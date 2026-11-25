#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
COMPOSE_FILE="$SCRIPT_DIR/docker-compose.yml"

echo "Restoring all rs0 replica set nodes..."
docker compose -f "$COMPOSE_FILE" start mongo1 mongo2 mongo3

echo "Waiting for all 3 nodes to become healthy members of rs0..."
for i in $(seq 1 30); do
  READY=$(docker exec campus_mongo1 mongosh --port 27017 --quiet --eval '
    try {
      const s = rs.status();
      const healthy = (s.members || []).filter(m => m.health === 1 && (m.stateStr === "PRIMARY" || m.stateStr === "SECONDARY"));
      if (healthy.length === 3) print("OK");
    } catch (e) {}
  ' 2>/dev/null | tr -d '\r\n' || true)

  if [[ "$READY" == "OK" ]]; then
    echo "All 3 nodes restored and synchronized:"
    docker exec campus_mongo1 mongosh --port 27017 --quiet --eval '
      const s = rs.status();
      s.members.forEach(m => print("  " + m.name + " -> " + m.stateStr + " (health=" + m.health + ")"));
    '
    exit 0
  fi
  sleep 1
done

echo "Timed out waiting for all 3 nodes to rejoin rs0."
exit 1
