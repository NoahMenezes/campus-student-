const mongoose = require('mongoose');

// Topic 2: BSON Schema for `students` collection with embedded guardian subdocument
const studentSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
    },
    rollNo: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
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
    batch: {
      type: String,
      enum: ['C', 'D'],
      required: true,
      default: 'C',
    },
    labBatch: {
      type: String,
      enum: ['C', 'D'],
      required: true,
      default: 'C',
    },
    status: {
      type: String,
      enum: ['active', 'dropped'],
      required: true,
      default: 'active',
    },
    guardian: {
      name: {
        type: String,
        trim: true,
        default: 'Parent/Guardian',
      },
      phone: {
        type: String,
        required: true,
        trim: true,
      },
      relation: {
        type: String,
        trim: true,
        default: 'Parent',
      },
    },
  },
  {
    collection: 'students',
    timestamps: true,
  }
);

// Topic 2: Unique rollNo index + text search index on { name, rollNo }
studentSchema.index({ rollNo: 1 }, { unique: true });
studentSchema.index({ name: 'text', rollNo: 'text' });
studentSchema.index({ userId: 1 });
studentSchema.index({ semester: 1, section: 1, batch: 1 });

module.exports = mongoose.model('Student', studentSchema);
