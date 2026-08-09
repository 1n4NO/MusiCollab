# Project backup and recovery policy

MusiCollab currently has a live-session architecture, not a durable project database. The Mac session server is authoritative while it is running; room state is held in memory and is lost when the process exits. This document defines the safe backup boundary for the current release and the expected recovery behavior.

## What to back up

Back up these user-controlled sources outside the app:

- Original sample/audio files, including the directory structure used to identify them.
- The MusiCollab repository and any local `project.yml`/server configuration changes.
- The current release archive and release notes when distributing a native build.
- Any manually saved arrangement notes, scene descriptions, pad maps, and BPM/key information.
- Trusted certificates only in a secure system keychain or password manager; never in the repository backup.

The repository's code backup is not a substitute for an audio backup. Imported sample metadata can identify a file by name/hash, but it cannot reconstruct missing audio bytes.

## Current storage and restore behavior

| Area | Current storage | Backup status | Restore behavior |
| --- | --- | --- | --- |
| Live room, transport, queue, scenes, loop selections | Mac Node process memory | Not persisted | Restart clients and reconstruct the session from the original project notes/source files |
| Composer imported audio blob | Browser memory for the active session | Not persisted by the current prototype | Re-import the original audio file after refresh or browser restart |
| Composer sample metadata/waveform/slices | Room state and client memory | Not persisted as a project file yet | Re-import and re-slice if the room is gone; use the original file and verify its hash |
| iPhone 14 downloaded asset cache | App Caches directory | Rebuildable, not authoritative | Re-download from a valid transfer reference or re-import; missing cache entries are marked unavailable |
| iPhone 6 Plus queue/waveform view | WebSocket snapshot and browser state | Not persisted as a project file | Reconnect and request a snapshot; queue items that existed only in the lost room must be recreated |
| Session tokens | Browser `localStorage`/native `UserDefaults` | Do not back up or copy | A new token is issued; clients rejoin the room as a fresh identity after server authority changes |

## Recovery procedure

1. Preserve the original audio files and do not rename them until recovery is complete.
2. Restart the Mac server with the same room code and endpoint.
3. Reconnect the Mac composer, iPhone 14, and iPhone 6 Plus companion; confirm the new server snapshot and roster.
4. Re-import samples, verify duration/rate/channel metadata, and compare the displayed hash when available.
5. Recreate slices, pad mappings, queue order, scenes, and transport settings from the saved arrangement notes.
6. Mark any unavailable asset as missing instead of substituting a different file silently.
7. Run the three-client smoke/session checks before treating the recovered session as a release candidate.

## Missing-file policy

An audio reference is not proof that audio is available. The UI should show metadata-only or missing state when the local file/cache is absent, the hash/size does not match, the transfer URL is invalid/expired, or decoding fails. Recovery must be explicit: locate the original, re-import it, verify it, then clear the missing marker.

## Future durable-project requirement

Before public distribution, add a versioned project snapshot export/import format containing arrangement, transport, library metadata, scenes, slices, pad maps, and sample references—but never embedded raw audio by default. The format must include schema version, asset hashes, license metadata, and a migration path. This is the follow-up needed to turn the current documented recovery process into one-click restore.
