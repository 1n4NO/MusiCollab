# iPhone 6 Plus companion device checklist

Use the iPhone 6 Plus in landscape on the same Wi-Fi network as the Mac.

## Join and install

1. Start the MusiCollab server on the Mac and open `/composer`.
2. On the iPhone 6 Plus, open `http://MAC_LAN_IP:8787/companion/?room=LOCAL` in Safari.
3. Confirm the companion shows `connected` and the Composer roster shows all three clients.
4. For Home Screen installation, repeat with HTTPS and use Safari Share → Add to Home Screen.

## Feature checks

- Add a queue item; confirm it appears on Composer and the iPhone 6 Plus.
- Move an item up and down; remove it; confirm the shared queue converges.
- Confirm waveform metadata and slice markers render without playing audio locally.
- Select Drums, Bass, Keys, and Sampler; send pitch values at -24, 0, and +24 semitones.
- Confirm the iPhone 14 performer receives each instrument and pitch update.
- Rotate to portrait and confirm the landscape guidance does not destroy the session.

## Recovery checks

- Lock and unlock the phone; confirm it reconnects without a refresh.
- Disable Wi-Fi briefly; confirm the status becomes offline/reconnecting and then recovers.
- Refresh the page once; confirm the session resumes and no duplicate companion appears.
- Capture the Composer diagnostics export after the recovery checks.

Record the iOS version, Safari version, LAN address, and any failed step in the release notes.
