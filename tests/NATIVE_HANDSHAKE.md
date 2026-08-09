# Native WebSocket handshake

The iPhone 14 transport joins the configured room with a stable client ID and
role `performer`. The native UI reports the connection as online only after a
valid `welcome` message confirms that role.

Handshake sequence:

1. Start the WebSocket task and begin receiving before sending `hello`.
2. Retry hello delivery briefly if the URL session has not reached its running state.
3. Persist the server session token from `welcome` for reconnects.
4. Accept the authoritative `snapshot` and current `roster`.
5. Start clock pings after welcome; reconnects resync the snapshot and roster.

The UI distinguishes `connecting`, `welcome received`, `snapshot received`,
`roster received`, `suspended`, and `hello failed` states. This keeps a socket
that has opened at the TCP/WebSocket layer from being mistaken for a joined
music session.
