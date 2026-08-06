# Phase 7 tickets — synchronization, reconnects, and latency hardening

## MC-085 — Session resumption token

- Priority: P0 · Status: planned · Dependencies: MC-007, MC-009
- Acceptance: A reconnecting client resumes identity and receives a fresh authoritative snapshot without duplicate roster entries.

## MC-086 — Duplicate-event handling

- Priority: P0 · Status: planned · Dependencies: MC-005
- Acceptance: Duplicate event IDs are ignored safely while acknowledgements remain idempotent.

## MC-087 — Late and out-of-order event policy

- Priority: P0 · Status: planned · Dependencies: MC-005, MC-060
- Acceptance: Clients reject, defer, or apply late events according to documented event-type policy.

## MC-088 — Reliable command delivery

- Priority: P0 · Status: planned · Dependencies: MC-006, MC-085
- Acceptance: Commands retry within limits, preserve correlation IDs, and expose failure without double-applying musical state.

## MC-089 — Native reconnect integration

- Priority: P0 · Status: in-progress · Dependencies: MC-085, MC-088
- Acceptance: iPhone 14 reconnects after Wi-Fi loss, server restart, sleep, backgrounding, and permission transitions.

## MC-090 — Browser reconnect integration

- Priority: P0 · Status: in-progress · Dependencies: MC-085, MC-088
- Acceptance: Composer and companion recover without refresh, preserve UI context, and indicate stale/pending state.

## MC-091 — Server restart recovery

- Priority: P0 · Status: planned · Dependencies: MC-085
- Acceptance: Clients detect lost authority, reconnect, receive a clean snapshot, and never assume old sequence continuity.

## MC-092 — Input-latency instrumentation

- Priority: P0 · Status: planned · Dependencies: MC-017, MC-060
- Acceptance: Local touch-to-audio, local-to-server, and server-to-peer timings are measured separately.

## MC-093 — Network quality diagnostics

- Priority: P1 · Status: planned · Dependencies: MC-064
- Acceptance: RTT, jitter, packet/event loss, reconnect count, and last error are visible and exportable.

## MC-094 — Wi-Fi interruption test matrix

- Priority: P0 · Status: planned · Dependencies: MC-089, MC-090
- Acceptance: Tests cover brief loss, network switch, router isolation, Mac sleep, and server port changes.

## MC-095 — Mobile lifecycle test matrix

- Priority: P0 · Status: planned · Dependencies: MC-089, MC-090
- Acceptance: Tests cover lock, unlock, app switch, termination, low power, audio interruption, and route changes.

## MC-096 — Memory and CPU soak test

- Priority: P1 · Status: planned · Dependencies: MC-021, MC-048, MC-077
- Acceptance: A 60-minute session stays within documented memory, CPU, battery, and event-loop budgets.

## MC-097 — Diagnostics export

- Priority: P1 · Status: planned · Dependencies: MC-093
- Acceptance: Mac exports redacted session diagnostics with app version, protocol version, timings, and errors.


