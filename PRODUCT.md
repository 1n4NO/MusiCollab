# Product

<!-- impeccable:product-schema 1 -->

## Platform

adaptive

## Users

Assumption from the brief: one person composing on a Mac while performing on an
iPhone 14.

## Product Purpose

MusiCollab is a two-surface collaborative music workspace. The Mac hosts the
composer deck and sequencer, while the iPhone 14 handles latency-sensitive
instruments and expressive performance.

## Positioning

The distinctive mechanism is one shared session protocol spanning a Mac web app
and a native performance app. Clients exchange timestamped musical events and
state rather than raw audio.

## Operating Context

The app is used on one local Wi-Fi network with a Mac and an iPhone 14. The Mac
runs the WebSocket session service during the first version.

## Capabilities and Constraints

- Drum pads
- Tempo clock and transport
- Loop playback and track controls
- Built-in or bundled instruments
- Importing user-owned audio samples
- Sample slicing into playable regions
- Mac composer web app
- Native iPhone 14 performance app
- WebSocket session server and shared protocol
- Native iPhone 14 audio may target modern iOS APIs
- External MIDI is intentionally out of scope
- Raw audio streaming over WebSockets is out of scope
- The Mac/server owns session state and clock authority

## Evidence on Hand

No production audio assets or branding assets have been supplied. Bundled demo
audio should be clearly treated as placeholder content until replaced.

## Product Principles

- Make the musical action immediate and visible.
- Keep the two-device connection understandable and recoverable.
- Synchronize compact musical events, not large audio streams.
- Let users hear the result within seconds of opening the app.
- Keep latency-sensitive audio local to the device that performs it.
