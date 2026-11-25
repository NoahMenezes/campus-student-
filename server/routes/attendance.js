const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
const Attendance = require('../models/Attendance');
const AuditLog = require('../models/AuditLog');
const TimetableSlot = require('../models/TimetableSlot');
const Student = require('../models/Student');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');
const attendanceStats = require('../services/attendanceStats');
const { sendSuccess, sendError } = require('../utils/response');
const { tag } = require('../utils/mongoTrace');
const { getIstNowParts, parseMinutes } = require('../utils/ist');

// Topic 3 & 6: GET /attendance - Student overall & course-wise attendance via centralized attendanceStats
router.get('/', authenticateToken, async (req, res) => {
  try {
    const student = req.student;
    if (!student) {
      return sendError(res, { status: 404, error: 'Student profile not found' });
    }

    tag(
      req,
      6,
      ['$match', '$group', '$lookup', '$unwind', '$project'],
      'Delegates all attendance percentage calculations to attendanceStats.js MongoDB aggregations.'
    );

    const semester = req.query.semester ? parseInt(req.query.semester, 10) : student.semester || 5;
    const activeBatch = student.labBatch || student.batch || 'C';
    const [overallRes, subjectRes] = await Promise.all([
      attendanceStats.getOverallStats(student._id, activeBatch),
      attendanceStats.getPerSubjectStats(student._id, semester, activeBatch),
    ]);

    const subjects = subjectRes.data.subjects.map((s) => ({
      id: s.courseId,
      code: s.code,
      name: s.name,
      shortName: s.shortName,
      type: s.type,
      category: s.category,
      minAttendance: s.minAttendance,
      attended: s.present,
      missed: s.absent,
      total: s.marked,
      percentage: s.percentage,
      classesNeeded: s.classesNeeded,
      risk: s.risk,
      progressColor:
        s.risk === 'SAFE'
          ? '#10B981'
          : s.risk === 'AT_RISK'
            ? '#F59E0B'
            : s.risk === 'DEFAULTER'
              ? '#EF4444'
              : '#4B5563',
    }));

    return sendSuccess(res, {
      data: {
        semester,
        studentId: student._id,
        overallPercentage: overallRes.data.percentage,
        attendedClasses: overallRes.data.present,
        missedClasses: overallRes.data.absent,
        totalClasses: overallRes.data.marked,
        risk: overallRes.data.risk,
        subjects,
      },
    });
  } catch (error) {
    return sendError(res, { status: 500, error: error.message });
  }
});

// Topic 3 & 5: GET /attendance/history - Paginated/filtered attendance log
router.get('/history', authenticateToken, async (req, res) => {
  try {
    const studentId = req.student?._id;
    if (!studentId) {
      return sendError(res, { status: 404, error: 'Student profile not found' });
    }

    const { filter } = req.query;
    const query = { studentId };
    if (filter === 'P' || filter === 'A') query.status = filter;
    else if (filter === 'present') query.status = 'P';
    else if (filter === 'absent') query.status = 'A';

    tag(
      req,
      3,
      ['find', 'projection', 'sort', 'limit'],
      'Uses {studentId, markedAt:-1} index and formats UTC markedAt into Asia/Kolkata display time.'
    );

    // Topic 3: Indexed lookup on { studentId, markedAt: -1 } with course populate
    const records = await Attendance.find(query, {
      courseId: 1,
      slotId: 1,
      dateKey: 1,
      status: 1,
      markedAt: 1,
      source: 1,
    })
      .populate('courseId', 'name shortName code')
      .sort({ markedAt: -1 })
      .limit(100)
      .lean();

    return sendSuccess(res, {
      data: {
        records: records.map((r) => ({
          id: r._id,
          courseId: r.courseId?._id || r.courseId,
          slotId: r.slotId,
          subject: r.courseId ? r.courseId.name : 'Unknown',
          code: r.courseId ? r.courseId.code : '—',
          dateKey: r.dateKey,
          date: r.markedAt,
          status: r.status,
          source: r.source,
          time: r.markedAt
            ? new Date(r.markedAt).toLocaleTimeString('en-IN', {
                timeZone: 'Asia/Kolkata',
                hour: '2-digit',
                minute: '2-digit',
              })
            : '',
        })),
      },
    });
  } catch (error) {
    return sendError(res, { status: 500, error: error.message });
  }
});

