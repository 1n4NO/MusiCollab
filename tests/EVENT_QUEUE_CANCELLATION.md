# Event queue and cancellation

Native control-plane commands are treated as replaceable state rather than an
ever-growing FIFO. A newer transport, track-control, instrument, or
instrument-parameter command removes the older unsent command of the same type.
Explicit cancellation also removes pending retries before a new command is
queued.

Scheduled remote pad events are keyed by event ID and canceled when an
authoritative snapshot arrives, the app enters background, or the shared
transport pauses/stops. Pad hits remain immediate local actions and are not
coalesced with transport or instrument state updates.
