const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
const Attendance = require('../models/Attendance');
const AuditLog = require('../models/AuditLog');
const Notification = require('../models/Notification');
const Student = require('../models/Student');
const attendanceStats = require('../services/attendanceStats');
const { authenticateToken } = require('../middleware/auth');
const { sendSuccess, sendError } = require('../utils/response');
const { tag, recordQuery, runAggregate, buildMeta } = require('../utils/mongoTrace');
const { runSeed } = require('../seed');

const READY_STATE_LABELS = {
  0: 'disconnected',
  1: 'connected',
  2: 'connecting',
  3: 'disconnecting',
};

const formatCollStatsRow = (row, fallbackShard = 'rs0') => ({
  shard: row.shard || fallbackShard,
  host: row.host || null,
  ns: row.ns || null,
  storageStats: {
    count: row.storageStats?.count ?? 0,
    size: row.storageStats?.size ?? 0,
    avgObjSize: row.storageStats?.avgObjSize ?? 0,
    storageSize: row.storageStats?.storageSize ?? 0,
    totalIndexSize: row.storageStats?.totalIndexSize ?? 0,
    nindexes: row.storageStats?.nindexes ?? 0,
    indexSizes: row.storageStats?.indexSizes || {},
  },
});

const requireDemoDbReady = (req, res, next) => {
  const readyState = mongoose.connection.readyState;
  if (readyState !== 1 || !mongoose.connection.db) {
    tag(
      req,
      8,
      ['readyState', 'serverSelectionTimeoutMS'],
      'Signals clients immediately when MongoDB is disconnected or failing over.'
    );
    return res.status(503).json({
      data: {
        status: 'reconnecting',
        readyState,
        readyStateLabel: READY_STATE_LABELS[readyState] || 'unknown',
        message: 'MongoDB is reconnecting, please retry shortly',
      },
      meta: buildMeta(req),
    });
  }
  next();
};

// Topic 1 & 8: GET /demo/health - live ping, buildInfo version, readyState, and replica primary
router.get('/health', async (req, res) => {
  const PORT = process.env.PORT || 4000;
  const readyState = mongoose.connection.readyState;
  const readyStateLabel = READY_STATE_LABELS[readyState] || 'unknown';

  try {
    if (readyState !== 1 || !mongoose.connection.db) {
      tag(
        req,
        1,
        ['admin().ping()', 'buildInfo', 'readyState'],
        'Reports Mongoose connection state when MongoDB is disconnected or selecting a server.'
      );
      tag(
        req,
        8,
        ['replSetGetStatus', 'serverSelectionTimeoutMS'],
        'Tracks replica set availability during primary election or node loss.'
      );
      return res.status(503).json({
        data: {
          status: 'reconnecting',
          service: 'campus-student-api',
          port: PORT,
          ping: null,
          version: null,
          readyState,
          readyStateLabel,
          replicaSet: null,
          replicaPrimary: null,
          members: [],
        },
        meta: buildMeta(req),
      });
    }

    tag(
      req,
      1,
      ['admin().ping()', 'buildInfo', 'mongoose.connection.readyState'],
      'Verifies live MongoDB reachability, server version, and driver connection state.'
    );
    tag(
      req,
      8,
      ['replSetGetStatus', 'retryWrites', 'retryReads', 'w:majority'],
      'Surfaces current rs0 primary and member states across automatic failovers.'
    );

    const admin = mongoose.connection.db.admin();
    const ping = await admin.ping();
    recordQuery(req, { collection: 'admin', op: 'ping', filter: { ping: 1 } });

    const buildInfo = await admin.command({ buildInfo: 1 });
    recordQuery(req, { collection: 'admin', op: 'command', filter: { buildInfo: 1 } });

    let replicaSet = null;
    let replicaPrimary = null;
    let members = [];
    try {
      const rsStatus = await admin.command({ replSetGetStatus: 1 });
      recordQuery(req, { collection: 'admin', op: 'command', filter: { replSetGetStatus: 1 } });
      replicaSet = rsStatus.set || null;
      members = (rsStatus.members || []).map((m) => ({
        id: m._id,
        name: m.name,
        stateStr: m.stateStr,
        health: m.health,
      }));
      const primary = members.find((m) => m.stateStr === 'PRIMARY');
      replicaPrimary = primary ? primary.name : null;
    } catch (rsErr) {
      recordQuery(req, {
        collection: 'admin',
        op: 'command',
        filter: { replSetGetStatus: 1, error: rsErr.message },
      });
    }

    return res.json({
      data: {
        status: ping?.ok === 1 ? 'ok' : 'degraded',
        service: 'campus-student-api',
        port: PORT,
        ping,
        version: buildInfo.version,
        readyState,
        readyStateLabel,
        replicaSet,
        replicaPrimary,
        members,
      },
      meta: buildMeta(req),
    });
  } catch (error) {
    tag(
      req,
      1,
      ['admin().ping()', 'buildInfo'],
      'Captures health probe errors during transient failover.'
    );
    return res.status(500).json({
      data: {
        status: 'error',
        service: 'campus-student-api',
        port: PORT,
        readyState: mongoose.connection.readyState,
        readyStateLabel: READY_STATE_LABELS[mongoose.connection.readyState] || 'unknown',
        error: error.message,
      },
      meta: buildMeta(req),
    });
  }
});

