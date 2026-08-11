# MusiCollab

Two-surface collaborative music workspace: a Mac composer web app and a native
iPhone 14 performance app.

## What is included

- UIKit prototype UI for drum pads, tempo, loops, instruments, and sample slicing
- `AVAudioEngine` skeleton for local low-latency playback
- WebSocket session architecture for the Mac and iPhone 14
- Local sample import using `UIDocumentPickerViewController`
- XcodeGen project specification
- Browser mockup at `Mockup.html` for quick visual inspection

## Supported devices

The native performer targets iPhone 14-class devices running iOS 16 or newer.
The iPhone 6 Plus is not a supported MusiCollab device.

## Build setup

1. Install full Xcode from the Mac App Store, then open it once and install the
   iOS platform/device support files.
2. Install XcodeGen if you want to generate the `.xcodeproj` from `project.yml`:

   ```sh
   brew install xcodegen
   xcodegen generate
   open MusiCollab.xcodeproj
   ```

3. Select a development team in Signing & Capabilities.
4. Connect the iPhone 14, trust the Mac, and run the native app on it. Open the
   Mac composer at `/composer`; use `/sequencer` for the production grid.

Do not add external MIDI support for this product. The initial audio contract is
sample playback, drum-pad triggering, loop transport, and synchronized music
events—not streaming raw audio between phones.

## Planning

- [Roadmap](./roadmap.md)
- [Client architecture](./architecture.md)
- [Implementation phases](./phases/)
- [GUI mockup](./Mockup.html)
- [Landscape-only policy](./tests/LANDSCAPE_POLICY.md)
