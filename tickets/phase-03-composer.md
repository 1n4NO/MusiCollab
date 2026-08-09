# Phase 3 tickets — Mac composer deck

## MC-029 — Composer application shell

- Priority: P0 · Status: done · Dependencies: MC-011
- Acceptance: Wide Mac layout has transport, arrangement, client roster, event stream, and session status regions.

## MC-030 — Composer WebSocket lifecycle

- Priority: P0 · Status: done · Dependencies: MC-002, MC-009
- Acceptance: Composer joins as `composer`, renders connected/disconnected/reconnecting states, and reconnects without refresh.

## MC-031 — Client roster and role display

- Priority: P0 · Status: done · Dependencies: MC-008, MC-030
- Acceptance: All connected phones appear with stable names, roles, last-seen state, and useful empty/error states.

## MC-032 — Transport controls

- Priority: P0 · Status: done · Dependencies: MC-005, MC-030
- Acceptance: Play, stop, pause, BPM, beat, bar, and loop position are visible and emit validated commands.

## MC-033 — Arrangement timeline

- Priority: P1 · Status: done · Dependencies: MC-032
- Acceptance: Timeline supports bars/beats, playhead, zoom, scrolling, and track regions without losing alignment.

## MC-034 — Drum track lane

- Priority: P1 · Status: done · Dependencies: MC-033, MC-021
- Acceptance: Incoming pad events appear in the drum lane with sender, pad, velocity, and beat information.

## MC-035 — Instrument track lanes

- Priority: P1 · Status: done · Dependencies: MC-023, MC-033
- Acceptance: Instrument tracks show name, arm/mute/solo state, clips, and active performer.

## MC-036 — Loop and sample lanes

- Priority: P1 · Status: done · Dependencies: MC-033, MC-048
- Acceptance: Loop and sample regions show duration, BPM/key metadata, slice boundaries, and queue state.

## MC-037 — Queue editor

- Priority: P1 · Status: done · Dependencies: MC-032
- Acceptance: User can add, reorder, remove, and quantize queue items; changes have optimistic UI and server acknowledgement.

## MC-038 — Keyboard and pointer workflow

- Priority: P1 · Status: done · Dependencies: MC-032, MC-033
- Acceptance: Spacebar transport, keyboard shortcuts, pointer selection, drag, zoom, and undo-safe interactions work on Mac.

## MC-039 — Composer state persistence

- Priority: P1 · Status: done · Dependencies: MC-033, MC-037
- Acceptance: Draft arrangement and UI preferences persist locally, with explicit reset and migration versioning.

## MC-040 — Composer error and offline UX

- Priority: P0 · Status: done · Dependencies: MC-030
- Acceptance: The deck explains server offline, room rejected, stale snapshot, reconnecting, and incompatible protocol states.

## MC-041 — Composer responsive and accessibility pass

- Priority: P2 · Status: planned · Dependencies: MC-029
- Acceptance: Keyboard focus, reduced motion, readable contrast, zoom to 200%, and narrow-window behavior are verified.

## MC-042 — Composer visual regression fixtures

- Priority: P2 · Status: planned · Dependencies: MC-029, MC-033
- Acceptance: Representative empty, connected, busy, error, and three-client screenshots can be compared across changes.

## MC-122 — Desktop audio-output toggle

- Priority: P0 · Status: done · Dependencies: MC-032, MC-040
- Acceptance: Composer provides an obvious desktop sound toggle with enabled, muted, unavailable, and permission-denied states; sound starts only after an allowed user gesture.

## MC-123 — Desktop monitor audio engine

- Priority: P1 · Status: done · Dependencies: MC-122, MC-035
- Acceptance: Desktop can locally monitor selected drum, instrument, loop, and sample events without replacing the iPhone 14’s local performance path or sending raw audio over WebSocket.

## MC-124 — Desktop audio mixer and output safety

- Priority: P1 · Status: done · Dependencies: MC-123
- Acceptance: Desktop monitor volume, mute, output-device failure, duplicate-trigger prevention, and an emergency stop are implemented and tested.

## MC-125 — Composer landscape-first layout

- Priority: P1 · Status: planned · Dependencies: MC-119, MC-029
- Acceptance: The desktop composer is optimized for landscape/wide windows; narrow or portrait windows show a clear rotate/resize guidance state without losing session status.
