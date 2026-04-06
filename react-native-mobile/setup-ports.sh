#!/usr/bin/env bash
#
# setup-ports.sh — Ensure Android emulator can reach the backend servers
#
# Usage:
#   ./setup-ports.sh              # Default: launch emulator if needed, forward Go (8082) and Metro (8081)
#   ./setup-ports.sh --rails      # Also forward Rails (3000)
#   ./setup-ports.sh --all        # Forward all known ports (3000, 5432, 6379, 8081, 8082)
#
# This script is idempotent — safe to run multiple times.
#

set -euo pipefail

AVD_NAME="Small_Phone"
EMULATOR_CMD="$HOME/Library/Android/sdk/emulator/emulator"

# Ports that are always forwarded (Metro + Go backend)
PORTS=(8081 8082)

for arg in "$@"; do
  case "$arg" in
    --rails)
      PORTS+=(3000)
      ;;
    --all)
      PORTS+=(3000 5432 6379)
      ;;
    --help|-h)
      echo "Usage: $0 [--rails] [--all] [--help]"
      echo ""
      echo "  (default)  Forward Metro (8081) and Go backend (8082)"
      echo "  --rails    Also forward Rails backend (3000)"
      echo "  --all      Forward all: Rails (3000), Postgres (5432), Redis (6379), Metro (8081), Go (8082)"
      exit 0
      ;;
  esac
done

# Check that adb is available
if ! command -v adb &>/dev/null; then
  echo "ERROR: adb not found. Install Android SDK platform-tools."
  exit 1
fi

# Auto-start emulator if no device is connected
# Use || true so pipefail doesn't kill us when grep finds no match
DEVICE=$(adb devices 2>/dev/null | grep -v "^List" | grep "device$" | head -1 | awk '{print $1}' || true)
if [ -z "$DEVICE" ]; then
  echo "No emulator running. Starting '$AVD_NAME'..."
  "$EMULATOR_CMD" -avd "$AVD_NAME" -no-snapshot -no-audio &>/dev/null &
  echo "Waiting for emulator to boot (up to 60s)..."
  for i in $(seq 1 30); do
    sleep 2
    DEVICE=$(adb devices 2>/dev/null | grep -v "^List" | grep "device$" | head -1 | awk '{print $1}' || true)
    if [ -n "$DEVICE" ]; then
      break
    fi
    if [ "$i" -eq 30 ]; then
      echo "ERROR: Timed out waiting for emulator."
      exit 1
    fi
  done
fi

echo "Device: $DEVICE"
echo ""

for PORT in "${PORTS[@]}"; do
  # Check if already forwarded
  if adb reverse --list 2>/dev/null | grep -q "tcp:${PORT}"; then
    echo "  Port ${PORT} — already forwarded"
  else
    if adb reverse tcp:"${PORT}" tcp:"${PORT}" 2>/dev/null; then
      echo "  Port ${PORT} — forwarded"
    else
      echo "  Port ${PORT} — FAILED"
    fi
  fi
done

echo ""
echo "Done. Reload the app in the emulator (press RR) if needed."
