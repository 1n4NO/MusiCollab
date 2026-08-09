# MusiCollab memory and CPU soak test

The server soak harness drives three WebSocket clients with pad events, samples process RSS and CPU, measures event-loop lag, and fails on disconnects, low throughput, excessive memory, or a one-second event-loop stall.

Quick validation run:

```sh
cd /Users/ps/dev/MusiCollab/server
SOAK_DURATION_SECONDS=10 npm run test:soak
```

Release run:

```sh
cd /Users/ps/dev/MusiCollab/server
SOAK_DURATION_SECONDS=3600 npm run test:soak
```

The release run should be performed on the Mac configuration used for distribution, with the physical iPhone 14 and iPhone 6 Plus lifecycle matrix run separately. Record the printed duration, event count, peak RSS, RSS growth, CPU percentage, and maximum event-loop lag. Investigate any disconnect, throughput-floor failure, RSS growth above 128 MB, peak RSS above 512 MB, or event-loop stall over one second.
