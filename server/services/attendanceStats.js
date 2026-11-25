const mongoose = require('mongoose');
const Attendance = require('../models/Attendance');
const Course = require('../models/Course');
const Student = require('../models/Student');
const TimetableSlot = require('../models/TimetableSlot');
const Notification = require('../models/Notification');
const { getIstNowParts } = require('../utils/ist');
const { runAggregate, runExplain } = require('../utils/mongoTrace');

const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

function toObjectId(id) {
  return id instanceof mongoose.Types.ObjectId ? id : new mongoose.Types.ObjectId(String(id));
}

function getIstWeekdayForDateKey(dateKey) {
  const [y, m, d] = dateKey.split('-').map(Number);
  const probeUtc = new Date(Date.UTC(y, m - 1, d, 6, 30, 0)); // 12:00 IST
  return probeUtc.toLocaleDateString('en-US', {
    timeZone: 'Asia/Kolkata',
    weekday: 'long',
  });
}

function shiftDateKey(dateKey, deltaDays) {
  const [y, m, d] = dateKey.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + deltaDays));
  const yy = dt.getUTCFullYear();
  const mm = String(dt.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(dt.getUTCDate()).padStart(2, '0');
  return `${yy}-${mm}-${dd}`;
}

// Count weekdays (Monday..Friday) occurring in (year, month) up to maxDateKey (IST)
function countWeekdaysInMonth(year, month, maxDateKey) {
  const counts = { Monday: 0, Tuesday: 0, Wednesday: 0, Thursday: 0, Friday: 0 };
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  for (let d = 1; d <= daysInMonth; d++) {
    const dateKey = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    if (dateKey > maxDateKey) break;
    const weekday = getIstWeekdayForDateKey(dateKey);
    if (weekday in counts) {
      counts[weekday]++;
    }
  }
  return counts;
}

// Reusable stages filtering attendance records to the student's active lab batch via timetable_slots
function batchFilterStages(activeBatch) {
  if (!activeBatch) return [];
  return [
    {
      $lookup: {
        from: 'timetable_slots',
        localField: 'slotId',
        foreignField: '_id',
        as: 'slot',
      },
    },
    { $unwind: '$slot' },
    { $match: { $or: [{ 'slot.batch': null }, { 'slot.batch': activeBatch }] } },
  ];
}

// Topic 6 & 7: Overall attendance via $match -> batch filter -> $group -> $sum -> $divide -> $round
async function getOverallStats(studentId, activeBatch = null) {
  const sid = toObjectId(studentId);
  const pipeline = [
    { $match: { studentId: sid } },
    ...batchFilterStages(activeBatch),
    {
      $group: {
        _id: '$studentId',
        present: { $sum: { $cond: [{ $eq: ['$status', 'P'] }, 1, 0] } },
        absent: { $sum: { $cond: [{ $eq: ['$status', 'A'] }, 1, 0] } },
        marked: { $sum: 1 },
      },
    },
    {
      $project: {
        _id: 0,
        studentId: '$_id',
        present: 1,
        absent: 1,
        marked: 1,
        percentage: {
          $cond: [
            { $eq: ['$marked', 0] },
            null,
            { $round: [{ $multiply: [{ $divide: ['$present', '$marked'] }, 100] }, 1] },
          ],
        },
      },
    },
    {
      $addFields: {
        risk: {
          $cond: [
            { $eq: ['$percentage', null] },
            'NO_DATA',
            {
              $cond: [
                { $gte: ['$percentage', 80] },
                'SAFE',
                { $cond: [{ $gte: ['$percentage', 75] }, 'AT_RISK', 'DEFAULTER'] },
              ],
            },
          ],
        },
      },
    },
  ];

  // Topic 6: Execute overall attendance aggregation pipeline via wrapper
  const rows = await runAggregate(Attendance, pipeline);
  const summary = rows[0] || {
    studentId: sid,
    present: 0,
    absent: 0,
    marked: 0,
    percentage: null,
    risk: 'NO_DATA',
  };

  return {
    data: {
      ...summary,
      hasRecords: summary.marked > 0,
    },
    pipeline,
  };
}

