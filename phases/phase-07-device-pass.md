# Phase 7 — Synchronization, reconnects, and latency hardening

## Objective

Make the three-client session reliable under real use.

## Tasks

- Add reconnect with session resumption and a fresh state snapshot.
- Handle duplicate, late, and out-of-order events.
- Add client heartbeats and server-side timeouts.
- Measure iPhone 14 local input latency separately from network latency.
- Test queue changes while the iPhone 14 is performing.
- Test Wi-Fi loss, Mac sleep, phone lock, app backgrounding, and audio route changes.
- Add diagnostics export from the Mac composer deck.

## Done when

The iPhone 14 stays playable during ordinary network interruptions, while the
iPhone 6 Plus can reconnect and recover its companion state.
