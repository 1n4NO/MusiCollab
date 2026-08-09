# Instrument abstraction

The session protocol uses `InstrumentPreset` rather than an engine-specific
implementation. A preset contains:

- `instrumentID` and `instrument` for stable selection;
- display `name` and `family`;
- an abstract `engine` identifier;
- bounded numeric `parameters`; and
- integer `pitch` in the range -24…+24 semitones.

The native audio layer exposes the same shape through `InstrumentVoice`. The
current `AudioEngine` is one implementation: it renders the selected preset
using its local synthesized voice bank. Future bass, keys, and sampler engines
can implement the same trigger/stop contract without changing WebSocket event
types or room state.

The iPhone 14 applies instrument selection from both authoritative snapshots
and live `instrument` events. Parameter updates invalidate cached buffers while
preserving the active preset and protocol identity.
