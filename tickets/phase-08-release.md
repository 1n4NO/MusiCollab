# Phase 8 tickets — release readiness and distribution

## MC-098 — Release architecture review

- Priority: P0 · Status: planned · Dependencies: MC-091
- Acceptance: Data flow, trust boundaries, local-network assumptions, failure modes, and supported-device matrix are documented.

## MC-099 — Mac packaging and startup

- Priority: P0 · Status: planned · Dependencies: MC-012
- Acceptance: Mac server has a repeatable start/stop workflow, dependency check, port conflict message, and LAN setup guide.

## MC-100 — Native app signing configuration

- Priority: P0 · Status: planned · Dependencies: MC-098
- Acceptance: Bundle ID, signing, capabilities, entitlements, version/build numbers, and archive configuration are documented.

## MC-101 — TestFlight distribution path

- Priority: P0 · Status: planned · Dependencies: MC-100
- Acceptance: A signed archive can be uploaded, installed by an external tester, and rolled back to a prior build.

## MC-102 — Companion hosting and HTTPS

- Priority: P0 · Status: planned · Dependencies: MC-043, MC-098
- Acceptance: Companion is hosted over HTTPS with cache strategy, versioned assets, and a documented deployment command.

## MC-103 — Local development HTTPS option

- Priority: P1 · Status: planned · Dependencies: MC-102
- Acceptance: Development can use secure WebSockets when needed, with documented local certificate handling.

## MC-104 — Dependency and license audit

- Priority: P0 · Status: planned · Dependencies: MC-084
- Acceptance: Node, Swift, audio, and web dependencies have pinned versions, license records, and known-vulnerability review.

## MC-105 — Secrets and privacy review

- Priority: P0 · Status: planned · Dependencies: MC-098
- Acceptance: No secrets are committed; logs exclude private paths/content; local sample metadata and diagnostics are minimized.

## MC-106 — Data backup and recovery policy

- Priority: P1 · Status: planned · Dependencies: MC-039, MC-083
- Acceptance: User projects, arrangements, samples, and cached metadata have documented backup, restore, and missing-file behavior.

## MC-107 — Crash and error reporting strategy

- Priority: P1 · Status: planned · Dependencies: MC-097, MC-105
- Acceptance: Release builds record actionable failures without collecting unnecessary personal or audio data.

## MC-108 — Automated unit and protocol tests

- Priority: P0 · Status: planned · Dependencies: MC-013, MC-086
- Acceptance: CI or a documented local command runs protocol, model, queue, clock, and reconnect tests.

## MC-109 — Browser compatibility test suite

- Priority: P0 · Status: planned · Dependencies: MC-044, MC-102
- Acceptance: Composer browsers and iPhone 6 Plus Safari are tested for loading, WebSocket, layout, audio-free companion behavior, and reconnect.

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
