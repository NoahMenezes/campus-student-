const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Student = require('../models/Student');
const { authenticateToken, JWT_SECRET } = require('../middleware/auth');
const { sendSuccess, sendError } = require('../utils/response');
const { tag } = require('../utils/mongoTrace');

// Topic 3: POST /auth/register - Create user (and linked student profile if role=student)
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, role, rollNo, department, semester, section, batch, guardian } =
      req.body;

    if (!name || !email || !password) {
      tag(req, 3, ['findOne', 'save'], 'Validates registration input fields before inserting user.');
      return sendError(res, {
        status: 400,
        error: 'Name, email, and password are required',
      });
    }
    if (password.length < 6) {
      return sendError(res, {
        status: 400,
        error: 'Password must be at least 6 characters',
      });
    }

    const normalizedEmail = email.toLowerCase().trim();
    tag(
      req,
      3,
      ['findOne', 'projection', 'save'],
      'Verifies unique email with minimal projection before inserting user and student.'
    );

    // Topic 3: Check existing email with projection
    const existingUser = await User.findOne({ email: normalizedEmail }, { _id: 1 }).lean();

    if (existingUser) {
      return sendError(res, {
        status: 409,
        error: 'Email already registered',
      });
    }

    // Topic 3: Insert new user
    const user = new User({
      name: name.trim(),
      email: normalizedEmail,
      password,
      role: role || 'student',
    });
    await user.save();

    let studentProfile = null;
    if (user.role === 'student') {
      const assignedBatch = batch === 'D' ? 'D' : 'C';
      const student = new Student({
        userId: user._id,
        name: user.name,
        rollNo: (rollNo || `24CE${Date.now().toString().slice(-4)}`).toUpperCase(),
        email: normalizedEmail,
        department: department || 'Computer Engineering',
        semester: semester || 5,
        section: section || 'B',
        batch: assignedBatch,
        labBatch: assignedBatch,
        status: 'active',
        guardian: guardian || { name: 'Parent/Guardian', phone: '+91-9823000000', relation: 'Parent' },
      });
      await student.save();
      studentProfile = student.toObject();
    }

    const token = jwt.sign({ userId: user._id }, JWT_SECRET, { expiresIn: '7d' });

    return sendSuccess(res, {
      status: 201,
      data: {
        token,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          studentId: studentProfile?._id || null,
          rollNo: studentProfile?.rollNo || null,
          semester: studentProfile?.semester || null,
          section: studentProfile?.section || null,
          labBatch: studentProfile?.labBatch || null,
        },
      },
    });
  } catch (error) {
    return sendError(res, { status: 500, error: error.message });
  }
});

// Topic 3: POST /auth/login - findOne with projection
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      tag(req, 3, ['findOne', 'projection'], 'Requires email and password for user lookup.');
      return sendError(res, {
        status: 400,
        error: 'Email and password are required',
      });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const userProjection = { _id: 1, name: 1, email: 1, password: 1, role: 1, isActive: 1 };

    tag(
      req,
      3,
      ['findOne', 'projection'],
      'Fetches only projected credential and identity fields from users and students collections.'
    );

    // Topic 3: findOne with explicit field projection
    const user = await User.findOne({ email: normalizedEmail }, userProjection);

    if (!user) {
      return sendError(res, {
        status: 401,
        error: 'Invalid credentials',
      });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return sendError(res, {
        status: 401,
        error: 'Invalid credentials',
      });
    }

    const studentProjection = {
      _id: 1,
      rollNo: 1,
      department: 1,
      semester: 1,
      section: 1,
      batch: 1,
      labBatch: 1,
      status: 1,
    };
    // Topic 3: Lookup linked student profile with projection
    const student = await Student.findOne({ userId: user._id }, studentProjection).lean();

    const token = jwt.sign({ userId: user._id }, JWT_SECRET, { expiresIn: '7d' });

    return sendSuccess(res, {
      data: {
        token,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          studentId: student?._id || null,
          rollNo: student?.rollNo || null,
          department: student?.department || null,
          semester: student?.semester || null,
          section: student?.section || null,
          labBatch: student?.labBatch || student?.batch || null,
          status: student?.status || null,
        },
      },
    });
  } catch (error) {
    return sendError(res, { status: 500, error: error.message });
  }
});

// Topic 3: GET /auth/me - Return active user & student profile
router.get('/me', authenticateToken, async (req, res) => {
  tag(
    req,
    3,
    ['findOne', 'projection (-password)'],
    'Returns authenticated or default demo student profile without exposing password hash.'
  );
  return sendSuccess(res, {
    data: {
      user: {
        id: req.user._id,
        name: req.user.name,
        email: req.user.email,
        role: req.user.role,
        studentId: req.student?._id || null,
        rollNo: req.student?.rollNo || null,
        department: req.student?.department || 'Computer Engineering',
        semester: req.student?.semester || 5,
        section: req.student?.section || 'B',
        labBatch: req.student?.labBatch || req.student?.batch || 'C',
        status: req.student?.status || 'active',
      },
    },
  });
});

module.exports = router;
