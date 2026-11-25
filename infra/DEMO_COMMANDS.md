# MongoDB Replica Set (`rs0`) & Sharded Cluster Demo Commands

Use these `mongosh` commands during demos to inspect replica set health, replication state, failover behavior, and sharded cluster distribution.

## Connect from Host

### Replica Set (`rs0`)

```bash
mongosh "mongodb://localhost:27017,localhost:27018,localhost:27019/campus_student?replicaSet=rs0"
```
Connects `mongosh` from the host directly to the 3-node `rs0` replica set with automatic primary discovery.

```bash
docker exec -it campus_mongo1 mongosh --port 27017
```
Opens an interactive `mongosh` shell inside the `campus_mongo1` container if `mongosh` is not installed on the host.

### Sharded Cluster (`mongos` on `27100`)

```bash
mongosh "mongodb://localhost:27100/campus_student"
```
Connects `mongosh` from the host to the `mongos` query router for `cfgrs`, `shard1rs`, and `shard2rs`.

```bash
docker exec -it campus_mongos mongosh --port 27100 campus_student
```
Opens an interactive `mongosh` shell directly inside the `campus_mongos` container.

---

## Topic 1 — Install & Health

```javascript
db.adminCommand({ ping: 1 })
```
Verifies that the MongoDB server is alive and responding (`{ ok: 1 }`).

```javascript
db.serverBuildInfo().version
```
Prints the running MongoDB server version (e.g., `7.0.x`).

```javascript
db.hello()
```
Returns node role, replica set name (`setName`) or router marker (`msg: "isdbgrid"`), writable primary status, and member host list.

---

## Topic 8 — Replica Set & Failover

```javascript
rs.status()
```
Displays the live health, state (`PRIMARY` / `SECONDARY` / `(not reachable/healthy)`), uptime, and optimes of all `rs0` members.

```javascript
rs.conf()
```
Displays the persisted replica set configuration (`_id`, member IDs, hostnames, and priorities).

```javascript
rs.printReplicationInfo()
```
Shows the oplog size, used space, and replication time window on the connected node.

```javascript
rs.printSecondaryReplicationInfo()
```
Shows each `SECONDARY` member's replication lag relative to the current `PRIMARY`.

```javascript
db.getMongo().setReadPref("secondaryPreferred")
```
Routes subsequent read queries on this shell session to a `SECONDARY` node when available, falling back to `PRIMARY`.

```javascript
db.demo_probe.insertOne({ ts: new Date(), note: "majority-write-test" }, { writeConcern: { w: "majority", wtimeout: 5000 } })
```
Writes a test document requiring acknowledgment from a majority (2 of 3) of replica set nodes before returning.

```javascript
rs.stepDown(30)
```
Forces the current `PRIMARY` to step down for 30 seconds and triggers an election among the remaining secondaries.

---

## Topic 9 — Sharding & Shard Keys (`mongos` on `27100`)

```javascript
sh.status()
```
Displays shards (`shard1rs`, `shard2rs`), enabled databases (`campus_student`), sharded collections (`attendance`, `notifications`), chunk distribution, and balancer state.

```javascript
db.adminCommand({ listShards: 1 })
```
Lists all registered shards (`_id`, `host`, `state`) managed by `mongos` / `cfgrs`.

```javascript
db.attendance.getShardDistribution()
```
Shows exact document counts, data sizes, average object size, and chunk counts per shard for `campus_student.attendance` (`{ studentId: 1, dateKey: 1 }` range shard key).

```javascript
db.notifications.getShardDistribution()
```
Shows uniform hashed chunk and document distribution across shards for `campus_student.notifications` (`{ studentId: "hashed" }` shard key).

```javascript
db.attendance.aggregate([{ $collStats: { storageStats: {} } }])
```
Aggregates per-shard WiredTiger storage metrics (`count`, `size`, `storageSize`, `totalIndexSize`) across all shards via `mongos`.

```javascript
db.attendance.find({ studentId: db.students.findOne({ rollNo: "24CE001" })._id, dateKey: "2026-11-24" }).explain("executionStats")
```
Verifies targeted **single-shard** routing (`SHARD_MERGE` touching 1 shard) because `{ studentId, dateKey }` includes the full shard key prefix.
