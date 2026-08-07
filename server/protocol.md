# MusiCollab protocol v1

Transport: WebSocket at `/ws`. Messages are UTF-8 JSON objects.

Every server message includes `version: 1` and `type`. Client commands may include `requestID`; server acknowledgements echo it.

## Client commands

- `hello`: `{ room, clientID, name, role }`
- `event`: `{ eventType, eventID?, requestID?, payload, beat?, targetServerTime?, targetBeat?, targetBar?, quantization? }`; transport payloads may use `action: "play" | "pause" | "stop"`, plus `bpm`, `beat`, `loopLengthBeats`, and `tempoPolicy: "preserve" | "reset"`
- `requestSnapshot`: `{ requestID? }`
- `ping`: `{ clientTime? }`
- `metrics`: `{ offsetMs, rttMs, jitterMs, lastSnapshotAt? }`

Valid roles: `composer`, `performer`, `companion`.

Valid event types: `padHit`, `transport`, `queue`, `loops`, `sample`, `scene`, `instrument`.

## Server messages

- `welcome`: accepted identity and room
- `snapshot`: authoritative transport, queue, loops, sample, pending changes, and roster state with a `stateVersion`
- `roster`: current clients, roles, and reported clock metrics
- `event`: sequenced delta with `eventID`, `stateVersion`, sender, role, server time, payload, and normalized `timing` metadata
- `stateChange`: applied deferred queue or scene change with the resulting `stateVersion`
- `ack`: command acknowledgement with request ID and sequence where relevant
- `error`: stable error code, message, and request ID where available
- `pong`: response to `ping` with the echoed client timestamp and server receive/send timestamps for RTT and clock-offset estimation
- `clock`: periodic authoritative beat position with `beat`, `bar`, `loopPosition`, `loopLengthBeats`, `bpm`, `playing`, and wall-clock `serverTime`; `beat` is measured in quarter-note beats and advances from the server's monotonic clock.

Malformed messages, unsupported versions/types, invalid room codes, duplicate client IDs, invalid roles, and invalid payloads are rejected without terminating the entire server.
