# Performer error states

The iPhone 14 now surfaces actionable state in the connection and performance
labels instead of silently remaining unusable.

Covered states include offline network path, connection loss, hello/role
rejection, stale session/server restart, server rejection, exhausted reliable
delivery, and unavailable audio. The UI shows the category and recovery state;
audio errors direct the user to retry locally, while network errors retry or
resync without reinstalling.

Pending pad events keep stable IDs for safe retry. Replaceable control events
continue to follow the event-queue coalescing policy.