// Topic 4 & 8: PUT /attendance - Transactional upsert with w:majority and audit_log on status change
router.put('/', authenticateToken, async (req, res) => {
  let session;

  try {
    const student = req.student;
    if (!student) {
      return sendError(res, { status: 404, error: 'Student profile not found' });
    }

    // Reject dropped students
    if (student.status === 'dropped') {
      tag(
        req,
        4,
        ['status !== "dropped"'],
        'Soft-deleted students are blocked from mutating attendance.'
      );
      return sendError(res, {
        status: 403,
        error: 'Dropped student cannot mark attendance',
      });
    }

    const { slotId, dateKey, status, source = 'manual', markedAt: clientMarkedAt } = req.body;
    if (!slotId || !dateKey || status === undefined || status === null) {
      tag(
        req,
        4,
        ['updateOne', '$set', 'upsert'],
        'Validates required slotId, dateKey, and status before attendance upsert.'
      );
      return sendError(res, {
        status: 400,
        error: 'slotId, dateKey, and status are required',
      });
    }

    if (!mongoose.Types.ObjectId.isValid(String(slotId))) {
      return sendError(res, { status: 400, error: 'Invalid slotId ObjectId' });
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(dateKey))) {
      return sendError(res, {
        status: 400,
        error: 'dateKey must be in YYYY-MM-DD format (IST day)',
      });
    }

    // Topic 3: Lookup timetable slot
    const slotObjectId = new mongoose.Types.ObjectId(String(slotId));
    const slot = await TimetableSlot.findById(slotObjectId).lean();

    if (!slot) {
      return sendError(res, { status: 404, error: 'Timetable slot not found' });
    }

    // Reject slots outside student's section or lab batch
    const studentBatch = student.labBatch || student.batch;
    if (slot.section !== student.section || (slot.batch !== null && slot.batch !== studentBatch)) {
      tag(
        req,
        4,
        ['updateOne', '$set', 'upsert'],
        'Blocks attendance marks for timetable slots outside the student active section or labBatch.'
      );
      return sendError(res, {
        status: 403,
        error: `Slot belongs to section ${slot.section} batch ${slot.batch ?? 'all'}, outside student's section ${student.section} batch ${studentBatch}`,
      });
    }

    // Reject future lectures evaluated in Asia/Kolkata (IST)
    const istNow = getIstNowParts(new Date());
    if (dateKey > istNow.dateKey) {
      tag(
        req,
        4,
        ['updateOne', '$set', 'upsert'],
        'Rejects future attendance dates evaluated in Asia/Kolkata.'
      );
      return sendError(res, {
        status: 400,
        error: `Cannot mark attendance for future date ${dateKey} (current IST date: ${istNow.dateKey})`,
      });
    }
    if (dateKey === istNow.dateKey && istNow.minutes < parseMinutes(slot.start)) {
      tag(
        req,
        4,
        ['updateOne', '$set', 'upsert'],
        'Rejects same-day lectures whose IST start time has not yet arrived.'
      );
      return sendError(res, {
        status: 400,
        error: `Cannot mark future lecture starting at ${slot.start} IST`,
      });
    }

    const studentObjectId = new mongoose.Types.ObjectId(String(student._id));
    const courseObjectId = new mongoose.Types.ObjectId(String(slot.courseId));
    const actorObjectId =
      req.user?._id && mongoose.Types.ObjectId.isValid(String(req.user._id))
        ? new mongoose.Types.ObjectId(String(req.user._id))
        : null;

    const parsedClientDate = clientMarkedAt ? new Date(String(clientMarkedAt)) : null;
    const nowUtc =
      parsedClientDate && !Number.isNaN(parsedClientDate.getTime()) ? parsedClientDate : new Date();
    // Shard-key-prefixed filter: { studentId, dateKey, slotId }
    const upsertFilter = {
      studentId: studentObjectId,
      dateKey: String(dateKey),
      slotId: slotObjectId,
    };

    tag(
      req,
      4,
      ['updateOne', '$set', 'upsert', '$setOnInsert'],
      'Performs idempotent shard-key-prefixed upsert on {studentId, dateKey, slotId}.'
    );
    tag(
      req,
      8,
      ['withTransaction', 'w: "majority"'],
      'Atomically persists attendance and conditional audit_log row across replica set majority.'
    );

    let previousStatus = null;
    let statusChanged = false;
    let auditLogged = false;
    let upsertResult = null;
    let savedDoc = null;

    // Topic 8: Replica Set ACID transaction wrapping attendance upsert + conditional audit_log insert
    session = await mongoose.startSession();
    await session.withTransaction(
      async () => {
        const existing = await Attendance.collection.findOne(upsertFilter, {
          session,
          projection: { _id: 1, status: 1 },
        });
        previousStatus = existing ? existing.status : null;

        // Topic 4 & 8: updateOne upsert with $set, $setOnInsert, and w:"majority" (validated by MongoDB $jsonSchema)
        upsertResult = await Attendance.collection.updateOne(
          upsertFilter,
          {
            $set: {
              status,
              markedAt: nowUtc,
              source: String(source),
            },
            $setOnInsert: {
              studentId: studentObjectId,
              courseId: courseObjectId,
              slotId: slotObjectId,
              dateKey: String(dateKey),
            },
          },
          {
            upsert: true,
            session,
            writeConcern: { w: 'majority' },
          }
        );

        savedDoc = await Attendance.collection.findOne(upsertFilter, { session });

        statusChanged = previousStatus !== status;
        if (statusChanged) {
          // Topic 3 & 8: Insert audit_log in the same replica set transaction when status changed
          await AuditLog.collection.insertOne(
            {
              actorId: actorObjectId,
              studentId: studentObjectId,
              action: previousStatus === null ? 'ATTENDANCE_MARK' : 'ATTENDANCE_CHANGE',
              collectionName: 'attendance',
              documentId: savedDoc?._id || upsertResult.upsertedId || null,
              before: previousStatus === null ? null : { status: previousStatus },
              after: { status, dateKey: String(dateKey), slotId: slotObjectId },
              metadata: { source: String(source), courseCode: slot.courseCode },
              createdAt: nowUtc,
            },
            { session, writeConcern: { w: 'majority' } }
          );
          auditLogged = true;
        }
      },
      { writeConcern: { w: 'majority' } }
    );

    return sendSuccess(res, {
      data: {
        attendance: savedDoc,
        upserted: Boolean(upsertResult?.upsertedCount),
        matchedCount: upsertResult?.matchedCount || 0,
        modifiedCount: upsertResult?.modifiedCount || 0,
        previousStatus,
        statusChanged,
        auditLogged,
      },
    });
  } catch (error) {
    // Topic 2: Surface MongoDB $jsonSchema validation errors (code 121) as HTTP 400
    if (error.code === 121 || error.errorResponse?.code === 121) {
      tag(
        req,
        2,
        ['$jsonSchema', 'validationAction: "error"'],
        'MongoDB server-side validator rejected invalid attendance document fields.'
      );
      return sendError(res, {
        status: 400,
        error: 'Document failed $jsonSchema validation',
        code: 121,
        details: error.errInfo || error.errorResponse?.errInfo || null,
      });
    }
    return sendError(res, { status: 500, error: error.message });
  } finally {
    if (session) {
      await session.endSession();
    }
  }
});