// Topic 6 & 7: Per-subject stats ($group by courseId -> $lookup courses -> $unwind -> $project classesNeeded & risk)
async function getPerSubjectStats(studentId, semester = 5, activeBatch = null) {
  const sid = toObjectId(studentId);
  const pipeline = [
    { $match: { studentId: sid } },
    ...batchFilterStages(activeBatch),
    {
      $group: {
        _id: '$courseId',
        present: { $sum: { $cond: [{ $eq: ['$status', 'P'] }, 1, 0] } },
        absent: { $sum: { $cond: [{ $eq: ['$status', 'A'] }, 1, 0] } },
        marked: { $sum: 1 },
      },
    },
    {
      $lookup: {
        from: 'courses',
        localField: '_id',
        foreignField: '_id',
        as: 'course',
      },
    },
    { $unwind: '$course' },
    {
      $project: {
        _id: 0,
        courseId: '$_id',
        code: '$course.code',
        name: '$course.name',
        shortName: '$course.shortName',
        type: '$course.type',
        category: '$course.category',
        minAttendance: { $ifNull: ['$course.minAttendance', 75] },
        present: 1,
        absent: 1,
        marked: 1,
        percentage: {
          $cond: [
            { $eq: ['$marked', 0] },
            null,
            { $round: [{ $multiply: [{ $divide: ['$present', '$marked'] }, 100] }, 1] },
          ],
        },
        classesNeeded: {
          $let: {
            vars: {
              minAtt: { $ifNull: ['$course.minAttendance', 75] },
            },
            in: {
              $cond: [
                {
                  $or: [
                    { $eq: ['$marked', 0] },
                    { $gte: ['$present', { $multiply: [{ $divide: ['$$minAtt', 100] }, '$marked'] }] },
                    { $gte: ['$$minAtt', 100] },
                  ],
                },
                0,
                {
                  $toInt: {
                    $ceil: {
                      $divide: [
                        {
                          $subtract: [
                            { $multiply: ['$$minAtt', '$marked'] },
                            { $multiply: [100, '$present'] },
                          ],
                        },
                        { $subtract: [100, '$$minAtt'] },
                      ],
                    },
                  },
                },
              ],
            },
          },
        },
      },
    },
    {
      $addFields: {
        risk: {
          $cond: [
            { $eq: ['$percentage', null] },
            'NO_DATA',
            {
              $cond: [
                { $gte: ['$percentage', 80] },
                'SAFE',
                {
                  $cond: [{ $gte: ['$percentage', '$minAttendance'] }, 'AT_RISK', 'DEFAULTER'],
                },
              ],
            },
          ],
        },
      },
    },
    { $sort: { code: 1 } },
  ];

  // Topic 6 & 7: Aggregate attendance by courseId with $lookup courses and deficit formula
  const [aggRows, allCourses] = await Promise.all([
    runAggregate(Attendance, pipeline),
    Course.find(
      { semester },
      { code: 1, name: 1, shortName: 1, type: 1, category: 1, minAttendance: 1 }
    )
      .sort({ code: 1 })
      .lean(),
  ]);

  const byCode = new Map(aggRows.map((r) => [r.code, r]));
  const subjects = allCourses.map((c) => {
    const found = byCode.get(c.code);
    if (found) return found;
    return {
      courseId: c._id,
      code: c.code,
      name: c.name,
      shortName: c.shortName,
      type: c.type,
      category: c.category,
      minAttendance: c.minAttendance ?? 75,
      present: 0,
      absent: 0,
      marked: 0,
      percentage: null,
      classesNeeded: 0,
      risk: 'NO_DATA',
    };
  });

  return {
    data: { semester, batch: activeBatch, subjects },
    pipeline,
  };
}

