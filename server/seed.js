require('dotenv').config();
const bcrypt = require('bcryptjs');
const connectDB = require('./config/db');
const {
  User,
  Student,
  Course,
  TimetableSlot,
  Attendance,
  Notification,
  AuditLog,
} = require('./models');

const FIRST_NAMES = [
  'Aarav', 'Aditi', 'Advait', 'Ananya', 'Arjun', 'Aryan', 'Avni', 'Chirag', 'Dev', 'Diya',
  'Esha', 'Gaurav', 'Harsh', 'Ishaan', 'Jhanvi', 'Kabir', 'Kavya', 'Kiran', 'Kriti', 'Manav',
  'Meera', 'Mihir', 'Neha', 'Nikhil', 'Nisha', 'Omkar', 'Palak', 'Pranav', 'Priya', 'Rahul',
  'Rhea', 'Rohan', 'Roshni', 'Sagar', 'Sahil', 'Sakshi', 'Sameer', 'Sanika', 'Shreya', 'Siddharth',
  'Sneha', 'Tanvi', 'Tejas', 'Urvi', 'Vaibhav', 'Varun', 'Vedant', 'Vidya', 'Yash', 'Zoya',
];

const LAST_NAMES = [
  'Naik', 'Dessai', 'Kamat', 'Sawant', 'Prabhu', 'Shet', 'Pai', 'Shenoy', 'Kulkarni', 'Joshi',
  'Patil', 'Deshpande', 'Rane', 'Korgaonkar', 'Fernandes', 'D\'Souza', 'Rodrigues', 'Pereira', 'Dias', 'Gomes',
  'Bhat', 'Hegde', 'Rao', 'Sharma', 'Verma', 'Kulkarni', 'Chari', 'Gaonkar', 'Velip', 'Parab',
];

const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
const SECTIONS = ['A', 'B', 'C'];
const BATCH_SIZE = 5000;

