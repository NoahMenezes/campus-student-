const mongoose = require('mongoose');

// Topic 2 & 9: BSON Schema for `attendance` collection with shard-key-prefixed unique index
const attendanceSchema = new mongoose.Schema(
  {
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Student',
      required: true,
    },
    courseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course',
      required: true,
    },
    slotId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'TimetableSlot',
      required: true,
    },
    dateKey: {
      type: String,
      required: true,
      trim: true,
      match: /^\d{4}-\d{2}-\d{2}$/, // IST day YYYY-MM-DD
    },
    status: {
      type: String,
      enum: ['P', 'A'],
      required: true,
    },
    markedAt: {
      type: Date,
      required: true,
      default: Date.now, // UTC Date
    },
    source: {
      type: String,
      enum: ['seed', 'manual', 'qr', 'sync', 'api'],
      required: true,
      default: 'manual',
    },
  },
  {
    collection: 'attendance',
    timestamps: false,
  }
);

// Topic 2 & 9: Shard-key-prefixed unique compound index ({ studentId, dateKey } shard key prefix + slotId)
attendanceSchema.index({ studentId: 1, dateKey: 1, slotId: 1 }, { unique: true });
attendanceSchema.index({ studentId: 1, courseId: 1 });
attendanceSchema.index({ studentId: 1, markedAt: -1 });

module.exports = mongoose.model('Attendance', attendanceSchema);
