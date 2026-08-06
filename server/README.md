# MusiCollab session server

This is the Phase 1 local WebSocket backbone for the Mac composer, native
iPhone 14 performance app, and iPhone 6 Plus companion web app.

## Run

```sh
cd /Users/ps/dev/MusiCollab/server
npm install
npm start
```

The server exposes:

- Health check: `http://127.0.0.1:8787/health`
- Composer deck: `http://127.0.0.1:8787/composer`
- WebSocket endpoint: `ws://127.0.0.1:8787/ws`

For phones on the same Wi-Fi network, replace `127.0.0.1` with the Mac's LAN
IP address. The server defaults to room `LOCAL`; clients may provide another
room in their `hello` message.

For the native iPhone 14 app, `project.yml` currently points to this Mac's LAN
address: `ws://192.168.29.33:8787/ws`. If the Mac's IP changes, update that
value and run `xcodegen generate` again.

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
