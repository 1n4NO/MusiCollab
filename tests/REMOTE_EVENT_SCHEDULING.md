# Remote event scheduling

Remote pad events are processed independently from local pad input. The native
client now:

- rejects an event ID that has already been received;
- rejects an older server sequence after an authoritative snapshot;
- tracks each scheduled event by event ID so it cannot be scheduled twice;
- converts the server target time using the measured clock offset;
- caps a malformed/far-future delay at 10 seconds; and
- cancels pending scheduled hits when a fresh snapshot arrives or the app enters background.

The sound is scheduled asynchronously on the main queue and does not wait on
the local WebSocket receive path. Local pad touches continue to trigger the
local audio engine immediately.
