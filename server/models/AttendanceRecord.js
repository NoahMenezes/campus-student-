const mongoose = require('mongoose');

const attendanceRecordSchema = new mongoose.Schema(
  {
    studentEnrollment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'StudentEnrollment',
      required: true,
    },
    attendanceSession: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'AttendanceSession',
      required: true,
    },
    subject: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Subject',
      required: true,
    },
    status: {
      type: String,
      enum: ['present', 'absent', 'pending'],
      default: 'pending',
    },
    markedAt: {
      type: Date,
    },
    source: {
      type: String,
      enum: ['student_app', 'faculty_app', 'admin_import', 'system_correction'],
      default: 'student_app',
    },
    correctionHistory: [
      {
        previousStatus: String,
        newStatus: String,
        changedAt: { type: Date, default: Date.now },
        changedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
        reason: String,
      },
    ],
    auditMetadata: {
      ipAddress: String,
      deviceInfo: String,
      markedVia: String,
    },
  },
  {
    timestamps: true,
  }
);

attendanceRecordSchema.index(
  { studentEnrollment: 1, attendanceSession: 1 },
  { unique: true }
);
attendanceRecordSchema.index({ studentEnrollment: 1, status: 1 });
attendanceRecordSchema.index({ subject: 1, status: 1 });
attendanceRecordSchema.index({ markedAt: -1 });

module.exports = mongoose.model('AttendanceRecord', attendanceRecordSchema);
