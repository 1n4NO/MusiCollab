# Automated test coverage

Run the complete local suite without stopping the development server:

```sh
cd /Users/ps/dev/MusiCollab/server
npm ci
npm run test:all
```

The runner assigns each test process an ephemeral port (`PORT=0`), so it does not interrupt or collide with the normal server on port 8787.

| Suite | Coverage |
| --- | --- |
| `npm test` | Protocol validation, event sequencing, acknowledgements, snapshots, session tokens, clocks, transport, queue timing, assets, scenes, instruments, and slice maps |
| `npm run test:network` | Brief disconnect, network/path switch, unavailable-port failure, and reconnect recovery |
| `npm run test:smoke` | Mac composer + iPhone 14 performer + iPhone 6 Plus companion roster, pad event, and session resumption |
| `npm run test:soak` | Three-client event throughput, disconnect count, RSS growth, CPU, and event-loop lag |

The soak duration defaults to 10 seconds and can be adjusted for local runs:

```sh
SOAK_DURATION_SECONDS=60 npm run test:all
```

The tests are deterministic protocol/behavior checks, not a substitute for physical-device audio, browser compatibility, or Wi-Fi acceptance testing.
