# MusiCollab protocol v1

Transport: WebSocket at `/ws`. Messages are UTF-8 JSON objects.

Every server message includes `version: 1` and `type`. Client commands may include `requestID`; server acknowledgements echo it.

## Client commands

- `hello`: `{ room, clientID, name, role }`
- `event`: `{ eventType, eventID?, requestID?, payload, beat?, targetServerTime?, targetBeat?, targetBar?, quantization? }`; transport payloads may use `action: "play" | "pause" | "stop"`, plus `bpm`, `beat`, `loopLengthBeats`, and `tempoPolicy: "preserve" | "reset"`
- `requestSnapshot`: `{ requestID? }`
- `ping`: `{ clientTime? }`
- `metrics`: `{ offsetMs, rttMs, jitterMs, lastSnapshotAt?, reconnectCount?, eventsSent?, eventsReceived?, eventsLost?, lastError? }`

Valid roles: `composer`, `performer`, `companion`.

Valid event types: `padHit`, `transport`, `queue`, `loops`, `sample`, `scene`, `instrument`, `instrumentParam`, `asset`, `sliceMap`, `library`.

Asset payloads use model version 1 and support `track`, `instrument`, `loop`, `sample`, `scene`, and `slice` records. New rooms include original generated demo content with license attribution; the room snapshot exposes all assets under `state.library`.

Every asset carries an `origin` (`bundled-demo`, `user-imported`, `third-party`, or `unknown`). License metadata includes `type`, `attribution`, `distribution`, and optional `url`/`notice`. Missing license data remains `unknown`; user imports are not treated as distributable rights and should be reviewed before export or release.

Sample metadata is control-plane data only. A normalized sample may include `duration`, `sampleRate`, `channels`, `sourceFormat`, `normalization`, `waveform`, `hash`, `transfer`, and validated `slices`. `transfer` is either `{ kind: "url", url, hash?, sizeBytes?, expiresAt? }` or `{ kind: "reference", reference, hash?, sizeBytes?, expiresAt? }`. Raw audio fields or bytes are rejected and are never broadcast over WebSocket. Audio transfer/download and local caching are covered by MC-077.

`sliceMap` payloads use `{ sampleID, sceneID?, assignments }`, where `assignments` maps pad numbers `0`–`15` to slice IDs or `null`. Reassigning a pad replaces its prior slice; sending an empty assignment map resets the map. The authoritative room snapshot exposes these records under `state.sliceMappings`.

`loops` payloads use `{ items: [loopID...] }` and are normalized from the room library. The server broadcasts each loop's `bars`, source `bpm`, `key`, `duration`, and `quantization`, plus the shared `loopLengthBeats` and per-loop `playbackRates` (`sessionBPM / sourceBPM`). Tempo changes preserve the authoritative beat phase, so loops remain bar-aligned while their playback rate follows the session tempo.

`instrument` payloads use an abstract preset contract: `{ instrumentID, instrument, name, family, engine: "abstract", parameters, pitch }`. Built-in and room-library presets are resolved server-side; parameters are numeric and bounded, `voiceCount` is limited to 1–32, and pitch is limited to ±24 semitones. Clients can map the normalized preset to their own synth or sampler engine without sharing engine-specific implementation details. The current selection persists under `state.instrument`.

`instrumentParam` payloads use `{ instrumentID, parameter, value }` and are normalized into a snapshot-safe parameter map with `automation: "step"` and the target beat. Reconnecting clients receive the latest complete parameter map from `state.instrument`.

`trackControl` payloads use `{ trackID, volume?, mute?, solo?, arm?, instrumentID? }`. Volume is clamped to 0…1, booleans are validated, and unspecified fields retain their current value. The authoritative values persist under `state.tracks`.

`scene` payloads use actions: `create`/`save` with a validated scene record, `rename` with `sceneID` and `name`, `duplicate` with `sceneID` and `newID`, `reorder` with a complete `order`, or `recall` with `sceneID`. The server persists the scene library, active scene, and `sceneOrder` in snapshots and rejects missing or invalid track references.

`library` payloads use `favorite`, `tags`, `missing`, or `recover` actions with an `assetID`. Favorite state, normalized tags, and missing-file state persist in room snapshots. Clients should offer recovery by re-importing the original file or restoring a valid transfer reference; the `recover` action clears the missing marker after that recovery.

## Server messages

- `welcome`: accepted identity and room. Includes `serverInstanceID`; a stale session token is reported with `serverRestarted: true`.
- `snapshot`: authoritative transport, queue, loops, sample, pending changes, and roster state with a `stateVersion` and `serverInstanceID`. A changed server instance is a new authority; clients must accept the snapshot as authoritative and reset old sequence/event-history assumptions. A new authority starts at sequence `0`.
- `roster`: current clients, roles, and reported clock metrics
- `event`: sequenced delta with `eventID`, `stateVersion`, sender, role, server time, payload, and normalized `timing` metadata. When supplied by the sender, `clientSentAt` produces `latency.clientToServerMs`; peers can combine `serverTime` with their clock offset to measure server-to-peer delivery.
- `stateChange`: applied deferred queue or scene change with the resulting `stateVersion`
- `ack`: command acknowledgement with request ID and sequence where relevant

Event IDs are idempotency keys. A repeated valid `eventID` is not applied or broadcast again; the server returns an acknowledgement with the original sequence/state version and `duplicate: true`. The bounded history retains the most recent 512 event IDs per room.

Reliable clients should send both a stable `requestID` and `eventID`, retry up to four times with the same IDs, and stop on `ack` or `error`. The server's duplicate handling makes retries safe; clients must surface a delivery failure after the retry limit.

Late-event policy: `padHit` events with a stale target are applied immediately and marked `timing.late: true, policy: "apply-immediately"`. Late transport, queue, loop, instrument, scene, library, asset, sample, and slice-map commands are rejected with `LATE_EVENT`; clients should resync and resend without the stale target. A 100 ms / 0.25 beat grace window avoids rejecting normal network jitter.
- `error`: stable error code, message, and request ID where available
- `pong`: response to `ping` with the echoed client timestamp and server receive/send timestamps for RTT and clock-offset estimation
- `clock`: periodic authoritative beat position with `beat`, `bar`, `loopPosition`, `loopLengthBeats`, `bpm`, `playing`, and wall-clock `serverTime`; `beat` is measured in quarter-note beats and advances from the server's monotonic clock.

Malformed messages, unsupported versions/types, invalid room codes, duplicate client IDs, invalid roles, and invalid payloads are rejected without terminating the entire server.
