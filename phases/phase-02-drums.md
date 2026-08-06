# Phase 2 — Native iPhone 14 performance engine

## Objective

Make the iPhone 14 the latency-sensitive performance surface.

## Tasks

- Keep the current UIKit pad UI and synthesized drum rack as the first sound.
- Add the native WebSocket client for the shared protocol.
- Play local pad sounds immediately on touch.
- Send pad events to the Mac server after local triggering.
- Receive remote events and schedule them against the shared beat clock.
- Add instrument tracks, volume, mute, and arm state.
- Keep raw audio off the network.

## Done when

The iPhone 14 plays pads locally without waiting for the server and remains
connected to the shared Mac session.
