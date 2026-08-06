# Phase 6 — Cross-device musical synchronization

## Objective

Make remote actions feel like one shared instrument rather than two separate apps.

## Tasks

- Send compact events for pad hits, slice triggers, tempo, transport, loops, and
  track state.
- Add event sequence numbers and duplicate suppression.
- Add a peer clock-offset estimate and jitter buffer.
- Quantize selected remote events to the next beat or bar.
- Display connection quality and synchronization health.
- Test burst traffic from fast pad playing and simultaneous interactions.

## Done when

The same musical action produces a consistent result on both devices without
sending raw audio over the network.
