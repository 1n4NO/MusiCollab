# Phase 6 tickets — loops, instruments, samples, and slicing

## MC-068 — Musical asset model

- Priority: P0 · Status: planned · Dependencies: MC-001
- Acceptance: Tracks, instruments, loops, samples, scenes, slices, tags, BPM, key, and duration have versioned models.

## MC-069 — Bundled demo content

- Priority: P1 · Status: planned · Dependencies: MC-068
- Acceptance: App includes clearly licensed or original demo kits, loops, and instruments with attribution metadata.

## MC-070 — Audio import pipeline

- Priority: P0 · Status: planned · Dependencies: MC-068
- Acceptance: Mac imports supported WAV/AIFF/MP3/M4A files, validates size/duration, preserves user data, and reports failures.

## MC-071 — Audio format normalization

- Priority: P0 · Status: planned · Dependencies: MC-070
- Acceptance: Unsupported sample rates, channels, bit depths, and codecs are normalized or rejected with actionable feedback.

## MC-072 — Waveform generation service

- Priority: P0 · Status: planned · Dependencies: MC-070, MC-071
- Acceptance: Waveform peaks are generated deterministically, cached, invalidated when source changes, and bounded for large files.

## MC-073 — Waveform timeline UI

- Priority: P1 · Status: planned · Dependencies: MC-072, MC-033
- Acceptance: Composer shows time/grid rulers, playhead, zoom, selection, and loading/error states.

## MC-074 — Slice detection and editing

- Priority: P0 · Status: planned · Dependencies: MC-073
- Acceptance: User can add, drag, delete, snap, name, audition, undo, and reset slice boundaries.

## MC-075 — Slice validation

- Priority: P0 · Status: planned · Dependencies: MC-074
- Acceptance: Boundaries are ordered, in range, non-NaN, and safe for zero-length or very short regions.

## MC-076 — Sample metadata protocol

- Priority: P0 · Status: planned · Dependencies: MC-068, MC-075
- Acceptance: Phones receive metadata, hashes, URLs or transfer references, and slice boundaries—not raw audio over WebSocket.

## MC-077 — iPhone 14 asset cache

- Priority: P0 · Status: planned · Dependencies: MC-076
- Acceptance: Assets download, verify hash, resume or retry, evict under policy, and are available for local playback.

## MC-078 — Slice-to-pad mapping

- Priority: P0 · Status: planned · Dependencies: MC-077
- Acceptance: Slices map to pads/scenes with clear assignment, replacement, preview, and reset behavior.

## MC-079 — Loop metadata and beat matching

- Priority: P1 · Status: planned · Dependencies: MC-068, MC-065
- Acceptance: Loops carry bars, BPM, key, length, and quantization mode; tempo changes preserve musical alignment.

## MC-080 — Instrument library abstraction

- Priority: P1 · Status: planned · Dependencies: MC-023, MC-068
- Acceptance: Instrument presets, parameters, persistence, and safe loading are represented without coupling to one synth.

## MC-081 — Instrument parameter control

- Priority: P1 · Status: planned · Dependencies: MC-080
- Acceptance: Supported controls are automatable or snapshot-safe and behave consistently across reconnects.

## MC-082 — Scene and kit management

- Priority: P1 · Status: planned · Dependencies: MC-078, MC-079, MC-080
- Acceptance: User can create, rename, duplicate, reorder, save, and recall scenes/kits with validation.

## MC-083 — Content library search and organization

- Priority: P2 · Status: planned · Dependencies: MC-068
- Acceptance: Library supports search, tags, favorites, sorting, duplicate detection, and missing-file recovery.

## MC-084 — Content safety and licensing metadata

- Priority: P0 · Status: planned · Dependencies: MC-069, MC-070
- Acceptance: Imported and bundled content tracks origin/license notes and never implies distribution rights the user does not have.

