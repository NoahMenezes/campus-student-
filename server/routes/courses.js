const express = require('express');
const router = express.Router();
const Course = require('../models/Course');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');
const { sendSuccess, sendError } = require('../utils/response');
const { tag } = require('../utils/mongoTrace');

// Topic 3 & 5: GET /courses?type= - find plus countDocuments for Theory(5)/Laboratories(5) counts
router.get('/', authenticateToken, async (req, res) => {
  try {
    const semester = req.query.semester
      ? parseInt(req.query.semester, 10)
      : req.student?.semester || 5;
    const { type, category } = req.query;

    const filter = { semester };
    if (type && type !== 'all') filter.type = String(type);
    if (category) filter.category = String(category);

    const projection = {
      code: 1,
      name: 1,
      shortName: 1,
      type: 1,
      category: 1,
      credits: 1,
      semester: 1,
      minAttendance: 1,
      department: 1,
      academicLevel: 1,
    };

    tag(
      req,
      3,
      ['find', 'projection', 'sort', 'countDocuments'],
      'Fetches filtered courses while computing Theory (5) and Laboratory (5) badge counts via countDocuments.'
    );

    // Topic 3: Find filtered courses with projection + countDocuments by type
    const [courses, totalCount, theoryCount, labCount, otherCount] = await Promise.all([
      Course.find(filter, projection).sort({ code: 1 }).lean(),
      Course.countDocuments({ semester }),
      Course.countDocuments({ semester, type: 'theory' }),
      Course.countDocuments({ semester, type: 'lab' }),
      Course.countDocuments({ semester, type: 'other' }),
    ]);

    return sendSuccess(res, {
      data: {
        semester,
        courses,
        counts: {
          total: totalCount,
          theory: theoryCount,
          lab: labCount,
          other: otherCount,
        },
      },
    });
  } catch (error) {
    return sendError(res, { status: 500, error: error.message });
  }
});

// Topic 3: GET /courses/:id
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    tag(req, 3, ['findById'], 'Looks up single course document by ObjectId.');
    const course = await Course.findById(req.params.id).lean();
    if (!course) {
      return sendError(res, { status: 404, error: 'Course not found' });
    }
    return sendSuccess(res, {
      data: { course },
    });
  } catch (error) {
    return sendError(res, { status: 500, error: error.message });
  }
});

// Topic 3: POST /courses
router.post('/', authenticateToken, authorizeRoles('faculty', 'admin'), async (req, res) => {
  try {
    const {
      name,
      shortName,
      code,
      type,
      category,
      credits,
      semester,
      minAttendance,
      department,
      academicLevel,
    } = req.body;

    if (!name || !code || !type || !category) {
      return sendError(res, {
        status: 400,
        error: 'name, code, type, and category are required',
      });
    }

    tag(
      req,
      3,
      ['findOne', 'save'],
      'Validates unique course code and inserts a new course document.'
    );

    const existing = await Course.findOne({ code: code.toUpperCase() }, { _id: 1 }).lean();
    if (existing) {
      return sendError(res, { status: 409, error: 'Course code already exists' });
    }

    const course = new Course({
      name,
      shortName: shortName || name,
      code: code.toUpperCase(),
      type,
      category,
      credits: credits ?? 3,
      semester: semester || 5,
      minAttendance: minAttendance ?? 75,
      department: department || 'Computer Engineering',
      academicLevel: academicLevel || 'SE',
    });

    await course.save();

    return sendSuccess(res, {
      status: 201,
      data: { course },
    });
  } catch (error) {
    return sendError(res, { status: 500, error: error.message });
  }
});

// Topic 4: PUT /courses/:id
router.put('/:id', authenticateToken, authorizeRoles('faculty', 'admin'), async (req, res) => {
  const allowedFields = ['name', 'shortName', 'type', 'category', 'credits', 'semester', 'minAttendance'];
  const updates = {};
  for (const k of allowedFields) {
    if (req.body[k] !== undefined) updates[k] = req.body[k];
  }

  try {
    tag(req, 4, ['findByIdAndUpdate', '$set'], 'Updates whitelisted course attributes atomically.');
    const course = await Course.findByIdAndUpdate(
      req.params.id,
      { $set: updates },
      { new: true, runValidators: true }
    ).lean();
    if (!course) {
      return sendError(res, { status: 404, error: 'Course not found' });
    }
    return sendSuccess(res, {
      data: { course },
    });
  } catch (error) {
    return sendError(res, { status: 500, error: error.message });
  }
});

// Topic 4: DELETE /courses/:id
router.delete('/:id', authenticateToken, authorizeRoles('admin'), async (req, res) => {
  try {
    tag(req, 4, ['findByIdAndDelete'], 'Deletes a course by ObjectId.');
    const course = await Course.findByIdAndDelete(req.params.id).lean();
    if (!course) {
      return sendError(res, { status: 404, error: 'Course not found' });
    }
    return sendSuccess(res, {
      data: { deleted: true, id: req.params.id },
    });
  } catch (error) {
    return sendError(res, { status: 500, error: error.message });
  }
});

module.exports = router;
