const express = require('express');
const router = express.Router();
const Attendance = require('../models/Attendance');
const Subject = require('../models/Subject');
const User = require('../models/User');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

// Helper: calculate attendance percentage
const calculatePercentage = (attended, total) => {
  if (total === 0) return 0;
  return Math.round((attended / total) * 100);
};

// GET /attendance - Get student's attendance data
router.get('/', authenticateToken, async (req, res) => {
  try {
    const studentId = req.user._id;
    const { semester } = req.query;

    // Get subjects for the student's semester
    const subjectFilter = {};
    if (semester) subjectFilter.semester = parseInt(semester);
    else subjectFilter.semester = req.user.semester || 5;

    const subjects = await Subject.find(subjectFilter).sort({ code: 1 });

    // Get attendance records for this student
    const attendanceRecords = await Attendance.find({ student: studentId })
      .populate('subject', 'name code type category')
      .sort({ date: -1 });

    // Build subject attendance data
    const subjectAttendance = [];
    let totalAttended = 0;
    let totalClasses = 0;

    for (const subject of subjects) {
      const subjectRecords = attendanceRecords.filter(
        (r) => r.subject && r.subject._id.toString() === subject._id.toString()
      );

      const attended = subjectRecords.filter((r) => r.status === 'present').length;
      const total = subjectRecords.length;
      const pct = calculatePercentage(attended, total);

      totalAttended += attended;
      totalClasses += total;

      subjectAttendance.push({
        id: subject._id,
        code: subject.code,
        name: subject.name,
        type: subject.type,
        category: subject.category,
        attended,
        total,
        percentage: pct,
        progressColor:
          pct >= 80 ? '#10B981' : pct >= 75 ? '#F59E0B' : '#EF4444',
      });
    }

    const overallPercentage = calculatePercentage(totalAttended, totalClasses);

    // Calculate warning
    let warning = null;
    const atRisk = subjectAttendance.find(
      (s) => s.percentage >= 75 && s.percentage < 80
    );
    if (atRisk) {
      warning = {
        subjectName: atRisk.name,
        percentage: atRisk.percentage,
        message: `${atRisk.name} is at ${atRisk.percentage}%. Attend more classes to stay above 75%.`,
      };
    } else {
      const critical = subjectAttendance.find((s) => s.percentage < 75);
      if (critical) {
        warning = {
          subjectName: critical.name,
          percentage: critical.percentage,
          message: `${critical.name} is below 75% (${critical.percentage}%). Attend more classes to avoid detention.`,
        };
      }
    }

    res.json({
      semester: req.user.semester || 5,
      overallPercentage,
      attendedClasses: totalAttended,
      totalClasses: totalClasses,
      subjects: subjectAttendance,
      warning,
    });
  } catch (error) {
    console.error('Get attendance error:', error);
    res.status(500).json({ error: 'Failed to fetch attendance' });
  }
});

// GET /attendance/history - Get attendance history records
router.get('/history', authenticateToken, async (req, res) => {
  try {
    const studentId = req.user._id;
    const { filter } = req.query;

    const query = { student: studentId };
    if (filter && filter !== 'all') {
      query.status = filter;
    }

    const records = await Attendance.find(query)
      .populate('subject', 'name code')
      .sort({ date: -1 })
      .limit(100);

    res.json({
      records: records.map((r) => ({
        id: r._id,
        subject: r.subject ? r.subject.name : 'Unknown',
        code: r.subject ? r.subject.code : '—',
        date: r.date,
        status: r.status,
        time: r.date ? new Date(r.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '',
      })),
    });
  } catch (error) {
    console.error('Get attendance history error:', error);
    res.status(500).json({ error: 'Failed to fetch attendance history' });
  }
});

// POST /attendance - Mark attendance (faculty only)
router.post('/', authenticateToken, authorizeRoles('faculty', 'admin'), async (req, res) => {
  try {
    const { studentId, subjectId, date, status, sessionCode } = req.body;

    if (!studentId || !subjectId || !date || !status) {
      return res.status(400).json({ error: 'studentId, subjectId, date, and status are required' });
    }

    if (!['present', 'absent', 'late'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    // Check if attendance already marked for this student/subject/date
    const existing = await Attendance.findOne({
      student: studentId,
      subject: subjectId,
      date: new Date(date),
    });

    if (existing) {
      return res.status(409).json({ error: 'Attendance already marked for this date' });
    }

    const attendance = new Attendance({
      student: studentId,
      subject: subjectId,
      date: new Date(date),
      status,
      markedBy: req.user._id,
      sessionCode,
    });

    await attendance.save();
    await attendance.populate('subject', 'name code');

    res.status(201).json({ attendance });
  } catch (error) {
    console.error('Mark attendance error:', error);
    res.status(500).json({ error: 'Failed to mark attendance' });
  }
});

// GET /attendance/stats - Get attendance statistics (faculty/admin)
router.get('/stats', authenticateToken, authorizeRoles('faculty', 'admin'), async (req, res) => {
  try {
    const totalStudents = await User.countDocuments({ role: 'student' });
    const totalRecords = await Attendance.countDocuments();
    const presentRecords = await Attendance.countDocuments({ status: 'present' });
    const absentRecords = await Attendance.countDocuments({ status: 'absent' });

    res.json({
      totalStudents,
      totalRecords,
      presentRecords,
      absentRecords,
      overallPercentage: calculatePercentage(presentRecords, totalRecords),
    });
  } catch (error) {
    console.error('Get attendance stats error:', error);
    res.status(500).json({ error: 'Failed to fetch attendance stats' });
  }
});

module.exports = router;
