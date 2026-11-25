const express = require('express');
const router = express.Router();
const TimetableSlot = require('../models/TimetableSlot');
const Course = require('../models/Course');
const { authenticateToken } = require('../middleware/auth');
const { sendSuccess, sendError } = require('../utils/response');
const { tag } = require('../utils/mongoTrace');

const DAYS_ORDER = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

// Topic 3 & 5: GET /timetable?day= - find with $and [semester, section, day] and $or [{batch:null},{batch}] sorted by start
router.get('/', authenticateToken, async (req, res) => {
  try {
    const semester = req.query.semester
      ? parseInt(req.query.semester, 10)
      : req.student?.semester || 5;
    const section = req.query.section || req.student?.section || 'B';
    const batch = req.query.batch || req.student?.labBatch || req.student?.batch || 'C';
    const day = req.query.day ? String(req.query.day) : null;

    if (day && !DAYS_ORDER.includes(day)) {
      return sendError(res, {
        status: 400,
        error: `Invalid day '${day}'. Expected Monday-Friday.`,
      });
    }

    const andClauses = [{ semester }, { section }];
    if (day) {
      andClauses.push({ day });
    }
    andClauses.push({ $or: [{ batch: null }, { batch }] });

    const filter = { $and: andClauses };
    const projection = {
      slotKey: 1,
      semester: 1,
      section: 1,
      day: 1,
      start: 1,
      end: 1,
      courseId: 1,
      courseCode: 1,
      courseName: 1,
      type: 1,
      batch: 1,
      room: 1,
    };
    const sortSpec = day ? { start: 1 } : { day: 1, start: 1 };

    tag(
      req,
      3,
      ['find', 'projection', 'sort'],
      'Projects schedule fields and sorts lectures chronologically by start time.'
    );
    tag(
      req,
      5,
      ['$and', '$or'],
      'Combines semester/section/day predicates with $or [{batch:null}, {batch}] for lab batch resolution.'
    );

    // Topic 3 & 5: Compound index-backed query with $and + $or batch filter + start sort
    const slots = await TimetableSlot.find(filter, projection).sort(sortSpec).lean();

    const daysMap = {};
    for (const d of DAYS_ORDER) {
      daysMap[d] = slots.filter((entry) => entry.day === d);
    }

    return sendSuccess(res, {
      data: {
        semester,
        section,
        batch,
        day: day || 'all',
        count: slots.length,
        slots,
        timetable: daysMap,
      },
    });
  } catch (error) {
    return sendError(res, { status: 500, error: error.message });
  }
});

// Topic 3: POST /timetable - Create timetable slot
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { slotKey, day, start, end, courseId, facultyId, room, type, semester, section, batch } =
      req.body;

    if (!day || !start || !end || !courseId || !type || !semester) {
      return sendError(res, {
        status: 400,
        error: 'day, start, end, courseId, type, and semester are required',
      });
    }

    tag(
      req,
      3,
      ['findById', 'save'],
      'Creates a validated timetable slot with batch=null for non-lab sessions.'
    );

    // Topic 3: Lookup course
    const course = await Course.findById(courseId, { code: 1, name: 1, shortName: 1 }).lean();
    if (!course) {
      return sendError(res, { status: 404, error: 'Course not found' });
    }

    // Topic 3: Insert new timetable slot (null batch for theory/other)
    const entry = new TimetableSlot({
      slotKey: slotKey || `${day.slice(0, 3).toLowerCase()}_${course.code}_${start}`,
      day,
      start,
      end,
      courseId: course._id,
      courseCode: course.code,
      courseName: course.shortName || course.name,
      facultyId: facultyId || null,
      room: room || 'CR-204',
      type,
      batch: type === 'lab' ? batch || 'C' : null,
      semester: parseInt(semester, 10),
      section: section || 'B',
    });

    await entry.save();

    return sendSuccess(res, {
      status: 201,
      data: { entry },
    });
  } catch (error) {
    return sendError(res, { status: 500, error: error.message });
  }
});

module.exports = router;
