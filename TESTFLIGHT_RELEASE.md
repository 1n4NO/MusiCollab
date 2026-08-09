# TestFlight release and rollback runbook

MC-101 covers the path from a validated native archive to an external TestFlight tester. Apple Developer Program enrollment and App Store Connect access are required; a free personal signing team can install development builds but cannot use TestFlight distribution.

## Before the first upload

- Replace `com.example.MusiCollab` in `/Users/ps/dev/MusiCollab/project.yml` with a unique bundle ID registered to the distribution team.
- Confirm the App Store Connect app record uses the same bundle ID.
- Confirm the team in `project.yml` and `ExportOptions-AppStore.plist` is the enrolled distribution team.
- Add the required App Store Connect role for the account performing uploads.
- Review privacy, local-network, audio, sample licensing, and support-device disclosures before inviting testers.

## Create and export a candidate

Increment `CURRENT_PROJECT_VERSION` for every upload. Keep `MARKETING_VERSION` unchanged for builds within the same release train.

```sh
cd /Users/ps/dev/MusiCollab
xcodegen generate
./scripts/archive-native.sh
./scripts/export-native.sh
```

The archive is written to `build/MusiCollab.xcarchive`; the export script writes the IPA to `build/export`. Both paths are ignored by Git. The committed export options use automatic App Store/TestFlight signing for team `L4Q834S9XV` and must be updated if the distribution team changes.

If automatic export cannot resolve a distribution certificate or profile, open the archive in Xcode Organizer and use **Distribute App → App Store Connect → Upload**. Xcode will show the exact missing account, certificate, identifier, or capability.

## Install with an external tester

1. In App Store Connect, wait for processing and complete any export-compliance or missing-information questions.
2. Add the tester to an internal or external testing group and send the invitation.
3. The tester installs TestFlight from the App Store, accepts the invitation, and installs MusiCollab.
4. Verify the release candidate on the iPhone 14 with the Mac composer and the iPhone 6 Plus companion on the same LAN.
5. Record build number, device OS versions, server version, connection/reconnect result, audio result, and diagnostics export in the release evidence.

## Rollback

Keep every uploaded archive and its release evidence. For a TestFlight problem:

1. Stop testing or remove the affected build from the testing group.
2. Re-enable the last known-good prior build for the group, if it remains available for testing.
3. If the prior build is unavailable or the issue affects production, fix the issue, increment the build number, archive, and upload a new build. iOS distribution does not replace a published build by reusing its version/build number.
4. Record the rollback reason, affected build, restored build, tester impact, and follow-up ticket.

Do not delete the prior archive, diagnostics, or release notes until the replacement has passed the three-client acceptance run. The release checklist and final go/no-go decision are tracked by MC-116 and MC-118.
