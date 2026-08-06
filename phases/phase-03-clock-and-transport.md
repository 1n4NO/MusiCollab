# Phase 3 — Shared tempo clock and transport

## Objective

Give both phones one authoritative musical timeline.

## Tasks

- Choose a host/master device for the first implementation.
- Add BPM changes, play, stop, and beat position to session state.
- Timestamp events against a monotonic clock rather than wall-clock time.
- Add a short look-ahead scheduler for remote events.
- Show peer beat indicators and drift diagnostics during development.
- Handle host disconnect and host reassignment.

## Done when

Both devices start and stop within the chosen tolerance, remain aligned for
several minutes, and recover after the host disconnects.