// Topic 6 & 7: Today stats (timetable_slots $lookup attendance + $facet for Total/Present/Absent/Pending)
async function getTodayStats(student, overrideDateKey = null) {
  const istNow = getIstNowParts(new Date());
  const dateKey = overrideDateKey || istNow.dateKey;
  const weekday = overrideDateKey ? getIstWeekdayForDateKey(dateKey) : istNow.weekday;
  const studentBatch = student.labBatch || student.batch || 'C';
  const sid = toObjectId(student._id);

  if (!DAY_NAMES.includes(weekday)) {
    return {
      data: {
        dateKey,
        day: weekday,
        section: student.section,
        batch: studentBatch,
        Total: 0,
        Present: 0,
        Absent: 0,
        Pending: 0,
        marked: 0,
        percentage: null,
        sessions: [],
      },
      pipeline: [],
    };
  }

  const pipeline = [
    {
      $match: {
        $and: [
          { semester: student.semester || 5 },
          { section: student.section || 'B' },
          { day: weekday },
          { $or: [{ batch: null }, { batch: studentBatch }] },
        ],
      },
    },
    { $sort: { start: 1 } },
    {
      $lookup: {
        from: 'attendance',
        let: { slotObjId: '$_id' },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  { $eq: ['$slotId', '$$slotObjId'] },
                  { $eq: ['$studentId', sid] },
                  { $eq: ['$dateKey', dateKey] },
                ],
              },
            },
          },
          { $project: { _id: 1, status: 1, markedAt: 1, source: 1 } },
        ],
        as: 'attDocs',
      },
    },
    {
      $addFields: {
        att: { $arrayElemAt: ['$attDocs', 0] },
        markStatus: { $ifNull: [{ $arrayElemAt: ['$attDocs.status', 0] }, 'PENDING'] },
      },
    },
    {
      $facet: {
        sessions: [
          {
            $project: {
              _id: 1,
              slotKey: 1,
              day: 1,
              start: 1,
              end: 1,
              courseId: 1,
              courseCode: 1,
              courseName: 1,
              type: 1,
              batch: 1,
              room: 1,
              status: '$markStatus',
              markedAt: '$att.markedAt',
              source: '$att.source',
            },
          },
        ],
        totals: [
          {
            $group: {
              _id: null,
              Total: { $sum: 1 },
              Present: { $sum: { $cond: [{ $eq: ['$markStatus', 'P'] }, 1, 0] } },
              Absent: { $sum: { $cond: [{ $eq: ['$markStatus', 'A'] }, 1, 0] } },
            },
          },
          {
            $project: {
              _id: 0,
              Total: 1,
              Present: 1,
              Absent: 1,
              // Pending = scheduled slots minus marked rows
              Pending: { $subtract: ['$Total', { $add: ['$Present', '$Absent'] }] },
              marked: { $add: ['$Present', '$Absent'] },
              percentage: {
                $cond: [
                  { $eq: [{ $add: ['$Present', '$Absent'] }, 0] },
                  null,
                  {
                    $round: [
                      {
                        $multiply: [
                          { $divide: ['$Present', { $add: ['$Present', '$Absent'] }] },
                          100,
                        ],
                      },
                      1,
                    ],
                  },
                ],
              },
            },
          },
        ],
      },
    },
  ];

  // Topic 6 & 7: Aggregate today's scheduled slots joined with attendance via $lookup + $facet
  const res = await runAggregate(TimetableSlot, pipeline);
  const facetDoc = res[0] || { sessions: [], totals: [] };
  const counts = facetDoc.totals[0] || {
    Total: 0,
    Present: 0,
    Absent: 0,
    Pending: 0,
    marked: 0,
    percentage: null,
  };

  return {
    data: {
      dateKey,
      day: weekday,
      section: student.section,
      batch: studentBatch,
      ...counts,
      sessions: facetDoc.sessions,
    },
    pipeline,
  };
}

