const mongoose = require('mongoose');

const NINETY_DAYS_SECONDS = 90 * 24 * 60 * 60;

// Topic 2: BSON Schema for `notifications` collection with 90-day TTL index on createdAt
const notificationSchema = new mongoose.Schema(
  {
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Student',
      required: true,
    },
    courseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course',
      default: null,
    },
    slotId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'TimetableSlot',
      default: null,
    },
    type: {
      type: String,
      enum: ['lecture_started', 'low_attendance_warning', 'attendance_marked', 'system'],
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    body: {
      type: String,
      required: true,
      trim: true,
    },
    read: {
      type: Boolean,
      required: true,
      default: false,
    },
    createdAt: {
      type: Date,
      required: true,
      default: Date.now,
    },
  },
  {
    collection: 'notifications',
    timestamps: { createdAt: false, updatedAt: true },
  }
);

// Topic 2 & 9: Inbox query index + 90-day TTL index + hashed shard key index
notificationSchema.index({ studentId: 1, read: 1, createdAt: -1 });
notificationSchema.index({ studentId: 'hashed' });
notificationSchema.index({ createdAt: 1 }, { expireAfterSeconds: NINETY_DAYS_SECONDS });

module.exports = mongoose.model('Notification', notificationSchema);