// Topic 8: GET /demo/replica-set - live rs.status() members, failover commands, and recent oplog preview
router.get('/replica-set', requireDemoDbReady, async (req, res) => {
  try {
    tag(
      req,
      8,
      ['replSetGetStatus', 'local.oplog.rs', 'retryWrites', 'w: "majority"'],
      'Inspects live replica set member health, optime lag, failover steps, and recent oplog entries.'
    );

    const client = mongoose.connection.getClient();
    const admin = mongoose.connection.db.admin();
    const hello = await admin.command({ hello: 1 });
    recordQuery(req, { collection: 'admin', op: 'command', filter: { hello: 1 } });

    let replicaSet = hello?.setName || null;
    let members = [];
    let replicaPrimary = null;
    let statusError = null;

    try {
      const rsStatus = await admin.command({ replSetGetStatus: 1 });
      recordQuery(req, { collection: 'admin', op: 'command', filter: { replSetGetStatus: 1 } });
      replicaSet = rsStatus.set || replicaSet;
      members = (rsStatus.members || []).map((m) => ({
        id: m._id,
        name: m.name,
        state: m.state,
        stateStr: m.stateStr,
        health: m.health,
        uptime: m.uptime ?? 0,
        pingMs: m.pingMs ?? 0,
        syncSourceHost: m.syncSourceHost || null,
        optimeDate: m.optimeDate ? new Date(m.optimeDate).toISOString() : null,
        electionTime: m.electionDate ? new Date(m.electionDate).toISOString() : null,
        self: Boolean(m.self),
      }));
      const p = members.find((m) => m.stateStr === 'PRIMARY');
      replicaPrimary = p ? p.name : null;
    } catch (err) {
      statusError = err.message;
    }

    let oplogSupported = false;
    let oplogReason = null;
    let oplog = [];
    try {
      const localDb = client.db('local');
      const entries = await localDb
        .collection('oplog.rs')
        .find({}, { projection: { ts: 1, op: 1, ns: 1, wall: 1, o: 1, o2: 1 } })
        .sort({ $natural: -1 })
        .limit(15)
        .toArray();
      recordQuery(req, {
        collection: 'local.oplog.rs',
        op: 'find',
        filter: {},
        sort: { $natural: -1 },
        limit: 15,
      });
      oplogSupported = true;
      oplog = entries.map((e) => ({
        op: e.op,
        ns: e.ns,
        wall: e.wall ? new Date(e.wall).toISOString() : null,
        o2: e.o2 || null,
        o: e.o || null,
      }));
    } catch (err) {
      oplogReason = err.message;
    }

    return sendSuccess(res, {
      data: {
        isReplicaSet: Boolean(replicaSet),
        replicaSet,
        replicaPrimary,
        statusError,
        members,
        oplog: {
          supported: oplogSupported,
          reason: oplogReason,
          entries: oplog,
        },
        killPrimaryInstructions: [
          '1. Run `cd infra && ./kill-primary.sh` to detect the active PRIMARY via rs.status() and docker stop it.',
          '2. Watch this panel (or GET /demo/health): within ~10s a SECONDARY wins election as the new PRIMARY.',
          '3. Writes made during election queue/retry via retryWrites & serverSelectionTimeoutMS (15000ms).',
          '4. Restore all 3 members with `cd infra && ./restore.sh` and watch the stopped node rejoin as SECONDARY.',
        ],
      },
    });
  } catch (error) {
    return sendError(res, { status: 500, error: error.message });
  }
});

