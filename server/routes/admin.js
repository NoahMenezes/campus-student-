const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
const Student = require('../models/Student');
const Course = require('../models/Course');
const TimetableSlot = require('../models/TimetableSlot');
const Attendance = require('../models/Attendance');
const AuditLog = require('../models/AuditLog');
const { sendSuccess, sendError } = require('../utils/response');
const { tag, recordQuery } = require('../utils/mongoTrace');

const ALLOWED_COLLECTIONS = [
  'users',
  'students',
  'courses',
  'timetable_slots',
  'attendance',
  'notifications',
  'audit_log',
];

function detectBsonType(value) {
  if (value === null) return 'null';
  if (value === undefined) return 'undefined';
  if (value instanceof mongoose.Types.ObjectId || value?._bsontype === 'ObjectId') {
    return 'objectId';
  }
  if (value instanceof Date) return 'date';
  if (Array.isArray(value)) return 'array';
  if (typeof value === 'boolean') return 'bool';
  if (typeof value === 'number') {
    return Number.isInteger(value) ? 'int' : 'double';
  }
  if (typeof value === 'string') return 'string';
  if (typeof value === 'object') return 'object';
  return typeof value;
}

function buildBsonTypeMap(docs) {
  const typeSets = {};

  const walk = (obj, prefix = '') => {
    if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return;
    for (const [key, val] of Object.entries(obj)) {
      const path = prefix ? `${prefix}.${key}` : key;
      const bType = detectBsonType(val);
      if (!typeSets[path]) typeSets[path] = new Set();
      typeSets[path].add(bType);

      if (bType === 'object') {
        walk(val, path);
      }
    }
  };

  for (const doc of docs) {
    walk(doc);
  }

  const result = {};
  for (const [field, set] of Object.entries(typeSets)) {
    result[field] = Array.from(set);
  }
  return result;
}

// Convert IST dateKey (YYYY-MM-DD) + optional slot start HH:mm into UTC Date
function istDateKeyToUtc(dateKey, hhmm = '09:00') {
  const [y, m, d] = dateKey.split('-').map(Number);
  const [hh, mm] = hhmm.split(':').map(Number);
  return new Date(Date.UTC(y, m - 1, d, hh, mm, 0) - 330 * 60 * 1000);
}

// Topic 2 & 3: GET /admin/explorer/:collection - 5 sample docs + per-field BSON type map + indexes
router.get('/explorer/:collection', async (req, res) => {
  const collectionName = req.params.collection;

  if (!ALLOWED_COLLECTIONS.includes(collectionName)) {
    return sendError(res, {
      status: 400,
      error: `Invalid collection '${collectionName}'. Allowed: ${ALLOWED_COLLECTIONS.join(', ')}`,
    });
  }

  try {
    const db = mongoose.connection.db;
    const col = db.collection(collectionName);
    const projection = collectionName === 'users' ? { password: 0 } : {};

    tag(
      req,
      2,
      ['objectId', 'date', 'int', 'bool', 'string', 'null', 'indexes()'],
      'Inspects live BSON field types and index definitions for the collection.'
    );
    tag(
      req,
      3,
      ['find', 'limit(5)', 'projection', 'countDocuments'],
      'Samples 5 documents while projecting out sensitive credentials on users.'
    );

    // Topic 3: Count documents, sample 5 documents with projection, and inspect Topic 2 indexes
    const [totalDocuments, samples, indexes] = await Promise.all([
      col.countDocuments({}),
      col.find({}, { projection }).limit(5).toArray(),
      col.indexes(),
    ]);

    recordQuery(req, { collection: collectionName, op: 'countDocuments', filter: {} });
    recordQuery(req, { collection: collectionName, op: 'find', filter: {}, projection, limit: 5 });
    recordQuery(req, { collection: collectionName, op: 'indexes', filter: {} });

    return sendSuccess(res, {
      data: {
        collection: collectionName,
        totalDocuments,
        sampleCount: samples.length,
        bsonTypeMap: buildBsonTypeMap(samples),
        indexes,
        samples,
      },
    });
  } catch (error) {
    return sendError(res, { status: 500, error: error.message });
  }
});

