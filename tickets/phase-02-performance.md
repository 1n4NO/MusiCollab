# Phase 2 tickets — native iPhone 14 performance

## MC-016 — Stabilize pad touch interaction

- Priority: P0 · Status: done · Dependencies: MC-002
- Acceptance: Pads have 44pt targets, pressed/released states, multi-touch behavior, and no UI hitch during audio triggering.
- Delivered: Added 74pt pad targets, simultaneous touch support, duplicate touch-down suppression, release/cancel cleanup, visual pressed states, and VoiceOver labels/hints.

## MC-017 — Calibrate local drum-pad latency

- Priority: P0 · Status: done · Dependencies: MC-016
- Acceptance: Local audio starts without waiting for WebSocket; cold and warm input latency are measured and documented on iPhone 14.
- Delivered: Preserved local-first triggering, added per-pad cold/warm touch-to-audio readouts, and documented the iPhone 14 calibration procedure and acoustic-latency limitation.

## MC-018 — Complete synthesized drum rack

- Priority: P1 · Status: done · Dependencies: MC-016
- Acceptance: Kick, snare, hat, clap, tom, and percussion voices are distinct, tunable, and safe under rapid retriggering.
- Delivered: Added distinct kick, snare, hat, clap, percussion, tom, rim, and FX synthesis; bounded pitch, decay, and tone controls; and two rotating playback voices per pad for safe rapid retriggering. See `tests/SYNTH_DRUM_RACK.md`.

## MC-019 — Add audio-session lifecycle handling

- Priority: P0 · Status: done · Dependencies: MC-018
- Acceptance: Audio resumes or fails clearly after interruption, route change, phone call, lock, and Bluetooth transition.
- Delivered: Added audio-session status reporting, Bluetooth A2DP category support, interruption recovery/failure messaging, route-change recovery, media-services reset recovery, background touch cleanup, and foreground restart handling. Verified with the native build; device-call, lock, and Bluetooth cases remain in `tests/MOBILE_LIFECYCLE_MATRIX.md` for on-device validation.

## MC-020 — Implement native WebSocket handshake

- Priority: P0 · Status: done · Dependencies: MC-002, MC-004
- Acceptance: iPhone 14 joins as `performer`, receives welcome/snapshot/roster, and exposes connection state in the UI.
- Delivered: Hardened hello delivery with readiness/retry handling, validated the accepted `performer` role before marking the connection online, and surfaced welcome, snapshot, roster, suspended, and handshake-failure states in the native UI.

## MC-021 — Send local pad events

- Priority: P0 · Status: done · Dependencies: MC-005, MC-017, MC-020
- Acceptance: Local pad sound is immediate and a compact event is sent after triggering with pad, velocity, beat, and event ID.
- Delivered: Added the current clock beat to local pad payloads, promoted it to the protocol event envelope, preserved stable event/request IDs and client send timing, and held queued pad events until the native handshake completes so reconnects do not send on a stale socket.

## MC-022 — Receive and schedule remote events

- Priority: P1 · Status: done · Dependencies: MC-005, MC-020, MC-025
- Acceptance: Remote events are deduplicated and scheduled against the clock without blocking local pad input.
- Delivered: Added sequence-aware remote event filtering, event-ID scheduling guards, clock-offset scheduling with a bounded delay, and cancellation of pending remote hits when a fresh snapshot or background transition supersedes them.

## MC-023 — Add instrument abstraction

- Priority: P1 · Status: done · Dependencies: MC-018
- Acceptance: Instruments share a documented voice interface and can be selected without changing the session protocol.
- Delivered: Added the shared `InstrumentPreset` contract and `InstrumentVoice` interface, mapped authoritative snapshots and instrument events into the native engine, and preserved abstract protocol selection across drums, bass, keys, and sampler presets.

## MC-024 — Add track controls

- Priority: P1 · Status: done · Dependencies: MC-023
- Acceptance: Volume, mute, solo, arm, instrument selection, and safe defaults work per track.
- Delivered: Added authoritative `trackControl` state and validation for volume, mute, solo, arm, and instrument selection; initialized safe drum-track defaults; and applied native performer volume/mute/solo behavior across snapshots and live events.

## MC-025 — Add local event queue and cancellation

- Priority: P1 · Status: done · Dependencies: MC-022
- Acceptance: Scheduled events can be canceled or replaced safely when transport changes or a scene is switched.
- Delivered: Added replaceable pending-command cancellation for transport, track, and instrument control events; canceled stale transport retries on tempo/state changes; and canceled scheduled remote hits on pause, stop, snapshot, and background transitions.

## MC-026 — Add performer error states

- Priority: P1 · Status: done · Dependencies: MC-020
- Acceptance: Offline, permission denied, unsupported audio, stale session, and server rejection states explain recovery.
- Delivered: Added unified transport status reporting for offline paths, connection loss, hello failures, server restarts, delivery exhaustion, server error responses, and audio-session failures; native UI now shows the error category and recovery state.

## MC-027 — Add accessibility and haptics pass

- Priority: P2 · Status: done · Dependencies: MC-016
- Acceptance: VoiceOver labels, Dynamic Type-safe labels, contrast, reduce-motion behavior, and optional haptic feedback are verified.
- Delivered: Added Dynamic Type-aware status/control labels, live VoiceOver connection updates and pad values, optional local haptic feedback, and a reduce-motion-safe pad flash path while retaining high-contrast pad colors and touch targets.

## MC-028 — Native performance test harness

- Priority: P1 · Status: done · Dependencies: MC-017, MC-021
- Acceptance: Automated or repeatable tests cover pad rate, event serialization, reconnect, audio interruption, and memory growth.
- Delivered: Added a single performance harness script combining the native build, protocol, network, three-client smoke, and optional soak suites, plus a physical iPhone 14 pad-rate/interruption/memory runbook in `tests/NATIVE_PERFORMANCE_HARNESS.md`.

## MC-129 — Apply remote instrument and pitch settings

- Priority: P1 · Status: done · Dependencies: MC-022, MC-023
- Acceptance: iPhone 14 applies companion-selected instrument and bounded pitch settings to subsequent local and remote performance sounds.
- Delivered: Applied instrument presets from snapshots and live companion events before subsequent local or scheduled remote triggers; clamped native pitch to ±24 semitones and all preset parameters to their safe ranges; and invalidated synthesized buffers after each update.

## MC-120 — Enforce landscape-only native orientation

- Priority: P0 · Status: done · Dependencies: MC-119
- Acceptance: The iPhone 14 app supports landscape orientations only, rejects portrait rotation, and keeps pads, transport, and safe-area content usable in both landscape directions.

## MC-121 — Add landscape performance layout pass

- Priority: P1 · Status: done · Dependencies: MC-120, MC-027
- Acceptance: Pad grid, instrument controls, transport, connection state, and accessibility labels are laid out for landscape without clipping or unsafe touch targets.
- Delivered: Completed the landscape layout pass with edge-to-edge horizontal content, preserved top safe-area handling, compact pad sizing, Dynamic Type-safe status/control labels, and accessible touch targets. Removed the native iPhone 14 side gutters while retaining panel-internal spacing.
