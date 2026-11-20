const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    subject: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Subject',
      required: true,
    },
    date: {
      type: Date,
      required: true,
    },
    status: {
      type: String,
      enum: ['present', 'absent', 'late'],
      required: true,
    },
    markedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    sessionCode: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

attendanceSchema.index({ student: 1, subject: 1, date: 1 });
attendanceSchema.index({ student: 1, date: -1 });
attendanceSchema.index({ subject: 1, date: -1 });

module.exports = mongoose.model('Attendance', attendanceSchema);