// Topic 2: GET /admin/validators - Inspect $jsonSchema validators & validationAction across collections
router.get('/validators', async (req, res) => {
  try {
    const db = mongoose.connection.db;

    tag(
      req,
      2,
      ['$jsonSchema', 'validationLevel: strict', 'validationAction: error'],
      'Exposes active database-enforced $jsonSchema validators and index rules.'
    );

    // Topic 2: Fetch collection metadata including validator, validationLevel, and validationAction
    const rawCollections = await db.listCollections({}, { nameOnly: false }).toArray();
    recordQuery(req, {
      collection: '$cmd (listCollections)',
      op: 'listCollections',
      filter: { nameOnly: false },
    });

    const targetCollections = rawCollections
      .filter((c) => ALLOWED_COLLECTIONS.includes(c.name))
      .sort((a, b) => a.name.localeCompare(b.name));

    const validators = await Promise.all(
      targetCollections.map(async (c) => {
        const indexes = await db.collection(c.name).indexes();
        return {
          collection: c.name,
          type: c.type,
          validationLevel: c.options?.validationLevel || null,
          validationAction: c.options?.validationAction || null,
          validator: c.options?.validator || null,
          indexCount: indexes.length,
          indexes,
        };
      })
    );

    return sendSuccess(res, {
      data: { count: validators.length, validators },
    });
  } catch (error) {
    return sendError(res, { status: 500, error: error.message });
  }
});

// Topic 3 & 2: POST /admin/import/attendance - CSV import via insertMany ordered:false with per-row error report
const importAttendanceHandler = async (req, res) => {
  try {
    const { csv, rows: rawRows } = req.body;
    let parsedRows = [];

    if (typeof csv === 'string' && csv.trim().length > 0) {
      const lines = csv
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter(Boolean);
      const startIndex = lines[0].toLowerCase().includes('rollno') ? 1 : 0;
      for (let i = startIndex; i < lines.length; i++) {
        const parts = lines[i].split(',').map((p) => p.trim());
        parsedRows.push({
          row: i + 1,
          rollNo: parts[0],
          courseCode: parts[1],
          slotKey: parts[2],
          dateKey: parts[3],
          status: parts[4],
          raw: lines[i],
        });
      }
    } else if (Array.isArray(rawRows)) {
      parsedRows = rawRows.map((r, idx) => ({
        row: idx + 1,
        rollNo: r.rollNo,
        courseCode: r.courseCode,
        slotKey: r.slotKey,
        dateKey: r.dateKey,
        status: r.status,
        raw: r,
      }));
    } else {
      return sendError(res, {
        status: 400,
        error: 'Provide "csv" string (rollNo,courseCode,slotKey,dateKey,status) or "rows" array',
      });
    }

    tag(
      req,
      3,
      ['insertMany (ordered: false)', '$in'],
      'Imports valid attendance rows in bulk while continuing past per-row errors.'
    );
    tag(
      req,
      2,
      ['code 11000 (duplicate key)', 'code 121 ($jsonSchema error)'],
      'Reports unique index conflicts and schema rejections row-by-row.'
    );

    const rollNos = [...new Set(parsedRows.map((r) => String(r.rollNo || '').toUpperCase()).filter(Boolean))];
    const courseCodes = [
      ...new Set(parsedRows.map((r) => String(r.courseCode || '').toUpperCase()).filter(Boolean)),
    ];
    const slotKeys = [...new Set(parsedRows.map((r) => String(r.slotKey || '')).filter(Boolean))];

    // Topic 3 & 5: Batch reference lookups with $in
    const [students, courses, slots] = await Promise.all([
      Student.find({ rollNo: { $in: rollNos } }, { _id: 1, rollNo: 1, section: 1 }).lean(),
      Course.find({ code: { $in: courseCodes } }, { _id: 1, code: 1 }).lean(),
      TimetableSlot.find(
        { slotKey: { $in: slotKeys } },
        { _id: 1, slotKey: 1, section: 1, start: 1, courseId: 1 }
      ).lean(),
    ]);

    const studentMap = new Map(students.map((s) => [s.rollNo, s]));
    const courseMap = new Map(courses.map((c) => [c.code, c]));
    const slotMap = new Map();
    for (const sl of slots) {
      slotMap.set(`${sl.section}|${sl.slotKey}`, sl);
    }

    const errors = [];
    const candidateDocs = [];
    const candidateMeta = [];

    for (const item of parsedRows) {
      const roll = String(item.rollNo || '').toUpperCase();
      const code = String(item.courseCode || '').toUpperCase();
      const student = studentMap.get(roll);
      const course = courseMap.get(code);
      const slot = student ? slotMap.get(`${student.section}|${item.slotKey}`) : null;

      if (!student) {
        errors.push({ row: item.row, reason: `Unknown rollNo '${roll}'`, raw: item.raw });
        continue;
      }
      if (!course) {
        errors.push({ row: item.row, reason: `Unknown courseCode '${code}'`, raw: item.raw });
        continue;
      }
      if (!slot) {
        errors.push({
          row: item.row,
          reason: `Unknown slotKey '${item.slotKey}' for section ${student.section}`,
          raw: item.raw,
        });
        continue;
      }
      if (!/^\d{4}-\d{2}-\d{2}$/.test(String(item.dateKey || ''))) {
        errors.push({ row: item.row, reason: `Invalid dateKey '${item.dateKey}'`, raw: item.raw });
        continue;
      }

      candidateDocs.push({
        studentId: student._id,
        courseId: course._id,
        slotId: slot._id,
        dateKey: String(item.dateKey),
        status: item.status,
        markedAt: istDateKeyToUtc(String(item.dateKey), slot.start),
        source: 'sync',
      });
      candidateMeta.push(item);
    }

    let insertedCount = 0;
    if (candidateDocs.length > 0) {
      try {
        // Topic 3: Unordered bulk insert so valid rows succeed even when duplicate/invalid rows fail
        const resInsert = await Attendance.collection.insertMany(candidateDocs, { ordered: false });
        insertedCount = resInsert.insertedCount;
      } catch (bulkErr) {
        insertedCount = bulkErr.result?.insertedCount ?? 0;
        const writeErrors = bulkErr.writeErrors || [];
        for (const we of writeErrors) {
          const src = candidateMeta[we.index];
          errors.push({
            row: src ? src.row : we.index + 1,
            code: we.code,
            reason: we.errmsg || we.err?.errmsg || 'Bulk write validation/index error',
            raw: src ? src.raw : null,
          });
        }
      }
    }

    errors.sort((a, b) => a.row - b.row);

    return sendSuccess(res, {
      data: {
        totalRows: parsedRows.length,
        insertedCount,
        failedCount: errors.length,
        errors,
      },
    });
  } catch (error) {
    return sendError(res, { status: 500, error: error.message });
  }
};

