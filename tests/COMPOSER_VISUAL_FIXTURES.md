# Composer visual fixtures

The Composer visual regression set consists of these deterministic states:

1. empty room: no peers, stopped transport, empty queue;
2. connected room: Composer, performer, and companion in the roster;
3. busy transport: playing clock, populated arrangement, and active playhead;
4. queue editing: pending add/reorder/remove command;
5. sample editing: waveform, selection, and slice markers;
6. degraded session: reconnecting status, stale snapshot, and visible diagnostics.

Browser asset tests verify that every fixture's required DOM regions remain in
the served shell. Capture screenshots at a fixed wide viewport when doing a
manual visual comparison.
