# MusiCollab MVP release acceptance

1. Start the server with `scripts/musicollab-server.sh start`.
2. Open the Composer and Companion on the same LAN and join the same room.
3. Verify the roster, tempo, play/stop, queue, scene recall, instrument/pitch,
   waveform, and slice-boundary updates.
4. Install the companion PWA from Safari and repeat the reconnect/resume check.
5. Install the signed native iPhone build and verify local pad audio, remote
   pad events, landscape full-screen layout, and audio interruption recovery.
6. Run `scripts/test-all.sh` and record the build number and test output.
7. For external distribution, archive/export with the release scripts and
   complete TestFlight review, accessibility, privacy, and device checks.
