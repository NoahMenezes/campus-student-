const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
const Student = require('../models/Student');
const attendanceStats = require('../services/attendanceStats');
const { authenticateToken } = require('../middleware/auth');
const { sendSuccess, sendError } = require('../utils/response');
const { tag } = require('../utils/mongoTrace');

async function resolveTargetStudent(req) {
  if (req.query.studentId && mongoose.Types.ObjectId.isValid(String(req.query.studentId))) {
    const found = await Student.findById(req.query.studentId).lean();
    if (found) return found;
  }
  if (req.query.rollNo) {
    const found = await Student.findOne({ rollNo: String(req.query.rollNo).toUpperCase() }).lean();
    if (found) return found;
  }
  return req.student;
}

// Topic 6 & 7: GET /analytics/overall - $match -> $group -> $sum -> $divide -> $round
router.get('/overall', authenticateToken, async (req, res) => {
  try {
    const student = await resolveTargetStudent(req);
    if (!student) return sendError(res, { status: 404, error: 'Student not found' });

    tag(
      req,
      6,
      ['$match', '$lookup', '$group', '$sum', '$divide', '$round'],
      'Computes overall P/(P+A) attendance percentage inside MongoDB for the student active batch.'
    );

    const activeBatch = req.query.batch
      ? String(req.query.batch)
      : student.labBatch || student.batch || 'C';
    const { data } = await attendanceStats.getOverallStats(student._id, activeBatch);
    return sendSuccess(res, { data });
  } catch (error) {
    return sendError(res, { status: 500, error: error.message });
  }
});

// Topic 6 & 7: GET /analytics/subjects (and /per-subject alias)
const perSubjectHandler = async (req, res) => {
  try {
    const student = await resolveTargetStudent(req);
    if (!student) return sendError(res, { status: 404, error: 'Student not found' });

    tag(
      req,
      7,
      ['$group', '$lookup', '$unwind', '$project', '$ceil', '$cond'],
      'Joins attendance with courses (incl. NCC301) filtered to active batch to compute classesNeeded and risk tier.'
    );

    const semester = req.query.semester
      ? parseInt(String(req.query.semester), 10)
      : student.semester || 5;
    const activeBatch = req.query.batch
      ? String(req.query.batch)
      : student.labBatch || student.batch || 'C';
    const { data } = await attendanceStats.getPerSubjectStats(student._id, semester, activeBatch);

    return sendSuccess(res, { data });
  } catch (error) {
    return sendError(res, { status: 500, error: error.message });
  }
};
router.get('/subjects', authenticateToken, perSubjectHandler);
router.get('/per-subject', authenticateToken, perSubjectHandler);

// Topic 6 & 7: GET /analytics/today - timetable_slots $lookup attendance + $facet for Total/Present/Absent/Pending
router.get('/today', authenticateToken, async (req, res) => {
  try {
    const student = await resolveTargetStudent(req);
    if (!student) return sendError(res, { status: 404, error: 'Student not found' });

    tag(
      req,
      7,
      ['$lookup', '$facet', '$group', '$subtract'],
      'Joins scheduled timetable_slots with attendance and computes Total/Present/Absent/Pending in one $facet pass.'
    );

    const dateKey = req.query.dateKey ? String(req.query.dateKey) : null;
    const { data } = await attendanceStats.getTodayStats(student, dateKey);

    return sendSuccess(res, { data });
  } catch (error) {
    return sendError(res, { status: 500, error: error.message });
  }
});

// Topic 6 & 7: GET /analytics/monthly - $group on { $month with timezone Asia/Kolkata, courseId }, $sort
router.get('/monthly', authenticateToken, async (req, res) => {
  try {
    const student = await resolveTargetStudent(req);
    if (!student) return sendError(res, { status: 404, error: 'Student not found' });

    tag(
      req,
      6,
      ['$month (timezone: Asia/Kolkata)', '$year', '$group', '$lookup', '$sort'],
      'Groups UTC markedAt dates into IST months and courses cleanly.'
    );

    const year = req.query.year ? parseInt(String(req.query.year), 10) : null;
    const month = req.query.month ? parseInt(String(req.query.month), 10) : null;
    const { data } = await attendanceStats.getMonthlyStats(student, year, month);

    return sendSuccess(res, { data });
  } catch (error) {
    return sendError(res, { status: 500, error: error.message });
  }
});

