# Clock accuracy verification

## Automated simulation

Run the server test suite from `server/`:

```sh
PORT=8788 npm test
```

The three-client simulation joins a composer, performer, and companion, runs
the authoritative clock at 120 BPM, and verifies that their latest beat
positions remain within 0.1 quarter-note beats.

## Hardware verification

1. Start the live server with `npm start`.
2. Open the Composer on the Mac and connect the iPhone 14 app and iPhone 6 Plus companion to room `LOCAL`.
3. Confirm each client reports clock sync offset, RTT, and sample count.
4. Press PLAY and compare beat, bar, and loop position for at least 30 seconds.
5. Background and reopen the iPhone app and companion. Confirm they request a snapshot and resynchronize instead of continuing from stale timing.
6. Record the largest visible offset, RTT, jitter, and any audible timing error in the release test notes.
