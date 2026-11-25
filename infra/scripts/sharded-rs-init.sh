#!/usr/bin/env bash
set -euo pipefail

wait_for_hosts() {
  for h in "$@"; do
    for _ in $(seq 1 40); do
      if mongosh --host "$h" --port 27017 --quiet --eval "db.adminCommand('ping').ok" >/dev/null 2>&1; then
        break
      fi
      sleep 1
    done
  done
}

init_rs() {
  local primary_host="$1"
  local rs_name="$2"
  local members_json="$3"
  local extra_opts="$4"

  mongosh --host "$primary_host" --port 27017 --quiet --eval "
    try {
      const st = rs.status();
      if (st.ok === 1) {
        print('$rs_name already initialized.');
      }
    } catch (e) {
      print('Initializing $rs_name ...');
      const cfg = Object.assign({ _id: '$rs_name', members: $members_json }, $extra_opts);
      printjson(rs.initiate(cfg));
    }
    for (let i = 0; i < 45; i++) {
      try {
        const s = rs.status();
        const p = (s.members || []).find(m => m.stateStr === 'PRIMARY');
        if (p) {
          print('$rs_name PRIMARY: ' + p.name);
          quit(0);
        }
      } catch (err) {}
      sleep(1000);
    }
    print('Timed out waiting for $rs_name primary');
    quit(1);
  "
}

if getent hosts cfg2 >/dev/null 2>&1 && getent hosts cfg3 >/dev/null 2>&1; then
  echo "Detected FULL sharded mode (3 nodes per replica set)..."
  wait_for_hosts cfg1 cfg2 cfg3 shard1a shard1b shard1c shard2a shard2b shard2c
  init_rs cfg1 cfgrs '[{_id:0,host:"cfg1:27017"},{_id:1,host:"cfg2:27017"},{_id:2,host:"cfg3:27017"}]' '{configsvr:true}'
  init_rs shard1a shard1rs '[{_id:0,host:"shard1a:27017"},{_id:1,host:"shard1b:27017"},{_id:2,host:"shard1c:27017"}]' '{}'
  init_rs shard2a shard2rs '[{_id:0,host:"shard2a:27017"},{_id:1,host:"shard2b:27017"},{_id:2,host:"shard2c:27017"}]' '{}'
else
  echo "Detected LIGHT sharded mode (1 node per replica set)..."
  wait_for_hosts cfg1 shard1a shard2a
  init_rs cfg1 cfgrs '[{_id:0,host:"cfg1:27017"}]' '{configsvr:true}'
  init_rs shard1a shard1rs '[{_id:0,host:"shard1a:27017"}]' '{}'
  init_rs shard2a shard2rs '[{_id:0,host:"shard2a:27017"}]' '{}'
fi
