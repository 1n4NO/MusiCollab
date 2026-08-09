# MusiCollab landscape-only policy

Landscape is the supported orientation for every MusiCollab surface.

| Surface | Policy | Portrait behavior |
| --- | --- | --- |
| iPhone 14 native app | Landscape only; both landscape directions are supported | The app must not present a performance layout in portrait. Show or retain a clear rotate-device prompt while preserving session state. |
| iPhone 6 Plus companion PWA | Landscape-first queue and waveform layout | Show a rotate-device guidance state; do not attempt latency-sensitive audio or destroy the current room/session. |
| Mac Composer | Wide/landscape desktop window | Narrow or portrait-like windows show resize guidance and keep the connection/session status visible. |

The iPhone 14 implementation enforces the orientation at the view-controller level. Companion and Composer guidance remains a web-surface responsibility because Safari and desktop browsers control the outer window orientation. All controls must remain usable at the supported landscape viewport, with no required portrait-only workflow.