router.post('/import/attendance', importAttendanceHandler);
router.post('/import/csv', importAttendanceHandler);

// Topic 4: POST /admin/rollover - updateMany $inc semester for active students
router.post('/rollover', async (req, res) => {
  try {
    const { fromSemester, section } = req.body || {};
    const filter = { status: 'active', semester: { $lt: 8 } };
    if (fromSemester !== undefined) {
      filter.semester = parseInt(String(fromSemester), 10);
    }
    if (section) {
      filter.section = String(section).toUpperCase();
    }

    const update = { $inc: { semester: 1 } };

    tag(
      req,
      4,
      ['updateMany', '$inc', '$lt'],
      'Atomically increments semester across all matching active students.'
    );

    // Topic 4: Bulk semester rollover using $inc
    const result = await Student.updateMany(filter, update);

    await AuditLog.create({
      actorId: req.user?._id || null,
      action: 'SEMESTER_ROLLOVER',
      collectionName: 'students',
      after: { filter, inc: 1, modifiedCount: result.modifiedCount },
      createdAt: new Date(),
    });

    return sendSuccess(res, {
      data: {
        matchedCount: result.matchedCount,
        modifiedCount: result.modifiedCount,
        filter,
      },
    });
  } catch (error) {
    return sendError(res, { status: 500, error: error.message });
  }
});

// Topic 4: DELETE /admin/attendance/before - deleteMany for attendance before a date
router.delete('/attendance/before', async (req, res) => {
  try {
    const dateKey = req.query.dateKey || req.body?.dateKey || req.body?.beforeDateKey;
    const beforeDate = req.query.date || req.body?.date || req.body?.beforeDate;

    let filter;
    if (dateKey) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(String(dateKey))) {
        return sendError(res, { status: 400, error: 'dateKey must be YYYY-MM-DD' });
      }
      filter = { dateKey: { $lt: String(dateKey) } };
    } else if (beforeDate) {
      const parsed = new Date(String(beforeDate));
      if (Number.isNaN(parsed.getTime())) {
        return sendError(res, { status: 400, error: 'Invalid date value' });
      }
      filter = { markedAt: { $lt: parsed } };
    } else {
      return sendError(res, {
        status: 400,
        error: 'Provide dateKey (YYYY-MM-DD) or date (ISO timestamp)',
      });
    }

    tag(
      req,
      4,
      ['deleteMany', '$lt'],
      'Removes attendance documents older than the cutoff dateKey or UTC timestamp.'
    );

    // Topic 4: Purge historical attendance records matching $lt cutoff
    const result = await Attendance.deleteMany(filter);

    return sendSuccess(res, {
      data: {
        deletedCount: result.deletedCount,
        filter,
      },
    });
  } catch (error) {
    return sendError(res, { status: 500, error: error.message });
  }
});

// Topic 4: Soft-delete student via /admin/students/:id
router.delete('/students/:id', async (req, res) => {
  const filter = { _id: req.params.id };
  const update = { $set: { status: 'dropped' } };
  try {
    tag(req, 4, ['updateOne', '$set'], 'Soft-deletes a student by setting status to "dropped".');
    const result = await Student.updateOne(filter, update, { runValidators: true });
    if (result.matchedCount === 0) {
      return sendError(res, { status: 404, error: 'Student not found' });
    }
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
});

module.exports = router;