// Topic 6 & 7: Monthly breakdown ($group on { $month with timezone "Asia/Kolkata", courseId }, $sort) + real scheduled/pending counts
async function getMonthlyStats(studentOrId, year = null, month = null) {
  let student = null;
  if (typeof studentOrId === 'object' && studentOrId !== null && 'semester' in studentOrId) {
    student = studentOrId;
  } else {
    student = await Student.findById(toObjectId(studentOrId)).lean();
  }

  const sid = toObjectId(student ? student._id : studentOrId);
  const semester = student?.semester || 5;
  const section = student?.section || 'B';
  const activeBatch = student?.labBatch || student?.batch || 'C';

  const matchStage = { studentId: sid };
  if (year && month) {
    const prefix = `${year}-${String(month).padStart(2, '0')}`;
    matchStage.dateKey = { $regex: `^${prefix}-` };
  }

  const pipeline = [
    { $match: matchStage },
    ...batchFilterStages(activeBatch),
    {
      $group: {
        _id: {
          year: { $year: { date: '$markedAt', timezone: 'Asia/Kolkata' } },
          month: { $month: { date: '$markedAt', timezone: 'Asia/Kolkata' } },
          courseId: '$courseId',
        },
        present: { $sum: { $cond: [{ $eq: ['$status', 'P'] }, 1, 0] } },
        absent: { $sum: { $cond: [{ $eq: ['$status', 'A'] }, 1, 0] } },
        marked: { $sum: 1 },
      },
    },
    {
      $lookup: {
        from: 'courses',
        localField: '_id.courseId',
        foreignField: '_id',
        as: 'course',
      },
    },
    { $unwind: '$course' },
    {
      $project: {
        _id: 0,
        year: '$_id.year',
        month: '$_id.month',
        courseId: '$_id.courseId',
        code: '$course.code',
        name: '$course.name',
        shortName: '$course.shortName',
        type: '$course.type',
        minAttendance: { $ifNull: ['$course.minAttendance', 75] },
        present: 1,
        absent: 1,
        marked: 1,
        percentage: {
          $cond: [
            { $eq: ['$marked', 0] },
            null,
            { $round: [{ $multiply: [{ $divide: ['$present', '$marked'] }, 100] }, 1] },
          ],
        },
      },
    },
    { $sort: { year: -1, month: -1, code: 1 } },
    {
      $group: {
        _id: { year: '$year', month: '$month' },
        present: { $sum: '$present' },
        absent: { $sum: '$absent' },
        marked: { $sum: '$marked' },
        subjects: {
          $push: {
            courseId: '$courseId',
            code: '$code',
            name: '$name',
            shortName: '$shortName',
            type: '$type',
            minAttendance: '$minAttendance',
            present: '$present',
            absent: '$absent',
            marked: '$marked',
            percentage: '$percentage',
          },
        },
      },
    },
    {
      $project: {
        _id: 0,
        year: '$_id.year',
        month: '$_id.month',
        present: 1,
        absent: 1,
        marked: 1,
        percentage: {
          $cond: [
            { $eq: ['$marked', 0] },
            null,
            { $round: [{ $multiply: [{ $divide: ['$present', '$marked'] }, 100] }, 1] },
          ],
        },
        subjects: 1,
      },
    },
    { $sort: { year: -1, month: -1 } },
  ];

  // Topic 6 & 7: Monthly IST aggregation + scheduled slot counts for real pending numbers
  const [aggMonths, slots, allCourses] = await Promise.all([
    runAggregate(Attendance, pipeline),
    TimetableSlot.find(
      {
        semester,
        section,
        $or: [{ batch: null }, { batch: activeBatch }],
      },
      { day: 1, courseCode: 1 }
    ).lean(),
    Course.find(
      { semester },
      { _id: 1, code: 1, name: 1, shortName: 1, type: 1, minAttendance: 1 }
    )
      .sort({ code: 1 })
      .lean(),
  ]);

  const istToday = getIstNowParts(new Date()).dateKey;

  const enrichMonth = (mYear, mMonth, mData) => {
    const weekdayCounts = countWeekdaysInMonth(mYear, mMonth, istToday);
    let totalScheduled = 0;
    const scheduledByCode = new Map();
    for (const sl of slots) {
      const n = weekdayCounts[sl.day] || 0;
      totalScheduled += n;
      scheduledByCode.set(sl.courseCode, (scheduledByCode.get(sl.courseCode) || 0) + n);
    }

    const base = mData || {
      year: mYear,
      month: mMonth,
      present: 0,
      absent: 0,
      marked: 0,
      percentage: null,
      subjects: [],
    };

    const byCode = new Map((base.subjects || []).map((s) => [s.code, s]));
    const fullSubjects = allCourses.map((c) => {
      const existing = byCode.get(c.code);
      const sched = scheduledByCode.get(c.code) || 0;
      const marked = existing ? existing.marked : 0;
      return {
        courseId: c._id,
        code: c.code,
        name: c.name,
        shortName: c.shortName,
        type: c.type,
        minAttendance: c.minAttendance ?? 75,
        present: existing ? existing.present : 0,
        absent: existing ? existing.absent : 0,
        marked,
        scheduled: sched,
        pending: Math.max(0, sched - marked),
        percentage: existing ? existing.percentage : null,
      };
    });

    return {
      ...base,
      totalScheduled,
      pending: Math.max(0, totalScheduled - base.marked),
      subjects: fullSubjects,
    };
  };

  const months = aggMonths.map((m) => enrichMonth(m.year, m.month, m));
  let selected = null;
  if (year && month) {
    const found = months.find((m) => m.year === year && m.month === month);
    selected = found || enrichMonth(year, month, null);
  }

  return {
    data: {
      months,
      selected,
    },
    pipeline,
  };
}

