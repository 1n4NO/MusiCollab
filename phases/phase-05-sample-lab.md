# Phase 5 — Sample import and slicing

## Objective

Let users bring their own audio into MusiCollab and turn it into playable slices.

## Tasks

- Import supported audio formats through the Files picker.
- Copy security-scoped documents into the app's local sample library.
- Decode audio with `AVAudioFile` and calculate a display waveform.
- Add draggable slice markers with a minimum slice length.
- Render slices into reusable `AVAudioPCMBuffer` objects.
- Map slices to pads and trigger them with the local audio engine.
- Save sample metadata and slice boundaries for the next session.
- Add errors for unsupported, corrupt, or excessively large files.

## Done when

An imported sample displays a waveform, can be divided into eight or more slices,
and each slice can be triggered repeatedly without glitches.
