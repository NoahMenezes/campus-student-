#!/usr/bin/env bash
set -euo pipefail

# Map container names to their replica-set ports
declare -A NODE_PORTS=(
  ["campus_mongo1"]="27017"
  ["campus_mongo2"]="27018"
  ["campus_mongo3"]="27019"
)

PROBE_CONTAINER=""
PROBE_PORT=""
for cname in campus_mongo1 campus_mongo2 campus_mongo3; do
  if [[ "$(docker inspect -f '{{.State.Running}}' "$cname" 2>/dev/null || echo false)" == "true" ]]; then
    PROBE_CONTAINER="$cname"
    PROBE_PORT="${NODE_PORTS[$cname]}"
    break
  fi
done

if [[ -z "$PROBE_CONTAINER" ]]; then
  echo "Error: No rs0 MongoDB containers are running."
  exit 1
fi

PRIMARY_HOST=$(docker exec "$PROBE_CONTAINER" mongosh --port "$PROBE_PORT" --quiet --eval '
  const s = rs.status();
  const p = (s.members || []).find(m => m.stateStr === "PRIMARY");
  if (p) print(p.name);
' | tr -d '\r\n')

if [[ -z "$PRIMARY_HOST" ]]; then
  echo "Error: No PRIMARY currently elected in rs0."
  exit 1
fi

PRIMARY_CONTAINER=""
case "$PRIMARY_HOST" in
  *":27017") PRIMARY_CONTAINER="campus_mongo1" ;;
  *":27018") PRIMARY_CONTAINER="campus_mongo2" ;;
  *":27019") PRIMARY_CONTAINER="campus_mongo3" ;;
  *)
    echo "Error: Could not map primary host '$PRIMARY_HOST' to a container."
    exit 1
    ;;
esac

echo "Current PRIMARY is $PRIMARY_HOST ($PRIMARY_CONTAINER). Stopping it..."
docker stop "$PRIMARY_CONTAINER"

# Pick a remaining running node to observe the election
SURVIVOR=""
SURVIVOR_PORT=""
for cname in campus_mongo1 campus_mongo2 campus_mongo3; do
  if [[ "$cname" != "$PRIMARY_CONTAINER" ]] && [[ "$(docker inspect -f '{{.State.Running}}' "$cname" 2>/dev/null || echo false)" == "true" ]]; then
    SURVIVOR="$cname"
    SURVIVOR_PORT="${NODE_PORTS[$cname]}"
    break
  fi
done

if [[ -n "$SURVIVOR" ]]; then
  echo "Waiting for automatic failover election via $SURVIVOR:$SURVIVOR_PORT..."
  for i in $(seq 1 30); do
    NEW_PRIMARY=$(docker exec "$SURVIVOR" mongosh --port "$SURVIVOR_PORT" --quiet --eval '
      try {
        const s = rs.status();
        const p = (s.members || []).find(m => m.stateStr === "PRIMARY");
        if (p) print(p.name);
      } catch (e) {}
    ' | tr -d '\r\n')
    if [[ -n "$NEW_PRIMARY" && "$NEW_PRIMARY" != "$PRIMARY_HOST" ]]; then
      echo "Failover complete! New PRIMARY elected: $NEW_PRIMARY"
      docker exec "$SURVIVOR" mongosh --port "$SURVIVOR_PORT" --quiet --eval '
        const s = rs.status();
        s.members.forEach(m => print("  " + m.name + " -> " + m.stateStr + " (health=" + m.health + ")"));
      '
      exit 0
    fi
    sleep 1
  done
  echo "Timed out waiting for new primary election."
  exit 1
fi
