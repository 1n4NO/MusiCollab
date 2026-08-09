# Audio-session recovery

The native performer now reports the audio state in the performance status line.
The local pad path remains available without waiting for the WebSocket.

Recovery behavior:

- Phone call, Siri, or another audio interruption pauses the engine and reports the interruption.
- If iOS grants resume permission, the audio session is reactivated automatically.
- If iOS does not grant resume permission, the UI reports that the user can tap a pad to retry.
- Headphone and Bluetooth A2DP route changes reactivate the audio session.
- Media-services resets reset and prepare the engine graph before restarting.
- Returning from background reactivates audio; entering background clears any held pad-touch state.
- Audio-start failures are shown as an actionable status instead of silently leaving the performer unusable.

The physical interruption, lock, Bluetooth, and phone-call cases must still be
run on the iPhone 14 using the matrix in `tests/MOBILE_LIFECYCLE_MATRIX.md`.
