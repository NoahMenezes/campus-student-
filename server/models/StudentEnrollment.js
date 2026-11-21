const mongoose = require('mongoose');

const enrollmentSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    semester: {
      type: Number,
      required: true,
      default: 5,
    },
    section: {
      type: String,
      required: true,
      default: 'B',
    },
    labBatch: {
      type: String,
      enum: ['C', 'D'],
      required: true,
      default: 'C',
    },
    department: {
      type: String,
      required: true,
      default: 'Computer Engineering',
    },
    academicLevel: {
      type: String,
      required: true,
      default: 'SE',
    },
    institution: {
      type: String,
      required: true,
      default: 'Goa College of Engineering',
    },
    timezone: {
      type: String,
      required: true,
      default: 'Asia/Kolkata',
    },
    isConfigured: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

enrollmentSchema.index({ student: 1 }, { unique: true });

module.exports = mongoose.model('StudentEnrollment', enrollmentSchema);
