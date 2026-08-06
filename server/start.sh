#!/bin/sh
set -eu

server_dir=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
cd "$server_dir"

if [ ! -d node_modules ]; then
  npm install
fi

echo "MusiCollab server starting. LAN/session info will be available at /info."
exec npm start