// Topic 6 & 7: Course summary avg/min/max across active students
async function getCourseSummary(semester = 5) {
  const pipeline = [
    {
      $lookup: {
        from: 'students',
        localField: 'studentId',
        foreignField: '_id',
        as: 'student',
      },
    },
    { $unwind: '$student' },
    { $match: { 'student.status': 'active', 'student.semester': semester } },
    {
      $group: {
        _id: { studentId: '$studentId', courseId: '$courseId' },
        present: { $sum: { $cond: [{ $eq: ['$status', 'P'] }, 1, 0] } },
        marked: { $sum: 1 },
      },
    },
    { $match: { marked: { $gt: 0 } } },
    {
      $project: {
        courseId: '$_id.courseId',
        pct: { $multiply: [{ $divide: ['$present', '$marked'] }, 100] },
      },
    },
    {
      $lookup: {
        from: 'courses',
        localField: 'courseId',
        foreignField: '_id',
        as: 'course',
      },
    },
    { $unwind: '$course' },
    {
      $group: {
        _id: '$courseId',
        code: { $first: '$course.code' },
        name: { $first: '$course.name' },
        shortName: { $first: '$course.shortName' },
        type: { $first: '$course.type' },
        minAttendance: { $first: { $ifNull: ['$course.minAttendance', 75] } },
        studentCount: { $sum: 1 },
        avgPercentage: { $avg: '$pct' },
        minPercentage: { $min: '$pct' },
        maxPercentage: { $max: '$pct' },
        defaultersCount: {
          $sum: {
            $cond: [{ $lt: ['$pct', { $ifNull: ['$course.minAttendance', 75] }] }, 1, 0],
          },
        },
      },
    },
    {
      $project: {
        _id: 0,
        courseId: '$_id',
        code: 1,
        name: 1,
        shortName: 1,
        type: 1,
        minAttendance: 1,
        studentCount: 1,
        defaultersCount: 1,
        avgPercentage: { $round: ['$avgPercentage', 1] },
        minPercentage: { $round: ['$minPercentage', 1] },
        maxPercentage: { $round: ['$maxPercentage', 1] },
      },
    },
    { $sort: { code: 1 } },
  ];

  const courses = await runAggregate(Attendance, pipeline);

  return {
    data: { semester, courses },
    pipeline,
  };
}

// Topic 6 & 7: Defaulters list with guardian phone ($lookup students -> $unwind -> $match active -> $project -> $sort)
async function getDefaultersList({ semester = 5, threshold = 75, section = null } = {}) {
  const studentMatch = { 'student.status': 'active', 'student.semester': semester };
  if (section) {
    studentMatch['student.section'] = String(section).toUpperCase();
  }

  const pipeline = [
    {
      $group: {
        _id: '$studentId',
        present: { $sum: { $cond: [{ $eq: ['$status', 'P'] }, 1, 0] } },
        absent: { $sum: { $cond: [{ $eq: ['$status', 'A'] }, 1, 0] } },
        marked: { $sum: 1 },
      },
    },
    { $match: { marked: { $gt: 0 } } },
    {
      $project: {
        present: 1,
        absent: 1,
        marked: 1,
        percentage: { $round: [{ $multiply: [{ $divide: ['$present', '$marked'] }, 100] }, 1] },
      },
    },
    { $match: { percentage: { $lt: threshold } } },
    {
      $lookup: {
        from: 'students',
        localField: '_id',
        foreignField: '_id',
        as: 'student',
      },
    },
    { $unwind: '$student' },
    { $match: studentMatch },
    {
      $project: {
        _id: 0,
        studentId: '$_id',
        rollNo: '$student.rollNo',
        name: '$student.name',
        email: '$student.email',
        section: '$student.section',
        labBatch: { $ifNull: ['$student.labBatch', '$student.batch'] },
        guardianName: '$student.guardian.name',
        guardianPhone: '$student.guardian.phone',
        present: 1,
        absent: 1,
        marked: 1,
        percentage: 1,
        risk: { $cond: [{ $lt: ['$percentage', 75] }, 'DEFAULTER', 'AT_RISK'] },
      },
    },
    { $sort: { percentage: 1, rollNo: 1 } },
  ];

  const defaulters = await runAggregate(Attendance, pipeline);

  return {
    data: {
      semester,
      threshold,
      count: defaulters.length,
      defaulters,
    },
    pipeline,
  };
}

