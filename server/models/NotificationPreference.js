const mongoose = require('mongoose');

const notificationPreferenceSchema = new mongoose.Schema(
  {
    studentEnrollment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'StudentEnrollment',
      required: true,
      unique: true,
    },
    lectureStartNotifications: {
      type: Boolean,
      default: true,
    },
    attendancePendingReminder: {
      type: Boolean,
      default: true,
    },
    reminderIntervalMinutes: {
      type: Number,
      default: 15,
    },
    lowAttendanceWarning: {
      type: Boolean,
      default: true,
    },
    monthlySummary: {
      type: Boolean,
      default: true,
    },
    quietHoursStart: {
      type: String,
      default: '22:00',
    },
    quietHoursEnd: {
      type: String,
      default: '07:00',
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('NotificationPreference', notificationPreferenceSchema);
