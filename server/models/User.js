const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// Topic 2: BSON Schema for `users` collection (auth & role identity)
const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
      minlength: 6,
    },
    role: {
      type: String,
      enum: ['student', 'faculty', 'admin'],
      default: 'student',
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    collection: 'users',
    timestamps: true,
  }
);

// Hash password before saving via single Document save()
userSchema.pre('save', async function () {
  if (!this.isModified('password')) return;
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

userSchema.methods.toJSON = function () {
  const user = this.toObject();
  delete user.password;
  return user;
};

// Topic 2: Unique index on email (declared once to avoid Mongoose duplicate index warning)
userSchema.index({ email: 1 }, { unique: true });

module.exports = mongoose.model('User', userSchema);
