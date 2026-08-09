# Native performance harness

Run the automated release gate from the project root:

```sh
/Users/ps/dev/MusiCollab/scripts/run-performance-harness.sh
```

The harness covers:

- iPhone target compilation and signing;
- protocol validation, event serialization, acknowledgements, duplicate IDs,
  instrument/track state, and stale-session recovery;
- network interruption and reconnect behavior; and
- the three-client Mac Composer / iPhone 14 / iPhone 6 Plus smoke flow.

Run the short soak gate with:

```sh
SOAK_DURATION_SECONDS=10 /Users/ps/dev/MusiCollab/scripts/run-performance-harness.sh
```

For a release candidate, use `SOAK_DURATION_SECONDS=3600` and retain the
printed throughput, peak RSS, RSS growth, CPU, and event-loop-lag results.

## Physical iPhone 14 checks

With the server and Composer active, run 20 taps per pad, then a 10-second
rapid alternating-pad burst. Confirm no missed local hits, no UI hitch, and
stable memory in Xcode’s Debug Navigator. Repeat after a phone-call/audio
interruption, Bluetooth route change, background/foreground cycle, and brief
Wi-Fi loss. Capture the Composer diagnostics JSON and use the lifecycle and
network matrices as the evidence record.
