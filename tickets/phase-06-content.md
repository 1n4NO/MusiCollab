# Phase 6 tickets — loops, instruments, samples, and slicing

## MC-068 — Musical asset model

- Priority: P0 · Status: done · Dependencies: MC-001
- Acceptance: Tracks, instruments, loops, samples, scenes, slices, tags, BPM, key, and duration have versioned models.

## MC-069 — Bundled demo content

- Priority: P1 · Status: done · Dependencies: MC-068
- Acceptance: App includes clearly licensed or original demo kits, loops, and instruments with attribution metadata.

## MC-070 — Audio import pipeline

- Priority: P0 · Status: done · Dependencies: MC-068
- Acceptance: Mac imports supported WAV/AIFF/MP3/M4A files, validates size/duration, preserves user data, and reports failures.

## MC-071 — Audio format normalization

- Priority: P0 · Status: done · Dependencies: MC-070
- Acceptance: Unsupported sample rates, channels, bit depths, and codecs are normalized or rejected with actionable feedback.

## MC-072 — Waveform generation service

- Priority: P0 · Status: done · Dependencies: MC-070, MC-071
- Acceptance: Waveform peaks are generated deterministically, cached, invalidated when source changes, and bounded for large files.

## MC-073 — Waveform timeline UI

- Priority: P1 · Status: done · Dependencies: MC-072, MC-033
- Acceptance: Composer shows time/grid rulers, playhead, zoom, selection, and loading/error states.
- Delivered: Canvas waveform view with time ruler, amplitude grid, movable playhead, zoom range, click-drag selection, local preview/stop controls, reset view, and explicit empty/loading/error messaging.

## MC-074 — Slice detection and editing

- Priority: P0 · Status: done · Dependencies: MC-073
- Acceptance: User can add, drag, delete, snap, name, audition, undo, and reset slice boundaries.
- Delivered: Composer slice editor with add/delete/reset, snap-to-sixteenth-note boundaries, draggable slice edges or regions, naming, local audition, and undo history; edits publish normalized slice metadata to the room.

## MC-075 — Slice validation

- Priority: P0 · Status: done · Dependencies: MC-074
- Acceptance: Boundaries are ordered, in range, non-NaN, and safe for zero-length or very short regions.
- Delivered: Client and server validation reject malformed, reversed, out-of-range, zero-length, sub-millisecond, oversized, and zero-duration slice payloads while allowing valid very-short samples.

## MC-076 — Sample metadata protocol

- Priority: P0 · Status: done · Dependencies: MC-068, MC-075
- Acceptance: Phones receive metadata, hashes, URLs or transfer references, and slice boundaries—not raw audio over WebSocket.
- Delivered: Versioned sample metadata now supports SHA-256 hashes and URL/reference transfer descriptors; server rejects raw audio fields, validates transfer references, and broadcasts only normalized metadata and slices. Companion and iPhone 14 consume sample metadata from events/snapshots.

## MC-077 — iPhone 14 asset cache

- Priority: P0 · Status: done · Dependencies: MC-076
- Acceptance: Assets download, verify hash, resume or retry, evict under policy, and are available for local playback.
- Delivered: iPhone 14 cache service stores URL-backed assets under a 512 MB LRU policy, verifies size and SHA-256 hashes, retries failed downloads, persists a manifest, and reports metadata-only status for reference transfers.

## MC-078 — Slice-to-pad mapping

- Priority: P0 · Status: done · Dependencies: MC-077
- Acceptance: Slices map to pads/scenes with clear assignment, replacement, preview, and reset behavior.
- Delivered: Composer pad-map grid assigns the selected slice to pads 1–16, replaces existing assignments, previews through the selected-slice audition control, and resets mappings. Server snapshots/events and the iPhone 14 model carry validated sample-to-pad assignments.

## MC-079 — Loop metadata and beat matching

- Priority: P1 · Status: done · Dependencies: MC-068, MC-065
- Acceptance: Loops carry bars, BPM, key, length, and quantization mode; tempo changes preserve musical alignment.
- Delivered: Composer loop library loads validated room loops; selecting a loop publishes bars/BPM/key/duration/quantization metadata, updates the shared loop length, and reports tempo playback rates while the authoritative beat phase remains preserved across tempo changes.

## MC-080 — Instrument library abstraction

- Priority: P1 · Status: done · Dependencies: MC-023, MC-068
- Acceptance: Instrument presets, parameters, persistence, and safe loading are represented without coupling to one synth.
- Delivered: Added abstract built-in and room-library instrument presets with bounded parameters, pitch limits, persistent room selection, Composer preset cards, and compatibility with companion instrument controls.

## MC-081 — Instrument parameter control

- Priority: P1 · Status: done · Dependencies: MC-080
- Acceptance: Supported controls are automatable or snapshot-safe and behave consistently across reconnects.
- Delivered: Composer exposes bounded preset parameter sliders, sends beat-targeted step updates, and restores the complete parameter map from room snapshots. Server and iPhone 14 validate/apply parameter state consistently.

## MC-082 — Scene and kit management

- Priority: P1 · Status: done · Dependencies: MC-078, MC-079, MC-080
- Acceptance: User can create, rename, duplicate, reorder, save, and recall scenes/kits with validation.
- Delivered: Added Composer scene/kit management controls and validated server actions for create, rename, duplicate, reorder, save, and recall. Scene libraries, active scene, and ordering persist in room snapshots with track-reference validation.

## MC-083 — Content library search and organization

- Priority: P2 · Status: done · Dependencies: MC-068
- Acceptance: Library supports search, tags, favorites, sorting, duplicate detection, and missing-file recovery.
- Delivered: Added a unified Composer content library with text/type/favorites filters, name/type/favorites sorting, tag editing, favorite persistence, duplicate hash indicators, and missing-file recovery actions. Server snapshots retain normalized tags and library state.

## MC-084 — Content safety and licensing metadata

- Priority: P0 · Status: done · Dependencies: MC-069, MC-070
- Acceptance: Imported and bundled content tracks origin/license notes and never implies distribution rights the user does not have.
- Delivered: Added validated origin and license metadata with conservative distribution statuses, explicit bundled-demo attribution, user-imported review-required notices, and Composer rights labels. Assets without verified licensing remain visibly flagged for review.
