# Landscape layout verification

The iPhone 14 native performance surface is landscape-only and edge-to-edge.
The outer stack has no horizontal layout margins; panels keep their own
internal padding so controls remain visually grouped without device-wide
gutters.

Verify in both landscape directions:

- the pad grid reaches the usable left/right content edges;
- all pads remain at least 44 points high;
- transport and connection status do not clip;
- instrument/sample controls remain reachable by scrolling;
- the top safe area is not covered by the title/status content; and
- VoiceOver focus order follows title, status, transport, pads, instruments,
  and sample controls.
