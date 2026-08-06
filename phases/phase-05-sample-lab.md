# Phase 5 — Shared clock and transport

## Objective

Give all three clients one consistent timeline.

## Tasks

- Let the Mac session server publish a monotonic clock reference.
- Send BPM, beat, bar, transport, and loop-position snapshots.
- Include future target timestamps in scheduled events.
- Add client clock-offset estimation.
- Add a small look-ahead window for iPhone 14 scheduling.
- Quantize queue and scene changes on the next beat or bar.
- Show drift and clock-health diagnostics on the Mac.

## Done when

Transport changes remain consistent across all clients while only the iPhone 14
is held to the strict audio-latency requirement.
