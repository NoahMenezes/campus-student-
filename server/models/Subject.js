const mongoose = require('mongoose');

const subjectSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    code: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
    },
    type: {
      type: String,
      enum: ['theory', 'lab'],
      required: true,
    },
    category: {
      type: String,
      enum: ['mandatory', 'elective'],
      required: true,
    },
    semester: {
      type: Number,
      required: true,
      default: 5,
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
  },
  {
    timestamps: true,
  }
);

subjectSchema.index({ code: 1 }, { unique: true });
subjectSchema.index({ semester: 1, category: 1 });

module.exports = mongoose.model('Subject', subjectSchema);
