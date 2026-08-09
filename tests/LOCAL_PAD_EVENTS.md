# Native local pad events

The iPhone 14 triggers its local synthesized sound before touching the network.
After the trigger, `SessionTransport` queues a reliable `padHit` command with:

- `track`, `pad`, and normalized `velocity` in the payload
- the latest authoritative musical `beat` in the payload and event envelope
- local `inputAt` and `audioAt` timestamps for latency diagnostics
- a stable generated `eventID` and `requestID`
- `clientSentAt` in the event envelope

Commands wait for a completed native `welcome` handshake before transmission.
The same IDs are reused across up to four retries, allowing the server's
idempotency handling to acknowledge a retry without duplicating the hit.

On-device check: connect the iPhone 14, tap a pad, confirm the local sound is
immediate, then inspect the Composer event/diagnostics view for one `padHit`
with a matching event ID and beat. Temporarily background either client and
repeat after reconnect; there should be one logical event, not one per retry.
