# Browser compatibility matrix

MC-109 covers the audio-free iPhone 6 Plus companion, the Mac Composer, and the WebSocket/PWA behavior they share. Browser automation verifies the served shell and static assets; physical Safari/device checks remain required for legacy iOS behavior.

## Automated checks

```sh
cd /Users/ps/dev/MusiCollab/server
PORT=0 npm run test:browser-assets
```

Checks include Composer/Companion route loading, protocol-aware `ws`/`wss` selection, PWA manifest metadata, landscape orientation, service-worker versioning/fallback, health responses, and browser-readable errors. `npm run test:all` includes this suite.

## Manual matrix

| Surface | Target | Required checks | Current evidence |
| --- | --- | --- | --- |
| Mac Composer | Safari current | Loads, connects, desktop sound toggle, sample-free controls, diagnostics export, reconnect | Verified against the local Composer page; connected roster and diagnostics visible |
| Mac Composer | Chromium current | Same as Safari; confirm Web Audio unlock and file picker | Run the same checklist with the current Chromium build |
| iPhone 14 native + Composer | iOS current + Mac Safari/Chromium | Pad event, instrument/pitch selection, clock, reconnect, landscape full-screen | Native/server automated smoke covers protocol; physical audio test remains release evidence |
| iPhone 6 Plus Safari | iOS 12.5.x, landscape | Loads over LAN, connects without refresh, queue, waveform metadata, instrument/pitch command, reconnect | Verified at 736×414 landscape viewport; physical device check remains required |
| iPhone 6 Plus Home Screen PWA | iOS 12.5.x | Manifest, standalone launch, service worker, landscape layout, reconnect after foreground | HTTPS/trusted certificate required for production; test using `COMPANION_HOSTING.md` or `LOCAL_HTTPS.md` |

## Manual procedure

1. Start the server and open `/composer` on the Mac.
2. Open `/companion/?room=LOCAL` in Safari on the iPhone 6 Plus.
3. Confirm the roster contains Composer, iPhone 14 performer, and iPhone 6 Plus companion.
4. Queue a non-latency-sensitive item, change instrument/pitch, and confirm the performer acknowledges it.
5. Rotate/lock/foreground the companion and confirm it reconnects and requests a snapshot.
6. On the Composer, toggle desktop sound and verify it does not replace native performer audio.
7. Export diagnostics and review that it contains no session token, sample path, audio bytes, client names, or room code.

Record browser version, iOS version, viewport/orientation, LAN topology, result, and any console error in the release evidence. Do not treat a successful desktop viewport emulation as proof of iOS 12 Safari support.
