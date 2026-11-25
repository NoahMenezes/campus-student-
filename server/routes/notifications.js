const express = require('express');
const router = express.Router();
const Notification = require('../models/Notification');
const { authenticateToken } = require('../middleware/auth');
const { sendSuccess, sendError } = require('../utils/response');
const { tag } = require('../utils/mongoTrace');

// Topic 3: GET /notifications - List student notifications + countDocuments for unread badge
router.get('/', authenticateToken, async (req, res) => {
  try {
    const studentId = req.student?._id;
    if (!studentId) {
      return sendError(res, { status: 404, error: 'Student profile not found' });
    }

    const filter = { studentId };
    const unreadFilter = { studentId, read: false };
    const projection = {
      studentId: 1,
      courseId: 1,
      slotId: 1,
      type: 1,
      title: 1,
      body: 1,
      read: 1,
      createdAt: 1,
    };

    tag(
      req,
      3,
      ['find', 'sort', 'limit', 'countDocuments'],
      'Uses compound index {studentId, read, createdAt:-1} to render inbox and unread badge count.'
    );

    // Topic 3: Fetch notifications sorted newest-first + count unread badge via countDocuments
    const [notifications, unreadCount] = await Promise.all([
      Notification.find(filter, projection).sort({ createdAt: -1 }).limit(50).lean(),
      Notification.countDocuments(unreadFilter),
    ]);

    return sendSuccess(res, {
      data: {
        unreadCount,
        notifications,
      },
    });
  } catch (error) {
    return sendError(res, { status: 500, error: error.message });
  }
});

// Topic 3: GET /notifications/unread-count - Lightweight badge query
router.get('/unread-count', authenticateToken, async (req, res) => {
  const studentId = req.student?._id;
  if (!studentId) {
    return sendError(res, { status: 404, error: 'Student profile not found' });
  }
  const filter = { studentId, read: false };
  try {
    tag(req, 3, ['countDocuments'], 'Counts unread notifications for the header bell badge.');
    // Topic 3: Index-covered unread badge count
    const unreadCount = await Notification.countDocuments(filter);
    return sendSuccess(res, {
      data: { unreadCount },
    });
  } catch (error) {
    return sendError(res, { status: 500, error: error.message });
  }
});

// Topic 4: PATCH /notifications/read-all - updateMany to mark all read
const markAllReadHandler = async (req, res) => {
  const studentId = req.student?._id;
  if (!studentId) {
    return sendError(res, { status: 404, error: 'Student profile not found' });
  }

  const filter = { studentId, read: false };
  const update = { $set: { read: true, updatedAt: new Date() } };

  try {
    tag(
      req,
      4,
      ['updateMany', '$set'],
      'Marks every unread notification read in a single multi-document write.'
    );
    // Topic 4: Bulk mark all unread notifications for this student as read
    const result = await Notification.updateMany(filter, update);
    return sendSuccess(res, {
      data: {
        matchedCount: result.matchedCount,
        modifiedCount: result.modifiedCount,
        unreadCount: 0,
      },
    });
  } catch (error) {
    return sendError(res, { status: 500, error: error.message });
  }
};

router.patch('/read-all', authenticateToken, markAllReadHandler);
router.post('/read-all', authenticateToken, markAllReadHandler);

// Topic 4: PATCH /notifications/:id/read - Mark single notification read
router.patch('/:id/read', authenticateToken, async (req, res) => {
  const studentId = req.student?._id;
  const filter = { _id: req.params.id, studentId };
  const update = { $set: { read: true, updatedAt: new Date() } };

  try {
    tag(req, 4, ['updateOne', '$set'], 'Marks a single notification as read.');
    const result = await Notification.updateOne(filter, update);
    return sendSuccess(res, {
      data: { matchedCount: result.matchedCount, modifiedCount: result.modifiedCount },
    });
  } catch (error) {
    return sendError(res, { status: 500, error: error.message });
  }
});

// Topic 4: DELETE /notifications - Clear student notifications
router.delete('/', authenticateToken, async (req, res) => {
  const studentId = req.student?._id;
  const filter = { studentId };
  try {
    tag(req, 4, ['deleteMany'], 'Clears all notifications belonging to the student.');
    const result = await Notification.deleteMany(filter);
    return sendSuccess(res, {
      data: { deletedCount: result.deletedCount },
    });
  } catch (error) {
    return sendError(res, { status: 500, error: error.message });
  }
});

module.exports = router;
