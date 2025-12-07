#!/usr/bin/env bash
# Simple helper script to start the lap-analyzer dev instance.
# Usage:
#   ./dev.sh            # installs deps if needed then runs next dev
#   PORT=4000 ./dev.sh  # run on custom port
# Options:
#   SKIP_INSTALL=1 ./dev.sh   # skip dependency install check
#   FORCE_INSTALL=1 ./dev.sh  # force npm install even if node_modules exists

set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$PROJECT_ROOT"

echo "==> lap-analyzer dev start"

if ! command -v node >/dev/null 2>&1; then
  echo "Error: node is not installed or not in PATH" >&2
  exit 1
fi
if ! command -v npm >/dev/null 2>&1; then
  echo "Error: npm is not installed or not in PATH" >&2
  exit 1
fi

NODE_VER="$(node --version || true)"
echo "Node version: $NODE_VER"

if [[ "${SKIP_INSTALL:-0}" != "1" ]]; then
  if [[ ! -d node_modules || "${FORCE_INSTALL:-0}" == "1" ]]; then
    echo "==> Installing dependencies (npm ci if lockfile present)"
    if [[ -f package-lock.json ]]; then
      npm ci
    else
      npm install
    fi
  else
    echo "==> Dependencies present (node_modules). Skipping install (set FORCE_INSTALL=1 to override)."
  fi
else
  echo "==> SKIP_INSTALL=1 set. Not installing dependencies."
fi

# Choose port (default 3000 unless already set)
PORT="${PORT:-3000}"
export PORT
echo "Using PORT=$PORT"

if [[ "${SKIP_KILL:-0}" != "1" ]]; then
  echo "==> Checking for existing process on port $PORT"
  KILLED=0
  # Prefer lsof if available
  if command -v lsof >/dev/null 2>&1; then
    PIDS=$(lsof -ti tcp:$PORT || true)
    if [[ -n "$PIDS" ]]; then
      echo "Found processes: $PIDS (terminating)"
      kill $PIDS 2>/dev/null || true
      sleep 0.5
      # Force kill if still alive
      STILL=$(lsof -ti tcp:$PORT || true)
      if [[ -n "$STILL" ]]; then
        echo "Force killing: $STILL"
        kill -9 $STILL 2>/dev/null || true
      fi
      KILLED=1
    fi
  elif command -v fuser >/dev/null 2>&1; then
    if fuser -n tcp $PORT >/dev/null 2>&1; then
      echo "Terminating processes using port $PORT via fuser"
      fuser -k -n tcp $PORT || true
      KILLED=1
    fi
  else
    echo "Warning: neither lsof nor fuser available; cannot auto-kill port $PORT"
  fi
  if [[ $KILLED -eq 1 ]]; then
    echo "Port $PORT freed."
  else
    echo "No existing process on port $PORT."
  fi
else
  echo "==> SKIP_KILL=1 set. Not checking/killing existing port usage."
fi

echo "==> Starting Next.js dev server (Ctrl+C to stop)"
exec npm run dev
