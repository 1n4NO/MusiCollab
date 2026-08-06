# Phase 5 tickets — shared clock and transport

## MC-056 — Server authoritative clock

- Priority: P0 · Status: planned · Dependencies: MC-007
- Acceptance: Server exposes a monotonic session clock independent of wall-clock changes and documents its time units.

## MC-057 — Clock synchronization handshake

- Priority: P0 · Status: planned · Dependencies: MC-056
- Acceptance: Clients estimate offset and round-trip time using multiple samples and retain quality metrics.

## MC-058 — Transport state model

- Priority: P0 · Status: planned · Dependencies: MC-056
- Acceptance: Play, pause, stop, BPM, beat, bar, and loop position have one authoritative state machine with legal transitions.

## MC-059 — Transport snapshots and deltas

- Priority: P0 · Status: planned · Dependencies: MC-007, MC-058
- Acceptance: New clients converge from a snapshot; active clients converge from compact updates without oscillation.

## MC-060 — Future-target event timestamps

- Priority: P0 · Status: planned · Dependencies: MC-057, MC-058
- Acceptance: Scheduled events include target session time, beat, bar, and quantization metadata.

## MC-061 — iPhone 14 look-ahead scheduler

- Priority: P0 · Status: planned · Dependencies: MC-022, MC-060
- Acceptance: Performer schedules within a configurable look-ahead window and keeps local input immediate.

## MC-062 — Quantized queue changes

- Priority: P1 · Status: planned · Dependencies: MC-058, MC-047
- Acceptance: Queue and scene changes can apply on next beat, bar, or immediate mode with visible pending state.

## MC-063 — Loop phase and bar position

- Priority: P1 · Status: planned · Dependencies: MC-058
- Acceptance: All clients display the same loop phase within documented tolerance after join and reconnect.

## MC-064 — Drift measurement

- Priority: P1 · Status: planned · Dependencies: MC-057
- Acceptance: Mac displays offset, RTT, drift, jitter, and last snapshot age per client.

## MC-065 — Tempo change policy

- Priority: P1 · Status: planned · Dependencies: MC-058
- Acceptance: BPM changes preserve or intentionally reset phase according to documented user choice.

## MC-066 — Clock interruption recovery

- Priority: P0 · Status: planned · Dependencies: MC-057, MC-058
- Acceptance: Sleep, backgrounding, route interruption, and long suspension force resync rather than producing stale timing.

## MC-067 — Clock accuracy test suite

- Priority: P0 · Status: planned · Dependencies: MC-060, MC-061, MC-063
- Acceptance: Automated simulation and real-device tests measure event timing, drift, jitter, and reconnect convergence.

