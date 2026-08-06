# MusiCollab Roadmap

## Product goal

Create a two-iPhone collaborative music workspace where each device can play
drums, loops, instruments, and user-imported sample slices while sharing one
musical timeline.

## Current state

- UIKit interface prototype exists.
- The app targets iOS 12 to include the iPhone 6 Plus.
- Multipeer Connectivity and AVAudioEngine skeletons exist.
- Sample import and slicing interfaces exist as placeholders.
- GUI reference: [`Mockup.html`](./Mockup.html)

## Milestones

1. Foundation and two-device connection
2. Local drum-pad playback
3. Shared tempo clock and transport
4. Loop and instrument engine
5. Sample import, waveform analysis, and slicing
6. Cross-device musical synchronization
7. Device-specific layout and performance pass
8. TestFlight-ready beta

## Success criteria

- Two physical phones connect without a server.
- A pad hit is heard locally and represented on the peer.
- Both phones agree on tempo, play/stop, and loop position.
- Imported audio can be sliced and triggered reliably.
- Core controls remain usable on the iPhone 6 Plus.
- Audio behavior is stable under interruptions and reconnects.

## Deliberate non-goals

- External MIDI support
- Cloud accounts or cloud session persistence
- System-wide extended display behavior
- Raw audio streaming between the two phones
