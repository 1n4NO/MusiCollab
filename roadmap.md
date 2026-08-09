# MusiCollab Roadmap

## Product goal

Create a three-client collaborative music workspace: a Mac composer deck, a
native iPhone 14 performance app, and an iPhone 6 Plus web companion connected
through one WebSocket session.

## Current state

- The Mac Composer, iPhone 14 performer, and iPhone 6 Plus companion PWA are
  implemented against the shared WebSocket session.
- Synthesized drum-pad audio, instrument/pitch control, shared transport,
  queueing, waveform metadata, and slice editing are implemented.
- Reconnect, session resumption, clock metrics, browser recovery, and
  three-client automated acceptance tests pass.
- The native performer targets iOS 16+ and uses a real launch storyboard to
  avoid legacy 480×320 compatibility scaling.
- GUI reference: [`Mockup.html`](./Mockup.html)
- Detailed implementation backlog: [`tickets/README.md`](./tickets/README.md)

## Milestones

1. Shared protocol and Mac WebSocket session service
2. Native iPhone 14 performance audio
3. Mac composer deck web app
4. iPhone 6 Plus companion web app
5. Shared tempo clock and transport
6. Loops, instruments, samples, and slicing
7. Synchronization, reconnects, and latency hardening
8. Private beta and deployment

## Success criteria

- All three clients join the same session room.
- A pad hit plays immediately on the iPhone 14 and appears in the composer deck.
- The iPhone 6 Plus can queue tracks and view waveform/slice state.
- All clients agree on tempo, play/stop, and loop position.
- Imported audio can be sliced and triggered reliably.
- The iPhone 6 Plus never carries latency-sensitive audio responsibility.
- Audio behavior is stable under interruptions and reconnects.

## Deliberate non-goals

- External MIDI support
- Cloud accounts or cloud session persistence in the first version
- System-wide extended display behavior
- Raw audio streaming between clients
