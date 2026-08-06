# Phase 2 tickets — native iPhone 14 performance

## MC-016 — Stabilize pad touch interaction

- Priority: P0 · Status: planned · Dependencies: MC-002
- Acceptance: Pads have 44pt targets, pressed/released states, multi-touch behavior, and no UI hitch during audio triggering.

## MC-017 — Calibrate local drum-pad latency

- Priority: P0 · Status: planned · Dependencies: MC-016
- Acceptance: Local audio starts without waiting for WebSocket; cold and warm input latency are measured and documented on iPhone 14.

## MC-018 — Complete synthesized drum rack

- Priority: P1 · Status: planned · Dependencies: MC-016
- Acceptance: Kick, snare, hat, clap, tom, and percussion voices are distinct, tunable, and safe under rapid retriggering.

## MC-019 — Add audio-session lifecycle handling

- Priority: P0 · Status: planned · Dependencies: MC-018
- Acceptance: Audio resumes or fails clearly after interruption, route change, phone call, lock, and Bluetooth transition.

## MC-020 — Implement native WebSocket handshake

- Priority: P0 · Status: in-progress · Dependencies: MC-002, MC-004
- Acceptance: iPhone 14 joins as `performer`, receives welcome/snapshot/roster, and exposes connection state in the UI.

## MC-021 — Send local pad events

- Priority: P0 · Status: in-progress · Dependencies: MC-005, MC-017, MC-020
- Acceptance: Local pad sound is immediate and a compact event is sent after triggering with pad, velocity, beat, and event ID.

## MC-022 — Receive and schedule remote events

- Priority: P1 · Status: planned · Dependencies: MC-005, MC-020, MC-025
- Acceptance: Remote events are deduplicated and scheduled against the clock without blocking local pad input.

## MC-023 — Add instrument abstraction

- Priority: P1 · Status: planned · Dependencies: MC-018
- Acceptance: Instruments share a documented voice interface and can be selected without changing the session protocol.

## MC-024 — Add track controls

- Priority: P1 · Status: planned · Dependencies: MC-023
- Acceptance: Volume, mute, solo, arm, instrument selection, and safe defaults work per track.

## MC-025 — Add local event queue and cancellation

- Priority: P1 · Status: planned · Dependencies: MC-022
- Acceptance: Scheduled events can be canceled or replaced safely when transport changes or a scene is switched.

## MC-026 — Add performer error states

- Priority: P1 · Status: planned · Dependencies: MC-020
- Acceptance: Offline, permission denied, unsupported audio, stale session, and server rejection states explain recovery.

## MC-027 — Add accessibility and haptics pass

- Priority: P2 · Status: planned · Dependencies: MC-016
- Acceptance: VoiceOver labels, Dynamic Type-safe labels, contrast, reduce-motion behavior, and optional haptic feedback are verified.

## MC-028 — Native performance test harness

- Priority: P1 · Status: planned · Dependencies: MC-017, MC-021
- Acceptance: Automated or repeatable tests cover pad rate, event serialization, reconnect, audio interruption, and memory growth.

## MC-120 — Enforce landscape-only native orientation

- Priority: P0 · Status: planned · Dependencies: MC-119
- Acceptance: The iPhone 14 app supports landscape orientations only, rejects portrait rotation, and keeps pads, transport, and safe-area content usable in both landscape directions.

## MC-121 — Add landscape performance layout pass

- Priority: P1 · Status: planned · Dependencies: MC-120, MC-027
- Acceptance: Pad grid, instrument controls, transport, connection state, and accessibility labels are laid out for landscape without clipping or unsafe touch targets.
