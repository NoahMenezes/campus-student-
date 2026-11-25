const mongoose = require('mongoose');

// Topic 2: BSON Schema for `timetable_slots` collection (`batch` is null for theory/other slots)
const timetableSlotSchema = new mongoose.Schema(
  {
    slotKey: {
      type: String,
      required: true,
      trim: true,
    },
    semester: {
      type: Number,
      required: true,
      default: 5,
      min: 1,
      max: 8,
    },
    section: {
      type: String,
      enum: ['A', 'B', 'C'],
      required: true,
      default: 'B',
    },
    day: {
      type: String,
      enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
      required: true,
    },
    start: {
      type: String,
      required: true,
      trim: true,
      match: /^\d{2}:\d{2}$/,
    },
    end: {
      type: String,
      required: true,
      trim: true,
      match: /^\d{2}:\d{2}$/,
    },
    courseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course',
      required: true,
    },
    courseCode: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
    },
    courseName: {
      type: String,
      required: true,
      trim: true,
    },
    type: {
      type: String,
      enum: ['theory', 'lab', 'other'],
      required: true,
    },
    batch: {
      type: String,
      enum: ['C', 'D', null],
      default: null,
    },
    room: {
      type: String,
      required: true,
      trim: true,
    },
    facultyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  {
    collection: 'timetable_slots',
    timestamps: true,
  }
);

// Topic 2: Compound schedule lookup index + unique slotKey per semester/section
timetableSlotSchema.index({ semester: 1, section: 1, day: 1, start: 1 });
timetableSlotSchema.index({ semester: 1, section: 1, slotKey: 1 }, { unique: true });

module.exports = mongoose.model('TimetableSlot', timetableSlotSchema);
