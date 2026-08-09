# MusiCollab release architecture review

## Data flow and trust boundaries

```text
Mac browser (Composer) ─────┐
iPhone 14 native app ───────┼── WebSocket JSON ──> Mac session server ──> room state/clock
iPhone 6 Plus Safari/PWA ───┘                         │
                                                     └── HTTP health/info/static web assets
```

The Mac is the local authority for room state, event sequencing, clock timing, reconnect snapshots, and client roster. Clients own audio rendering and send compact musical events and normalized metadata. Raw audio is never sent over WebSocket. Imported samples are normalized on the Composer; only metadata, waveform peaks, hashes, slice regions, and transfer references cross the session boundary.

Trust boundaries:

| Boundary | Data crossing it | Required trust assumption |
| --- | --- | --- |
| Browser/native client → Mac server | Hello identity, role, session token, musical events, timing and diagnostics | Devices are on the user’s trusted LAN; server validates roles, payloads, IDs, timing, and asset metadata |
| Mac server → clients | Snapshots, sequenced events, roster, clock, acknowledgements, errors | Clients treat snapshots as authoritative and do not execute unvalidated raw audio or arbitrary paths |
| Composer → local sample decoder | User-selected audio file | Browser permission and local file remain user-controlled; unsupported/oversized files are rejected |
| Server → LAN browser/PWA | Static HTML, manifest, service worker, `/health`, `/info` | Development server is LAN-scoped; production hosting must add HTTPS/WSS and deployment access controls |

## Local-network assumptions

- The Mac and both phones share the same Wi-Fi/subnet and can reach the Mac’s LAN address.
- The router must permit client-to-client traffic; guest/AP isolation breaks the session.
- The Mac’s firewall must allow the configured HTTP/WebSocket port.
- The first release has no cloud relay, NAT traversal, authentication service, or internet dependency.
- Changing the server port requires updating the join URL; clients report the old endpoint as unavailable.
- WebSocket payloads are control-plane data, not an audio transport. Timing quality depends on Wi-Fi latency and clock synchronization.

## Failure modes and recovery

| Failure | User-visible behavior | Recovery |
| --- | --- | --- |
| Server stopped/restarted | Clients show reconnecting/offline and then receive a clean snapshot with a new authority ID | Restart the server; clients retry automatically |
| Wi-Fi loss or router isolation | Reconnect count/error and stale state are visible; no refresh should be required | Restore the same LAN path; use the diagnostics export if recovery fails |
| Duplicate or late event | Server acknowledges duplicates or rejects stale state changes with an actionable error | Client keeps stable IDs, resyncs, and retries within the bounded retry policy |
| Unsupported/oversized sample | Composer reports an import error; no raw audio is broadcast | Choose a supported WAV/AIFF/MP3/M4A file within documented limits |
| iPhone background/lock/audio interruption | Native transport suspends/resumes and audio session reactivates; companion resyncs on visibility | Unlock/foreground and retry after the OS interruption ends |
| Missing transfer reference | Metadata remains visible but audio is marked unavailable | Re-import or restore the original local file/reference |

## Supported-device matrix

| Surface | Supported baseline | Role | Known limitation |
| --- | --- | --- | --- |
| Mac Composer | macOS with a current Safari or Chromium browser and Node.js server runtime | Arrangement, clock, sample import/slicing, desktop monitor | Must remain on the same LAN; local development is HTTP/WS unless HTTPS is configured |
| iPhone 14 native | Current project-supported iOS/Xcode toolchain | Low-latency pads and instruments | Requires Developer Mode/signing for direct development installation |
| iPhone 6 Plus companion | iOS 12.5.x Safari; installable PWA where supported | Queue, waveform, metadata, simple controls | No native build, no latency-sensitive audio, and legacy Safari API/layout limits |

Release review outcome: the local-first architecture is suitable for personal distribution and controlled beta testing. Public distribution requires the later HTTPS/WSS, signing, dependency/privacy, and release-checklist tickets before exposing the server beyond a trusted LAN.
