const express = require('express');
const router = express.Router();
const Timetable = require('../models/Timetable');
const Subject = require('../models/Subject');
const User = require('../models/User');
const { authenticateToken } = require('../middleware/auth');

// GET /timetable - Get weekly timetable
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { semester } = req.query;
    const filter = {};
    if (semester) filter.semester = parseInt(semester);
    else filter.semester = req.user.semester || 5;

    const timetable = await Timetable.find(filter)
      .populate('subject', 'name code type')
      .populate('faculty', 'name email')
      .sort({ day: 1, time: 1 });

    const daysOrder = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
    const daysMap = {};
    daysOrder.forEach((day) => {
      daysMap[day] = timetable.filter((entry) => entry.day === day);
    });

    res.json({ timetable: daysMap, entries: timetable });
  } catch (error) {
    console.error('Get timetable error:', error);
    res.status(500).json({ error: 'Failed to fetch timetable' });
  }
});

// POST /timetable - Create timetable entry (faculty/admin)
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { day, time, subjectId, facultyId, room, type, semester } = req.body;

    if (!day || !time || !subjectId || !type || !semester) {
      return res.status(400).json({ error: 'day, time, subjectId, type, and semester are required' });
    }

    const entry = new Timetable({
      day,
      time,
      subject: subjectId,
      faculty: facultyId,
      room,
      type,
      semester: parseInt(semester),
    });

    await entry.save();
    await entry.populate('subject', 'name code type');
    await entry.populate('faculty', 'name email');

    res.status(201).json({ entry });
  } catch (error) {
    console.error('Create timetable error:', error);
    res.status(500).json({ error: 'Failed to create timetable entry' });
  }
});

module.exports = router;
