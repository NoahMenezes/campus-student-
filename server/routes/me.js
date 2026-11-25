const express = require('express');
const router = express.Router();
const Student = require('../models/Student');
const { authenticateToken } = require('../middleware/auth');
const { sendSuccess, sendError } = require('../utils/response');
const { tag } = require('../utils/mongoTrace');

// Topic 3: GET /me - Current student profile with projection
router.get('/', authenticateToken, async (req, res) => {
  const student = req.student;
  if (!student) {
    return sendError(res, { status: 404, error: 'Student profile not found' });
  }
  tag(req, 3, ['findOne', 'projection'], 'Loads current student enrollment, section, and labBatch.');
  return sendSuccess(res, {
    data: { user: req.user, student },
  });
});

// Topic 4: PATCH /me/batch - updateOne $set labBatch
router.patch('/batch', authenticateToken, async (req, res) => {
  try {
    const nextBatch = req.body.labBatch || req.body.batch;
    if (!['C', 'D'].includes(nextBatch)) {
      tag(req, 4, ['updateOne', '$set'], 'Validates labBatch before updating student document.');
      return sendError(res, {
        status: 400,
        error: 'labBatch must be "C" or "D"',
      });
    }

    const student = req.student;
    if (!student) {
      return sendError(res, { status: 404, error: 'Student profile not found' });
    }

    const filter = { _id: student._id };
    const update = { $set: { labBatch: nextBatch, batch: nextBatch } };

    // Topic 4: Update student lab batch atomically with $set
    const result = await Student.updateOne(filter, update, { runValidators: true });
    tag(
      req,
      4,
      ['updateOne', '$set'],
      'Updates only the student labBatch field in place without rewriting the document.'
    );

    return sendSuccess(res, {
      data: {
        studentId: student._id,
        labBatch: nextBatch,
        matchedCount: result.matchedCount,
        modifiedCount: result.modifiedCount,
      },
    });
  } catch (error) {
    return sendError(res, { status: 500, error: error.message });
  }
});

module.exports = router;
