# Accessibility and haptics

The native performer accessibility pass covers VoiceOver labels and hints for
every drum pad, `Ready`/`Playing` pad values, a frequently-updating connection
status, Dynamic Type-aware status and control labels, a reduce-motion branch
without animated transforms, and high-contrast cyan/coral pad states.

Haptics are enabled by default and can be disabled with the
`musicollab.hapticsDisabled` preference. Haptics run only for local pad input,
so remote events do not create unexpected vibration.

Device verification: enable VoiceOver, Large Text, Increase Contrast, and
Reduce Motion one at a time; tap every pad in both landscape orientations and
confirm labels, target sizes, status announcements, and feedback remain usable.
