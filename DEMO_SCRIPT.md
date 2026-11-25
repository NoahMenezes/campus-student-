# Konnakol (Campus Student) — 10-Minute MongoDB Live Demo Script

**Prerequisites Running**
- Replica Set `rs0`: `cd infra && ./up-rs.sh` (`localhost:27017,27018,27019`)
- Sharded Cluster `light`: `cd infra && ./up-sharded.sh --light` (`mongos` on `localhost:27100`, pre-seeded via `npm run seed:sharded` with `212,313` attendance rows)
- Backend API: `npm run server` (`http://192.168.31.151:4000`, LAN IP in `.env`)
- Expo App (Web + Phone via Expo Go): `npx expo start` (`http://localhost:8082` on Web; scan QR in Expo Go on physical phone on same Wi-Fi)

---

## Timeline & Exact Walkthrough (`00:00` – `10:00`)

### `00:00 – 01:00` · Topic 1: Server Health (`T1`)
1. Open the web app (`http://localhost:8082`) and sign in on `/login` with **`admin@gec.ac.in`** / **`admin123`**.
   - Routes straight into the hidden admin-only **Demo Center** (`/demo-center`).
2. Default tab **`Health (T1)`** (`GET /demo/health`) displays:
   - Status **`OK`**, `admin().ping()` -> `ok: 1`, MongoDB **`7.0.48`**, Mongoose `readyState: 1 (connected)`, Replica Set **`rs0`**, and Active Primary (`mongo1.localhost:27017` or `mongo2.localhost:27018`).
3. **Expected Topic Badges (`meta.concepts`):**
   - `Topic 1 · admin().ping() + buildInfo + mongoose.connection.readyState`
   - `Topic 8 · replSetGetStatus + retryWrites + retryReads + w:majority`

---

### `01:00 – 02:00` · Topic 2: Data Explorer, BSON Types & `$jsonSchema` Validators (`T2`)
1. Click the **`Explorer (T2)`** tab (`GET /admin/explorer/attendance` + `GET /admin/validators`).
2. Select **`attendance`** in the horizontal collection chips; point out `102,563 docs`, indexes (`uniq_attendance_student_date_slot` `{ studentId: 1, dateKey: 1, slotId: 1 }`, `idx_attendance_student_course`, `idx_attendance_student_markedAt`), **BSON type badges** (`objectId`, `date`, `string`), and 5 sample docs.
3. Click **`notifications`** chip to highlight **`ttl_notif_createdAt_90d`** (`TTL 7776000s` = 90 days) and **`studentId_hashed`**.
4. Scroll to **Active `$jsonSchema` Validators** showing `level=strict · action=error` enforced inside MongoDB (code `121` rejects invalid statuses like `"L"`).
5. **Expected Topic Badges:**
   - `Topic 2 · objectId + date + int + bool + string + null + indexes()`
   - `Topic 3 · find + limit(5) + projection + countDocuments`
   - `Topic 2 · $jsonSchema + validationLevel: strict + validationAction: error`

---

### `02:00 – 03:30` · Topics 3 & 4: Login Projection, Demo Mode, Mark / Undo / Batch Toggle (`T3–T4`)
1. Click **`Logout`** in the Demo Center top bar, then log in as demo student **`nnm1.s24@gec.ac.in`** / **`demo123`** (Noah Menezes, Roll `24CE001`, Batch `C`, initial stats **`9/12 = 75%`**, **`0/4 marked`** today, **`11 Subjects`**).
   - Login (`POST /auth/login`) runs `findOne` with field projection (never returning password hash over the wire).
   - Badge on `/auth/login`: **`Topic 3 · findOne + projection`**
2. On **Home** (`/home`), **long-press (450ms)** the greeting header **`GOA COLLEGE OF ENGINEERING / Hi, Noah Menezes`**.
   - Toast confirms: `Demo Mode ON — MongoDB Inspector enabled` and opens the **MongoDB Demo Inspector** bottom sheet. Close the sheet.
3. Tap **`Batch D`** in the **Laboratory Batch** switcher bar, wait 1s, then tap **`Batch C`** back.
   - Bottom sheet pops up with **`PATCH /me/batch`**:
   - **Expected Topic Badge:** `Topic 4 · updateOne + $set`
   - Exact query JSON shows `{ $set: { labBatch: "D", batch: "D" } }`. Close the sheet.
