import path from 'node:path';
import { fileURLToPath } from 'node:url';
import mongoose from 'mongoose';
import connectDB from '../config/db.js';

type MongoDb = mongoose.mongo.Db;
type IndexSpec = mongoose.mongo.IndexSpecification;
type CreateIndexesOptions = mongoose.mongo.CreateIndexesOptions;

interface CollectionSpec {
  name: string;
  validator: Record<string, unknown>;
  indexes: Array<{
    key: IndexSpec;
    options?: CreateIndexesOptions;
  }>;
}

const NINETY_DAYS_SECONDS = 90 * 24 * 60 * 60;

// Topic 2: Collection definitions with strict MongoDB $jsonSchema validators (validationAction: "error") and indexes
export const COLLECTION_SPECS: CollectionSpec[] = [
  {
    name: 'users',
    validator: {
      $jsonSchema: {
        bsonType: 'object',
        required: ['name', 'email', 'password', 'role'],
        properties: {
          name: { bsonType: 'string', minLength: 2 },
          email: { bsonType: 'string', pattern: '^.+@.+\\..+$' },
          password: { bsonType: 'string', minLength: 6 },
          role: { enum: ['student', 'faculty', 'admin'] },
          isActive: { bsonType: 'bool' },
        },
      },
    },
    indexes: [{ key: { email: 1 }, options: { name: 'uniq_users_email', unique: true } }],
  },
  {
    name: 'students',
    validator: {
      $jsonSchema: {
        bsonType: 'object',
        required: [
          'userId',
          'name',
          'rollNo',
          'email',
          'semester',
          'section',
          'batch',
          'labBatch',
          'status',
          'guardian',
        ],
        properties: {
          userId: { bsonType: 'objectId' },
          name: { bsonType: 'string', minLength: 2 },
          rollNo: { bsonType: 'string', minLength: 3 },
          email: { bsonType: 'string', pattern: '^.+@.+\\..+$' },
          department: { bsonType: 'string' },
          academicLevel: { bsonType: 'string' },
          semester: { bsonType: ['int', 'long', 'double'], minimum: 1, maximum: 8 },
          section: { enum: ['A', 'B', 'C'] },
          batch: { enum: ['C', 'D'] },
          labBatch: { enum: ['C', 'D'] },
          status: { enum: ['active', 'dropped'] },
          guardian: {
            bsonType: 'object',
            required: ['phone'],
            properties: {
              name: { bsonType: 'string' },
              phone: { bsonType: 'string', minLength: 8 },
              relation: { bsonType: 'string' },
            },
          },
        },
      },
    },
    indexes: [
      { key: { rollNo: 1 }, options: { name: 'uniq_students_rollNo', unique: true } },
      { key: { name: 'text', rollNo: 'text' }, options: { name: 'text_students_name_rollNo' } },
      { key: { userId: 1 }, options: { name: 'idx_students_userId' } },
      { key: { semester: 1, section: 1, batch: 1 }, options: { name: 'idx_students_sem_sec_batch' } },
    ],
  },
  {
    name: 'courses',
    validator: {
      $jsonSchema: {
        bsonType: 'object',
        required: ['code', 'name', 'shortName', 'type', 'category', 'semester', 'minAttendance'],
        properties: {
          code: { bsonType: 'string', minLength: 3 },
          name: { bsonType: 'string', minLength: 2 },
          shortName: { bsonType: 'string', minLength: 1 },
          type: { enum: ['theory', 'lab', 'other'] },
          category: { enum: ['mandatory', 'elective', 'activity'] },
          credits: { bsonType: ['int', 'long', 'double'], minimum: 0 },
          semester: { bsonType: ['int', 'long', 'double'], minimum: 1, maximum: 8 },
          minAttendance: { bsonType: ['int', 'long', 'double'], minimum: 0, maximum: 100 },
          facultyId: { bsonType: ['objectId', 'null'] },
          department: { bsonType: 'string' },
          academicLevel: { bsonType: 'string' },
        },
      },
    },
    indexes: [
      { key: { code: 1 }, options: { name: 'uniq_courses_code', unique: true } },
      { key: { semester: 1, category: 1 }, options: { name: 'idx_courses_sem_cat' } },
    ],
  },
  {
    name: 'timetable_slots',
    validator: {
      $jsonSchema: {
        bsonType: 'object',
        required: [
          'slotKey',
          'semester',
          'section',
          'day',
          'start',
          'end',
          'courseId',
          'courseCode',
          'courseName',
          'type',
          'batch',
          'room',
        ],
        properties: {
          slotKey: { bsonType: 'string', minLength: 2 },
          semester: { bsonType: ['int', 'long', 'double'], minimum: 1, maximum: 8 },
          section: { enum: ['A', 'B', 'C'] },
          day: { enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'] },
          start: { bsonType: 'string', pattern: '^\\d{2}:\\d{2}$' },
          end: { bsonType: 'string', pattern: '^\\d{2}:\\d{2}$' },
          courseId: { bsonType: 'objectId' },
          courseCode: { bsonType: 'string', minLength: 3 },
          courseName: { bsonType: 'string', minLength: 1 },
          type: { enum: ['theory', 'lab', 'other'] },
          batch: { bsonType: ['string', 'null'], enum: ['C', 'D', null] },
          room: { bsonType: 'string', minLength: 1 },
          facultyId: { bsonType: ['objectId', 'null'] },
        },
      },
    },
    indexes: [
      {
        key: { semester: 1, section: 1, day: 1, start: 1 },
        options: { name: 'idx_slots_sem_sec_day_start' },
      },
      {
        key: { semester: 1, section: 1, slotKey: 1 },
        options: { name: 'uniq_slots_sem_sec_key', unique: true },
      },
    ],
  },
  {
    name: 'attendance',
    validator: {
      $jsonSchema: {
        bsonType: 'object',
        required: ['studentId', 'courseId', 'slotId', 'dateKey', 'status', 'markedAt', 'source'],
        properties: {
          studentId: { bsonType: 'objectId' },
          courseId: { bsonType: 'objectId' },
          slotId: { bsonType: 'objectId' },
          dateKey: { bsonType: 'string', pattern: '^\\d{4}-\\d{2}-\\d{2}$' },
          status: { enum: ['P', 'A'] },
          markedAt: { bsonType: 'date' },
          source: { enum: ['seed', 'manual', 'qr', 'sync', 'api'] },
        },
      },
    },
    indexes: [
      // Topic 2 & 9: Shard-key-prefixed unique index ({ studentId, dateKey } shard key prefix + slotId)
      {
        key: { studentId: 1, dateKey: 1, slotId: 1 },
        options: { name: 'uniq_attendance_student_date_slot', unique: true },
      },
      { key: { studentId: 1, courseId: 1 }, options: { name: 'idx_attendance_student_course' } },
      { key: { studentId: 1, markedAt: -1 }, options: { name: 'idx_attendance_student_markedAt' } },
    ],
  },
  {
    name: 'notifications',
    validator: {
      $jsonSchema: {
        bsonType: 'object',
        required: ['studentId', 'type', 'title', 'body', 'read', 'createdAt'],
        properties: {
          studentId: { bsonType: 'objectId' },
          courseId: { bsonType: ['objectId', 'null'] },
          slotId: { bsonType: ['objectId', 'null'] },
          type: {
            enum: ['lecture_started', 'low_attendance_warning', 'attendance_marked', 'system'],
          },
          title: { bsonType: 'string', minLength: 1 },
          body: { bsonType: 'string', minLength: 1 },
          read: { bsonType: 'bool' },
          createdAt: { bsonType: 'date' },
        },
      },
    },
    indexes: [
      {
        key: { studentId: 1, read: 1, createdAt: -1 },
        options: { name: 'idx_notif_student_read_createdAt' },
      },
      // Topic 9: Hashed shard key index on notifications { studentId: "hashed" }
      {
        key: { studentId: 'hashed' },
        options: { name: 'studentId_hashed' },
      },
      // Topic 2: TTL index expiring notifications automatically after 90 days
      {
        key: { createdAt: 1 },
        options: { name: 'ttl_notif_createdAt_90d', expireAfterSeconds: NINETY_DAYS_SECONDS },
      },
    ],
  },
  {
    name: 'audit_log',
    validator: {
      $jsonSchema: {
        bsonType: 'object',
        required: ['action', 'collectionName', 'createdAt'],
        properties: {
          actorId: { bsonType: ['objectId', 'null'] },
          studentId: { bsonType: ['objectId', 'null'] },
          action: { bsonType: 'string', minLength: 1 },
          collectionName: { bsonType: 'string', minLength: 1 },
          documentId: { bsonType: ['objectId', 'null'] },
          createdAt: { bsonType: 'date' },
        },
      },
    },
    indexes: [
      { key: { studentId: 1, createdAt: -1 }, options: { name: 'idx_audit_student_createdAt' } },
      { key: { action: 1, createdAt: -1 }, options: { name: 'idx_audit_action_createdAt' } },
    ],
  },
];

// Clean up legacy orphaned collections if they exist from older iterations
const LEGACY_COLLECTIONS = [
  'attendancerecords',
  'attendancesessions',
  'notificationpreferences',
  'studentenrollments',
  'timetableexceptions',
  'subjects',
  'timetables',
  'demo_probe',
];

export async function setupDatabase(dbArg?: MongoDb): Promise<{
  collections: string[];
  indexesCreated: number;
}> {
  const db = dbArg ?? mongoose.connection.db;
  if (!db) {
    throw new Error('MongoDB database handle is not initialized');
  }

  // Topic 2: List existing collections to decide createCollection vs collMod
  const existing = await db.listCollections({}, { nameOnly: true }).toArray();
  const existingNames = new Set(existing.map((c) => c.name));

  for (const legacy of LEGACY_COLLECTIONS) {
    if (existingNames.has(legacy)) {
      await db.dropCollection(legacy).catch(() => { });
    }
  }

  let indexesCreated = 0;

  for (const spec of COLLECTION_SPECS) {
    if (!existingNames.has(spec.name)) {
      try {
        // Topic 2: Create collection with strict $jsonSchema validator and validationAction: "error"
        await db.createCollection(spec.name, {
          validator: spec.validator,
          validationLevel: 'strict',
          validationAction: 'error',
        });
      } catch (err) {
        if ((err as { code?: number })?.code !== 48) {
          throw err;
        }
        // Collection was created concurrently (e.g. by Mongoose autoIndex); apply collMod instead
        await db.command({
          collMod: spec.name,
          validator: spec.validator,
          validationLevel: 'strict',
          validationAction: 'error',
        });
      }
    } else {
      // Topic 2: Enforce/update strict $jsonSchema validator on existing collection
      await db.command({
        collMod: spec.name,
        validator: spec.validator,
        validationLevel: 'strict',
        validationAction: 'error',
      });
    }

    const col = db.collection(spec.name);

    // Drop legacy/mismatched non-_id indexes so setup stays idempotent and exact (preserve hashed/shard keys)
    const currentIndexes = await col.indexes().catch(() => []);
    const desiredNames = new Set(spec.indexes.map((idx) => idx.options?.name).filter(Boolean));
    for (const cur of currentIndexes) {
      if (
        cur.name &&
        cur.name !== '_id_' &&
        cur.name !== 'studentId_hashed' &&
        !desiredNames.has(cur.name)
      ) {
        await col.dropIndex(cur.name).catch(() => { });
      }
    }

    // Topic 2: Create declared indexes (unique, compound, text, TTL)
    const refreshedIndexes = await col.indexes().catch(() => []);
    for (const idx of spec.indexes) {
      const targetKeyJson = JSON.stringify(idx.key);
      const alreadyMatching = refreshedIndexes.some(
        (cur) =>
          cur.key &&
          JSON.stringify(cur.key) === targetKeyJson &&
          Boolean(cur.unique) === Boolean(idx.options?.unique)
      );
      if (!alreadyMatching) {
        await col.createIndex(idx.key, idx.options ?? {});
      }
      indexesCreated++;
    }
  }

  return {
    collections: COLLECTION_SPECS.map((c) => c.name),
    indexesCreated,
  };
}

const isDirectRun =
  Boolean(process.argv[1]) &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isDirectRun) {
  (async () => {
    try {
      await connectDB();
      const result = await setupDatabase();
      console.log('MongoDB schema setup complete:', JSON.stringify(result));
      await connectDB.disconnectDB();
      process.exit(0);
    } catch (err) {
      console.error('MongoDB setup failed:', err);
      process.exit(1);
    }
  })();
}
