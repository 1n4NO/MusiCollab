# Phase 8 tickets — release readiness and distribution

## MC-098 — Release architecture review

- Priority: P0 · Status: done · Dependencies: MC-091
- Acceptance: Data flow, trust boundaries, local-network assumptions, failure modes, and supported-device matrix are documented.
- Delivered: Added the release architecture review covering three-client data flow, trust boundaries, LAN constraints, recovery behavior, and Mac/iPhone 14/iPhone 6 Plus support limits.

## MC-099 — Mac packaging and startup

- Priority: P0 · Status: done · Dependencies: MC-012
- Acceptance: Mac server has a repeatable start/stop workflow, dependency check, port conflict message, and LAN setup guide.
- Delivered: Added `scripts/musicollab-server.sh` with start/stop/restart/status commands, Node/npm and dependency checks, port-owner diagnostics, PID/log handling, health verification, LAN join URL output, and documented firewall/Wi-Fi setup.

## MC-100 — Native app signing configuration

- Priority: P0 · Status: done · Dependencies: MC-098
- Acceptance: Bundle ID, signing, capabilities, entitlements, version/build numbers, and archive configuration are documented.
- Delivered: Made marketing/build metadata explicit in XcodeGen, documented the current bundle/team/automatic-signing configuration and Info.plist-backed capabilities, and added `scripts/archive-native.sh` for Release archives.

## MC-101 — TestFlight distribution path

- Priority: P0 · Status: in progress · Dependencies: MC-100
- Acceptance: A signed archive can be uploaded, installed by an external tester, and rolled back to a prior build.
- Delivered: Added App Store export options, `scripts/export-native.sh`, and the TestFlight release/installation/rollback runbook. Local export reached the signing step but is pending an enrolled Apple Developer account with an iOS Distribution certificate and App Store Connect access.

## MC-102 — Companion hosting and HTTPS

- Priority: P0 · Status: done · Dependencies: MC-043, MC-098
- Acceptance: Companion is hosted over HTTPS with cache strategy, versioned assets, and a documented deployment command.
- Delivered: Added versioned service-worker caching, static-host cache headers, secure `wss://` URL selection, Cloudflare Pages deployment tooling, and `COMPANION_HOSTING.md` covering HTTPS, WebSocket proxying, cache invalidation, and Home Screen verification.

## MC-103 — Local development HTTPS option

- Priority: P1 · Status: done · Dependencies: MC-102
- Acceptance: Development can use secure WebSockets when needed, with documented local certificate handling.
- Delivered: Added opt-in Node HTTPS/WSS support, protocol-aware composer and companion clients, TLS-aware server diagnostics/startup output, and `LOCAL_HTTPS.md` with mkcert, iPhone trust, and rollback-to-HTTP instructions.

## MC-104 — Dependency and license audit

- Priority: P0 · Status: done · Dependencies: MC-084
- Acceptance: Node, Swift, audio, and web dependencies have pinned versions, license records, and known-vulnerability review.
- Delivered: Pinned the sole Node runtime dependency (`ws` 8.21.2), confirmed there are no Swift Package Manager or browser CDN dependencies, added `DEPENDENCY_LICENSES.md`, and added `scripts/dependency-audit.sh` for lockfile, license, vulnerability, and native project checks.

## MC-105 — Secrets and privacy review

- Priority: P0 · Status: done · Dependencies: MC-098
- Acceptance: No secrets are committed; logs exclude private paths/content; local sample metadata and diagnostics are minimized.
- Delivered: Added `.gitignore` protection for credentials/certificates, `PRIVACY.md` data inventory and retention policy, and `scripts/privacy-scan.sh` for high-confidence secret and sensitive-file detection. Repository review confirmed logs and diagnostics exclude raw audio, local sample paths, client names, and session tokens.

## MC-106 — Data backup and recovery policy

