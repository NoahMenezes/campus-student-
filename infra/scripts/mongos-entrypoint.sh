#!/usr/bin/env bash
set -euo pipefail

if getent hosts cfg2 >/dev/null 2>&1 && getent hosts cfg3 >/dev/null 2>&1; then
  exec mongos --configdb cfgrs/cfg1:27017,cfg2:27017,cfg3:27017 --bind_ip_all --port 27100
else
  exec mongos --configdb cfgrs/cfg1:27017 --bind_ip_all --port 27100
fi
