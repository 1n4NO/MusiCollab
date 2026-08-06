# Phase 4 — iPhone 6 Plus companion web app

## Objective

Give the legacy phone useful control and visualization without requiring
latency-sensitive audio playback.

## Tasks

- Add a lightweight `web/companion/` frontend compatible with iOS 12 Safari.
- Support room-code or QR-code joining.
- Add queue-up-next, scene selection, and transport commands.
- Display waveform images/data and slice boundaries.
- Add loading, disconnected, and retry states.
- Keep bundles small and avoid modern browser APIs without fallbacks.
- Add “companion mode” labeling so users know it is not the performance surface.

## Done when

The iPhone 6 Plus can join the Mac session, queue a track, and visualize the
current waveform without affecting iPhone 14 audio timing.
