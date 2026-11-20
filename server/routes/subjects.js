const express = require('express');
const router = express.Router();
const Subject = require('../models/Subject');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

// GET /subjects - List all subjects
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { semester, category } = req.query;
    const filter = {};
    if (semester) filter.semester = parseInt(semester);
    if (category) filter.category = category;

    const subjects = await Subject.find(filter).sort({ code: 1 });
    res.json({ subjects });
  } catch (error) {
    console.error('Get subjects error:', error);
    res.status(500).json({ error: 'Failed to fetch subjects' });
  }
});

// GET /subjects/:id - Get single subject
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const subject = await Subject.findById(req.params.id);
    if (!subject) {
      return res.status(404).json({ error: 'Subject not found' });
    }
    res.json({ subject });
  } catch (error) {
    console.error('Get subject error:', error);
    res.status(500).json({ error: 'Failed to fetch subject' });
  }
});

// POST /subjects - Create subject (faculty/admin only)
router.post('/', authenticateToken, authorizeRoles('faculty', 'admin'), async (req, res) => {
  try {
    const { name, code, type, category, semester, department, academicLevel } = req.body;

    if (!name || !code || !type || !category) {
      return res.status(400).json({ error: 'Name, code, type, and category are required' });
    }

    const existing = await Subject.findOne({ code: code.toUpperCase() });
    if (existing) {
      return res.status(409).json({ error: 'Subject code already exists' });
    }

    const subject = new Subject({
      name,
      code: code.toUpperCase(),
      type,
      category,
      semester: semester || 5,
      department: department || 'Computer Engineering',
      academicLevel: academicLevel || 'SE',
    });

    await subject.save();
    res.status(201).json({ subject });
  } catch (error) {
    console.error('Create subject error:', error);
    res.status(500).json({ error: 'Failed to create subject' });
  }
});

// PUT /subjects/:id - Update subject (faculty/admin only)
router.put('/:id', authenticateToken, authorizeRoles('faculty', 'admin'), async (req, res) => {
  try {
    const subject = await Subject.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!subject) {
      return res.status(404).json({ error: 'Subject not found' });
    }
    res.json({ subject });
  } catch (error) {
    console.error('Update subject error:', error);
    res.status(500).json({ error: 'Failed to update subject' });
  }
});

// DELETE /subjects/:id - Delete subject (admin only)
router.delete('/:id', authenticateToken, authorizeRoles('admin'), async (req, res) => {
  try {
    const subject = await Subject.findByIdAndDelete(req.params.id);
    if (!subject) {
      return res.status(404).json({ error: 'Subject not found' });
    }
    res.json({ message: 'Subject deleted' });
  } catch (error) {
    console.error('Delete subject error:', error);
    res.status(500).json({ error: 'Failed to delete subject' });
  }
});

module.exports = router;