// Topic 8: GET /demo/oplog - Inspect recent local.oplog.rs operations
router.get('/oplog', requireDemoDbReady, async (req, res) => {
  try {
    tag(
      req,
      8,
      ['local.oplog.rs', 'sort({ $natural: -1 })'],
      'Reads recent replica set oplog entries showing replicated inserts, updates, and deletes.'
    );
    const limit = Math.min(Math.max(parseInt(String(req.query.limit || '20'), 10) || 20, 1), 50);
    const filter = req.query.ns ? { ns: String(req.query.ns) } : {};

    const localDb = mongoose.connection.getClient().db('local');
    const entries = await localDb
      .collection('oplog.rs')
      .find(filter, { projection: { ts: 1, op: 1, ns: 1, wall: 1, o: 1, o2: 1 } })
      .sort({ $natural: -1 })
      .limit(limit)
      .toArray();
    recordQuery(req, {
      collection: 'local.oplog.rs',
      op: 'find',
      filter,
      sort: { $natural: -1 },
      limit,
    });

    return sendSuccess(res, {
      data: {
        count: entries.length,
        entries: entries.map((e) => ({
          op: e.op,
          ns: e.ns,
          wall: e.wall ? new Date(e.wall).toISOString() : null,
          o2: e.o2 || null,
          o: e.o || null,
        })),
      },
    });
  } catch (error) {
    return sendError(res, { status: 500, error: error.message });
  }
});

// Topic 8: POST /demo/write-concern-test - Compare w:1 vs w:"majority" write latency on replica set
router.post('/write-concern-test', requireDemoDbReady, async (req, res) => {
  const testRunId = `wc_${Date.now()}`;
  const iterations = Math.min(Math.max(parseInt(String(req.body?.iterations || '15'), 10) || 15, 3), 40);

  try {
    tag(
      req,
      8,
      ['writeConcern: { w: 1 }', 'writeConcern: { w: "majority" }', 'insertOne', 'deleteMany'],
      'Benchmarks single-node primary acknowledgment (w:1) against quorum replication (w:"majority").'
    );

    const makeProbeDoc = (mode, idx) => ({
      action: 'WRITE_CONCERN_BENCHMARK',
      collectionName: 'audit_log',
      before: null,
      after: { testRunId, mode, idx },
      metadata: { testRunId, mode },
      createdAt: new Date(),
    });

    const w1Start = Date.now();
    for (let i = 0; i < iterations; i++) {
      await AuditLog.collection.insertOne(makeProbeDoc('w1', i), {
        writeConcern: { w: 1 },
      });
    }
    const w1Ms = Math.max(1, Date.now() - w1Start);

    const majStart = Date.now();
    for (let i = 0; i < iterations; i++) {
      await AuditLog.collection.insertOne(makeProbeDoc('majority', i), {
        writeConcern: { w: 'majority', wtimeout: 5000 },
      });
    }
    const wMajMs = Math.max(1, Date.now() - majStart);

    await AuditLog.deleteMany({
      action: 'WRITE_CONCERN_BENCHMARK',
      'metadata.testRunId': testRunId,
    });

    const overheadMs = wMajMs - w1Ms;
    const overheadPct = Number(((overheadMs / Math.max(1, w1Ms)) * 100).toFixed(1));

    return sendSuccess(res, {
      data: {
        iterations,
        w1: {
          label: 'w: 1 (Primary ack only)',
          totalMs: w1Ms,
          avgMs: Number((w1Ms / iterations).toFixed(2)),
          opsPerSec: Math.round((iterations / w1Ms) * 1000),
          durability: 'Acknowledged once primary writes in memory; rollback possible if primary crashes before replication.',
        },
        wMajority: {
          label: 'w: "majority" (Quorum ack)',
          totalMs: wMajMs,
          avgMs: Number((wMajMs / iterations).toFixed(2)),
          opsPerSec: Math.round((iterations / wMajMs) * 1000),
          durability: 'Acknowledged only after majority of voting replica set members replicate the write; survives primary failover.',
        },
        overheadMs,
        overheadPct,
      },
    });
  } catch (error) {
    await AuditLog.deleteMany({
      action: 'WRITE_CONCERN_BENCHMARK',
      'metadata.testRunId': testRunId,
    }).catch(() => {});
    return sendError(res, { status: 500, error: error.message });
  }
});