// Deterministic PRNG for repeatable realistic attendance patterns across runs
function createPrng(seedNum) {
  let state = seedNum >>> 0;
  return () => {
    state = (1664525 * state + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

// Convert IST dateKey (YYYY-MM-DD) + IST "HH:mm" into UTC Date
function istSlotToUtcDate(year, month, day, timeStr) {
  const [hh, mm] = timeStr.split(':').map(Number);
  // IST is UTC+05:30 (330 minutes); mark 10 minutes after slot start
  const utcMs = Date.UTC(year, month - 1, day, hh, mm + 10, 0) - 330 * 60 * 1000;
  return new Date(utcMs);
}

// Get IST weekday name for calendar date (Monday..Friday, or null on weekends)
function getIstWeekday(year, month, day) {
  const probeUtc = new Date(Date.UTC(year, month - 1, day, 6, 30, 0)); // 12:00 IST
  const weekday = probeUtc.toLocaleDateString('en-US', {
    timeZone: 'Asia/Kolkata',
    weekday: 'long',
  });
  return DAY_NAMES.includes(weekday) ? weekday : null;
}

// Topic 3: Batched insertMany(..., { ordered: false }) helper
async function insertInBatches(model, docs, batchSize = BATCH_SIZE) {
  let totalInserted = 0;
  for (let i = 0; i < docs.length; i += batchSize) {
    const chunk = docs.slice(i, i + batchSize);
    const res = await model.collection.insertMany(chunk, { ordered: false });
    totalInserted += res.insertedCount;
  }
  return totalInserted;
}

async function seed({ manageConnection = true } = {}) {
  const startedAt = Date.now();
  try {
    if (manageConnection || connectDB.mongoose.connection.readyState !== 1) {
      await connectDB();
    }
    const db = connectDB.mongoose.connection.db;
    const admin = db.admin();
    const hello = await admin.command({ hello: 1 }).catch(() => ({}));
    const isMongos = hello?.msg === 'isdbgrid';
    const isShardedMode =
      isMongos || process.env.SEED_SHARDED === '1' || process.argv.includes('--sharded');
    const totalStudents = parseInt(
      process.env.SEED_STUDENTS || (isShardedMode ? '620' : '300'),
      10
    );

    // Import real Sem 5 subjects & timetable slots directly from frontend engine
    const { SEMESTER_5_SUBJECTS, TIMETABLE_SLOTS } = await import('../src/services/timetable.ts');
    const { setupDatabase } = await import('./db/setup.ts');

    // Topic 2: Create collections with $jsonSchema validators & indexes
    await setupDatabase(db);

    // Clear existing collections for clean deterministic seeding
    await Promise.all([
      User.deleteMany({}),
      Student.deleteMany({}),
      Course.deleteMany({}),
      TimetableSlot.deleteMany({}),
      Attendance.deleteMany({}),
      Notification.deleteMany({}),
      AuditLog.deleteMany({}),
    ]);

    const nowUtc = new Date();
    const [adminHash, facultyHash, demoHash, studentHash] = await Promise.all([
      bcrypt.hash('admin123', 10),
      bcrypt.hash('faculty123', 10),
      bcrypt.hash('demo123', 10),
      bcrypt.hash('student123', 10),
    ]);

    // 1. Seed Users (1 admin + 3 faculty + 300 students) using Topic 3 insertMany ordered:false
    const userDocs = [
      {
        name: 'Campus Admin',
        email: 'admin@gec.ac.in',
        password: adminHash,
        role: 'admin',
        isActive: true,
        createdAt: nowUtc,
        updatedAt: nowUtc,
      },
      {
        name: 'Prof. A. Sharma',
        email: 'sharma.a@gec.ac.in',
        password: facultyHash,
        role: 'faculty',
        isActive: true,
        createdAt: nowUtc,
        updatedAt: nowUtc,
      },
      {
        name: 'Prof. R. Mehta',
        email: 'mehta.r@gec.ac.in',
        password: facultyHash,
        role: 'faculty',
        isActive: true,
        createdAt: nowUtc,
        updatedAt: nowUtc,
      },
      {
        name: 'Prof. S. Patel',
        email: 'patel.s@gec.ac.in',
        password: facultyHash,
        role: 'faculty',
        isActive: true,
        createdAt: nowUtc,
        updatedAt: nowUtc,
      },
    ];

    // Demo student #1: Noah Menezes (password: demo123)
    userDocs.push({
      name: 'Noah Menezes',
      email: 'nnm1.s24@gec.ac.in',
      password: demoHash,
      role: 'student',
      isActive: true,
      createdAt: nowUtc,
      updatedAt: nowUtc,
    });

    // Remaining 299 students
    const studentMetaList = [
      {
        name: 'Noah Menezes',
        email: 'nnm1.s24@gec.ac.in',
        rollNo: '24CE001',
        section: 'B',
        batch: 'C',
        guardian: {
          name: 'Mario Menezes',
          phone: '+91-9823000001',
          relation: 'Father',
        },
      },
    ];

    for (let i = 2; i <= totalStudents; i++) {
      const first = FIRST_NAMES[(i - 2) % FIRST_NAMES.length];
      const last = LAST_NAMES[Math.floor((i - 2) / FIRST_NAMES.length) % LAST_NAMES.length];
      const name = `${first} ${last}`;
      const numStr = String(i).padStart(3, '0');
      const email = `stu${numStr}.s24@gec.ac.in`;
      const rollNo = `24CE${numStr}`;
      const section = SECTIONS[(i - 1) % SECTIONS.length]; // Distributed across A, B, C
      const batch = i % 2 === 1 ? 'C' : 'D';
      const guardianPhone = `+91-9823${String(100000 + i).slice(0, 6)}`;

      userDocs.push({
        name,
        email,
        password: studentHash,
        role: 'student',
        isActive: true,
        createdAt: nowUtc,
        updatedAt: nowUtc,
      });

      studentMetaList.push({
        name,
        email,
        rollNo,
        section,
        batch,
        guardian: {
          name: `${first}'s Guardian (${last})`,
          phone: guardianPhone,
          relation: i % 2 === 0 ? 'Mother' : 'Father',
        },
      });
    }

    // Topic 3: Batch insert users
    const userInsertRes = await User.collection.insertMany(userDocs, { ordered: false });
    const adminUserId = userInsertRes.insertedIds[0];
    const facultyIds = [
      userInsertRes.insertedIds[1],
      userInsertRes.insertedIds[2],
      userInsertRes.insertedIds[3],
    ];

    // 2. Seed 300 Students linked to their User records
    const studentDocs = studentMetaList.map((meta, idx) => ({
      userId: userInsertRes.insertedIds[4 + idx],
      name: meta.name,
      rollNo: meta.rollNo,
      email: meta.email,
      department: 'Computer Engineering',
      academicLevel: 'SE',
      semester: 5,
      section: meta.section,
      batch: meta.batch,
      labBatch: meta.batch,
      status: 'active',
      guardian: meta.guardian,
      createdAt: nowUtc,
      updatedAt: nowUtc,
    }));

    const studentInsertRes = await Student.collection.insertMany(studentDocs, { ordered: false });
    const seededStudents = studentDocs.map((s, idx) => ({
      _id: studentInsertRes.insertedIds[idx],
      ...s,
    }));

    // 3. Seed 11 Courses (10 from SEMESTER_5_SUBJECTS + NCC301)
    const rawCourses = [
      ...SEMESTER_5_SUBJECTS.map((s, idx) => ({
        code: s.code.toUpperCase(),
        name: s.name,
        shortName: s.shortName,
        type: s.type,
        category: s.category,
        credits: s.credits,
        semester: s.semester,
        minAttendance: 75,
        facultyId: facultyIds[idx % facultyIds.length],
        department: 'Computer Engineering',
        academicLevel: 'SE',
        createdAt: nowUtc,
        updatedAt: nowUtc,
      })),
      {
        code: 'NCC301',
        name: 'NCC / NSS / Mentoring',
        shortName: 'NCC/NSS',
        type: 'other',
        category: 'activity',
        credits: 0,
        semester: 5,
        minAttendance: 75,
        facultyId: facultyIds[0],
        department: 'Computer Engineering',
        academicLevel: 'SE',
        createdAt: nowUtc,
        updatedAt: nowUtc,
      },
    ];

    // Topic 3: Batch insert courses
    const courseInsertRes = await Course.collection.insertMany(rawCourses, { ordered: false });
    const courseByCode = new Map();
    rawCourses.forEach((c, idx) => {
      courseByCode.set(c.code, { _id: courseInsertRes.insertedIds[idx], ...c });
    });

    // 4. Seed Timetable Slots for Sections A, B, C (batch = null for theory/other!)
    const slotDocs = [];
    for (const section of SECTIONS) {
      for (const slot of TIMETABLE_SLOTS) {
        const course = courseByCode.get(slot.subjectCode.toUpperCase());
        if (!course) continue;
        slotDocs.push({
          slotKey: slot.id,
          semester: 5,
          section,
          day: slot.day,
          start: slot.startTime,
          end: slot.endTime,
          courseId: course._id,
          courseCode: course.code,
          courseName: slot.subjectName,
          type: slot.type,
          // Theory and activity slots use batch: null; lab slots use 'C' or 'D'
          batch: slot.batch === 'all' ? null : slot.batch,
          room: slot.room,
          facultyId: course.facultyId,
          createdAt: nowUtc,
          updatedAt: nowUtc,
        });
      }
    }

    // Topic 3: Batch insert timetable slots
    const slotInsertRes = await TimetableSlot.collection.insertMany(slotDocs, { ordered: false });
    const seededSlots = slotDocs.map((s, idx) => ({
      _id: slotInsertRes.insertedIds[idx],
      ...s,
    }));

    // Index slots by `${section}|${day}` for fast lookup during attendance generation
    const slotsBySecDay = new Map();
    for (const s of seededSlots) {
      const k = `${s.section}|${s.day}`;
      if (!slotsBySecDay.has(k)) slotsBySecDay.set(k, []);
      slotsBySecDay.get(k).push(s);
    }

    // 5. Generate Aug-Nov 2026 weekdays (2026-08-01 to 2026-11-24, skipping weekends)
    const weekdays = [];
    const cursor = new Date(Date.UTC(2026, 7, 1)); // 2026-08-01
    const endDate = new Date(Date.UTC(2026, 10, 24)); // 2026-11-24 (leaves 2026-11-25 live for demo)
    while (cursor <= endDate) {
      const y = cursor.getUTCFullYear();
      const m = cursor.getUTCMonth() + 1;
      const d = cursor.getUTCDate();
      const dayName = getIstWeekday(y, m, d);
      if (dayName) {
        weekdays.push({
          year: y,
          month: m,
          day: d,
          dayName,
          dateKey: `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`,
        });
      }
      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }

    // Topic 9: Pre-split range chunks on {studentId, dateKey} across shards when seeding through mongos
    if (isMongos && seededStudents.length >= 8) {
      try {
        const listShardsRes = await admin.command({ listShards: 1 });
        const shards = listShardsRes.shards || [];
        if (shards.length >= 2) {
          const configDb = connectDB.mongoose.connection.client.db('config');
          const attColMeta = await configDb
            .collection('collections')
            .findOne({ _id: 'campus_student.attendance' });
          const existingChunks = attColMeta?.uuid
            ? await configDb.collection('chunks').find({ uuid: attColMeta.uuid }).toArray()
            : await configDb
                .collection('chunks')
                .find({ ns: 'campus_student.attendance' })
                .toArray();

          if (existingChunks.length <= 1) {
            const q1 = seededStudents[Math.floor(seededStudents.length * 0.25)]._id;
            const q2 = seededStudents[Math.floor(seededStudents.length * 0.5)]._id;
            const q3 = seededStudents[Math.floor(seededStudents.length * 0.75)]._id;
            for (const mid of [q1, q2, q3]) {
              await admin
                .command({
                  split: 'campus_student.attendance',
                  middle: { studentId: mid, dateKey: '' },
                })
                .catch(() => {});
            }
            // Place lower half of student ranges on shards[1] and upper half on shards[0] (or balanced)
            await admin
              .command({
                moveChunk: 'campus_student.attendance',
                find: { studentId: seededStudents[0]._id, dateKey: '' },
                to: shards[0]._id,
              })
              .catch(() => {});
            await admin
              .command({
                moveChunk: 'campus_student.attendance',
                find: { studentId: q1, dateKey: '' },
                to: shards[1]._id,
              })
              .catch(() => {});
            await admin
              .command({
                moveChunk: 'campus_student.attendance',
                find: { studentId: q2, dateKey: '' },
                to: shards[0]._id,
              })
              .catch(() => {});
            await admin
              .command({
                moveChunk: 'campus_student.attendance',
                find: { studentId: q3, dateKey: '' },
                to: shards[1]._id,
              })
              .catch(() => {});
          }
        }
      } catch (splitErr) {
        console.warn('Pre-split skipped:', splitErr.message);
      }
    }

    // 6. Generate attendance records in batches (bulk students + Noah demo marks)
    const prng = createPrng(20261125);
    const attendanceDocs = [];
    let attendanceInserted = 0;

    const flushAttendanceIfNeeded = async (force = false) => {
      if (attendanceDocs.length >= BATCH_SIZE || (force && attendanceDocs.length > 0)) {
        const toWrite = attendanceDocs.splice(0, attendanceDocs.length);
        // Topic 3: Batched insertMany with ordered:false respecting unique {studentId, dateKey, slotId}
        attendanceInserted += await insertInBatches(Attendance, toWrite, BATCH_SIZE);
      }
    };

    // Student #0 = Noah Menezes: keep only a few marks (last 3 weekdays in Nov 2026)
    const noah = seededStudents[0];
    const noahDays = weekdays.slice(-3); // e.g., Nov 20 (Fri), Nov 23 (Mon), Nov 24 (Tue)
    let noahMarksCount = 0;
    for (const wd of noahDays) {
      const daySlots = (slotsBySecDay.get(`${noah.section}|${wd.dayName}`) || []).filter(
        (s) => s.batch === null || s.batch === noah.batch
      );
      for (let sIdx = 0; sIdx < daySlots.length; sIdx++) {
        const slot = daySlots[sIdx];
        // Give Noah a realistic mix (~10 P, ~4 A across recent days)
        const status = noahMarksCount % 4 === 2 ? 'A' : 'P';
        attendanceDocs.push({
          studentId: noah._id,
          courseId: slot.courseId,
          slotId: slot._id,
          dateKey: wd.dateKey,
          status,
          markedAt: istSlotToUtcDate(wd.year, wd.month, wd.day, slot.start),
          source: 'seed',
        });
        noahMarksCount++;
      }
    }

    // Students #1..299: full Aug-Nov 2026 attendance with realistic safe / 70-78% / defaulter bands
    for (let idx = 1; idx < seededStudents.length; idx++) {
      const student = seededStudents[idx];
      let targetPresentRate;
      const band = idx % 10;
      if (band < 5) {
        // Safe students (82% - 94%)
        targetPresentRate = 0.82 + (idx % 7) * 0.02;
      } else if (band < 8) {
        // Explicit 70% - 78% borderline students (some defaulters 70-74%, some at-risk 75-78%)
        targetPresentRate = 0.70 + (idx % 9) * 0.01;
      } else {
        // Defaulter students (56% - 68%)
        targetPresentRate = 0.56 + (idx % 7) * 0.02;
      }

      for (const wd of weekdays) {
        const daySlots = (slotsBySecDay.get(`${student.section}|${wd.dayName}`) || []).filter(
          (s) => s.batch === null || s.batch === student.batch
        );
        for (const slot of daySlots) {
          // Skip ~2% of records on last week so pending rows exist realistically
          if (wd.dateKey >= '2026-11-18' && prng() < 0.05) {
            continue;
          }
          const status = prng() < targetPresentRate ? 'P' : 'A';
          attendanceDocs.push({
            studentId: student._id,
            courseId: slot.courseId,
            slotId: slot._id,
            dateKey: wd.dateKey,
            status,
            markedAt: istSlotToUtcDate(wd.year, wd.month, wd.day, slot.start),
            source: 'seed',
          });
          if (attendanceDocs.length >= BATCH_SIZE) {
            await flushAttendanceIfNeeded(true);
          }
        }
      }
    }
    await flushAttendanceIfNeeded(true);

    // 7. Seed sample notifications (for Noah + borderline students)
    const dbmsCourse = courseByCode.get('CECMP300');
    const daaLabCourse = courseByCode.get('CECMP307');
    const sampleNotifs = [
      {
        studentId: noah._id,
        courseId: dbmsCourse._id,
        slotId: null,
        type: 'system',
        title: 'Semester 5 Schedule Ready',
        body: 'Section B (Batch C) timetable and 11 Semester 5 courses synced.',
        read: true,
        createdAt: new Date(nowUtc.getTime() - 24 * 60 * 60 * 1000),
        updatedAt: nowUtc,
      },
      {
        studentId: noah._id,
        courseId: daaLabCourse._id,
        slotId: null,
        type: 'low_attendance_warning',
        title: 'Attendance Watch: DAA Lab',
        body: 'Keep your attendance at or above 75% across all theory and lab courses.',
        read: false,
        createdAt: new Date(nowUtc.getTime() - 2 * 60 * 60 * 1000),
        updatedAt: nowUtc,
      },
    ];
    const notifLimit = isShardedMode ? Math.min(100, seededStudents.length - 1) : 10;
    for (let i = 1; i <= notifLimit; i++) {
      sampleNotifs.push({
        studentId: seededStudents[i]._id,
        courseId: dbmsCourse._id,
        slotId: null,
        type: 'low_attendance_warning',
        title: 'Attendance Threshold Alert',
        body: 'Attendance is near or below the 75% minimum policy requirement.',
        read: i % 2 === 0,
        createdAt: new Date(nowUtc.getTime() - i * 3600 * 1000),
        updatedAt: nowUtc,
      });
    }
    const notifInsertRes = await Notification.collection.insertMany(sampleNotifs, { ordered: false });

    // 8. Record seed operation in audit_log
    await AuditLog.collection.insertMany(
      [
        {
          actorId: adminUserId,
          studentId: null,
          action: 'DATABASE_SEED',
          collectionName: 'attendance',
          documentId: null,
          before: null,
          after: {
            users: userInsertRes.insertedCount,
            students: studentInsertRes.insertedCount,
            courses: courseInsertRes.insertedCount,
            timetable_slots: slotInsertRes.insertedCount,
            attendance: attendanceInserted,
            notifications: notifInsertRes.insertedCount,
          },
          metadata: {
            dateRange: '2026-08-01..2026-11-24',
            weekdays: weekdays.length,
            demoStudent: { name: noah.name, email: noah.email, marks: noahMarksCount },
          },
          createdAt: nowUtc,
        },
      ],
      { ordered: false }
    );

    // 9. Print exact collection summary counts
    const [
      usersCount,
      studentsCount,
      coursesCount,
      slotsCount,
      attendanceCount,
      notificationsCount,
      auditLogCount,
    ] = await Promise.all([
      User.countDocuments(),
      Student.countDocuments(),
      Course.countDocuments(),
      TimetableSlot.countDocuments(),
      Attendance.countDocuments(),
      Notification.countDocuments(),
      AuditLog.countDocuments(),
    ]);

    const elapsedMs = Date.now() - startedAt;
    const summary = {
      elapsedMs,
      weekdays: weekdays.length,
      demoStudent: { name: noah.name, email: noah.email, marks: noahMarksCount },
      counts: {
        users: usersCount,
        students: studentsCount,
        courses: coursesCount,
        timetable_slots: slotsCount,
        attendance: attendanceCount,
        notifications: notificationsCount,
        audit_log: auditLogCount,
      },
    };

    if (manageConnection) {
      console.log('\n=== Seed Completed Successfully ===');
      console.log(`Elapsed: ${elapsedMs} ms`);
      console.log(`Weekdays generated (Aug-Nov 2026): ${weekdays.length}`);
      console.log(`Demo Student: ${noah.name} (${noah.email} / demo123) -> ${noahMarksCount} marks`);
      console.log('Collection counts:');
      console.log(`  users:           ${usersCount}`);
      console.log(`  students:        ${studentsCount}`);
      console.log(`  courses:         ${coursesCount}`);
      console.log(`  timetable_slots: ${slotsCount}`);
      console.log(`  attendance:      ${attendanceCount}`);
      console.log(`  notifications:   ${notificationsCount}`);
      console.log(`  audit_log:       ${auditLogCount}`);

      await connectDB.disconnectDB();
      process.exit(0);
    }

    return summary;
  } catch (error) {
    if (manageConnection) {
      console.error('Seeding error:', error);
      process.exit(1);
    }
    throw error;
  }
}

if (require.main === module) {
  seed({ manageConnection: true });
}

module.exports = { seed, runSeed: seed };
