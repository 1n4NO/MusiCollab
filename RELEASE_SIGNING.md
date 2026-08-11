# Native signing and archive configuration

This document is the source of truth for the iOS app's local development signing and release archive settings.

## Current configuration

| Setting | Value | Notes |
| --- | --- | --- |
| Product | `MusiCollab` | Native iOS application target |
| Bundle ID | `com.example.MusiCollab` | Replace with a unique reverse-DNS ID before distribution |
| Development team | `L4Q834S9XV` | Must belong to the Apple ID signed into Xcode |
| Signing style | Automatic | Xcode manages development provisioning for connected devices |
| Minimum iOS | 16.0 | Native performer support starts with iPhone 14-class devices |
| Marketing version | `0.1.0` | User-visible version; increment for product releases |
| Build number | `1` | Increment for every archive uploaded to Apple |
| Device family | iPhone | The native performer is landscape-only |

These values are defined in `/Users/ps/dev/MusiCollab/project.yml`. Regenerate the project after changing them:

```sh
cd /Users/ps/dev/MusiCollab
xcodegen generate
```

## Capabilities and entitlements

MusiCollab intentionally has no custom `.entitlements` file at this stage. The current permissions are represented by the required Info.plist keys:

- `UIBackgroundModes = audio` enables the audio session to continue while appropriate system audio conditions allow it.
- `NSLocalNetworkUsageDescription` explains the nearby-device connection request.
- `NSBonjourServices = _musicollab._tcp` reserves the service type for LAN discovery.
- `NSAppTransportSecurity.NSAllowsLocalNetworking = true` permits the development LAN WebSocket endpoint.
- `UIRequiresFullScreen = true` and landscape orientations enforce the native performer's layout policy.
- File sharing and in-place document opening support user sample import through the app document container.

If a future capability requires an Apple-managed entitlement, add it in Xcode's **Signing & Capabilities** tab and commit the generated entitlements file. Never commit certificates, provisioning profiles, API keys, or private sample content.

## Device development

1. Sign into Xcode with the Apple ID that belongs to the configured team.
2. Connect the iPhone 14, enable Developer Mode, trust the Mac, and select it as the run destination.
3. In the target's **Signing & Capabilities** tab, keep **Automatically manage signing** enabled and confirm the team and bundle ID.
4. Build and run the `MusiCollab` scheme. A free Apple account can run on a personal device with Apple's short-lived development provisioning limits; distribution/TestFlight requires Apple Developer Program enrollment.

## Archive and export

The repository includes a repeatable archive command:

```sh
cd /Users/ps/dev/MusiCollab
./scripts/archive-native.sh
```

The command creates `build/MusiCollab.xcarchive` using the Release configuration and generic iOS destination. It uses automatic provisioning updates, so Xcode must be signed in and the bundle ID must be registered for the selected team.

Export is intentionally performed in Xcode Organizer because the export method (App Store/TestFlight, Ad Hoc, or Development) changes the required provisioning profile and distribution certificate:

1. Open **Window → Organizer** in Xcode.
2. Select the MusiCollab archive and choose **Distribute App**.
3. Select the intended method, review signing, export the IPA, and preserve the archive as the rollback artifact.

Before distribution, replace the example bundle ID, verify the legal team/account, increment `CURRENT_PROJECT_VERSION`, and complete the TestFlight/release checklist in `tickets/phase-08-release.md`.

For the complete upload, tester, and rollback workflow, see [TESTFLIGHT_RELEASE.md](TESTFLIGHT_RELEASE.md). The export command is:

```sh
./scripts/export-native.sh
```
