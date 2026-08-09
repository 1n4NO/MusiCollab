# Crash and error reporting strategy

MusiCollab uses local, privacy-preserving diagnostics in the current release. It does not automatically upload crash reports, audio, sample content, room names, client names, or session tokens.

## Failure classes

| Class | Examples | User action | Evidence |
| --- | --- | --- | --- |
| Connection | Wi-Fi loss, TLS trust failure, WebSocket close, stale server authority | Restore LAN/certificate trust and wait for reconnect; request a snapshot if needed | Composer diagnostics export, companion status/log, native status label |
| Protocol | Invalid role, malformed asset, stale target, rejected command | Correct the input or resync; do not retry a rejected payload indefinitely | Error code/message and bounded event metrics |
| Audio | Audio session interruption, decoder failure, unsupported sample, unavailable cache | Foreground the app, re-import, or restore the original sample | Native status label and OSLog runtime entry |
| Resource | Oversized sample, cache limit, repeated delivery failure | Reduce input size or clear/rebuild cache; capture the failing asset metadata only | Redacted diagnostics and local OS/server logs |
| Crash | Native process termination or browser tab reload | Reopen, reproduce with the smallest workflow, preserve the preceding diagnostics | macOS Console/OSLog or the OS crash report, handled under the user's device privacy settings |

## What is recorded

- Native: actionable networking/audio failures go to the `com.example.MusiCollab` OSLog `runtime` category; user-visible state remains in the app UI.
- Composer: bounded RTT, jitter, reconnect, event-loss, pending-command, and last-error metrics can be exported manually.
- Companion: connection state, reconnect status, and clock quality remain in the page session; no automatic upload is performed.
- Server: startup, TLS, port, and lifecycle information goes to the local log configured by the server controller; event payloads and sample bytes are not logged.

Messages are intentionally bounded and redact payloads. Error strings must not include filesystem paths, tokens, raw JSON, sample bytes, or personal names.

## Retention and escalation

1. Reproduce the issue once and record app version, build, device/OS, server version, room role, and whether the Mac/phones share Wi-Fi.
2. Export the Composer diagnostics JSON immediately; review it before sharing.
3. Include the relevant local server log lines or Console entries, removing addresses and private paths where possible.
4. Attach a minimal reproduction and the exact error code/message to the project ticket.
5. Delete temporary diagnostics and logs after triage, subject to the user's normal system backup policy.

Future hosted distribution may add an opt-in crash service, but it must be disabled by default until privacy notice, retention, consent, sampling, and deletion controls are implemented.