4. Click **`Today's Classes`** -> on **Today** (`/today`), tap **`Present`** (`P`) on a lecture (`CECMP302 DCCN`).
   - Bottom sheet opens on **`PUT /attendance`** (`~18 ms`):
   - **Expected Topic Badges:**
     - `Topic 4 · updateOne + $set + upsert + $setOnInsert`
     - `Topic 8 · withTransaction + w: "majority"`
   - Query JSON shows `timetable_slots.findOne`, `attendance.updateOne` (`upsert: true`, `writeConcern: { w: "majority" }`), and transactional `audit_log.insertOne`. Close sheet.
5. Note Today, Home (`1/4 marked`, `10/13 = 76.9%`), and Subjects now reflect that mark identically. Clean up by undoing that temporary mark via API or tapping **Reset Demo Data** later (`DELETE /attendance` -> badge **`Topic 4 · deleteOne`**).

---

### `03:30 – 04:30` · Topic 5: Filters & Pagination (`T5`)
1. From **Home** or **BottomTabBar**, open **Timetable** (`/timetable`) and switch day pills (`Monday`..`Friday`).
   - Bottom sheet shows **`GET /timetable?day=...`** filtering `{ $and: [{ semester: 5 }, { section: "B" }, { day }], $or: [{ batch: null }, { batch: "C" }] }` sorted by `{ start: 1 }`.
   - **Expected Topic Badges:**
     - `Topic 3 · find + projection + sort`
     - `Topic 5 · $and + $or`
2. In terminal (or API demo tab), show cursor range pagination vs offset `skip/limit` across 300 students:
   ```bash
   curl -s "http://192.168.31.151:4000/students?section=B&semester=5&limit=5" | jq '.meta.concepts, .data.paginationMode, .data.nextCursor'
   curl -s "http://192.168.31.151:4000/students?section=B&semester=5&lastSeen=24CE005&limit=5" | jq '.meta.concepts, .data.students[].rollNo'
   ```
   - **Expected Topic Badges:**
     - Offset: `Topic 5 · $and + $in + $gte + $lte + $ne + $regex + skip + limit`
     - Keyset Range (`rollNo > lastSeen`): `Topic 5 · $and + $in + $gte + $lte + $ne + $regex + $gt (range pagination)`

---

### `04:30 – 05:45` · Topics 6 & 7: Subjects, Monthly Reports & Student 360 (`T6–T7`)
1. Tap **`Subjects`** (`/subjects`) in the bottom tab bar.
   - Verify header shows **`11 Courses`** (includes **`NCC301` Activity**, plus 5 Theory + 5 Batch `C` Labs) and `75%` overall (`9/12`).
   - **Expected Topic Badge (`GET /analytics/subjects`):**
     - `Topic 7 · $group + $lookup + $unwind + $project + $ceil + $cond`
2. Tap **`Reports`** (`/monthly-reports`) in the bottom tab bar (`Nov 2026`).
   - Verify 4-column summary: **Scheduled `75` · Present `9` · Absent `3` · Pending `63` · `75%`**.
   - **Expected Topic Badge (`GET /analytics/monthly`):**
     - `Topic 6 · $month (timezone: Asia/Kolkata) + $year + $group + $lookup + $sort`
3. In terminal, run **Student 360** single-pass `$facet` dashboard query:
   ```bash
   curl -s "http://192.168.31.151:4000/analytics/student-360?rollNo=24CE001" | jq '.meta.concepts, .meta.ms'
   ```
   - **Expected Topic Badge:** `Topic 7 · $facet + $lookup + $unwind + $group + $sort + $limit`
4. Long-press Home greeting header (or tap **`Turn Off Demo Mode`** inside the bottom sheet) to turn Demo Mode off cleanly before Admin console steps.

---

