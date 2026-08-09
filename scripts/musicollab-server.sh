#!/usr/bin/env bash
set -euo pipefail

PROJECT_DIR="/Users/ps/dev/MusiCollab"
SERVER_DIR="$PROJECT_DIR/server"
PORT="${MUSICOLLAB_PORT:-8787}"
PID_FILE="${MUSICOLLAB_PID_FILE:-/tmp/musicollab-session-server.pid}"
LOG_FILE="${MUSICOLLAB_LOG_FILE:-/tmp/musicollab-session-server.log}"
TLS_KEY_FILE="${MUSICOLLAB_TLS_KEY:-}"
TLS_CERT_FILE="${MUSICOLLAB_TLS_CERT:-}"

die() { echo "MusiCollab: $*" >&2; exit 1; }

require_dependencies() {
  command -v node >/dev/null 2>&1 || die "Node.js is required. Install Node.js LTS, then retry."
  command -v npm >/dev/null 2>&1 || die "npm is required. Install Node.js LTS, then retry."
  [ -d "$SERVER_DIR" ] || die "Server directory not found: $SERVER_DIR"
  if [ ! -d "$SERVER_DIR/node_modules" ]; then
    echo "Dependencies are missing; running npm ci."
    (cd "$SERVER_DIR" && npm ci)
  fi
}

port_owner() {
  lsof -nP -iTCP:"$PORT" -sTCP:LISTEN 2>/dev/null || true
}

lan_ip() {
  local address=""
  for interface in en0 en1; do
    address="$(ipconfig getifaddr "$interface" 2>/dev/null || true)"
    [ -n "$address" ] && { echo "$address"; return; }
  done
  echo "<Mac-LAN-IP>"
}

start_server() {
  require_dependencies
  local owner
  owner="$(port_owner)"
  if [ -n "$owner" ]; then
    echo "Port $PORT is already in use:"
    echo "$owner"
    die "Stop that process or run with MUSICOLLAB_PORT=<free-port>."
  fi
  if [ -f "$PID_FILE" ] && kill -0 "$(cat "$PID_FILE")" 2>/dev/null; then
    die "Server is already running with PID $(cat "$PID_FILE")."
  fi
  if { [ -n "$TLS_KEY_FILE" ] && [ -z "$TLS_CERT_FILE" ]; } || { [ -z "$TLS_KEY_FILE" ] && [ -n "$TLS_CERT_FILE" ]; }; then
    die "MUSICOLLAB_TLS_KEY and MUSICOLLAB_TLS_CERT must be provided together."
  fi
  if [ -n "$TLS_KEY_FILE" ] && { [ ! -f "$TLS_KEY_FILE" ] || [ ! -f "$TLS_CERT_FILE" ]; }; then
    die "TLS certificate files were not found. Check MUSICOLLAB_TLS_KEY and MUSICOLLAB_TLS_CERT."
  fi
  local scheme="http"
  local socket_scheme="ws"
  [ -n "$TLS_KEY_FILE" ] && scheme="https" && socket_scheme="wss"
  echo "Starting MusiCollab server on 0.0.0.0:$PORT"
  (cd "$SERVER_DIR" && nohup env PORT="$PORT" HOST="${MUSICOLLAB_HOST:-0.0.0.0}" MUSICOLLAB_TLS_KEY="$TLS_KEY_FILE" MUSICOLLAB_TLS_CERT="$TLS_CERT_FILE" node index.js >>"$LOG_FILE" 2>&1 & echo $! >"$PID_FILE")
  sleep 0.4
  if ! kill -0 "$(cat "$PID_FILE")" 2>/dev/null; then
    echo "Server failed to start. Last log lines:"
    tail -20 "$LOG_FILE" 2>/dev/null || true
    exit 1
  fi
  echo "Composer:  $scheme://127.0.0.1:$PORT/composer"
  echo "Companion: $scheme://$(lan_ip):$PORT/companion"
  echo "WebSocket: $socket_scheme://$(lan_ip):$PORT/ws"
  echo "Log:       $LOG_FILE"
}

stop_server() {
  [ -f "$PID_FILE" ] || { echo "MusiCollab server is not running."; return; }
  local pid
  pid="$(cat "$PID_FILE")"
  if kill -0 "$pid" 2>/dev/null; then
    kill "$pid"
    for _ in 1 2 3 4 5; do
      kill -0 "$pid" 2>/dev/null || break
      sleep 0.2
    done
    echo "Stopped MusiCollab server (PID $pid)."
  else
    echo "Removed stale server PID file."
  fi
  rm -f "$PID_FILE"
}

status_server() {
  if [ -f "$PID_FILE" ] && kill -0 "$(cat "$PID_FILE")" 2>/dev/null; then
    echo "MusiCollab server is running (PID $(cat "$PID_FILE"), port $PORT)."
    local scheme="http"
    [ -n "$TLS_KEY_FILE" ] && scheme="https"
    local -a curl_args=()
    [ "$scheme" = "https" ] && curl_args+=(--insecure)
    curl -fsS "${curl_args[@]}" "$scheme://127.0.0.1:$PORT/health" || true
    echo
  else
    echo "MusiCollab server is stopped."
  fi
}

case "${1:-status}" in
  start) start_server ;;
  stop) stop_server ;;
  restart) stop_server; start_server ;;
  status) status_server ;;
  *) echo "Usage: $0 {start|stop|restart|status}" >&2; exit 2 ;;
esac
