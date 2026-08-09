# Synthesized drum rack

MC-018 provides eight native synthesized voices mapped to the performer pads:

| Pad | Voice | Character |
| --- | --- | --- |
| 1 | Kick | Falling sine sweep with a short attack click |
| 2 | Snare | Noise body plus tuned membrane tone |
| 3 | Hat | Metallic partials plus noise |
| 4 | Clap | Three staggered noise transients |
| 5 | Percussion | Pitched wood-like click |
| 6 | Tom | Falling pitched tone |
| 7 | Rim | Short high-frequency click |
| 8 | FX | Pitched/noisy accent |

The engine uses two `AVAudioPlayerNode` voices per pad and rotates between them
on each trigger. This allows a rapid retrigger to overlap the previous hit
without changing the local-first input path. Calling `stop(note:)` stops both
voices for that pad.

The rack accepts bounded tuning parameters through the existing instrument
parameter channel:

- `pitch`: global semitone offset, clamped to -24…+24
- `decay`: normalized decay control, clamped to -1…+1
- `tone`: normalized tonal frequency control, clamped to -1…+1

Buffers are regenerated when instrument or parameters change. The voices remain
sample-free and require no external MIDI or audio assets.
