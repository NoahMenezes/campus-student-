const express = require('express');
const router = express.Router();
const Student = require('../models/Student');
const AuditLog = require('../models/AuditLog');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');
const { sendSuccess, sendError } = require('../utils/response');
const { tag } = require('../utils/mongoTrace');

function escapeRegex(str) {
  return String(str).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Topic 3 & 5: GET /students - skip/limit & range pagination (rollNo > lastSeen), $and/$in/$gte/$lte/$ne filters, $regex search
router.get('/', authenticateToken, async (req, res) => {
  try {
    const {
      section,
      batch,
      labBatch,
      semester,
      minSem,
      maxSem,
      status,
      includeDropped,
      q,
      search,
      lastSeen,
      page = '1',
      limit = '20',
    } = req.query;

    const parsedLimit = Math.min(Math.max(parseInt(String(limit), 10) || 20, 1), 100);
    const parsedPage = Math.max(parseInt(String(page), 10) || 1, 1);

    const andClauses = [];

    // $in filter for section(s)
    if (section) {
      const sections = String(section)
        .split(',')
        .map((s) => s.trim().toUpperCase())
        .filter(Boolean);
      if (sections.length > 0) {
        andClauses.push({ section: { $in: sections } });
      }
    }

    // $in filter for lab batch(es)
    const batchParam = labBatch || batch;
    if (batchParam) {
      const batches = String(batchParam)
        .split(',')
        .map((b) => b.trim().toUpperCase())
        .filter(Boolean);
      if (batches.length > 0) {
        andClauses.push({ labBatch: { $in: batches } });
      }
    }

    // $gte / $lte filter for semester range
    if (semester) {
      const semNum = parseInt(String(semester), 10);
      if (!Number.isNaN(semNum)) {
        andClauses.push({ semester: { $gte: semNum, $lte: semNum } });
      }
    } else if (minSem || maxSem) {
      const semRange = {};
      if (minSem) semRange.$gte = parseInt(String(minSem), 10);
      if (maxSem) semRange.$lte = parseInt(String(maxSem), 10);
      andClauses.push({ semester: semRange });
    }

    // $ne filter excluding soft-deleted students unless explicitly requested
    if (status) {
      andClauses.push({ status: String(status) });
    } else if (includeDropped !== 'true') {
      andClauses.push({ status: { $ne: 'dropped' } });
    }

    // $regex search on name or rollNo
    const searchTerm = q || search;
    if (searchTerm && String(searchTerm).trim()) {
      const rx = escapeRegex(String(searchTerm).trim());
      andClauses.push({
        $or: [
          { name: { $regex: rx, $options: 'i' } },
          { rollNo: { $regex: rx, $options: 'i' } },
        ],
      });
    }

    // Range pagination cursor: rollNo > lastSeen
    const isRangeMode = Boolean(lastSeen && String(lastSeen).trim());
    if (isRangeMode) {
      andClauses.push({ rollNo: { $gt: String(lastSeen).trim().toUpperCase() } });
    }

    const filter = andClauses.length > 0 ? { $and: andClauses } : {};
    const projection = {
      userId: 1,
      name: 1,
      rollNo: 1,
      email: 1,
      department: 1,
      semester: 1,
      section: 1,
      batch: 1,
      labBatch: 1,
      status: 1,
      'guardian.phone': 1,
    };

    if (isRangeMode) {
      tag(
        req,
        5,
        ['$and', '$in', '$gte', '$lte', '$ne', '$regex', '$gt (range pagination)'],
        'Filters students with $and/$in/$gte/$lte/$ne/$regex and paginates via indexed rollNo > lastSeen.'
      );

      // Topic 5: Keyset / range pagination (avoids skip overhead on large collections)
      const docs = await Student.find(filter, projection)
        .sort({ rollNo: 1 })
        .limit(parsedLimit + 1)
        .lean();

      const hasMore = docs.length > parsedLimit;
      const students = hasMore ? docs.slice(0, parsedLimit) : docs;
      const nextCursor = students.length > 0 ? students[students.length - 1].rollNo : null;

      return sendSuccess(res, {
        data: {
          paginationMode: 'range',
          limit: parsedLimit,
          lastSeen: String(lastSeen),
          nextCursor,
          hasMore,
          count: students.length,
          students,
        },
      });
    }

    tag(
      req,
      3,
      ['find', 'projection', 'countDocuments'],
      'Projects student directory fields and returns total matching count.'
    );
    tag(
      req,
      5,
      ['$and', '$in', '$gte', '$lte', '$ne', '$regex', 'skip', 'limit'],
      'Supports multi-predicate filtering, regex search, and skip/limit pagination.'
    );

    // Topic 5: Offset skip/limit pagination with total count
    const skip = (parsedPage - 1) * parsedLimit;
    const [students, totalCount] = await Promise.all([
      Student.find(filter, projection).sort({ rollNo: 1 }).skip(skip).limit(parsedLimit).lean(),
      Student.countDocuments(filter),
    ]);

    const totalPages = Math.ceil(totalCount / parsedLimit) || 1;
    const nextCursor = students.length > 0 ? students[students.length - 1].rollNo : null;

    return sendSuccess(res, {
      data: {
        paginationMode: 'offset',
        page: parsedPage,
        limit: parsedLimit,
        skip,
        totalCount,
        totalPages,
        hasMore: parsedPage < totalPages,
        nextCursor,
        students,
      },
    });
  } catch (error) {
    return sendError(res, { status: 500, error: error.message });
  }
});

// Topic 4: Soft delete student (status = "dropped")
const softDeleteStudent = async (req, res) => {
  const filter = { _id: req.params.id };
  const update = { $set: { status: 'dropped' } };

  try {
    tag(
      req,
      4,
      ['updateOne', '$set'],
      'Soft-deletes a student by setting status: "dropped" while preserving historical attendance.'
    );

    // Topic 4: Update student status to "dropped" instead of hard deleting history
    const result = await Student.updateOne(filter, update, { runValidators: true });
    if (result.matchedCount === 0) {
      return sendError(res, { status: 404, error: 'Student not found' });
    }

    await AuditLog.create({
      actorId: req.user?._id || null,
      studentId: req.params.id,
      action: 'STUDENT_SOFT_DELETE',
      collectionName: 'students',
      documentId: req.params.id,
      before: { status: 'active' },
      after: { status: 'dropped' },
      createdAt: new Date(),
    });

    return sendSuccess(res, {
      data: {
        studentId: req.params.id,
        status: 'dropped',
        matchedCount: result.matchedCount,
        modifiedCount: result.modifiedCount,
      },
    });
  } catch (error) {
    return sendError(res, { status: 500, error: error.message });
  }
};

router.delete('/:id', authenticateToken, authorizeRoles('admin', 'faculty'), softDeleteStudent);
router.patch('/:id/drop', authenticateToken, authorizeRoles('admin', 'faculty'), softDeleteStudent);

module.exports = router;
module.exports.softDeleteStudent = softDeleteStudent;
