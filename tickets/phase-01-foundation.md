# Phase 1 tickets — shared protocol and Mac session service

## MC-001 — Define protocol envelope

- Priority: P0 · Status: done · Dependencies: none
- Acceptance: Every message has version, type, room, server time where relevant, and documented JSON examples.

## MC-002 — Define hello and welcome handshake

- Priority: P0 · Status: done · Dependencies: MC-001
- Acceptance: A client identifies room, client ID, name, and role; the server returns a welcome message or a structured error.

## MC-003 — Define room lifecycle

- Priority: P0 · Status: done · Dependencies: MC-002
- Acceptance: Rooms are created on first join, normalized consistently, removed when empty, and never leak state across room codes.

## MC-004 — Define client roles and capabilities

- Priority: P1 · Status: done · Dependencies: MC-002
- Acceptance: `composer`, `performer`, and `companion` are validated; invalid roles receive a clear error; capability rules are documented.

## MC-005 — Add sequence numbers and event IDs

- Priority: P0 · Status: done · Dependencies: MC-001
- Acceptance: Every musical event has a monotonic room sequence and unique event ID; clients can identify duplicates and ordering.

## MC-006 — Add acknowledgements and error codes

- Priority: P1 · Status: done · Dependencies: MC-001, MC-005
- Acceptance: Important commands receive an acknowledgement or actionable error with correlation ID, code, and message.

## MC-007 — Implement state snapshots

- Priority: P0 · Status: done · Dependencies: MC-003, MC-005
- Acceptance: New and resumed clients receive transport, queue, loop, sample, and roster state; snapshots are versioned and tested.

## MC-008 — Implement roster updates

- Priority: P1 · Status: done · Dependencies: MC-003, MC-004
- Acceptance: Join, leave, and role changes update every client with name, ID, role, and connection time.

## MC-009 — Implement heartbeat and timeout policy

- Priority: P0 · Status: done · Dependencies: MC-002
- Acceptance: Temporary missed heartbeats are tolerated; stale sockets are removed; policy is covered by a deterministic test.

## MC-010 — Add health and diagnostics endpoints

- Priority: P1 · Status: done · Dependencies: MC-003
- Acceptance: Health reports server status, room count, client count, uptime, and protocol version without exposing private sample data.

## MC-011 — Add room-code and LAN-address UX

- Priority: P1 · Status: done · Dependencies: MC-003
- Acceptance: Mac UI shows current room, LAN URL, copy action, and instructions for joining from both phones.

## MC-012 — Add one-command local server workflow

- Priority: P1 · Status: done · Dependencies: MC-010, MC-011
- Acceptance: A documented command starts the server, validates its port, prints the LAN address, and exits cleanly on SIGINT.

## MC-013 — Add protocol schema validation

- Priority: P1 · Status: done · Dependencies: MC-001, MC-006
- Acceptance: Malformed, oversized, unknown, and unsupported-version messages are rejected safely and tested.

## MC-014 — Remove legacy transport dependency

- Priority: P1 · Status: done · Dependencies: MC-002
- Acceptance: WebSocket is the primary session transport; the old transport remains only where explicitly needed for local fallback or is removed.

## MC-015 — Three-client smoke test

- Priority: P0 · Status: planned · Dependencies: MC-007, MC-008, MC-009, MC-011
- Acceptance: Mac, iPhone 14, and iPhone 6 Plus join one room, appear in the roster, exchange a test event, and recover after one reconnect.

## MC-119 — Define landscape-only product policy

- Priority: P0 · Status: planned · Dependencies: MC-004
- Acceptance: Supported orientation is documented for the iPhone 14 app, iPhone 6 Plus companion, and desktop composer; portrait behavior and user guidance are explicitly defined.