### `05:45 – 07:00` · Topics 2 & 10: `explain("executionStats")` & 3-Way Benchmark (`T10`)
1. Check `COLLSCAN` vs `IXSCAN` via `GET /analytics/explain` in terminal:
   ```bash
   curl -s "http://192.168.31.151:4000/analytics/explain" | jq '.meta.concepts, .data | {withoutIndexHint: {stage: .withoutIndexHint.stage, docs: .withoutIndexHint.totalDocsExamined, ms: .withoutIndexHint.executionTimeMillis}, withIndexHint: {stage: .withIndexHint.stage, docs: .withIndexHint.totalDocsExamined, ms: .withIndexHint.executionTimeMillis}}'
   ```
   - Observed: **`COLLSCAN`** examines **`102,563` docs (~193 ms)** vs **`IXSCAN`** (`idx_attendance_student_course`) examines **`2` docs (~1 ms)**.
   - **Expected Topic Badges:**
     - `Topic 2 · IXSCAN + idx_attendance_student_course`
     - `Topic 10 · explain("executionStats") + hint() + $natural: 1`
2. Log back in as **`admin@gec.ac.in`** / **`admin123`** -> opens **Demo Center** -> click **`Comparison (T10)`** tab (`GET /demo/benchmark?rollNo=24CE002`).
   - Compare all 3 methods returning identical **`286/343 (83.4%)`**:
     - **(a) Pull docs into Node + JS loop**: `~144–192 ms` (`102,563` examined, `343` pulled into Node)
     - **(b) `$group` without index (`$natural: 1`)**: `~84–109 ms` (`102,563` examined, `1` returned)
     - **(c) `$group` with compound index**: **`~3–6 ms`** (`343` examined, `1` returned)
   - Show the **Replication vs Sharding** side-by-side card and **`AsyncStorage` vs `MongoDB`** table.
   - **Expected Topic Badges:**
     - `Topic 10 · Node.js find()+loop + $group ($natural: 1 / COLLSCAN) + $group (IXSCAN index hint)`
     - `Topic 6 · $match + $group + $sum + $divide + $round`

---

### `07:00 – 08:15` · Topic 8: Replica Set, Write Concern & Kill-Primary During Live Writes (`T8`)
1. In **Demo Center**, click **`Replica Set (T8)`** tab (`GET /demo/replica-set`).
   - Point out all 3 `rs0` member cards (`PRIMARY`, `SECONDARY`, `uptime`, `optimeDate`), **Oplog Viewer (`local.oplog.rs`)**, and tap **`Run 15x2 Write Test`** (`w: 1` ~`98 ms` vs `w: "majority"` ~`114 ms`).
   - **Expected Topic Badges:**
     - `Topic 8 · replSetGetStatus + local.oplog.rs + retryWrites + w: "majority"`
     - `Topic 8 · writeConcern: { w: 1 } + writeConcern: { w: "majority" } + insertOne + deleteMany`
2. Start a continuous marking loop in terminal while running **`./infra/kill-primary.sh`**, then restore with **`./infra/restore.sh`**:
   - Observe primary `mongo2.localhost:27018` stop, automatic election of `mongo1.localhost:27017`, **`20/20` writes acknowledged with `0` lost writes**, and click **`Refresh`** in **Replica Set (T8)** to show the newly elected `PRIMARY` + restored `SECONDARY`.

---

### `08:15 – 09:00` · Topic 9: Sharding Per-Shard Distribution (`T9`)
1. Switch to **`Sharding (T9)`** tab (`GET /demo/sharding`).
   - Note: when `MONGODB_URI` points at `rs0`, explain the fallback banner, and show the live `mongos` (`localhost:27100`) distribution (`212,313` logical docs / ~`100k+` per shard across `shard1rs` and `shard2rs` + `notifications` `44` / `58` across 2 chunks each via `{ studentId: "hashed" }`).
   - Point out **Why `dateKey` Alone Creates a Write Hotspot** vs `{ studentId: 1, dateKey: 1 }`.
   - **Expected Topic Badge:**
     - `Topic 9 · sh.enableSharding + sh.shardCollection + listShards + $collStats (storageStats) + { studentId: 1, dateKey: 1 } + { studentId: "hashed" }`

---

### `09:00 – 10:00` · Live Phone Marking + SSE Change Stream + `<75%` Alert (Finale)
1. Keep **Demo Center** open on **`Replica Set (T8)`** tab on the laptop browser (listening live to **`GET /demo/attendance-stream`**) — or have a second browser tab logged in as Noah on **Home** (`/home`).
2. On the **physical phone (Expo Go)** connected to `http://192.168.31.151:4000`, log in as **`nnm1.s24@gec.ac.in`** / **`demo123`**.
   - Noah starts at **`75%` (`9/12`)**.
