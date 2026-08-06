# Phase 4 tickets — iPhone 6 Plus companion

## MC-043 — Companion application shell

- Priority: P0 · Status: done · Dependencies: MC-011
- Acceptance: A lightweight route loads in iOS 12 Safari with companion-mode labeling and no unsupported blocking APIs.

## MC-044 — Legacy Safari compatibility baseline

- Priority: P0 · Status: done · Dependencies: MC-043
- Acceptance: Supported CSS/JS features are documented; the app works at the iPhone 6 Plus viewport and on a slow Wi-Fi connection.

## MC-045 — Companion WebSocket lifecycle

- Priority: P0 · Status: in-progress · Dependencies: MC-002, MC-009, MC-043
- Acceptance: Companion joins as `companion`, shows connecting/connected/reconnecting/offline states, and resumes state without refresh.

## MC-046 — Room code and QR join

- Priority: P1 · Status: planned · Dependencies: MC-011, MC-045
- Acceptance: User can enter a room code or scan a QR code; invalid, expired, and unavailable rooms are explained.

## MC-047 — Queue up-next controls

- Priority: P0 · Status: in-progress · Dependencies: MC-037, MC-045
- Acceptance: Companion can add, reorder, remove, and confirm the next track; commands are quantized and acknowledged.

## MC-048 — Waveform visualization

- Priority: P1 · Status: in-progress · Dependencies: MC-045
- Acceptance: Waveform metadata renders efficiently with loading, empty, unavailable, and long-sample states.

## MC-049 — Slice-boundary viewer

- Priority: P1 · Status: planned · Dependencies: MC-048
- Acceptance: Companion displays slice boundaries, selected slice, names, and scene mapping without allowing latency-sensitive playback.

## MC-050 — Scene selection

- Priority: P1 · Status: planned · Dependencies: MC-045, MC-047
- Acceptance: Scene selection is visible, validated, acknowledged, and quantized according to session policy.

## MC-051 — Companion transport controls

- Priority: P1 · Status: planned · Dependencies: MC-032, MC-045
- Acceptance: Companion can request play, stop, and next; it clearly distinguishes command pending from authoritative state.

## MC-052 — Companion cache and offline fallback

- Priority: P2 · Status: planned · Dependencies: MC-048
- Acceptance: Last-known queue and waveform remain readable offline; stale data is labeled and no unsafe command is silently sent.

## MC-053 — Companion accessibility pass

- Priority: P2 · Status: planned · Dependencies: MC-043
- Acceptance: Controls work with Safari zoom, VoiceOver labels, high contrast, large text, and touch targets.

## MC-054 — Companion performance budget

- Priority: P1 · Status: planned · Dependencies: MC-044, MC-048
- Acceptance: Initial bundle, memory, redraw rate, and waveform rendering stay within documented iPhone 6 Plus limits.

## MC-055 — Companion device test checklist

- Priority: P0 · Status: planned · Dependencies: MC-045, MC-047, MC-049
- Acceptance: A repeatable real-device checklist covers join, queue, waveform, slice view, lock/unlock, Wi-Fi loss, and resume.

## MC-126 — Companion landscape-only guidance

- Priority: P1 · Status: planned · Dependencies: MC-119, MC-043
- Acceptance: iPhone 6 Plus Safari uses a landscape layout; portrait shows a clear rotate-device prompt while preserving connection and session state.

## MC-127 — Installable companion PWA

- Priority: P1 · Status: done · Dependencies: MC-043, MC-044
- Acceptance: iOS Safari can add the companion to the Home Screen using a manifest, standalone display mode, and service-worker shell fallback.

## MC-128 — Companion performer instrument and pitch controls

- Priority: P0 · Status: in-progress · Dependencies: MC-045, MC-047
- Acceptance: Companion can select drums, bass, keys, or sampler and send a bounded -24 to +24 semitone pitch setting to the iPhone 14 performer.
