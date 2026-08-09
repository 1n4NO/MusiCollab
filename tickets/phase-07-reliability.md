# Phase 7 tickets — synchronization, reconnects, and latency hardening

## MC-085 — Session resumption token

- Priority: P0 · Status: done · Dependencies: MC-007, MC-009
- Acceptance: A reconnecting client resumes identity and receives a fresh authoritative snapshot without duplicate roster entries.
- Delivered: Added opaque session tokens to the WebSocket hello/welcome flow. Composer, companion PWA, and iPhone 14 persist and resend tokens; the server restores identity, safely replaces stale sockets, prevents duplicate roster entries, and sends a fresh snapshot.

## MC-086 — Duplicate-event handling

- Priority: P0 · Status: done · Dependencies: MC-005
- Acceptance: Duplicate event IDs are ignored safely while acknowledgements remain idempotent.
- Delivered: Added bounded per-room event-ID history. Retries now receive the original sequence/state metadata with `duplicate: true` and cannot reapply or rebroadcast musical state, including deferred queue commands.

## MC-087 — Late and out-of-order event policy

- Priority: P0 · Status: done · Dependencies: MC-005, MC-060
- Acceptance: Clients reject, defer, or apply late events according to documented event-type policy.
- Delivered: Added a documented 100 ms / 0.25 beat grace policy. Late pad hits apply immediately with late metadata; late state-changing commands are rejected with `LATE_EVENT` so clients can resync and retry safely.

## MC-088 — Reliable command delivery

- Priority: P0 · Status: done · Dependencies: MC-006, MC-085
- Acceptance: Commands retry within limits, preserve correlation IDs, and expose failure without double-applying musical state.
- Delivered: Composer, companion PWA, and iPhone 14 now retry commands up to four times with stable request/event IDs, stop on acknowledgement or error, and report bounded delivery failures. Server-side duplicate handling prevents double application.

## MC-089 — Native reconnect integration

- Priority: P0 · Status: done · Dependencies: MC-085, MC-088
- Acceptance: iPhone 14 reconnects after Wi-Fi loss, server restart, sleep, backgrounding, and permission transitions.
- Delivered: Added native suspend/resume lifecycle handling, NWPathMonitor network recovery, reconnect scheduling after socket/send failures, foreground snapshot resync, and preservation of pending reliable commands across interruptions.

## MC-090 — Browser reconnect integration

- Priority: P0 · Status: done · Dependencies: MC-085, MC-088
- Acceptance: Composer and companion recover without refresh, preserve UI context, and indicate stale/pending state.
- Delivered: Added browser online/offline and visibility recovery, snapshot freshness indicators, pending-command status, and automatic reconnect behavior to the Composer and iPhone 6 Plus companion PWA.

## MC-091 — Server restart recovery

- Priority: P0 · Status: done · Dependencies: MC-085
- Acceptance: Clients detect lost authority, reconnect, receive a clean snapshot, and never assume old sequence continuity.
- Delivered: Added a per-process server authority ID and restart marker, clean snapshot metadata with sequence reset, stale-token detection, and pending-command/event-history reset handling across Composer, companion PWA, and iPhone 14 reconnects.

## MC-092 — Input-latency instrumentation

- Priority: P0 · Status: done · Dependencies: MC-017, MC-060
- Acceptance: Local touch-to-audio, local-to-server, and server-to-peer timings are measured separately.
- Delivered: Added client-to-server event timestamps, server latency metadata, Composer latency readouts, iPhone 14 touch-to-audio timing, and peer-delivery estimates using synchronized clocks.

## MC-093 — Network quality diagnostics

- Priority: P1 · Status: done · Dependencies: MC-064
- Acceptance: RTT, jitter, packet/event loss, reconnect count, and last error are visible and exportable.
- Delivered: Added Composer network diagnostics with RTT, jitter, event-sequence loss, reconnect count, last-error tracking, server roster metrics, and JSON export.

## MC-094 — Wi-Fi interruption test matrix

- Priority: P0 · Status: done · Dependencies: MC-089, MC-090
- Acceptance: Tests cover brief loss, network switch, router isolation, Mac sleep, and server port changes.
- Delivered: Added an automated network interruption suite plus a physical three-client test matrix covering Wi-Fi loss, network switching, router isolation, Mac sleep, and server port changes with diagnostics evidence requirements.

## MC-095 — Mobile lifecycle test matrix

- Priority: P0 · Status: done · Dependencies: MC-089, MC-090
- Acceptance: Tests cover lock, unlock, app switch, termination, low power, audio interruption, and route changes.
- Delivered: Added the release-device lifecycle matrix with explicit expected behavior and evidence requirements for iPhone 14, iPhone 6 Plus companion, and the shared Composer session.

## MC-096 — Memory and CPU soak test

- Priority: P1 · Status: done · Dependencies: MC-021, MC-048, MC-077
- Acceptance: A 60-minute session stays within documented memory, CPU, battery, and event-loop budgets.
- Delivered: Added a configurable three-client server soak harness with RSS, CPU, event-loop lag, disconnect, and throughput checks, plus documented quick and 60-minute release runs.

## MC-097 — Diagnostics export

- Priority: P1 · Status: planned · Dependencies: MC-093
- Acceptance: Mac exports redacted session diagnostics with app version, protocol version, timings, and errors.
