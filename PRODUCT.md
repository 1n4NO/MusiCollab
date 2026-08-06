# Product

<!-- impeccable:product-schema 1 -->

## Platform

ios

## Users

Assumption from the brief: one or two people using two iPhones side by side to
make music together in a shared physical space.

## Product Purpose

MusiCollab is a local two-iPhone music interface. Each phone contributes
touchable musical controls while the pair shares tempo, loops, instruments, and
sample-trigger events.

## Positioning

The distinctive mechanism is a shared musical workspace split across two nearby
phone screens, synchronized at the event/state level rather than by streaming
raw audio.

## Operating Context

The app is used with an iPhone 14 and an iPhone 6 Plus placed next to each
other. It must work without a cloud account or external MIDI hardware.

## Capabilities and Constraints

- Drum pads
- Tempo clock and transport
- Loop playback and track controls
- Built-in or bundled instruments
- Importing user-owned audio samples
- Sample slicing into playable regions
- Nearby peer discovery and shared event synchronization
- Target iOS 12 for iPhone 6 Plus compatibility
- UIKit is required for the first version; SwiftUI-only APIs are not suitable
- External MIDI is intentionally out of scope
- Precise audio synchronization across two independent speakers is an open
  engineering constraint; one shared output is preferred for musical accuracy

## Evidence on Hand

No production audio assets or branding assets have been supplied. Bundled demo
audio should be clearly treated as placeholder content until replaced.

## Product Principles

- Make the musical action immediate and visible.
- Keep the two-device connection understandable and recoverable.
- Synchronize compact musical events, not large audio streams.
- Let users hear the result within seconds of opening the app.
- Preserve a usable reduced layout on the smaller iPhone 6 Plus screen.