// Topic 6 & 7: 14-day trend vs overall using $facet
async function get14DayTrend(studentId) {
  const sid = toObjectId(studentId);
  const istNow = getIstNowParts(new Date());
  const endDateKey = istNow.dateKey;
  const startDateKey = shiftDateKey(endDateKey, -13);

  const pipeline = [
    { $match: { studentId: sid } },
    {
      $facet: {
        overall: [
          {
            $group: {
              _id: null,
              present: { $sum: { $cond: [{ $eq: ['$status', 'P'] }, 1, 0] } },
              absent: { $sum: { $cond: [{ $eq: ['$status', 'A'] }, 1, 0] } },
              marked: { $sum: 1 },
            },
          },
          {
            $project: {
              _id: 0,
              present: 1,
              absent: 1,
              marked: 1,
              percentage: {
                $cond: [
                  { $eq: ['$marked', 0] },
                  null,
                  { $round: [{ $multiply: [{ $divide: ['$present', '$marked'] }, 100] }, 1] },
                ],
              },
            },
          },
        ],
        windowSummary: [
          { $match: { dateKey: { $gte: startDateKey, $lte: endDateKey } } },
          {
            $group: {
              _id: null,
              present: { $sum: { $cond: [{ $eq: ['$status', 'P'] }, 1, 0] } },
              absent: { $sum: { $cond: [{ $eq: ['$status', 'A'] }, 1, 0] } },
              marked: { $sum: 1 },
            },
          },
          {
            $project: {
              _id: 0,
              present: 1,
              absent: 1,
              marked: 1,
              percentage: {
                $cond: [
                  { $eq: ['$marked', 0] },
                  null,
                  { $round: [{ $multiply: [{ $divide: ['$present', '$marked'] }, 100] }, 1] },
                ],
              },
            },
          },
        ],
        daily: [
          { $match: { dateKey: { $gte: startDateKey, $lte: endDateKey } } },
          {
            $group: {
              _id: '$dateKey',
              present: { $sum: { $cond: [{ $eq: ['$status', 'P'] }, 1, 0] } },
              absent: { $sum: { $cond: [{ $eq: ['$status', 'A'] }, 1, 0] } },
              marked: { $sum: 1 },
            },
          },
          {
            $project: {
              _id: 0,
              dateKey: '$_id',
              present: 1,
              absent: 1,
              marked: 1,
              percentage: {
                $cond: [
                  { $eq: ['$marked', 0] },
                  null,
                  { $round: [{ $multiply: [{ $divide: ['$present', '$marked'] }, 100] }, 1] },
                ],
              },
            },
          },
          { $sort: { dateKey: 1 } },
        ],
      },
    },
    {
      $project: {
        overall: {
          $ifNull: [
            { $arrayElemAt: ['$overall', 0] },
            { present: 0, absent: 0, marked: 0, percentage: null },
          ],
        },
        last14Days: {
          $ifNull: [
            { $arrayElemAt: ['$windowSummary', 0] },
            { present: 0, absent: 0, marked: 0, percentage: null },
          ],
        },
        daily: 1,
      },
    },
    {
      $addFields: {
        delta: {
          $cond: [
            {
              $or: [
                { $eq: ['$overall.percentage', null] },
                { $eq: ['$last14Days.percentage', null] },
              ],
            },
            null,
            { $round: [{ $subtract: ['$last14Days.percentage', '$overall.percentage'] }, 1] },
          ],
        },
      },
    },
    {
      $addFields: {
        direction: {
          $cond: [
            { $eq: ['$delta', null] },
            'NO_DATA',
            {
              $cond: [
                { $gt: ['$delta', 0] },
                'IMPROVING',
                { $cond: [{ $lt: ['$delta', 0] }, 'DECLINING', 'FLAT'] },
              ],
            },
          ],
        },
      },
    },
  ];

  const rows = await runAggregate(Attendance, pipeline);
  const result = rows[0] || {
    overall: { present: 0, absent: 0, marked: 0, percentage: null },
    last14Days: { present: 0, absent: 0, marked: 0, percentage: null },
    daily: [],
    delta: null,
    direction: 'NO_DATA',
  };

  return {
    data: {
      startDateKey,
      endDateKey,
      ...result,
    },
    pipeline,
  };
}