- Priority: P1 · Status: done · Dependencies: MC-039, MC-083
- Acceptance: User projects, arrangements, samples, and cached metadata have documented backup, restore, and missing-file behavior.
- Delivered: Added `BACKUP_RECOVERY.md` documenting the current in-memory storage boundary, user/sample backup requirements, cache rebuild behavior, server restart recovery, missing-file handling, and the durable project snapshot requirement for a future release.

## MC-107 — Crash and error reporting strategy

- Priority: P1 · Status: done · Dependencies: MC-097, MC-105
- Acceptance: Release builds record actionable failures without collecting unnecessary personal or audio data.
- Delivered: Added native OSLog runtime diagnostics, replaced raw native `print` error output, and documented failure classes, redaction, retention, escalation, and the existing Composer/companion/server diagnostics paths in `ERROR_REPORTING.md`.

## MC-108 — Automated unit and protocol tests

- Priority: P0 · Status: done · Dependencies: MC-013, MC-086
- Acceptance: CI or a documented local command runs protocol, model, queue, clock, and reconnect tests.
- Delivered: Added the ephemeral-port `scripts/test-all.sh` runner, `tests/AUTOMATED_TESTS.md` coverage map, and GitHub Actions workflow covering protocol/model, network recovery, three-client smoke, and soak tests.

## MC-109 — Browser compatibility test suite

- Priority: P0 · Status: in progress · Dependencies: MC-044, MC-102
- Acceptance: Composer browsers and iPhone 6 Plus Safari are tested for loading, WebSocket, layout, audio-free companion behavior, and reconnect.
- Delivered: Added browser/PWA asset tests to the automated suite, verified the live Composer and Companion at a 736×414 landscape viewport with no browser console warnings, and documented the Safari/Chromium/iPhone 6 Plus manual compatibility matrix in `tests/BROWSER_COMPATIBILITY.md`. Physical iPhone 6 Plus Safari verification remains pending.

## MC-110 — Audio and sample fixture suite

- Priority: P0 · Status: planned · Dependencies: MC-071, MC-075
- Acceptance: Fixtures cover valid/invalid formats, long files, silence, mono/stereo, malformed metadata, and slice edge cases.

## MC-111 — End-to-end three-client test

- Priority: P0 · Status: planned · Dependencies: MC-015, MC-067, MC-094
- Acceptance: Mac composer, iPhone 14 performer, and iPhone 6 Plus companion complete a full compose/queue/perform/reconnect session.

## MC-112 — Performance and battery acceptance

- Priority: P1 · Status: planned · Dependencies: MC-096
- Acceptance: Release candidate meets documented startup, input latency, memory, CPU, battery, and waveform rendering budgets.

## MC-113 — Accessibility acceptance

- Priority: P0 · Status: planned · Dependencies: MC-027, MC-041, MC-053
- Acceptance: Key workflows pass keyboard, VoiceOver, Dynamic Type/zoom, contrast, focus, and reduced-motion checks.

## MC-114 — Security and abuse acceptance

- Priority: P0 · Status: planned · Dependencies: MC-013, MC-105
- Acceptance: Oversized messages, malformed JSON, invalid roles, room probing, path traversal, and local-network misuse are tested.

## MC-115 — Release documentation

- Priority: P0 · Status: planned · Dependencies: MC-099, MC-101, MC-102
- Acceptance: README covers install, start, join, permissions, troubleshooting, supported devices, sample licensing, and known limitations.

## MC-116 — Release checklist and rollback

- Priority: P0 · Status: planned · Dependencies: MC-101, MC-111, MC-115
- Acceptance: A signed release checklist records artifacts, test evidence, version, rollback path, and post-release verification.

## MC-117 — Private beta feedback loop

- Priority: P1 · Status: planned · Dependencies: MC-101, MC-111
- Acceptance: Testers have a feedback template, diagnostics instructions, privacy notice, and a triage process for reproducible issues.

## MC-118 — Distribution decision gate

- Priority: P0 · Status: planned · Dependencies: MC-116, MC-117
- Acceptance: A documented go/no-go review confirms functionality, reliability, licensing, privacy, accessibility, and support readiness.
