# Phase 1 — Shared protocol and Mac session service

## Status

In progress — the local server, room handling, roles, snapshots, event relay,
heartbeats, health endpoint, and protocol test are implemented.

## Objective

Create the local WebSocket backbone that all three clients use.

## Tasks

- Add a Node.js WebSocket server under `server/`.
- Define versioned JSON messages for hello, room join, state snapshot, pad hit,
  transport, queue, loop, sample, and error events.
- Assign roles: `composer`, `performer`, and `companion`.
- Add sequence numbers, acknowledgements, and periodic state snapshots.
- Add a room code and clear connection states.
- Add a Mac-local start command and LAN address display.
- Remove Multipeer Connectivity as the primary transport.

## Done when

The Mac server accepts three clients and relays a test event with a visible
sender, role, sequence number, and connection status.
