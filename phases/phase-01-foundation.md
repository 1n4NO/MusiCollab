# Phase 1 — Foundation and two-device connection

## Objective

Turn the skeleton into a buildable app that can discover and connect two physical
iPhones locally.

## Tasks

- Install full Xcode and generate the project with XcodeGen.
- Set the development team and unique bundle identifier.
- Verify iOS 12 deployment compatibility on the iPhone 6 Plus.
- Test local-network permission and Bonjour service discovery.
- Add visible connection states: searching, inviting, connected, disconnected.
- Add reconnect behavior after foregrounding or temporary Wi-Fi loss.
- Define a versioned `MusicEvent` envelope for future protocol changes.

## Done when

Two phones show each other as connected, reconnect after a temporary disconnect,
and exchange a test event with no cloud service.