// Topic 6 & 7: GET /analytics/course-summary (and /courses alias) - avg/min/max per course
const courseSummaryHandler = async (req, res) => {
  try {
    tag(
      req,
      6,
      ['$group', '$avg', '$min', '$max', '$lookup', '$unwind'],
      'Computes cohort average, minimum, and maximum attendance across active students per course.'
    );

    const semester = req.query.semester ? parseInt(String(req.query.semester), 10) : 5;
    const { data } = await attendanceStats.getCourseSummary(semester);

    return sendSuccess(res, { data });
  } catch (error) {
    return sendError(res, { status: 500, error: error.message });
  }
};
router.get('/course-summary', authenticateToken, courseSummaryHandler);
router.get('/courses', authenticateToken, courseSummaryHandler);

// Topic 6 & 7: GET /analytics/defaulters - Defaulters list with guardian phone
router.get('/defaulters', authenticateToken, async (req, res) => {
  try {
    tag(
      req,
      7,
      ['$group', '$lookup', '$unwind', '$match (active)', '$project', '$sort'],
      'Finds active students below threshold and attaches guardian phone numbers for outreach.'
    );

    const semester = req.query.semester ? parseInt(String(req.query.semester), 10) : 5;
    const threshold = req.query.threshold ? parseFloat(String(req.query.threshold)) : 75;
    const section = req.query.section ? String(req.query.section) : null;

    const { data } = await attendanceStats.getDefaultersList({
      semester,
      threshold,
      section,
    });

    return sendSuccess(res, { data });
  } catch (error) {
    return sendError(res, { status: 500, error: error.message });
  }
});

// Topic 6 & 7: GET /analytics/trend - 14-day trend vs overall
router.get('/trend', authenticateToken, async (req, res) => {
  try {
    const student = await resolveTargetStudent(req);
    if (!student) return sendError(res, { status: 404, error: 'Student not found' });

    tag(
      req,
      7,
      ['$facet', '$match ($gte/$lte)', '$group', '$subtract', '$round'],
      'Compares rolling 14-day IST attendance performance against overall semester percentage.'
    );

    const { data } = await attendanceStats.get14DayTrend(student._id);

    return sendSuccess(res, { data });
  } catch (error) {
    return sendError(res, { status: 500, error: error.message });
  }
});

// Topic 6 & 7: GET /analytics/student-360 (and /:studentId) - Student 360 with $facet
const student360Handler = async (req, res) => {
  try {
    let targetStudent = null;
    if (req.params.studentId && mongoose.Types.ObjectId.isValid(req.params.studentId)) {
      targetStudent = await Student.findById(req.params.studentId).lean();
    } else {
      targetStudent = await resolveTargetStudent(req);
    }

    if (!targetStudent) {
      return sendError(res, { status: 404, error: 'Student not found' });
    }

    tag(
      req,
      7,
      ['$facet', '$lookup', '$unwind', '$group', '$sort', '$limit'],
      'Fetches overall, per-course, monthly, 14-day, and recent marks in a single multi-pipeline $facet query.'
    );

    const result = await attendanceStats.getStudent360(targetStudent._id);
    if (!result) {
      return sendError(res, { status: 404, error: 'Student not found' });
    }

    return sendSuccess(res, { data: result.data });
  } catch (error) {
    return sendError(res, { status: 500, error: error.message });
  }
};
router.get('/student-360', authenticateToken, student360Handler);
router.get('/student-360/:studentId', authenticateToken, student360Handler);

// Topic 2 & 10: GET /analytics/explain - explain("executionStats") with and without index hint
router.get('/explain', authenticateToken, async (req, res) => {
  try {
    const student = await resolveTargetStudent(req);
    if (!student) return sendError(res, { status: 404, error: 'Student not found' });

    tag(
      req,
      2,
      ['IXSCAN', 'idx_attendance_student_course'],
      'Demonstrates compound index selectivity versus full collection scan.'
    );
    tag(
      req,
      10,
      ['explain("executionStats")', 'hint()', '$natural: 1'],
      'Benchmarks totalDocsExamined and executionTimeMillis with and without index hint.'
    );

    const courseId = req.query.courseId ? String(req.query.courseId) : null;
    const { data } = await attendanceStats.explainAttendanceQuery(student._id, courseId);

    return sendSuccess(res, { data });
  } catch (error) {
    return sendError(res, { status: 500, error: error.message });
  }
});

module.exports = router;
