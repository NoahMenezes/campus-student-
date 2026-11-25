const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const User = require('../models/User');
const Student = require('../models/Student');

const JWT_SECRET = process.env.JWT_SECRET || 'campus_student_secret_change_in_production';

const FALLBACK_USER = {
  _id: '674488888888888888888888',
  name: 'Noah Menezes',
  email: 'nnm1.s24@gec.ac.in',
  role: 'student',
};

const FALLBACK_STUDENT = {
  _id: '674488888888888888888889',
  userId: '674488888888888888888888',
  name: 'Noah Menezes',
  rollNo: '24CE001',
  email: 'nnm1.s24@gec.ac.in',
  department: 'Computer Engineering',
  academicLevel: 'SE',
  semester: 5,
  section: 'B',
  batch: 'C',
  labBatch: 'C',
  status: 'active',
};

// Permissive auth middleware: resolves bearer user or demo student onto req.user & req.student
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (token && mongoose.connection.readyState === 1) {
      try {
        const decoded = jwt.verify(token, JWT_SECRET);
        // Topic 3: Find user by ID with password excluded via projection
        const user = await User.findById(decoded.userId, { password: 0 }).lean();
        if (user) {
          req.user = user;
          // Topic 3: Attach linked student profile if user is a student
          req.student = await Student.findOne({ userId: user._id }).lean();
          return next();
        }
      } catch {
        // Invalid/expired token falls back to demo student since app auth barrier is disabled
      }
    }

    if (mongoose.connection.readyState === 1) {
      // Optional x-student-id header for multi-student API testing without token
      const headerStudentId = req.headers['x-student-id'];
      if (headerStudentId && mongoose.Types.ObjectId.isValid(String(headerStudentId))) {
        const explicitStudent = await Student.findById(headerStudentId).lean();
        if (explicitStudent) {
          req.student = explicitStudent;
          req.user =
            (await User.findById(explicitStudent.userId, { password: 0 }).lean()) ||
            FALLBACK_USER;
          return next();
        }
      }

      // Topic 3: Default demo student lookup (Noah Menezes)
      let user = await User.findOne({ email: 'nnm1.s24@gec.ac.in' }, { password: 0 }).lean();
      if (!user) {
        user = await User.findOne({ role: 'student' }, { password: 0 }).lean();
      }
      if (user) {
        req.user = user;
        req.student = await Student.findOne({ userId: user._id }).lean();
        return next();
      }
    }

    req.user = FALLBACK_USER;
    req.student = FALLBACK_STUDENT;
    next();
  } catch {
    req.user = FALLBACK_USER;
    req.student = FALLBACK_STUDENT;
    next();
  }
};

// Permissive role middleware (auth barrier disabled per session setup)
const authorizeRoles = (..._roles) => {
  return (_req, _res, next) => {
    next();
  };
};

module.exports = { authenticateToken, authorizeRoles, JWT_SECRET, FALLBACK_USER, FALLBACK_STUDENT };