// Topic 6 & 7: Student 360 single-call dashboard via $facet
async function getStudent360(studentId) {
  const sid = toObjectId(studentId);
  const student = await Student.findById(sid, {
    userId: 1,
    name: 1,
    rollNo: 1,
    email: 1,
    department: 1,
    academicLevel: 1,
    semester: 1,
    section: 1,
    batch: 1,
    labBatch: 1,
    status: 1,
    guardian: 1,
  }).lean();

  if (!student) return null;

  const istNow = getIstNowParts(new Date());
  const start14DateKey = shiftDateKey(istNow.dateKey, -13);

  const pipeline = [
    { $match: { studentId: sid } },
    {
      $facet: {
        overall: [
          {
            $group: {
              _id: null,
              present: { $sum: { $cond: [{ $eq: ['$status', 'P'] }, 1, 0] } },
              absent: { $sum: { $cond: [{ $eq: ['$status', 'A'] }, 1, 0] } },
              marked: { $sum: 1 },
            },
          },
          {
            $project: {
              _id: 0,
              present: 1,
              absent: 1,
              marked: 1,
              percentage: {
                $cond: [
                  { $eq: ['$marked', 0] },
                  null,
                  { $round: [{ $multiply: [{ $divide: ['$present', '$marked'] }, 100] }, 1] },
                ],
              },
            },
          },
          {
            $addFields: {
              risk: {
                $cond: [
                  { $eq: ['$percentage', null] },
                  'NO_DATA',
                  {
                    $cond: [
                      { $gte: ['$percentage', 80] },
                      'SAFE',
                      { $cond: [{ $gte: ['$percentage', 75] }, 'AT_RISK', 'DEFAULTER'] },
                    ],
                  },
                ],
              },
            },
          },
        ],
        perCourse: [
          {
            $group: {
              _id: '$courseId',
              present: { $sum: { $cond: [{ $eq: ['$status', 'P'] }, 1, 0] } },
              absent: { $sum: { $cond: [{ $eq: ['$status', 'A'] }, 1, 0] } },
              marked: { $sum: 1 },
            },
          },
          {
            $lookup: {
              from: 'courses',
              localField: '_id',
              foreignField: '_id',
              as: 'course',
            },
          },
          { $unwind: '$course' },
          {
            $project: {
              _id: 0,
              courseId: '$_id',
              code: '$course.code',
              name: '$course.name',
              shortName: '$course.shortName',
              type: '$course.type',
              minAttendance: { $ifNull: ['$course.minAttendance', 75] },
              present: 1,
              absent: 1,
              marked: 1,
              percentage: {
                $cond: [
                  { $eq: ['$marked', 0] },
                  null,
                  { $round: [{ $multiply: [{ $divide: ['$present', '$marked'] }, 100] }, 1] },
                ],
              },
            },
          },
          { $sort: { code: 1 } },
        ],
        monthly: [
          {
            $group: {
              _id: {
                year: { $year: { date: '$markedAt', timezone: 'Asia/Kolkata' } },
                month: { $month: { date: '$markedAt', timezone: 'Asia/Kolkata' } },
              },
              present: { $sum: { $cond: [{ $eq: ['$status', 'P'] }, 1, 0] } },
              absent: { $sum: { $cond: [{ $eq: ['$status', 'A'] }, 1, 0] } },
              marked: { $sum: 1 },
            },
          },
          {
            $project: {
              _id: 0,
              year: '$_id.year',
              month: '$_id.month',
              present: 1,
              absent: 1,
              marked: 1,
              percentage: {
                $cond: [
                  { $eq: ['$marked', 0] },
                  null,
                  { $round: [{ $multiply: [{ $divide: ['$present', '$marked'] }, 100] }, 1] },
                ],
              },
            },
          },
          { $sort: { year: -1, month: -1 } },
        ],
        recent14Days: [
          { $match: { dateKey: { $gte: start14DateKey } } },
          {
            $group: {
              _id: '$dateKey',
              present: { $sum: { $cond: [{ $eq: ['$status', 'P'] }, 1, 0] } },
              absent: { $sum: { $cond: [{ $eq: ['$status', 'A'] }, 1, 0] } },
              marked: { $sum: 1 },
            },
          },
          {
            $project: {
              _id: 0,
              dateKey: '$_id',
              present: 1,
              absent: 1,
              marked: 1,
              percentage: {
                $cond: [
                  { $eq: ['$marked', 0] },
                  null,
                  { $round: [{ $multiply: [{ $divide: ['$present', '$marked'] }, 100] }, 1] },
                ],
              },
            },
          },
          { $sort: { dateKey: 1 } },
        ],
        recentMarks: [
          { $sort: { markedAt: -1 } },
          { $limit: 10 },
          {
            $lookup: {
              from: 'courses',
              localField: 'courseId',
              foreignField: '_id',
              as: 'course',
            },
          },
          { $unwind: '$course' },
          {
            $project: {
              _id: 1,
              dateKey: 1,
              status: 1,
              markedAt: 1,
              source: 1,
              courseCode: '$course.code',
              courseName: '$course.shortName',
            },
          },
        ],
      },
    },
  ];

  const [facetRows, todayRes, unreadCount] = await Promise.all([
    runAggregate(Attendance, pipeline),
    getTodayStats(student),
    Notification.countDocuments({ studentId: sid, read: false }),
  ]);

  const facet = facetRows[0] || {
    overall: [],
    perCourse: [],
    monthly: [],
    recent14Days: [],
    recentMarks: [],
  };

  return {
    data: {
      student,
      unreadNotifications: unreadCount,
      overall: facet.overall[0] || {
        present: 0,
        absent: 0,
        marked: 0,
        percentage: null,
        risk: 'NO_DATA',
      },
      today: todayRes.data,
      perCourse: facet.perCourse,
      monthly: facet.monthly,
      recent14Days: facet.recent14Days,
      recentMarks: facet.recentMarks,
    },
    pipeline,
  };
}

