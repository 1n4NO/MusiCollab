# MusiCollab diagnostics export

The Composer’s **EXPORT DIAGNOSTICS JSON** action downloads a redacted support artifact. It contains:

- schema, app, platform, and protocol versions;
- connection state, server authority ID, and endpoint host/port;
- role-only roster information;
- current RTT, jitter, reconnect, event-loss, pending-command, and last-error values;
- the most recent bounded timing/error history.

It intentionally excludes session tokens, event payloads, client names, sample contents, local sample paths, and raw audio. Attach the exported file to a bug report after reproducing a network or lifecycle issue.
