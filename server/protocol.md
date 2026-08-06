# MusiCollab protocol v1

Transport: WebSocket at `/ws`. Messages are UTF-8 JSON objects.

Every server message includes `version: 1` and `type`. Client commands may include `requestID`; server acknowledgements echo it.

## Client commands

- `hello`: `{ room, clientID, name, role }`
- `event`: `{ eventType, eventID?, requestID?, payload, beat? }`
- `requestSnapshot`: `{ requestID? }`
- `ping`: `{ clientTime? }`

Valid roles: `composer`, `performer`, `companion`.

Valid event types: `padHit`, `transport`, `queue`, `loops`, `sample`, `scene`, `instrument`.

## Server messages

- `welcome`: accepted identity and room
- `snapshot`: authoritative transport, queue, loops, sample, and roster state
- `roster`: current clients and roles
- `event`: sequenced event with `eventID`, sender, role, server time, and payload
- `ack`: command acknowledgement with request ID and sequence where relevant
- `error`: stable error code, message, and request ID where available
- `pong`: response to `ping`

Malformed messages, unsupported versions/types, invalid room codes, duplicate client IDs, invalid roles, and invalid payloads are rejected without terminating the entire server.
