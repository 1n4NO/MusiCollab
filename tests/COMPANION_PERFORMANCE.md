# Companion performance acceptance

The iPhone 6 Plus companion is deliberately audio-free. Its performance budget
is limited to connection state, queue controls, waveform bars, slice metadata,
and small session controls.

Acceptance checks:

- The initial HTML/CSS/JavaScript shell remains below 250 KB uncompressed.
- Waveform rendering uses a fixed 64-bar DOM surface; it does not create one
  element per audio sample.
- Queue and sample metadata are cached in `localStorage` for offline reading.
- Offline mode never sends a command; it labels the cached state and waits for
  the connection to recover.
- A 10-minute sample is represented by bounded metadata and peaks, not raw
  audio bytes.

Run the browser asset test with:

```sh
PORT=0 npm --prefix server run test:browser-assets
```
