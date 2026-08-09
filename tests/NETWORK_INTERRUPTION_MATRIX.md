# MusiCollab network interruption matrix

Automated simulation:

```sh
cd /Users/ps/dev/MusiCollab/server
PORT=8789 npm run test:network
```

The simulation covers session recovery after a brief socket loss, a network-path change with an unreachable path, and a paused/changed server port followed by recovery on the configured port.

## Physical-device matrix

Run with the Mac Composer, iPhone 14 native app, and iPhone 6 Plus companion in the same room. Capture the Composer’s **NETWORK DIAGNOSTICS** JSON after each case.

| Case | Action | Expected result | Evidence |
| --- | --- | --- | --- |
| Brief Wi-Fi loss | Disable Wi-Fi on one client for 2–5 seconds, then restore it | Client shows reconnecting, rejoins without refresh, receives a snapshot, and pending commands do not double-apply | Reconnect count, event loss, session log |
| Network switch | Move the client from the home Wi-Fi to a phone hotspot, then back to the home Wi-Fi | Client reports offline/reconnecting and converges after returning to the room network | Roster, snapshot age, exported diagnostics |
| Router isolation | Enable AP/client isolation or block the Mac’s LAN address temporarily | Client leaves the roster and clearly reports offline; no stale “connected” state remains | Status indicator and last error |
| Mac sleep | Put the Mac to sleep for at least 10 seconds, wake it, and reopen the Composer | iPhone clients reconnect or report server unavailable; after the server returns they receive a clean snapshot without a manual app reinstall | Server health, authority ID, reconnect count |
| Server port change | Stop the server, restart it on another port, update the join URL, and reconnect clients | Old endpoint reports failure; the updated endpoint joins and converges with a clean snapshot | Last error, new server authority, snapshot |

Pass criteria: no client requires a refresh or force-quit, no duplicate roster entry remains after recovery, no command is applied twice, and the exported diagnostics identify the interruption and recovery.
