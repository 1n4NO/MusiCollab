# Local iPhone 14 pad latency calibration

MC-017 measures the time from UIKit touch delivery to local audio scheduling. The native handler triggers `AudioEngine` before sending the WebSocket event, so network availability is not on the local audio path.

## Procedure

1. Build and run the native app on the iPhone 14 with the Mac server unavailable, then enable the session afterward. Local pad audio must still work before the connection exists.
2. Tap each pad once. The performance label reports `cold touch→audio`; this includes first-use buffer generation.
3. Tap each pad 20 more times at a steady rate. The label reports `warm touch→audio`; record the median and maximum per pad.
4. Repeat after a background/foreground cycle and after an audio-route change.
5. Export the Composer diagnostics separately for network timing; do not combine network RTT with local touch-to-audio timing.

The displayed value measures scheduling overhead at the app boundary, not the acoustic speaker-to-ear latency. A release calibration should pair these values with an Instruments/Audio I/O trace on the target iPhone 14. Suggested acceptance budget: cold scheduling under 50 ms and warm scheduling under 20 ms, with no missed local hits during a 10-hit burst.
