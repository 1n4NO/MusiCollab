# MusiCollab session server

This is the Phase 1 local WebSocket backbone for the Mac composer, native
iPhone 14 performance app, and iPhone 6 Plus companion web app.

## Run

Recommended Mac workflow:

```sh
/Users/ps/dev/MusiCollab/scripts/musicollab-server.sh start
/Users/ps/dev/MusiCollab/scripts/musicollab-server.sh status
/Users/ps/dev/MusiCollab/scripts/musicollab-server.sh stop
```

The controller checks Node.js/npm and installs the locked dependencies when
needed. It reports the process holding port 8787 instead of starting over it,
prints the Mac LAN join URLs, and writes the background log to
`/tmp/musicollab-session-server.log`. Use `MUSICOLLAB_PORT=8789` for a second
development instance.

```sh
cd /Users/ps/dev/MusiCollab/server
npm install
npm start
```

Or use the first-run wrapper, which installs dependencies if needed:

```sh
./start.sh
```

The server exposes:

- Health check: `http://127.0.0.1:8787/health`
- LAN/session info: `http://127.0.0.1:8787/info`
- Composer deck: `http://127.0.0.1:8787/composer`
- iPhone 6 Plus companion: `http://127.0.0.1:8787/companion`
- WebSocket endpoint: `ws://127.0.0.1:8787/ws`

For phones on the same Wi-Fi network, replace `127.0.0.1` with the Mac's LAN
IP address. The server defaults to room `LOCAL`; clients may provide another
room in their `hello` message.

The Mac firewall must allow incoming connections for Node.js on the selected
port. Keep the Mac and both phones on the same Wi-Fi network; guest-network or
AP-isolation settings can prevent the phones from reaching the server.

For the native iPhone 14 app, `project.yml` currently points to this Mac's LAN
address: `ws://192.168.29.33:8787/ws`. If the Mac's IP changes, update that
value and run `xcodegen generate` again.

The composer also displays the current LAN join URL. The `/info` response is
the machine-readable source for setup tools and future QR-code joining.

## Client hello

```json
{
  "type": "hello",
  "room": "ABCD",
  "clientID": "iphone14",
  "name": "Performance",
  "role": "performer"
}
```

Valid roles are `composer`, `performer`, and `companion`.

## Test

```sh
npm test
```