// Topic 9: GET /demo/sharding - listShards, $collStats storageStats per shard, and dateKey hotspot explanation
router.get('/sharding', requireDemoDbReady, async (req, res) => {
  try {
    tag(
      req,
      9,
      [
        'sh.enableSharding',
        'sh.shardCollection',
        'listShards',
        '$collStats (storageStats)',
        '{ studentId: 1, dateKey: 1 }',
        '{ studentId: "hashed" }',
      ],
      'Inspects sharded cluster topology, per-shard $collStats storageStats, and explains why dateKey alone creates a write hotspot.'
    );

    const db = mongoose.connection.db;
    const admin = db.admin();
    const hello = await admin.command({ hello: 1 });
    recordQuery(req, { collection: 'admin', op: 'command', filter: { hello: 1 } });

    const isShardedCluster = hello?.msg === 'isdbgrid';
    let shards = [];
    let listShardsNote = null;

    if (isShardedCluster) {
      const shardsRes = await admin.command({ listShards: 1 });
      recordQuery(req, { collection: 'admin', op: 'command', filter: { listShards: 1 } });
      shards = shardsRes.shards || [];
    } else {
      listShardsNote =
        'Connected to replica set rs0 rather than mongos:27100. Start --profile sharded (or --profile light) and set MONGODB_URI=mongodb://localhost:27100/campus_student to inspect multi-shard distribution.';
    }

    const [attendanceStatsRaw, notificationStatsRaw] = await Promise.all([
      runAggregate(Attendance, [{ $collStats: { storageStats: {} } }]),
      runAggregate(Notification, [{ $collStats: { storageStats: {} } }]),
    ]);

    const fallbackShardName = hello?.setName || 'rs0';
    const attendancePerShard = attendanceStatsRaw.map((row) =>
      formatCollStatsRow(row, fallbackShardName)
    );
    const notificationsPerShard = notificationStatsRaw.map((row) =>
      formatCollStatsRow(row, fallbackShardName)
    );

    let chunkDistribution = {};
    if (isShardedCluster) {
      try {
        const configDb = mongoose.connection.getClient().db('config');
        const colDocs = await configDb
          .collection('collections')
          .find({ _id: { $in: ['campus_student.attendance', 'campus_student.notifications'] } })
          .toArray();
        recordQuery(req, {
          collection: 'config.collections',
          op: 'find',
          filter: { _id: { $in: ['campus_student.attendance', 'campus_student.notifications'] } },
        });
        for (const c of colDocs) {
          const chunks = await configDb
            .collection('chunks')
            .aggregate([
              { $match: { uuid: c.uuid } },
              { $group: { _id: '$shard', chunkCount: { $sum: 1 } } },
              { $sort: { _id: 1 } },
            ])
            .toArray();
          chunkDistribution[c._id] = chunks;
        }
      } catch {
        chunkDistribution = {};
      }
    }

    return sendSuccess(res, {
      data: {
        isShardedCluster,
        router: isShardedCluster ? 'mongos' : 'mongod',
        listShardsNote,
        shards,
        shardKeys: {
          attendance: {
            key: { studentId: 1, dateKey: 1 },
            strategy: 'range',
            uniqueIndex: { studentId: 1, dateKey: 1, slotId: 1 },
          },
          notifications: {
            key: { studentId: 'hashed' },
            strategy: 'hashed',
          },
        },
        collections: {
          attendance: {
            totalDocs: attendancePerShard.reduce((sum, s) => sum + s.storageStats.count, 0),
            perShard: attendancePerShard,
            chunks: chunkDistribution['campus_student.attendance'] || [],
          },
          notifications: {
            totalDocs: notificationsPerShard.reduce((sum, s) => sum + s.storageStats.count, 0),
            perShard: notificationsPerShard,
            chunks: chunkDistribution['campus_student.notifications'] || [],
          },
        },
        writeHotspotExplanation: {
          whyDateKeyAloneHotspots:
            'Sharding attendance on { dateKey: 1 } alone creates a monotonic write hotspot because dateKey increases sequentially by calendar day (YYYY-MM-DD). Every student marking today’s attendance shares the exact same current dateKey (and future days exceed all prior split points), so 100% of active inserts hit the single shard owning the upper [split, MaxKey) chunk—overloading one shard’s CPU, memory, disk I/O, and oplog while other shards sit idle on writes.',
          whyStudentIdPrefixFixesIt:
            'Prefixing the range shard key as { studentId: 1, dateKey: 1 } distributes concurrent students across all shards (eliminating today-date hotspots) while keeping each student’s chronological records contiguous for fast single-shard analytics and supporting the shard-key-prefixed unique index { studentId: 1, dateKey: 1, slotId: 1 }.',
        },
      },
    });
  } catch (error) {
    return sendError(res, { status: 500, error: error.message });
  }
});

