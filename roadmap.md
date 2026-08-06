# MusiCollab Roadmap

## Product goal

Create a three-client collaborative music workspace: a Mac composer deck, a
native iPhone 14 performance app, and an iPhone 6 Plus web companion connected
through one WebSocket session.

## Current state

- UIKit iPhone performance prototype exists.
- Synthesized drum-pad audio works locally.
- Phase 1 WebSocket session server is implemented and tested.
- Mac/web clients are the next implementation focus.
- Sample import metadata and slice-boundary generation exist as foundations.
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
