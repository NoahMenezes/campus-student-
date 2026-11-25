#!/usr/bin/env bash
set -euo pipefail

if getent hosts shard1b >/dev/null 2>&1 && getent hosts shard2b >/dev/null 2>&1; then
  SHARD1_URI="shard1rs/shard1a:27017,shard1b:27017,shard1c:27017"
  SHARD2_URI="shard2rs/shard2a:27017,shard2b:27017,shard2c:27017"
else
  SHARD1_URI="shard1rs/shard1a:27017"
  SHARD2_URI="shard2rs/shard2a:27017"
fi

echo "Configuring sharded cluster via mongos:27100..."
mongosh --host mongos --port 27100 --quiet --eval "
  const existing = db.adminCommand({ listShards: 1 }).shards || [];
  const names = new Set(existing.map(s => s._id));

  if (!names.has('shard1rs')) {
    printjson(sh.addShard('$SHARD1_URI'));
  }
  if (!names.has('shard2rs')) {
    printjson(sh.addShard('$SHARD2_URI'));
  }

  // Use 1 MB chunk size so 200k+ seeded attendance docs split cleanly across shards
  db.getSiblingDB('config').settings.updateOne(
    { _id: 'chunksize' },
    { \$set: { value: 1 } },
    { upsert: true }
  );

  // Topic 9: Enable sharding on campus_student
  printjson(sh.enableSharding('campus_student'));

  const appDb = db.getSiblingDB('campus_student');

  // Ensure shard-key-prefixed unique index { studentId: 1, dateKey: 1, slotId: 1 }
  appDb.attendance.createIndex(
    { studentId: 1, dateKey: 1, slotId: 1 },
    { unique: true, name: 'uniq_attendance_student_date_slot' }
  );
  try {
    printjson(sh.shardCollection('campus_student.attendance', { studentId: 1, dateKey: 1 }));
  } catch (e) {
    if (!String(e).includes('already sharded')) throw e;
  }

  // Hashed shard key on notifications distributes notifications uniformly across shards
  appDb.notifications.createIndex(
    { studentId: 'hashed' },
    { name: 'studentId_hashed' }
  );
  try {
    printjson(sh.shardCollection('campus_student.notifications', { studentId: 'hashed' }));
  } catch (e) {
    if (!String(e).includes('already sharded')) throw e;
  }

  sh.status();
"
