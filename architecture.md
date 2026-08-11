# MusiCollab Client Architecture

## Runtime topology

```text
Mac browser: Composer Deck / Sequencer
        │
        │ WebSocket / JSON events
        ▼
Mac Node session server: room, clock, state, relay
        ▲
        │
Native iPhone 14 app
low-latency instruments
```

## Responsibilities

### Mac composer deck

- Own arrangement, queue, and waveform editing UI.
- Display connected clients and session health.
- Provide the primary transport controls.
- Act as the human-facing clock control surface.

### iPhone 14 native app

- Play drums, instruments, effects, and sample slices locally.
- Respond to pad touches without waiting for the network.
- Send timestamped musical events to the server.
- Schedule remote events slightly ahead of their target beat.

### Mac session server

- Accept WebSocket connections from the Mac composer and iPhone 14 performer.
- Assign a room/session ID and client role.
- Maintain authoritative session state and sequence numbers.
- Relay events and periodic state snapshots.

## Event envelope

```json
{
  "version": 1,
  "room": "ABCD",
  "sender": "iphone14",
  "type": "padHit",
  "sequence": 184,
  "beat": 42.25,
  "serverTime": 1722949200.221,
  "payload": { "track": "drums", "pad": "kick", "velocity": 0.92 }
}
```

Synchronize events and metadata, never raw audio. Each client owns its local
audio rendering. For the first version, run the WebSocket server on the Mac and
keep all devices on the same Wi-Fi network.

See [RELEASE_ARCHITECTURE_REVIEW.md](./RELEASE_ARCHITECTURE_REVIEW.md) for the
trust boundaries, failure-mode recovery, LAN assumptions, and supported-device
matrix used for release planning.