// Topic 4: DELETE /attendance/reset - Clear current student's attendance marks cleanly
router.delete('/reset', authenticateToken, async (req, res) => {
  const student = req.student;
  if (!student) {
    return sendError(res, { status: 404, error: 'Student profile not found' });
  }
  const filter = { studentId: new mongoose.Types.ObjectId(String(student._id)) };
  try {
    tag(
      req,
      4,
      ['deleteMany'],
      'Resets only the active student attendance marks without affecting other cohort records.'
    );
    const result = await Attendance.deleteMany(filter);
    return sendSuccess(res, {
      data: { deletedCount: result.deletedCount },
    });
  } catch (error) {
    return sendError(res, { status: 500, error: error.message });
  }
});

// Topic 4: DELETE /attendance - deleteOne (undo mark) using shard-key-prefixed filter
router.delete('/', authenticateToken, async (req, res) => {
  try {
    const student = req.student;
    if (!student) {
      return sendError(res, { status: 404, error: 'Student profile not found' });
    }

    const slotId = req.body?.slotId || req.query.slotId;
    const dateKey = req.body?.dateKey || req.query.dateKey;

    if (!slotId || !dateKey) {
      return sendError(res, { status: 400, error: 'slotId and dateKey are required' });
    }

    if (!mongoose.Types.ObjectId.isValid(String(slotId))) {
      return sendError(res, { status: 400, error: 'Invalid slotId ObjectId' });
    }

    const filter = {
      studentId: new mongoose.Types.ObjectId(String(student._id)),
      dateKey: String(dateKey),
      slotId: new mongoose.Types.ObjectId(String(slotId)),
    };

    tag(
      req,
      4,
      ['deleteOne'],
      'Undoes a marked attendance record using the shard-key-prefixed unique index.'
    );

    // Topic 4: Delete single attendance mark by shard-key-prefixed unique filter
    const result = await Attendance.deleteOne(filter);

    return sendSuccess(res, {
      data: {
        deletedCount: result.deletedCount,
        slotId,
        dateKey,
      },
    });
  } catch (error) {
    return sendError(res, { status: 500, error: error.message });
  }
});

// Topic 6: GET /attendance/stats - Global cohort summary using centralized attendanceStats
router.get('/stats', authenticateToken, authorizeRoles('faculty', 'admin'), async (req, res) => {
  try {
    tag(
      req,
      6,
      ['$group', '$avg', '$min', '$max', '$divide', '$round', 'countDocuments'],
      'Delegates all cohort percentage calculations to attendanceStats.js aggregations.'
    );

    const semester = req.query.semester ? parseInt(String(req.query.semester), 10) : 5;
    const [totalStudents, cohortOverall, courseSummary] = await Promise.all([
      Student.countDocuments({ status: { $ne: 'dropped' } }),
      attendanceStats.getCohortOverallStats(),
      attendanceStats.getCourseSummary(semester),
    ]);

    return sendSuccess(res, {
      data: {
        totalStudents,
        ...cohortOverall.data,
        courses: courseSummary.data.courses,
      },
    });
  } catch (error) {
    return sendError(res, { status: 500, error: error.message });
  }
});

module.exports = router;