// Topic 10: GET /demo/benchmark - Compare Node loop vs $group without index vs $group with index
router.get('/benchmark', requireDemoDbReady, authenticateToken, async (req, res) => {
  try {
    tag(
      req,
      10,
      ['Node.js find()+loop', '$group ($natural: 1 / COLLSCAN)', '$group (IXSCAN index hint)'],
      'Compares client/Node iteration against unindexed and indexed MongoDB $group aggregation pipelines.'
    );
    tag(
      req,
      6,
      ['$match', '$group', '$sum', '$divide', '$round'],
      'Computes identical overall P/(P+A) percentage across all three execution strategies.'
    );

    const requestedRoll = req.query.rollNo ? String(req.query.rollNo).toUpperCase() : '24CE002';
    let targetStudent = await Student.findOne({ rollNo: requestedRoll }, { name: 1, rollNo: 1 }).lean();
    if (!targetStudent) {
      targetStudent = req.student || (await Student.findOne({}, { name: 1, rollNo: 1 }).lean());
    }
    if (!targetStudent) {
      return sendError(res, { status: 404, error: 'No seeded students found for benchmark' });
    }

    const sid = new mongoose.Types.ObjectId(String(targetStudent._id));
    const overallPipeline = [
      { $match: { studentId: sid } },
      {
        $group: {
          _id: '$studentId',
          present: { $sum: { $cond: [{ $eq: ['$status', 'P'] }, 1, 0] } },
          absent: { $sum: { $cond: [{ $eq: ['$status', 'A'] }, 1, 0] } },
          marked: { $sum: 1 },
        },
      },
      {
        $project: {
          _id: 0,
          present: 1,
          absent: 1,
          marked: 1,
          percentage: {
            $cond: [
              { $eq: ['$marked', 0] },
              null,
              { $round: [{ $multiply: [{ $divide: ['$present', '$marked'] }, 100] }, 1] },
            ],
          },
        },
      },
    ];

    // (a) Old method: pull raw documents into Node memory and loop in JavaScript
    const tA0 = process.hrtime.bigint();
    const rawDocs = await Attendance.find({ studentId: sid })
      .hint({ $natural: 1 })
      .lean();
    let aPresent = 0;
    let aAbsent = 0;
    for (const d of rawDocs) {
      if (d.status === 'P') aPresent++;
      else if (d.status === 'A') aAbsent++;
    }
    const aMarked = aPresent + aAbsent;
    const aPercentage = aMarked > 0 ? Math.round((aPresent / aMarked) * 1000) / 10 : null;
    const aMs = Number((Number(process.hrtime.bigint() - tA0) / 1e6).toFixed(2));

    // (b) $group aggregation pipeline WITHOUT index (forced COLLSCAN via $natural: 1)
    const tB0 = process.hrtime.bigint();
    const bRows = await runAggregate(Attendance, overallPipeline, { hint: { $natural: 1 } });
    const bMs = Number((Number(process.hrtime.bigint() - tB0) / 1e6).toFixed(2));
    const bResult = bRows[0] || { present: 0, absent: 0, marked: 0, percentage: null };

    // (c) $group aggregation pipeline WITH compound index { studentId: 1, dateKey: 1, slotId: 1 }
    const indexHint = { studentId: 1, dateKey: 1, slotId: 1 };
    const tC0 = process.hrtime.bigint();
    const cRows = await runAggregate(Attendance, overallPipeline, { hint: indexHint });
    const cMs = Number((Number(process.hrtime.bigint() - tC0) / 1e6).toFixed(2));
    const cResult = cRows[0] || { present: 0, absent: 0, marked: 0, percentage: null };

    // Gather exact planner/execution doc counts cleanly
    const [totalCollectionDocs, expCollscan, expIxscan] = await Promise.all([
      Attendance.estimatedDocumentCount(),
      Attendance.collection.find({ studentId: sid }).hint({ $natural: 1 }).explain('executionStats'),
      Attendance.collection.find({ studentId: sid }).hint(indexHint).explain('executionStats'),
    ]);

    return sendSuccess(res, {
      data: {
        targetStudent: {
          _id: targetStudent._id,
          name: targetStudent.name,
          rollNo: targetStudent.rollNo,
        },
        totalCollectionDocs,
        methods: [
          {
            id: 'node_loop',
            label: '(a) Pull docs into Node + JS loop',
            stage: 'COLLSCAN -> Network -> Node Heap',
            docsPulledIntoNode: rawDocs.length,
            totalDocsExamined: expCollscan.executionStats?.totalDocsExamined ?? totalCollectionDocs,
            ms: aMs,
            result: {
              present: aPresent,
              absent: aAbsent,
              marked: aMarked,
              percentage: aPercentage,
            },
          },
          {
            id: 'group_no_index',
            label: '(b) $group pipeline without index',
            stage: 'COLLSCAN + $group',
            docsPulledIntoNode: bRows.length,
            totalDocsExamined: expCollscan.executionStats?.totalDocsExamined ?? totalCollectionDocs,
            ms: bMs,
            result: bResult,
          },
          {
            id: 'group_with_index',
            label: '(c) $group pipeline with index',
            stage: 'IXSCAN + $group',
            docsPulledIntoNode: cRows.length,
            totalDocsExamined: expIxscan.executionStats?.totalDocsExamined ?? cResult.marked,
            ms: cMs,
            result: cResult,
          },
        ],
        replicationVsSharding: {
          replication: {
            goal: 'High Availability & Durability',
            mechanism: 'Primary + Secondaries (rs0) copying oplog.rs',
            dataScope: 'Every node holds 100% of dataset',
            handles: 'Node failure, automatic failover, read scaling (secondaryPreferred), ACID transactions',
          },
          sharding: {
            goal: 'Horizontal Write & Storage Scale',
            mechanism: 'mongos router + Config RS (cfgrs) + multiple Shard RS (shard1rs, shard2rs)',
            dataScope: 'Each shard holds a subset of chunks partitioned by shard key',
            handles: 'Large collections (200k+..billions of docs), write throughput distribution, memory/storage growth',
          },
        },
        asyncStorageVsMongoDB: [
          { dimension: 'Architecture', asyncStorage: 'On-device flat JSON key-value store', mongoDB: 'Client-server distributed document DB (rs0 / sharded)' },
          { dimension: 'Schema Enforcement', asyncStorage: 'None (arbitrary strings)', mongoDB: 'Strict BSON $jsonSchema validators (validationAction: "error")' },
          { dimension: 'Queries & Analytics', asyncStorage: 'O(N) full JSON parse + JS loops in app memory', mongoDB: 'Compound/hashed/TTL indexes + server-side $group/$lookup/$facet' },
          { dimension: 'Consistency & Audit', asyncStorage: 'Single device only; no multi-doc transactions', mongoDB: 'Multi-doc ACID transactions (w:"majority") + audit_log' },
          { dimension: 'Offline Strategy', asyncStorage: 'Serves ONLY as pending write queue (konnakol_offline_attendance_queue_v1)', mongoDB: 'Authoritative cluster truth synced on reconnect' },
        ],
      },
    });
  } catch (error) {
    return sendError(res, { status: 500, error: error.message });
  }
});