3. On the phone, open **`Today`**, tap **`Absent`** (`A`) on a pending Wednesday lecture (e.g., `CECMP302 DCCN`).
4. Watch **both** screens immediately (no pull-to-refresh needed):
   - Laptop **Demo Center** `SSE Change Stream` card appends `UPDATE · Noah Menezes (24CE001) · A -> Overall: 69.2% (9/13) • DROPPED BELOW 75%`.
   - Both the phone and second student tab display the red **`Dropped below 75%: Noah Menezes (24CE001) dropped below 75% (69.2%)`** alert banner and update Home (`69.2%`, `1/4 marked`), Today (`1 Absent, 3 Pending`), Subjects (`CECMP302` drops to `33.3%`), and Reports (`4 Absent, 62 Pending`) live.
5. Finish by clicking **`Reset Demo Data`** (`POST /demo/reset`) in **Demo Center** to restore clean seed state for the next session.

---

## Verification Ledger

### Verified Automated & Live CLI Checks (Latest Run After All Code Changes)
- **Seeding (`npm run seed` on `rs0`)**: Passed (`304` users, `300` students, `11` courses, `81` timetable slots, `102,563` attendance rows, `12` notifications, `1` audit_log in `38,882 ms`; Noah `24CE001` has `12` Nov marks).
- **TypeScript (`npx tsc --noEmit`)**: Passed (`0` errors).
- **ESLint (`npm run lint`)**: Passed (`0` errors, `0` warnings).
- **Integration Tests (`npm test` -> `server/__tests__/api.test.js`)**: **17/17 passed** (`0` failed, `0` skipped), covering auth projection, course counts, timetable filters, batch update, attendance upsert/undo/rejections, notifications, student range/offset pagination, CSV import/rollover/purge, all `/analytics/*` pipelines + explain, `AsyncLocalStorage` + `mongoose.set('debug')` + `tag()` + `runAggregate` + 404 meta, `/demo/sharding`, `/demo/replica-set`, `/demo/oplog`, `/demo/write-concern-test`, `/demo/benchmark`, `/demo/attendance-stream` SSE + `<75%` alert, and `/demo/reset`.
- **Failover Write Durability Test (`kill-primary.sh` during continuous 20-write `PUT /attendance` loop + `restore.sh`)**: Passed — `mongo2.localhost:27018` stopped mid-loop, `mongo1.localhost:27017` elected primary automatically, **`20/20` writes acknowledged on first pass (`0` lost writes)**, and all 3 `rs0` members restored healthy.
- **Sharded Cluster (`./infra/up-sharded.sh --light` + `npm run seed:sharded` on `mongos:27100`)**: Passed — `attendance` count `212,313` (`shard1rs`: `99,424` docs / `3` chunks; `shard2rs`: `119,439` docs / `3` chunks), `notifications` count `102` (`shard1rs`: `44` docs / `2` chunks; `shard2rs`: `58` docs / `2` chunks), and live `GET /demo/sharding` confirmed `listShards`, `$collStats`, and `writeHotspotExplanation`.
- **Explain & Benchmark Comparison (`GET /analytics/explain`, `GET /demo/benchmark?rollNo=24CE002`)**: Passed — `COLLSCAN` (`102,563` docs, `193 ms`) vs `IXSCAN` (`2` docs, `1 ms`); 3-way benchmark returned identical `286/343 (83.4%)` across `(a) Node loop` (`192.34 ms`), `(b) $group without index` (`84.48 ms`), `(c) $group with index` (`3.24 ms`).

### Not Executed Live in UI / Remaining Manual Checks
- **Interactive Chrome Browser / Mobile Device UI Walkthrough**: Chrome DevTools MCP (`list_pages`) could not attach because Chrome remote debugging (`/home/piyush/.config/google-chrome/DevToolsActivePort`) was not enabled on the host, and no physical phone was connected to Expo Go during this session. Screen layout, long-press Demo Mode gestures, bottom-sheet rendering, and physical-phone-to-web SSE UI updates should be clicked through once on a browser / Expo Go device before presenting.
- **Full 3-Node-Per-RS Sharded Runtime (`--profile sharded`)**: Validated statically via `docker compose --profile sharded config --quiet`; only `--profile light` (1 node each for `cfgrs`, `shard1rs`, `shard2rs`) was started live alongside `rs0` to stay within host RAM limits.
