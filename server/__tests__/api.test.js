const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');

const app = require('../index');
const connectDB = require('../config/db');
const {
  User,
  Student,
  Course,
  TimetableSlot,
  Attendance,
  Notification,
  AuditLog,
} = require('../models');
const { getIstNowParts } = require('../utils/ist');

let noahToken = '';
let noahStudent = null;
let batchCSlot = null;
let batchDSlot = null;
let theorySlot = null;
let createdStudentId = null;
let createdUserId = null;
let futureSameDaySlotId = null;

function assertMetaEnvelope(body) {
  assert.ok(body && typeof body === 'object', 'Response must be JSON object');
  assert.ok('data' in body, 'Response must have data property');
  assert.ok(body.meta && typeof body.meta === 'object', 'Response must have meta object');
  assert.equal(typeof body.meta.ms, 'number');
  assert.ok(Array.isArray(body.meta.concepts), 'meta.concepts must be an array');
  assert.ok(Array.isArray(body.meta.queries), 'meta.queries must be an array');
}

describe('Campus Student API + MongoDB Integration Suite', () => {
  before(async () => {
    await connectDB();

    noahStudent = await Student.findOne({ rollNo: '24CE001' }).lean();
    assert.ok(noahStudent, 'Seeded demo student Noah (24CE001) must exist');

    batchCSlot = await TimetableSlot.findOne({
      semester: 5,
      section: 'B',
      slotKey: 'mon_lab_c',
    }).lean();
    batchDSlot = await TimetableSlot.findOne({
      semester: 5,
      section: 'B',
      slotKey: 'mon_lab_d',
    }).lean();
    theorySlot = await TimetableSlot.findOne({
      semester: 5,
      section: 'B',
      slotKey: 'mon_dbms',
    }).lean();

    assert.ok(batchCSlot && batchDSlot && theorySlot, 'Timetable slots must be seeded');
  });

  after(async () => {
    // Clean up any temporary test artifacts so seeded database remains pristine
    if (futureSameDaySlotId) {
      await TimetableSlot.deleteOne({ _id: futureSameDaySlotId });
    }
    if (createdStudentId) {
      await Attendance.deleteMany({ studentId: createdStudentId });
      await Student.deleteOne({ _id: createdStudentId });
    }
    if (createdUserId) {
      await User.deleteOne({ _id: createdUserId });
    }
    await Attendance.deleteMany({
      studentId: noahStudent._id,
      dateKey: '2026-10-12',
    });
    await AuditLog.deleteMany({
      studentId: noahStudent._id,
      'after.dateKey': '2026-10-12',
    });
    await connectDB.disconnectDB();
  });

  it('POST /auth/login returns token and projected user + student profile', async () => {
    const res = await request(app)
      .post('/auth/login')
      .send({ email: 'nnm1.s24@gec.ac.in', password: 'demo123' })
      .expect(200);

    assertMetaEnvelope(res.body);
    assert.ok(res.body.data.token);
    assert.equal(res.body.data.user.email, 'nnm1.s24@gec.ac.in');
    assert.equal(res.body.data.user.rollNo, '24CE001');
    assert.equal(res.body.data.user.labBatch, 'C');
    noahToken = res.body.data.token;
  });

  it('GET /courses?type= returns courses plus Theory(5)/Laboratories(5) counts via countDocuments', async () => {
    const allRes = await request(app).get('/courses').expect(200);
    assertMetaEnvelope(allRes.body);
    assert.equal(allRes.body.data.counts.total, 11);
    assert.equal(allRes.body.data.counts.theory, 5);
    assert.equal(allRes.body.data.counts.lab, 5);
    assert.equal(allRes.body.data.counts.other, 1);

    const theoryRes = await request(app).get('/courses?type=theory').expect(200);
    assertMetaEnvelope(theoryRes.body);
    assert.equal(theoryRes.body.data.courses.length, 5);
    assert.ok(theoryRes.body.data.courses.every((c) => c.type === 'theory'));
  });

  it('GET /timetable?day=Monday filters by $and [semester, section, day] and $or [{batch:null},{batch}] sorted by start', async () => {
    const res = await request(app)
      .get('/timetable?day=Monday')
      .set('Authorization', `Bearer ${noahToken}`)
      .expect(200);

    assertMetaEnvelope(res.body);
    const slots = res.body.data.slots;
    assert.ok(slots.length >= 4);
    assert.ok(slots.every((s) => s.day === 'Monday' && (s.batch === null || s.batch === 'C')));
    for (let i = 1; i < slots.length; i++) {
      assert.ok(slots[i - 1].start <= slots[i].start, 'Slots must be sorted ascending by start');
    }
  });

  it('PATCH /me/batch updates labBatch via updateOne $set and restores it cleanly', async () => {
    const patchRes = await request(app)
      .patch('/me/batch')
      .set('Authorization', `Bearer ${noahToken}`)
      .send({ labBatch: 'D' })
      .expect(200);

    assertMetaEnvelope(patchRes.body);
    assert.equal(patchRes.body.data.labBatch, 'D');
    assert.equal(patchRes.body.data.modifiedCount, 1);

    // Restore back to Batch C
    const restoreRes = await request(app)
      .patch('/me/batch')
      .set('Authorization', `Bearer ${noahToken}`)
      .send({ labBatch: 'C' })
      .expect(200);
    assert.equal(restoreRes.body.data.labBatch, 'C');
  });

  it('PUT /attendance: double mark is idempotent without duplicate docs or extra audit_log rows', async () => {
    const testDate = '2026-10-12'; // Monday in Oct 2026
    await Attendance.deleteOne({
      studentId: noahStudent._id,
      dateKey: testDate,
      slotId: theorySlot._id,
    });

    const first = await request(app)
      .put('/attendance')
      .set('Authorization', `Bearer ${noahToken}`)
      .send({ slotId: theorySlot._id, dateKey: testDate, status: 'P', source: 'manual' })
      .expect(200);

    assertMetaEnvelope(first.body);
    assert.equal(first.body.data.upserted, true);
    assert.equal(first.body.data.statusChanged, true);
    assert.equal(first.body.data.auditLogged, true);

    const auditBeforeSecond = await AuditLog.countDocuments({
      studentId: noahStudent._id,
      'after.dateKey': testDate,
      'after.slotId': theorySlot._id,
    });

    const second = await request(app)
      .put('/attendance')
      .set('Authorization', `Bearer ${noahToken}`)
      .send({ slotId: theorySlot._id, dateKey: testDate, status: 'P', source: 'manual' })
      .expect(200);

    assertMetaEnvelope(second.body);
    assert.equal(second.body.data.upserted, false);
    assert.equal(second.body.data.statusChanged, false);
    assert.equal(second.body.data.auditLogged, false);

    const countDocs = await Attendance.countDocuments({
      studentId: noahStudent._id,
      dateKey: testDate,
      slotId: theorySlot._id,
    });
    assert.equal(countDocs, 1);

    const auditAfterSecond = await AuditLog.countDocuments({
      studentId: noahStudent._id,
      'after.dateKey': testDate,
      'after.slotId': theorySlot._id,
    });
    assert.equal(auditAfterSecond, auditBeforeSecond);
  });

  it('PUT /attendance: changing mark P -> A inserts an audit_log row in the same transaction, and DELETE /attendance undoes it', async () => {
    const testDate = '2026-10-12';
    const changeRes = await request(app)
      .put('/attendance')
      .set('Authorization', `Bearer ${noahToken}`)
      .send({ slotId: theorySlot._id, dateKey: testDate, status: 'A', source: 'manual' })
      .expect(200);

    assertMetaEnvelope(changeRes.body);
    assert.equal(changeRes.body.data.previousStatus, 'P');
    assert.equal(changeRes.body.data.statusChanged, true);
    assert.equal(changeRes.body.data.auditLogged, true);
    assert.equal(changeRes.body.data.attendance.status, 'A');

    const latestAudit = await AuditLog.findOne({
      studentId: noahStudent._id,
      action: 'ATTENDANCE_CHANGE',
      'after.dateKey': testDate,
    })
      .sort({ createdAt: -1 })
      .lean();
    assert.ok(latestAudit, 'audit_log entry must be inserted on status change');
    assert.equal(latestAudit.before.status, 'P');
    assert.equal(latestAudit.after.status, 'A');

    // Undo via DELETE /attendance
    const delRes = await request(app)
      .delete('/attendance')
      .set('Authorization', `Bearer ${noahToken}`)
      .send({ slotId: theorySlot._id, dateKey: testDate })
      .expect(200);

    assertMetaEnvelope(delRes.body);
    assert.equal(delRes.body.data.deletedCount, 1);
  });

  it('PUT /attendance: rejects future date and same-day future lecture start time', async () => {
    const futureDateRes = await request(app)
      .put('/attendance')
      .set('Authorization', `Bearer ${noahToken}`)
      .send({ slotId: theorySlot._id, dateKey: '2099-12-01', status: 'P' })
      .expect(400);

    assertMetaEnvelope(futureDateRes.body);
    assert.match(futureDateRes.body.data.error, /future/i);

    const istNow = getIstNowParts(new Date());
    if (istNow.minutes < 23 * 60 + 50) {
      const course = await Course.findOne({ code: 'CECMP300' }).lean();
      const tempSlot = await TimetableSlot.create({
        slotKey: 'test_future_2355',
        semester: 5,
        section: 'B',
        day: 'Monday',
        start: '23:55',
        end: '23:59',
        courseId: course._id,
        courseCode: course.code,
        courseName: course.shortName,
        type: 'theory',
        batch: null,
        room: 'CR-204',
      });
      futureSameDaySlotId = tempSlot._id;

      const sameDayRes = await request(app)
        .put('/attendance')
        .set('Authorization', `Bearer ${noahToken}`)
        .send({ slotId: tempSlot._id, dateKey: istNow.dateKey, status: 'P' })
        .expect(400);

      assert.match(sameDayRes.body.data.error, /future lecture/i);
    }
  });

  it('PUT /attendance: rejects slot outside student batch (Batch C student marking Batch D lab)', async () => {
    const res = await request(app)
      .put('/attendance')
      .set('Authorization', `Bearer ${noahToken}`)
      .send({ slotId: batchDSlot._id, dateKey: '2026-10-12', status: 'P' })
      .expect(403);

    assertMetaEnvelope(res.body);
    assert.match(res.body.data.error, /outside student/i);
  });

  it('PUT /attendance: rejects dropped student after soft delete', async () => {
    const tempUser = await User.create({
      name: 'Dropped Test Student',
      email: 'dropped.test.s24@gec.ac.in',
      password: 'temp123',
      role: 'student',
    });
    createdUserId = tempUser._id;

    const tempStudent = await Student.create({
      userId: tempUser._id,
      name: 'Dropped Test Student',
      rollNo: '24CE999',
      email: 'dropped.test.s24@gec.ac.in',
      semester: 5,
      section: 'B',
      batch: 'C',
      labBatch: 'C',
      status: 'active',
      guardian: { name: 'Test Guardian', phone: '+91-9823999999', relation: 'Parent' },
    });
    createdStudentId = tempStudent._id;

    // Soft-delete student -> status: "dropped"
    const dropRes = await request(app)
      .delete(`/students/${tempStudent._id}`)
      .expect(200);
    assertMetaEnvelope(dropRes.body);
    assert.equal(dropRes.body.data.status, 'dropped');

    // Login as dropped student and attempt PUT /attendance
    const loginRes = await request(app)
      .post('/auth/login')
      .send({ email: 'dropped.test.s24@gec.ac.in', password: 'temp123' })
      .expect(200);
    const droppedToken = loginRes.body.data.token;

    const attRes = await request(app)
      .put('/attendance')
      .set('Authorization', `Bearer ${droppedToken}`)
      .send({ slotId: batchCSlot._id, dateKey: '2026-10-12', status: 'P' })
      .expect(403);

    assertMetaEnvelope(attRes.body);
    assert.match(attRes.body.data.error, /dropped/i);
  });

  it('PUT /attendance: rejects invalid status via MongoDB $jsonSchema (code 121)', async () => {
    const res = await request(app)
      .put('/attendance')
      .set('Authorization', `Bearer ${noahToken}`)
      .send({ slotId: batchCSlot._id, dateKey: '2026-10-12', status: 'INVALID' })
      .expect(400);

    assertMetaEnvelope(res.body);
    assert.equal(res.body.data.code, 121);
    assert.match(res.body.data.error, /\$jsonSchema/i);
  });

  it('GET /notifications & PATCH /notifications/read-all use countDocuments and updateMany', async () => {
    // Ensure Noah has at least 1 unread notification for the test
    await Notification.updateMany({ studentId: noahStudent._id }, { $set: { read: false } });

    const badgeRes = await request(app)
      .get('/notifications/unread-count')
      .set('Authorization', `Bearer ${noahToken}`)
      .expect(200);
    assertMetaEnvelope(badgeRes.body);
    assert.ok(badgeRes.body.data.unreadCount >= 1);

    const readAllRes = await request(app)
      .patch('/notifications/read-all')
      .set('Authorization', `Bearer ${noahToken}`)
      .expect(200);
    assertMetaEnvelope(readAllRes.body);
    assert.equal(readAllRes.body.data.unreadCount, 0);
    assert.ok(readAllRes.body.data.modifiedCount >= 1);
  });

  it('GET /students supports skip/limit, range pagination (rollNo > lastSeen), $in/$gte/$lte/$ne filters, and $regex search', async () => {
    const offsetRes = await request(app)
      .get('/students?section=A,B&minSem=5&maxSem=5&page=1&limit=10')
      .expect(200);
    assertMetaEnvelope(offsetRes.body);
    assert.equal(offsetRes.body.data.paginationMode, 'offset');
    assert.equal(offsetRes.body.data.students.length, 10);
    assert.ok(offsetRes.body.data.students.every((s) => ['A', 'B'].includes(s.section) && s.status !== 'dropped'));

    const cursor = offsetRes.body.data.nextCursor;
    const rangeRes = await request(app)
      .get(`/students?section=A,B&lastSeen=${cursor}&limit=10`)
      .expect(200);
    assertMetaEnvelope(rangeRes.body);
    assert.equal(rangeRes.body.data.paginationMode, 'range');
    assert.equal(rangeRes.body.data.students.length, 10);
    assert.ok(rangeRes.body.data.students.every((s) => s.rollNo > cursor));

    const searchRes = await request(app).get('/students?q=Noah').expect(200);
    assertMetaEnvelope(searchRes.body);
    assert.equal(searchRes.body.data.students.length, 1);
    assert.equal(searchRes.body.data.students[0].rollNo, '24CE001');
  });

  it('Admin CSV import (insertMany ordered:false), rollover ($inc), and deleteMany before date', async () => {
    // 1. Create a fresh temp student for isolated CSV import, rollover, and deleteMany checks
    const u = await User.create({
      name: 'CSV Admin Test Student',
      email: 'csv.admin.s24@gec.ac.in',
      password: 'temp123',
      role: 'student',
    });
    const st = await Student.create({
      userId: u._id,
      name: 'CSV Admin Test Student',
      rollNo: '24CE998',
      email: 'csv.admin.s24@gec.ac.in',
      semester: 5,
      section: 'B',
      batch: 'C',
      labBatch: 'C',
      status: 'active',
      guardian: { name: 'CSV Guardian', phone: '+91-9823999998', relation: 'Parent' },
    });

    try {
      const csvBody = [
        'rollNo,courseCode,slotKey,dateKey,status',
        '24CE998,CECMP300,mon_dbms,2026-07-06,P', // valid (before Aug 2026)
        '24CE998,CECMP300,mon_dbms,2026-07-06,P', // duplicate unique key (11000)
        '24CE998,CECMP304,mon_ai,2026-07-06,BAD', // invalid status ($jsonSchema 121)
        '99CE000,CECMP300,mon_dbms,2026-07-06,P', // unknown rollNo
        '24CE998,CECMP302,mon_dccn,2026-07-06,A', // valid
      ].join('\n');

      const importRes = await request(app)
        .post('/admin/import/attendance')
        .send({ csv: csvBody })
        .expect(200);

      assertMetaEnvelope(importRes.body);
      assert.equal(importRes.body.data.totalRows, 5);
      assert.equal(importRes.body.data.insertedCount, 2);
      assert.equal(importRes.body.data.failedCount, 3);
      assert.equal(importRes.body.data.errors.length, 3);

      // 2. Test deleteMany before 2026-08-01 cleans up our 2026-07-06 CSV docs without touching Aug-Nov data
      const purgeRes = await request(app)
        .delete('/admin/attendance/before?dateKey=2026-08-01')
        .expect(200);
      assertMetaEnvelope(purgeRes.body);
      assert.equal(purgeRes.body.data.deletedCount, 2);

      // 3. Test POST /admin/rollover ($inc semester) and revert back so seed remains Sem 5
      await Student.updateOne({ _id: st._id }, { $set: { semester: 7 } });
      const rolloverRes = await request(app)
        .post('/admin/rollover')
        .send({ fromSemester: 7 })
        .expect(200);
      assertMetaEnvelope(rolloverRes.body);
      assert.equal(rolloverRes.body.data.modifiedCount, 1);

      const rolled = await Student.findById(st._id).lean();
      assert.equal(rolled.semester, 8);
    } finally {
      await Attendance.deleteMany({ studentId: st._id });
      await Student.deleteOne({ _id: st._id });
      await User.deleteOne({ _id: u._id });
    }
  });

  it('GET /analytics/* endpoints compute overall, per-subject, today ($facet Pending), monthly IST, course summary, defaulters, 14-day trend, Student 360, and explain', async () => {
    // 1. overall
    const overallRes = await request(app)
      .get('/analytics/overall')
      .set('Authorization', `Bearer ${noahToken}`)
      .expect(200);
    assertMetaEnvelope(overallRes.body);
    assert.equal(overallRes.body.data.marked, overallRes.body.data.present + overallRes.body.data.absent);
    assert.ok(typeof overallRes.body.data.percentage === 'number');

    // 2. per-subject with classesNeeded & SAFE/AT_RISK/DEFAULTER/NO_DATA
    const subjRes = await request(app)
      .get('/analytics/subjects')
      .set('Authorization', `Bearer ${noahToken}`)
      .expect(200);
    assertMetaEnvelope(subjRes.body);
    assert.equal(subjRes.body.data.subjects.length, 11);
    const markedSubj = subjRes.body.data.subjects.find((s) => s.marked > 0);
    const emptySubj = subjRes.body.data.subjects.find((s) => s.marked === 0);
    assert.ok(markedSubj && ['SAFE', 'AT_RISK', 'DEFAULTER'].includes(markedSubj.risk));
    assert.equal(typeof markedSubj.classesNeeded, 'number');
    if (emptySubj) {
      assert.equal(emptySubj.percentage, null);
      assert.equal(emptySubj.risk, 'NO_DATA');
    }

    // 3. today ($facet Total/Present/Absent/Pending) on seeded Nov 23 (Monday) & unseeded Nov 25 (Wednesday)
    const monTodayRes = await request(app)
      .get('/analytics/today?dateKey=2026-11-23')
      .set('Authorization', `Bearer ${noahToken}`)
      .expect(200);
    assertMetaEnvelope(monTodayRes.body);
    assert.equal(
      monTodayRes.body.data.Total,
      monTodayRes.body.data.Present + monTodayRes.body.data.Absent + monTodayRes.body.data.Pending
    );
    assert.ok(monTodayRes.body.data.Total >= 4);

    const wedTodayRes = await request(app)
      .get('/analytics/today?dateKey=2026-11-25')
      .set('Authorization', `Bearer ${noahToken}`)
      .expect(200);
    assert.equal(wedTodayRes.body.data.Pending, wedTodayRes.body.data.Total);
    assert.equal(wedTodayRes.body.data.percentage, null);

    // 4. monthly ($month with Asia/Kolkata timezone)
    const monthlyRes = await request(app)
      .get('/analytics/monthly')
      .set('Authorization', `Bearer ${noahToken}`)
      .expect(200);
    assertMetaEnvelope(monthlyRes.body);
    assert.ok(monthlyRes.body.data.months.length >= 1);
    assert.equal(monthlyRes.body.data.months[0].month, 11);

    // 5. course-summary avg/min/max
    const summaryRes = await request(app).get('/analytics/course-summary').expect(200);
    assertMetaEnvelope(summaryRes.body);
    assert.equal(summaryRes.body.data.courses.length, 11);
    const cs0 = summaryRes.body.data.courses[0];
    assert.ok(cs0.minPercentage <= cs0.avgPercentage && cs0.avgPercentage <= cs0.maxPercentage);

    // 6. defaulters with guardian phone (active students only)
    const defRes = await request(app).get('/analytics/defaulters').expect(200);
    assertMetaEnvelope(defRes.body);
    assert.ok(defRes.body.data.count > 0);
    const d0 = defRes.body.data.defaulters[0];
    assert.ok(d0.guardianPhone && d0.percentage < 75);

    // 7. 14-day trend vs overall
    const trendRes = await request(app)
      .get('/analytics/trend')
      .set('Authorization', `Bearer ${noahToken}`)
      .expect(200);
    assertMetaEnvelope(trendRes.body);
    assert.ok('overall' in trendRes.body.data && 'last14Days' in trendRes.body.data && 'delta' in trendRes.body.data);

    // 8. Student 360 with $facet
    const s360Res = await request(app)
      .get('/analytics/student-360')
      .set('Authorization', `Bearer ${noahToken}`)
      .expect(200);
    assertMetaEnvelope(s360Res.body);
    assert.equal(s360Res.body.data.student.rollNo, '24CE001');
    assert.ok(Array.isArray(s360Res.body.data.perCourse) && Array.isArray(s360Res.body.data.recentMarks));

    // 9. explain("executionStats") with vs without index hint
    const expRes = await request(app)
      .get('/analytics/explain')
      .set('Authorization', `Bearer ${noahToken}`)
      .expect(200);
    assertMetaEnvelope(expRes.body);
    assert.equal(expRes.body.data.withoutIndexHint.stage, 'COLLSCAN');
    assert.equal(expRes.body.data.withIndexHint.stage, 'IXSCAN');
    assert.ok(
      expRes.body.data.withoutIndexHint.totalDocsExamined >
        expRes.body.data.withIndexHint.totalDocsExamined
    );
  });

  it('AsyncLocalStorage + mongoose debug + tag() + runAggregate wrapper populate meta.concepts & meta.queries on every response', async () => {
    const { mongoTraceStorage, runAggregate } = require('../utils/mongoTrace');

    // 1. Mutation response captures real Mongoose updateOne debug query & Topic 4 tag
    const batchRes = await request(app)
      .patch('/me/batch')
      .set('Authorization', `Bearer ${noahToken}`)
      .send({ labBatch: 'D' })
      .expect(200);
    assertMetaEnvelope(batchRes.body);
    assert.ok(batchRes.body.meta.concepts.some((c) => c.topic === 4 && c.operators.includes('$set')));
    assert.ok(
      batchRes.body.meta.queries.some(
        (q) => q.collection === 'students' && q.op === 'updateOne' && q.update?.$set?.labBatch === 'D'
      )
    );
    await request(app).patch('/me/batch').set('Authorization', `Bearer ${noahToken}`).send({ labBatch: 'C' }).expect(200);

    // 2. Analytics response captures live aggregate pipeline via debug/wrapper & Topic 7 tag
    const subjRes = await request(app)
      .get('/analytics/subjects')
      .set('Authorization', `Bearer ${noahToken}`)
      .expect(200);
    assertMetaEnvelope(subjRes.body);
    assert.ok(subjRes.body.meta.concepts.some((c) => c.topic === 7));
    assert.ok(
      subjRes.body.meta.queries.some(
        (q) => q.collection === 'attendance' && q.op === 'aggregate' && Array.isArray(q.pipeline)
      )
    );

    // 3. runAggregate fallback logs pipeline if driver/mock bypasses Mongoose debug hook
    const store = { startMs: Date.now(), concepts: [], queries: [], _debugAggregateCount: 0 };
    const fakeModel = {
      collectionName: 'attendance',
      aggregate: async () => [{ ok: 1 }],
    };
    await mongoTraceStorage.run(store, async () => {
      const out = await runAggregate(fakeModel, [{ $match: { status: 'P' } }]);
      assert.deepEqual(out, [{ ok: 1 }]);
    });
    assert.equal(store.queries.length, 1);
    assert.equal(store.queries[0].capturedBy, 'aggregate-wrapper');

    // 4. Even 404 responses carry the standardized { data, meta: { ms, concepts, queries } } envelope
    const notFoundRes = await request(app).get('/route-does-not-exist-check').expect(404);
    assertMetaEnvelope(notFoundRes.body);
    assert.equal(notFoundRes.body.data.error, 'Not found');
  });

  it('GET /demo/sharding returns Topic 9 shard topology, $collStats storageStats, and dateKey hotspot explanation', async () => {
    const res = await request(app).get('/demo/sharding').expect(200);
    assertMetaEnvelope(res.body);
    assert.ok(res.body.meta.concepts.some((c) => c.topic === 9));
    assert.ok(
      res.body.meta.queries.some(
        (q) => q.collection === 'attendance' && q.op === 'aggregate' && Array.isArray(q.pipeline)
      )
    );
    assert.deepEqual(res.body.data.shardKeys.attendance.key, { studentId: 1, dateKey: 1 });
    assert.deepEqual(res.body.data.shardKeys.attendance.uniqueIndex, {
      studentId: 1,
      dateKey: 1,
      slotId: 1,
    });
    assert.deepEqual(res.body.data.shardKeys.notifications.key, { studentId: 'hashed' });
    assert.ok(Array.isArray(res.body.data.collections.attendance.perShard));
    assert.ok(res.body.data.collections.attendance.perShard[0].storageStats.count > 0);
    assert.ok(
      res.body.data.writeHotspotExplanation.whyDateKeyAloneHotspots.toLowerCase().includes('hotspot')
    );
    assert.ok(
      res.body.data.writeHotspotExplanation.whyStudentIdPrefixFixesIt.includes('studentId')
    );
  });

  it('Demo Center endpoints (/demo/replica-set, /oplog, /write-concern-test, /benchmark, /attendance-stream SSE + <75% alert, /reset)', async () => {
    const http = require('node:http');

    // 1. Replica Set & Oplog
    const rsRes = await request(app).get('/demo/replica-set').expect(200);
    assertMetaEnvelope(rsRes.body);
    assert.ok(rsRes.body.meta.concepts.some((c) => c.topic === 8));
    assert.ok(rsRes.body.data.members.length >= 1);
    assert.ok(Array.isArray(rsRes.body.data.killPrimaryInstructions));
    assert.equal(rsRes.body.data.oplog.supported, true);

    const oplogRes = await request(app).get('/demo/oplog?limit=5').expect(200);
    assertMetaEnvelope(oplogRes.body);
    assert.ok(Array.isArray(oplogRes.body.data.entries));

    // 2. Write Concern benchmark (w:majority vs w:1)
    const wcRes = await request(app).post('/demo/write-concern-test').send({ iterations: 5 }).expect(200);
    assertMetaEnvelope(wcRes.body);
    assert.equal(wcRes.body.data.iterations, 5);
    assert.ok(wcRes.body.data.w1.totalMs >= 1 && wcRes.body.data.wMajority.totalMs >= 1);

    // 3. 3-way Comparison Benchmark (Node loop vs $group COLLSCAN vs $group IXSCAN)
    const benchRes = await request(app)
      .get('/demo/benchmark?rollNo=24CE002')
      .set('Authorization', `Bearer ${noahToken}`)
      .expect(200);
    assertMetaEnvelope(benchRes.body);
    assert.ok(benchRes.body.meta.concepts.some((c) => c.topic === 10));
    const methods = benchRes.body.data.methods;
    assert.equal(methods.length, 3);
    assert.deepEqual(methods[0].result, methods[1].result);
    assert.deepEqual(methods[1].result, methods[2].result);
    assert.ok(methods[1].totalDocsExamined > methods[2].totalDocsExamined);
    assert.ok(benchRes.body.data.asyncStorageVsMongoDB.length >= 4);

    // 4. Live SSE Change Stream on attendance + "dropped below 75%" alert
    const liveServer = http.createServer(app);
    await new Promise((resolve) => liveServer.listen(0, '127.0.0.1', resolve));
    const port = liveServer.address().port;
    const sseController = new AbortController();
    let sseReader = null;

    try {
      const sseRes = await fetch(`http://127.0.0.1:${port}/demo/attendance-stream`, {
        signal: sseController.signal,
      });
      assert.equal(sseRes.status, 200);

      const reader = sseRes.body.getReader();
      sseReader = reader;
      const decoder = new TextDecoder();
      let buf = '';
      const receivedEvents = [];

      const readUntil = async (predicate, timeoutMs = 6000) => {
        const deadline = Date.now() + timeoutMs;
        while (Date.now() < deadline) {
          if (predicate(receivedEvents)) return;
          const { value, done } = await reader.read();
          if (done) break;
          buf += decoder.decode(value, { stream: true });
          const blocks = buf.split('\n\n');
          buf = blocks.pop() || '';
          for (const block of blocks) {
            let evName = 'message';
            let dataStr = '';
            for (const line of block.split('\n')) {
              if (line.startsWith('event:')) evName = line.slice(6).trim();
              else if (line.startsWith('data:')) dataStr += line.slice(5).trim();
            }
            if (dataStr) {
              receivedEvents.push({ event: evName, data: JSON.parse(dataStr) });
            }
          }
        }
        throw new Error(`Timed out waiting for SSE event; got: ${JSON.stringify(receivedEvents)}`);
      };

      await readUntil((evs) => evs.some((e) => e.event === 'connected'));

      // Mark Noah (75.0%) Absent on 2026-11-19 -> drops Noah below 75% (69.2%)!
      await request(app)
        .put('/attendance')
        .set('Authorization', `Bearer ${noahToken}`)
        .send({ slotId: theorySlot._id, dateKey: '2026-11-19', status: 'A' })
        .expect(200);

      await readUntil(
        (evs) =>
          evs.some((e) => e.event === 'attendance_change' && e.data.dateKey === '2026-11-19') &&
          evs.some((e) => e.event === 'low_attendance_alert' && e.data.percentage < 75)
      );

      await request(app)
        .delete('/attendance')
        .set('Authorization', `Bearer ${noahToken}`)
        .send({ slotId: theorySlot._id, dateKey: '2026-11-19' })
        .expect(200);
    } finally {
      if (sseReader) await sseReader.cancel().catch(() => {});
      sseController.abort();
      liveServer.closeAllConnections?.();
      await new Promise((resolve) => liveServer.close(resolve));
    }

    // 5. POST /demo/reset rejects non-admin and succeeds for admin@gec.ac.in
    await request(app)
      .post('/demo/reset')
      .set('Authorization', `Bearer ${noahToken}`)
      .expect(403);

    const adminLogin = await request(app)
      .post('/auth/login')
      .send({ email: 'admin@gec.ac.in', password: 'admin123' })
      .expect(200);
    const resetRes = await request(app)
      .post('/demo/reset')
      .set('Authorization', `Bearer ${adminLogin.body.data.token}`)
      .expect(200);
    assertMetaEnvelope(resetRes.body);
    assert.equal(resetRes.body.data.reset, true);
    assert.ok(resetRes.body.data.counts.attendance >= 100000);
  });
});