// Topic 3 & 4: POST /demo/reset - Re-seed database cleanly via seed.js
router.post('/reset', requireDemoDbReady, authenticateToken, async (req, res) => {
  try {
    if (req.headers.authorization && req.user?.role !== 'admin') {
      return sendError(res, {
        status: 403,
        error: 'Admin privileges required to reset demo database',
      });
    }

    tag(
      req,
      4,
      ['deleteMany', 'insertMany (ordered: false)'],
      'Clears collections and re-seeds realistic semester data cleanly.'
    );

    const summary = await runSeed({ manageConnection: false });
    return sendSuccess(res, {
      data: {
        reset: true,
        ...summary,
      },
    });
  } catch (error) {
    return sendError(res, { status: 500, error: error.message });
  }
});

// Topic 8: GET /demo/attendance-stream - Real-time SSE Change Stream on `attendance` + <75% alert
router.get('/attendance-stream', async (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders?.();

  const sendEvent = (eventName, payload) => {
    if (res.writableEnded) return;
    res.write(`event: ${eventName}\n`);
    res.write(`data: ${JSON.stringify(payload)}\n\n`);
  };

  sendEvent('connected', {
    ok: true,
    collection: 'attendance',
    topic: 8,
    ts: new Date().toISOString(),
  });

  if (mongoose.connection.readyState !== 1) {
    sendEvent('stream_status', {
      status: 'reconnecting',
      message: 'MongoDB is disconnected; awaiting reconnect',
    });
  }

  let changeStream = null;
  try {
    changeStream = Attendance.watch(
      [{ $match: { operationType: { $in: ['insert', 'update', 'replace', 'delete'] } } }],
      { fullDocument: 'updateLookup' }
    );

    changeStream.on('change', async (change) => {
      try {
        const doc = change.fullDocument || null;
        const studentId = doc?.studentId || (req.query.studentId ? String(req.query.studentId) : null);

        let student = null;
        let overall = null;
        let droppedBelow75 = false;

        if (studentId) {
          student = await Student.findById(studentId, {
            name: 1,
            rollNo: 1,
            email: 1,
            section: 1,
            semester: 1,
            batch: 1,
            labBatch: 1,
          }).lean();

          if (student) {
            const activeBatch = student.labBatch || student.batch || 'C';
            const overallRes = await attendanceStats.getOverallStats(student._id, activeBatch);
            overall = overallRes.data;
            droppedBelow75 = overall.percentage !== null && overall.percentage < 75;
          }
        }

        const payload = {
          operationType: change.operationType,
          documentId: change.documentKey?._id ? String(change.documentKey._id) : null,
          studentId: studentId ? String(studentId) : null,
          studentName: student?.name || null,
          rollNo: student?.rollNo || null,
          dateKey: doc?.dateKey || null,
          slotId: doc?.slotId ? String(doc.slotId) : null,
          courseId: doc?.courseId ? String(doc.courseId) : null,
          status: doc?.status || null,
          markedAt: doc?.markedAt || null,
          overall,
          droppedBelow75,
          ts: new Date().toISOString(),
        };

        sendEvent('attendance_change', payload);

        if (droppedBelow75 && student && overall) {
          sendEvent('low_attendance_alert', {
            studentId: String(student._id),
            studentName: student.name,
            rollNo: student.rollNo,
            percentage: overall.percentage,
            marked: overall.marked,
            present: overall.present,
            absent: overall.absent,
            message: `${student.name} (${student.rollNo}) dropped below 75% (${overall.percentage}%)`,
            ts: payload.ts,
          });
        }
      } catch (err) {
        sendEvent('stream_error', { error: err.message });
      }
    });

    changeStream.on('error', (err) => {
      sendEvent('stream_status', {
        status: 'reconnecting',
        error: err.message,
      });
    });
  } catch (err) {
    sendEvent('stream_error', { error: err.message });
  }

  const keepAlive = setInterval(() => {
    if (!res.writableEnded) {
      res.write(`: keepalive ${Date.now()}\n\n`);
    }
  }, 25000);

  req.on('close', () => {
    clearInterval(keepAlive);
    if (changeStream) {
      changeStream.close().catch(() => {});
    }
  });
});

module.exports = router;
module.exports.requireDemoDbReady = requireDemoDbReady;
