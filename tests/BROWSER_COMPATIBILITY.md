# Browser compatibility matrix

MC-109 covers the Mac Composer/Sequencer and the WebSocket behavior shared with the native iPhone 14 performer. Browser automation verifies the served shells and static assets.

## Automated checks

```sh
cd /Users/ps/dev/MusiCollab/server
PORT=0 npm run test:browser-assets
```

Checks include Composer/Sequencer route loading, protocol-aware `ws`/`wss` selection, landscape layout, health responses, and browser-readable errors. `npm run test:all` includes this suite.

## Manual matrix

| Surface | Target | Required checks | Current evidence |
| --- | --- | --- | --- |
| Mac Composer | Safari current | Loads, connects, desktop sound toggle, sample-free controls, diagnostics export, reconnect | Verified against the local Composer page; connected roster and diagnostics visible |
| Mac Composer | Chromium current | Same as Safari; confirm Web Audio unlock and file picker | Run the same checklist with the current Chromium build |
| iPhone 14 native + Composer | iOS current + Mac Safari/Chromium | Pad event, instrument/pitch selection, clock, reconnect, landscape full-screen | Native/server automated smoke covers protocol; physical audio test remains release evidence |

## Manual procedure

1. Start the server and open `/composer` on the Mac.
2. Open `/sequencer` on the Mac and verify the grid, routing, effects, recording, and export controls.
3. Connect the iPhone 14 as performer and confirm instrument/pitch events reach the session.
4. Lock/foreground the native app and confirm it reconnects and requests a snapshot.
5. On the Composer, toggle desktop sound and verify it does not replace native performer audio.
6. Export diagnostics and review that it contains no session token, sample path, audio bytes, client names, or room code.

Record browser version, iOS version, viewport/orientation, LAN topology, result, and any console error in the release evidence. Do not treat a successful desktop viewport emulation as proof of iOS 12 Safari support.
