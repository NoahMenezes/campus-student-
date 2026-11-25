#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
COMPOSE_FILE="$SCRIPT_DIR/docker-compose.yml"

MODE="${1:-full}"
PROFILE="sharded"
if [[ "$MODE" == "--light" || "$MODE" == "light" ]]; then
  PROFILE="light"
fi

echo "Starting MongoDB sharded cluster (profile=$PROFILE, mongos on localhost:27100)..."
docker compose -f "$COMPOSE_FILE" --profile "$PROFILE" up -d

echo "Waiting for campus_sharded_init to finish enabling sharding & shard keys..."
INIT_EXIT=$(docker wait campus_sharded_init || true)
docker logs campus_sharded_init
if [[ "$INIT_EXIT" != "0" && -n "$INIT_EXIT" ]]; then
  echo "campus_sharded_init exited with code $INIT_EXIT"
  exit "$INIT_EXIT"
fi

echo ""
echo "Mongos URI:"
echo "  mongodb://localhost:27100/campus_student"
