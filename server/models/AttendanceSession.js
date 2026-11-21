const mongoose = require('mongoose');

const attendanceSessionSchema = new mongoose.Schema(
  {
    studentEnrollment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'StudentEnrollment',
      required: true,
    },
    subject: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Subject',
      required: true,
    },
    timetableEntry: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Timetable',
    },
    scheduledDate: {
      type: Date,
      required: true,
    },
    startTime: {
      type: String,
      required: true,
    },
    endTime: {
      type: String,
      required: true,
    },
    sessionType: {
      type: String,
      enum: ['theory', 'lab', 'other'],
      required: true,
    },
    labBatch: {
      type: String,
      enum: ['C', 'D'],
    },
    durationMinutes: {
      type: Number,
      required: true,
    },
    sessionStatus: {
      type: String,
      enum: ['scheduled', 'started', 'completed', 'cancelled', 'skipped'],
      default: 'scheduled',
    },
    isNotificationSent: {
      type: Boolean,
      default: false,
    },
    notificationSentAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

attendanceSessionSchema.index({ studentEnrollment: 1, scheduledDate: 1 });
attendanceSessionSchema.index({ scheduledDate: 1, sessionStatus: 1 });
attendanceSessionSchema.index({ subject: 1, scheduledDate: 1 });

module.exports = mongoose.model('AttendanceSession', attendanceSessionSchema);
