# MusiCollab session server

This is the Phase 1 local WebSocket backbone for the Mac composer, native
iPhone 14 performance app.

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
- WebSocket endpoint: `ws://127.0.0.1:8787/ws`

For phones on the same Wi-Fi network, replace `127.0.0.1` with the Mac's LAN
IP address. The server defaults to room `LOCAL`; clients may provide another
room in their `hello` message.

The Mac firewall must allow incoming connections for Node.js on the selected
port. Keep the Mac and iPhone 14 on the same Wi-Fi network; guest-network or
AP-isolation settings can prevent the phone from reaching the server.

For the native iPhone 14 app, `project.yml` currently points to this Mac's LAN
address: `ws://192.168.29.33:8787/ws`. If the Mac's IP changes, update that
value and run `xcodegen generate` again.

The composer also displays the current LAN join URL. The `/info` response is
the machine-readable source for setup tools and future QR-code joining.

## Sample storage

Desktop imports and native iPhone recordings are uploaded with `POST
/api/samples/upload` and copied into `server/samples/`. The server returns a
URL that is published as sample metadata over WebSocket. Connected desktop
clients download URL-backed samples automatically; the folder is intentionally
kept outside the JavaScript bundle and is ignored by normal application code.

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

Valid roles are `composer` and `performer`.

## Test

```sh
npm test
```
