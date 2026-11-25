#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
COMPOSE_FILE="$SCRIPT_DIR/docker-compose.yml"

echo "Starting 3-node MongoDB replica set rs0..."
docker compose -f "$COMPOSE_FILE" up -d

echo "Waiting for mongo-init to complete rs.initiate()..."
INIT_EXIT=$(docker wait campus_mongo_init || true)
docker logs campus_mongo_init
if [[ "$INIT_EXIT" != "0" && -n "$INIT_EXIT" ]]; then
  echo "mongo-init exited with code $INIT_EXIT"
  exit "$INIT_EXIT"
fi

echo ""
echo "Replica set rs0 status:"
docker exec campus_mongo1 mongosh --port 27017 --quiet --eval '
  const s = rs.status();
  print("Set: " + s.set);
  s.members.forEach(m => print("  " + m.name + " -> " + m.stateStr + " (health=" + m.health + ")"));
'

echo ""
echo "Host URI:"
echo "  mongodb://localhost:27017,localhost:27018,localhost:27019/campus_student?replicaSet=rs0"
