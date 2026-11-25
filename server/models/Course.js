const mongoose = require('mongoose');

// Topic 2: BSON Schema for `courses` collection (includes minAttendance policy threshold)
const courseSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    shortName: {
      type: String,
      required: true,
      trim: true,
    },
    type: {
      type: String,
      enum: ['theory', 'lab', 'other'],
      required: true,
    },
    category: {
      type: String,
      enum: ['mandatory', 'elective', 'activity'],
      required: true,
    },
    credits: {
      type: Number,
      required: true,
      default: 3,
      min: 0,
    },
    semester: {
      type: Number,
      required: true,
      default: 5,
      min: 1,
      max: 8,
    },
    minAttendance: {
      type: Number,
      required: true,
      default: 75,
      min: 0,
      max: 100,
    },
    facultyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    department: {
      type: String,
      required: true,
      default: 'Computer Engineering',
      trim: true,
    },
    academicLevel: {
      type: String,
      required: true,
      default: 'SE',
      trim: true,
    },
  },
  {
    collection: 'courses',
    timestamps: true,
  }
);

// Topic 2: Unique course code index + semester/category compound index
courseSchema.index({ code: 1 }, { unique: true });
courseSchema.index({ semester: 1, category: 1 });

module.exports = mongoose.model('Course', courseSchema);
