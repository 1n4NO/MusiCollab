# MusiCollab privacy and secrets policy

MusiCollab is a local-first personal music tool. It does not include analytics, advertising, a cloud account system, or a crash-reporting service.

## Data inventory

| Data | Where it is used | Retention and sharing |
| --- | --- | --- |
| Musical events, clock state, queue, library metadata | Mac session server and connected clients | Kept in server-process room state; lost when the server exits; sent only to clients in the room |
| Session token | Browser `localStorage` or native `UserDefaults` | Opaque reconnect identity; never included in diagnostics export; cleared by removing app/site data |
| Imported sample audio | Composer browser or native app local storage | Stays local unless the user explicitly uses a future transfer feature; raw audio is not sent over WebSocket |
| Sample name, duration, rate, channels, waveform peaks, hash, and slices | Session library metadata | Shared with the room so clients can display and schedule the sample; avoid sensitive filenames |
| Connection diagnostics | Client memory and optional downloaded JSON | Bounded local history; export omits tokens, event payloads, names, sample paths, and raw audio |
| Server logs | Mac `/tmp/musicollab-session-server.log` | Startup/transport diagnostics only; rotate or remove when no longer needed |

## Secrets rules

- Never commit certificates, private keys, provisioning profiles, App Store Connect keys, passwords, tokens, `.env` files, or private sample files.
- Keep local TLS material under `.local-certs/`; it is ignored by Git.
- Treat the LAN as the trust boundary. The local server has no user authentication or internet-facing access control.
- Use HTTPS/WSS and a managed reverse proxy before exposing a session server beyond a trusted LAN.
- Review diagnostics exports, logs, and sample metadata before sharing them publicly.

## Review checklist

```sh
cd /Users/ps/dev/MusiCollab
./scripts/privacy-scan.sh
```

Inspect the diff and confirm that sample metadata, diagnostics, and logs contain no personal or confidential information.
