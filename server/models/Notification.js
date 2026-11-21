const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
  {
    studentEnrollment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'StudentEnrollment',
      required: true,
    },
    attendanceSession: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'AttendanceSession',
    },
    type: {
      type: String,
      enum: [
        'lecture_started',
        'attendance_pending',
        'attendance_marked',
        'timetable_changed',
        'low_attendance_warning',
        'monthly_summary',
      ],
      required: true,
    },
    title: {
      type: String,
      required: true,
    },
    body: {
      type: String,
      required: true,
    },
    scheduledFor: {
      type: Date,
    },
    sentAt: {
      type: Date,
    },
    isRead: {
      type: Boolean,
      default: false,
    },
    isSent: {
      type: Boolean,
      default: false,
    },
    deliveryChannel: {
      type: String,
      enum: ['push', 'in_app'],
      default: 'push',
    },
    notificationId: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

notificationSchema.index({ studentEnrollment: 1, isRead: 1 });
notificationSchema.index({ studentEnrollment: 1, createdAt: -1 });
notificationSchema.index({ type: 1, isSent: 1 });
notificationSchema.index({ notificationId: 1 }, { unique: true, sparse: true });

module.exports = mongoose.model('Notification', notificationSchema);
