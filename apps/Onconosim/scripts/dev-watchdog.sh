#!/bin/bash
# OncoSIM dev server watchdog — keeps `bun run dev` alive across bash sessions.
# Usage: bash scripts/dev-watchdog.sh
cd /home/z/my-project

# kill any existing
pkill -9 -f "next" 2>/dev/null
pkill -9 -f "bun run dev" 2>/dev/null
sleep 1

# fully detach via setsid + nohup so the server outlives the launching shell
setsid bash -c 'cd /home/z/my-project && exec bun run dev' </dev/null >/tmp/oncosim-dev.log 2>&1 &
disown -a

# wait for readiness
for i in $(seq 1 40); do
  if curl -s -o /dev/null http://localhost:3000/ 2>/dev/null; then
    echo "OncoSIM dev server READY after ${i}s"
    exit 0
  fi
  sleep 1
done
echo "OncoSIM dev server FAILED to start in 40s"
exit 1
