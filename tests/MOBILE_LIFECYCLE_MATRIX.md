# MusiCollab mobile lifecycle test matrix

Run this matrix with the Mac Composer and server active, the iPhone 14 app connected as performer, and the iPhone 6 Plus companion open in landscape. Export the Composer diagnostics after each case and record the iPhone 14 connection label plus the companion status.

| Case | Device/action | Expected behavior | Evidence |
| --- | --- | --- | --- |
| Lock / unlock | Lock each phone for 10 seconds, then unlock | Native audio/session resumes or reconnects; the companion resyncs its snapshot when visible; no duplicate roster entry appears | Connection labels, roster, snapshot age |
| App switch | Switch away from each client for 10 seconds, then return | Background suspend prevents stale socket use; foreground triggers reconnect/snapshot resync; queued state remains authoritative | Event log and diagnostics reconnect count |
| Termination | Force-quit iPhone 14, reopen it; force-quit the companion, reopen Safari/PWA | Each client rejoins with a clean snapshot; the room does not retain a phantom client; pending commands do not double-apply | Roster before/after and event IDs |
| Low Power Mode | Enable Low Power Mode and leave the session active for 5 minutes | Clock sync remains visible, reconnect backoff remains bounded, and audio continues or reports a clear interruption | Clock quality and connection status |
| Audio interruption | Start a phone call or Siri/media interruption, then end it | `AVAudioSession` restarts safely, pads remain responsive, and the app does not crash or duplicate a hit | Local pad test and audio route status |
| Route change | Connect/disconnect headphones or Bluetooth audio while playing | Audio engine reactivates on the new route; remote timing remains synchronized; session transport stays connected | Pad audio, clock quality, diagnostics |

Pass criteria: every client returns to a connected/usable state without a reinstall; the native app remains landscape-only; the Composer receives a fresh authoritative snapshot after a stale/background period; no duplicate roster entry or duplicate event is observed; and failure states remain actionable when the OS or network does not recover immediately.

Implementation hooks under test:

- iPhone 14 `UIApplication.didEnterBackground` / `didBecomeActive` calls `SessionTransport.suspend()` / `resume()` and restarts audio.
- `SessionTransport` uses `NWPathMonitor`, bounded reconnect backoff, session resumption, and snapshot resync.
- `AudioEngine` handles `AVAudioSession` interruption, route-change, and media-services-reset notifications.
- Companion visibility changes request a snapshot and restart reconnect scheduling when the socket is unavailable.