// Topic 2 & 10: Compare explain("executionStats") with index hint vs without index hint (COLLSCAN)
async function explainAttendanceQuery(studentId, courseId = null) {
  const sid = toObjectId(studentId);
  let targetCourseId = courseId ? toObjectId(courseId) : null;
  if (!targetCourseId) {
    const dbms = await Course.findOne({ code: 'CECMP300' }, { _id: 1 }).lean();
    if (dbms) targetCourseId = dbms._id;
  }

  const filter = targetCourseId
    ? { studentId: sid, courseId: targetCourseId }
    : { studentId: sid };
  const indexHint = { studentId: 1, courseId: 1 };

  const [withoutIndexHintRaw, withIndexHintRaw, plannerDefaultRaw] = await Promise.all([
    runExplain(Attendance.collection, filter, { $natural: 1 }),
    runExplain(Attendance.collection, filter, indexHint),
    runExplain(Attendance.collection, filter),
  ]);

  const summarizeExplain = (exp) => {
    const stats = exp.executionStats || {};
    const stageTree = exp.queryPlanner?.winningPlan || {};
    const extractStage = (node) => {
      if (!node) return null;
      if (node.stage === 'IXSCAN' || node.stage === 'COLLSCAN') return node.stage;
      return extractStage(node.inputStage) || node.stage || null;
    };
    return {
      stage: extractStage(stageTree),
      indexName: stageTree.inputStage?.indexName || stageTree.indexName || null,
      nReturned: stats.nReturned ?? 0,
      totalKeysExamined: stats.totalKeysExamined ?? 0,
      totalDocsExamined: stats.totalDocsExamined ?? 0,
      executionTimeMillis: stats.executionTimeMillis ?? 0,
      winningPlan: stageTree,
    };
  };

  const withoutIndexHint = summarizeExplain(withoutIndexHintRaw);
  const withIndexHint = summarizeExplain(withIndexHintRaw);
  const defaultPlanner = summarizeExplain(plannerDefaultRaw);

  return {
    data: {
      filter,
      indexHint,
      withoutIndexHint,
      withIndexHint,
      defaultPlanner,
      comparison: {
        docsExaminedReduction:
          withoutIndexHint.totalDocsExamined - withIndexHint.totalDocsExamined,
        collscanVsIxscanRatio:
          withIndexHint.totalDocsExamined > 0
            ? Number(
                (withoutIndexHint.totalDocsExamined / withIndexHint.totalDocsExamined).toFixed(1)
              )
            : withoutIndexHint.totalDocsExamined,
      },
    },
    filter,
  };
}

// Topic 6: Global cohort overall attendance percentage via $group -> $divide -> $round
async function getCohortOverallStats() {
  const pipeline = [
    {
      $group: {
        _id: null,
        presentRecords: { $sum: { $cond: [{ $eq: ['$status', 'P'] }, 1, 0] } },
        absentRecords: { $sum: { $cond: [{ $eq: ['$status', 'A'] }, 1, 0] } },
        totalRecords: { $sum: 1 },
      },
    },
    {
      $project: {
        _id: 0,
        presentRecords: 1,
        absentRecords: 1,
        totalRecords: 1,
        overallPercentage: {
          $cond: [
            { $eq: ['$totalRecords', 0] },
            null,
            { $round: [{ $multiply: [{ $divide: ['$presentRecords', '$totalRecords'] }, 100] }, 1] },
          ],
        },
      },
    },
  ];

  const rows = await runAggregate(Attendance, pipeline);
  return {
    data: rows[0] || {
      presentRecords: 0,
      absentRecords: 0,
      totalRecords: 0,
      overallPercentage: null,
    },
    pipeline,
  };
}

module.exports = {
  getOverallStats,
  getPerSubjectStats,
  getTodayStats,
  getMonthlyStats,
  getCourseSummary,
  getDefaultersList,
  get14DayTrend,
  getStudent360,
  explainAttendanceQuery,
  getCohortOverallStats,
};
