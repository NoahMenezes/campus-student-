const mongoose = require('mongoose');

const timetableExceptionSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
    },
    exceptionDate: {
      type: Date,
      required: true,
    },
    exceptionType: {
      type: String,
      enum: ['holiday', 'cancelled', 'rescheduled'],
      required: true,
    },
    affectsAllBatches: {
      type: Boolean,
      default: true,
    },
    labBatch: {
      type: String,
      enum: ['C', 'D'],
    },
    description: {
      type: String,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
  }
);

timetableExceptionSchema.index({ exceptionDate: 1 });
timetableExceptionSchema.index({ exceptionType: 1 });

module.exports = mongoose.model('TimetableException', timetableExceptionSchema);
