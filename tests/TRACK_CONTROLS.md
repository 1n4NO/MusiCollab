# Track controls

Track controls use the `trackControl` event and persist in `state.tracks`.
Each track has safe defaults:

```json
{
  "trackID": "drums",
  "name": "Drum Kit",
  "volume": 1,
  "mute": false,
  "solo": false,
  "arm": true,
  "instrumentID": "drums"
}
```

The server validates and clamps updates before broadcasting them. The native
performer applies the drum track's volume, mute, and solo state to all local
voices, while instrument selection continues through the shared abstract
instrument contract. Reconnecting clients receive the authoritative controls
from the snapshot.
