# Dependency and license inventory

Audit baseline: 2026-08-09. Runtime versions are pinned in `server/package.json` and `server/package-lock.json`. Re-run the audit command after changing dependencies or upgrading Xcode.

## Runtime dependencies

| Component | Version | License | Distribution notes |
| --- | --- | --- | --- |
| [`ws`](https://github.com/websockets/ws) | 8.21.2 | MIT | Node.js WebSocket server/client dependency; its MIT notice is included in the package metadata and is not modified by MusiCollab. |

## Platform frameworks

The native app uses Apple SDK frameworks supplied by Xcode/iOS and does not redistribute them:

- AVFoundation — audio session and engine
- AudioToolbox — audio primitives
- Combine — state observation
- CoreMIDI — system framework import only; external MIDI support is not part of MusiCollab
- CryptoKit — local content hashing
- Foundation — data and file APIs
- Network — local network path monitoring
- UIKit — native iPhone interface

These frameworks are governed by Apple platform SDK and developer terms rather than third-party package licenses. The project does not embed third-party native frameworks or Swift packages.

## Development tools

Xcode, XcodeGen, Node.js/npm, mkcert, and Wrangler are development/deployment tools, not bundled app dependencies. Record their versions in release evidence when producing a distributable build. Do not vendor their binaries into this repository.

## First-party material

MusiCollab source and original project assets are released under the repository [MIT license](LICENSE). Imported user samples and demo-content URLs remain subject to their original licenses; the app must not treat imported audio as cleared for redistribution.

## Audit policy

- Keep direct runtime dependencies at exact versions.
- Use `npm ci` from the committed lockfile for installs.
- Run `npm audit --omit=dev --audit-level=high` before a release.
- Review license changes and transitive dependency changes before upgrading `ws`.
- Do not commit generated `node_modules`, audit reports, certificates, or sample files.
