const mongoose = require('mongoose');

const timetableSchema = new mongoose.Schema(
  {
    day: {
      type: String,
      enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
      required: true,
    },
    time: {
      type: String,
      required: true,
    },
    subject: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Subject',
      required: true,
    },
    faculty: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    room: {
      type: String,
      trim: true,
    },
    type: {
      type: String,
      enum: ['theory', 'lab'],
      required: true,
    },
    semester: {
      type: Number,
      required: true,
      default: 5,
    },
  },
  {
    timestamps: true,
  }
);

timetableSchema.index({ day: 1, time: 1 });
timetableSchema.index({ semester: 1 });

module.exports = mongoose.model('Timetable', timetableSchema);
