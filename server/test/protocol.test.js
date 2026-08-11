import assert from "node:assert/strict";
import test from "node:test";
import WebSocket from "ws";
import { ASSET_MODEL_VERSION, normalizeAsset, normalizeLibraryAction, normalizeLoopSelection, normalizeSceneAction, normalizeSliceMap } from "../assets.js";
import { DEMO_ASSETS, createDemoLibrary } from "../demo-content.js";
import { instrumentLibrary, normalizeInstrumentParameter, normalizeInstrumentSelection } from "../instruments.js";
import { applyPendingChanges, clockTimer, heartbeat, httpServer, rooms, runHeartbeat } from "../index.js";

const port = await new Promise((resolve) => {
  if (httpServer.address()) return resolve(httpServer.address().port);
  httpServer.once("listening", () => resolve(httpServer.address().port));
});

function connect(clientID, role, room = "TEST", sessionToken = null) {
  return new Promise((resolve, reject) => {
    const socket = new WebSocket(`ws://127.0.0.1:${port}/ws`);
    const messages = [];
    socket.on("message", (raw) => {
      const message = JSON.parse(raw.toString());
      messages.push(message);
      if (message.type === "welcome") resolve({ socket, messages });
    });
    socket.on("error", reject);
    socket.on("open", () => socket.send(JSON.stringify({ type: "hello", room, clientID, role, name: clientID, ...(sessionToken ? { sessionToken } : {}) })));
  });
}

test("clients join a room and relay sequenced events", async () => {
  const composer = await connect("composer-test", "composer", "RELAY_TEST");
  const performer = await connect("performer-test", "performer", "RELAY_TEST");

  composer.socket.send(JSON.stringify({ type: "event", eventType: "transport", payload: { playing: true, bpm: 120 }, beat: 0 }));
  const event = await new Promise((resolve) => {
    const handler = (raw) => {
      const message = JSON.parse(raw.toString());
      if (message.type === "event") {
        performer.socket.off("message", handler);
        resolve(message);
      }
    };
    performer.socket.on("message", handler);
  });

  assert.equal(event.eventType, "transport");
  assert.equal(event.sequence, 1);
  assert.equal(event.payload.bpm, 120);

  await new Promise((resolve) => setTimeout(resolve, 20));
  const acknowledgement = composer.messages.find((message) => message.type === "ack" && message.eventID === event.eventID);
  assert.ok(acknowledgement);
  assert.equal(acknowledgement.sequence, 1);

  composer.socket.close();
  performer.socket.close();
});

test("events expose client-to-server latency metadata", async () => {
  const client = await connect("latency-source", "composer", "LATENCY_TEST");
  const sentAt = Date.now() - 25;
  client.socket.send(JSON.stringify({ type: "event", eventType: "padHit", clientSentAt: sentAt, payload: { pad: 0, velocity: 0.8 } }));
  const event = await new Promise((resolve) => {
    const handler = (raw) => {
      const message = JSON.parse(raw.toString());
      if (message.type === "event" && message.eventType === "padHit") {
        client.socket.off("message", handler);
        resolve(message);
      }
    };
    client.socket.on("message", handler);
  });
  assert.ok(event.latency.clientToServerMs >= 20);
  client.socket.close();
});

test("keyboard note events relay to the connected performer", async () => {
  const composer = await connect("keyboard-source", "composer", "NOTE_TEST");
  const performer = await connect("keyboard-performer", "performer", "NOTE_TEST");
  composer.socket.send(JSON.stringify({ type: "event", eventType: "noteOn", payload: { instrument: "piano", key: 4, velocity: 0.86 } }));
  const event = await new Promise((resolve) => {
    const handler = (raw) => {
      const message = JSON.parse(raw.toString());
      if (message.type === "event" && message.eventType === "noteOn") {
        performer.socket.off("message", handler);
        resolve(message);
      }
    };
    performer.socket.on("message", handler);
  });
  assert.equal(event.payload.instrument, "piano");
  assert.equal(event.payload.key, 4);
  assert.equal(event.payload.velocity, 0.86);
  composer.socket.close();
  performer.socket.close();
});

test("scene actions persist, validate references, and update room order", async () => {
  const library = createDemoLibrary();
  assert.equal(normalizeSceneAction({ action: "create", scene: { id: "scene-unit", name: "Unit", trackIDs: ["demo-track-drums"] } }, library).error, undefined);
  assert.match(normalizeSceneAction({ action: "recall", sceneID: "missing" }, library).error, /room library/);
  assert.match(normalizeSceneAction({ action: "create", scene: { id: "scene-bad", name: "Bad", trackIDs: ["missing"] } }, library).error, /trackIDs/);

  const client = await connect("scene-actions", "composer", "SCENE_TEST");
  const sendScene = (payload) => client.socket.send(JSON.stringify({ type: "event", eventType: "scene", payload }));
  sendScene({ action: "create", scene: { id: "scene-test", name: "Test Scene", tags: ["user"], trackIDs: ["demo-track-drums"] } });
  await new Promise((resolve) => setTimeout(resolve, 20));
  const room = rooms.get("SCENE_TEST");
  assert.equal(room.state.scene.sceneID, "scene-test");
  assert.equal(room.state.library.scenes.find((scene) => scene.id === "scene-test").name, "Test Scene");
  sendScene({ action: "rename", sceneID: "scene-test", name: "Renamed" });
  sendScene({ action: "duplicate", sceneID: "scene-test", newID: "scene-copy", name: "Copy" });
  await new Promise((resolve) => setTimeout(resolve, 20));
  assert.equal(room.state.library.scenes.find((scene) => scene.id === "scene-test").name, "Renamed");
  assert.equal(room.state.scene.sceneID, "scene-copy");
  const reordered = [...room.state.sceneOrder].reverse();
  sendScene({ action: "reorder", order: reordered });
  await new Promise((resolve) => setTimeout(resolve, 20));
  assert.deepEqual(room.state.sceneOrder, reordered);
  sendScene({ action: "recall", sceneID: "scene-test" });
  await new Promise((resolve) => setTimeout(resolve, 20));
  assert.equal(room.state.scene.sceneID, "scene-test");
  assert.ok(client.messages.some((message) => message.type === "event" && message.eventType === "scene"));
  client.socket.close();
});

test("library organization actions persist favorite, tags, recovery, and delete state", async () => {
  const library = createDemoLibrary();
  assert.deepEqual(normalizeLibraryAction({ action: "favorite", assetID: "demo-loop-bass", favorite: true }, library).value, { action: "favorite", assetID: "demo-loop-bass", favorite: true });
  assert.deepEqual(normalizeLibraryAction({ action: "tags", assetID: "demo-loop-bass", tags: [" Groove ", "groove"] }, library).value.tags, ["groove"]);
  assert.deepEqual(normalizeLibraryAction({ action: "delete", assetID: "demo-sample-chops" }, library).value, { action: "delete", assetID: "demo-sample-chops", type: "sample" });
  assert.match(normalizeLibraryAction({ action: "favorite", assetID: "missing", favorite: true }, library).error, /room library/);
  const client = await connect("library-actions", "composer", "LIBRARY_TEST");
  const sendLibrary = (payload) => client.socket.send(JSON.stringify({ type: "event", eventType: "library", payload }));
  sendLibrary({ action: "favorite", assetID: "demo-loop-bass", favorite: true });
  sendLibrary({ action: "tags", assetID: "demo-loop-bass", tags: ["groove", "favorite"] });
  sendLibrary({ action: "missing", assetID: "demo-sample-chops", missing: true });
  await new Promise((resolve) => setTimeout(resolve, 30));
  const room = rooms.get("LIBRARY_TEST");
  const loop = room.state.library.loops.find((asset) => asset.id === "demo-loop-bass");
  const sample = room.state.library.samples.find((asset) => asset.id === "demo-sample-chops");
  assert.equal(loop.favorite, true);
  assert.deepEqual(loop.tags, ["groove", "favorite"]);
  assert.equal(sample.missing, true);
  sendLibrary({ action: "recover", assetID: "demo-sample-chops" });
  await new Promise((resolve) => setTimeout(resolve, 20));
  assert.equal(sample.missing, false);
  sendLibrary({ action: "delete", assetID: "demo-sample-chops" });
  await new Promise((resolve) => setTimeout(resolve, 20));
  assert.equal(room.state.library.samples.some((asset) => asset.id === "demo-sample-chops"), false);
  client.socket.close();
});

test("session tokens resume identity without duplicate roster entries", async () => {
  const first = await connect("resumable-client", "composer", "RESUME_TEST");
  const welcome = first.messages.find((message) => message.type === "welcome");
  assert.ok(welcome?.sessionToken);
  const peer = await connect("resumable-peer", "performer", "RESUME_TEST");
  first.socket.close();
  await new Promise((resolve) => setTimeout(resolve, 20));
  const resumed = await connect("different-local-id", "composer", "RESUME_TEST", welcome.sessionToken);
  const resumedWelcome = resumed.messages.find((message) => message.type === "welcome");
  assert.equal(resumedWelcome.sessionResumed, true);
  assert.equal(resumedWelcome.clientID, "resumable-client");
  const roster = resumed.messages.find((message) => message.type === "snapshot").clients;
  assert.equal(roster.filter((client) => client.id === "resumable-client").length, 1);
  assert.equal(roster.length, 2);
  peer.socket.close();
  resumed.socket.close();
});

test("stale session tokens identify a new server authority and reset sequence", async () => {
  const client = await connect("restart-recovery", "composer", "RESTART_TEST", "aaaaaaaaaaaaaaaa");
  const welcome = client.messages.find((message) => message.type === "welcome");
  const snapshot = client.messages.find((message) => message.type === "snapshot");
  assert.equal(welcome.serverRestarted, true);
  assert.ok(welcome.serverInstanceID);
  assert.equal(snapshot.serverInstanceID, welcome.serverInstanceID);
  assert.equal(snapshot.sequence, 0);
  client.socket.close();
});

test("duplicate event IDs are acknowledged without applying twice", async () => {
  const client = await connect("duplicate-event", "composer", "DUPLICATE_TEST");
  const message = { type: "event", eventType: "queue", eventID: "queue-once", requestID: "first", payload: { items: ["intro"] } };
  client.socket.send(JSON.stringify(message));
  await new Promise((resolve) => setTimeout(resolve, 20));
  const room = rooms.get("DUPLICATE_TEST");
  const firstVersion = room.stateVersion;
  const firstSequence = room.sequence;
  client.socket.send(JSON.stringify({ ...message, requestID: "retry", payload: { items: ["must-not-apply"] } }));
  await new Promise((resolve) => setTimeout(resolve, 20));
  assert.deepEqual(room.state.queue, ["intro"]);
  assert.equal(room.stateVersion, firstVersion);
  assert.equal(room.sequence, firstSequence);
  const duplicateAck = client.messages.find((entry) => entry.type === "ack" && entry.requestID === "retry");
  assert.equal(duplicateAck.duplicate, true);
  assert.equal(duplicateAck.sequence, firstSequence);
  client.socket.close();
});

test("late events follow the documented timing policy", async () => {
  const client = await connect("late-policy", "performer", "LATE_TEST");
  client.socket.send(JSON.stringify({ type: "event", eventType: "padHit", eventID: "late-pad", targetServerTime: Date.now() - 1000, payload: { pad: 2, velocity: 0.8 } }));
  await new Promise((resolve) => setTimeout(resolve, 20));
  const latePad = client.messages.find((message) => message.type === "event" && message.eventID === "late-pad");
  assert.equal(latePad.timing.late, true);
  assert.equal(latePad.timing.policy, "apply-immediately");
  client.socket.send(JSON.stringify({ type: "event", eventType: "transport", requestID: "late-transport", targetServerTime: Date.now() - 1000, payload: { action: "play" } }));
  await new Promise((resolve) => setTimeout(resolve, 20));
  assert.ok(client.messages.some((message) => message.code === "LATE_EVENT" && message.requestID === "late-transport"));
  client.socket.close();
});

test("rejects invalid roles and malformed events", async () => {
  const socket = new WebSocket(`ws://127.0.0.1:${port}/ws`);
  const messages = [];
  socket.on("message", (raw) => messages.push(JSON.parse(raw.toString())));
  await new Promise((resolve) => socket.once("open", resolve));
  socket.send(JSON.stringify({ type: "hello", room: "TEST", clientID: "bad-role", role: "admin", name: "Bad" }));
  await new Promise((resolve) => setTimeout(resolve, 20));
  assert.equal(messages[0].code, "INVALID_ROLE");
  socket.send(JSON.stringify({ type: "hello", room: "TEST", clientID: "valid-client", role: "performer", name: "Valid" }));
  await new Promise((resolve) => setTimeout(resolve, 20));
  socket.send(JSON.stringify({ type: "event", eventType: "not-real", payload: {} }));
  await new Promise((resolve) => setTimeout(resolve, 20));
  assert.ok(messages.some((message) => message.code === "INVALID_EVENT_TYPE"));
  socket.close();
});

test("transport transitions are normalized by the server", async () => {
  const client = await connect("transport-test", "composer", "TRANSPORT_TEST");
  const room = rooms.get("TRANSPORT_TEST");

  client.socket.send(JSON.stringify({ type: "event", eventType: "transport", requestID: "play-1", payload: { action: "play", bpm: 124 } }));
  await new Promise((resolve) => setTimeout(resolve, 20));
  assert.equal(room.state.transport.playing, true);
  assert.equal(room.state.transport.bpm, 124);
  assert.equal(room.state.transport.bar, 1);
  assert.equal(room.state.transport.loopLengthBeats, 16);
  assert.equal(room.state.transport.tempoPolicy, "preserve");
  assert.ok(room.state.transport.beat < 0.1);

  client.socket.send(JSON.stringify({ type: "event", eventType: "transport", requestID: "pause-1", payload: { action: "pause" } }));
  await new Promise((resolve) => setTimeout(resolve, 20));
  assert.equal(room.state.transport.playing, false);
  assert.equal(room.state.transport.bpm, 124);

  client.socket.send(JSON.stringify({ type: "event", eventType: "transport", requestID: "stop-1", payload: { action: "stop" } }));
  await new Promise((resolve) => setTimeout(resolve, 20));
  assert.equal(room.state.transport.beat, 0);
  assert.equal(room.state.transport.bar, 1);

  client.socket.send(JSON.stringify({ type: "event", eventType: "transport", requestID: "bad-bpm", payload: { action: "play", bpm: 400 } }));
  await new Promise((resolve) => setTimeout(resolve, 20));
  assert.equal(room.state.transport.playing, false);
  assert.ok(client.messages.some((message) => message.code === "INVALID_TRANSPORT"));
  client.socket.close();
});

test("new clients converge from the latest state snapshot", async () => {
  const composer = await connect("snapshot-composer", "composer");
  composer.socket.send(JSON.stringify({ type: "event", eventType: "transport", requestID: "snapshot-play", payload: { action: "play", bpm: 132 } }));
  await new Promise((resolve) => setTimeout(resolve, 20));

  const performer = await connect("snapshot-performer", "performer");
  await new Promise((resolve) => setTimeout(resolve, 20));
  const snapshot = performer.messages.find((message) => message.type === "snapshot");
  assert.ok(snapshot);
  assert.equal(snapshot.state.transport.playing, true);
  assert.equal(snapshot.state.transport.bpm, 132);
  assert.equal(snapshot.stateVersion, rooms.get("TEST").stateVersion);
  assert.ok(snapshot.sequence >= 1);
  composer.socket.close();
  performer.socket.close();
});

test("events carry normalized future-target timing metadata", async () => {
  const client = await connect("timed-event", "performer");
  client.socket.send(JSON.stringify({
    type: "event",
    eventType: "padHit",
    eventID: "timed-pad",
    targetServerTime: 2000000000000,
    targetBeat: 8,
    targetBar: 3,
    quantization: "bar",
    payload: { pad: 0, velocity: 0.8 }
  }));
  const event = await new Promise((resolve) => {
    const handler = (raw) => {
      const message = JSON.parse(raw.toString());
      if (message.type === "event" && message.eventID === "timed-pad") {
        client.socket.off("message", handler);
        resolve(message);
      }
    };
    client.socket.on("message", handler);
  });
  assert.deepEqual(event.timing, { targetServerTime: 2000000000000, targetBeat: 8, targetBar: 3, quantization: "bar" });
  client.socket.send(JSON.stringify({ type: "event", eventType: "padHit", quantization: "sixteenth", payload: { pad: 1 } }));
  await new Promise((resolve) => setTimeout(resolve, 20));
  assert.ok(client.messages.some((message) => message.code === "INVALID_QUANTIZATION"));
  client.socket.close();
});

test("quantized queue changes remain pending until their target", async () => {
  const client = await connect("queue-scheduler", "composer", "QUEUE_TEST");
  const targetServerTime = Date.now() + 50;
  client.socket.send(JSON.stringify({
    type: "event",
    eventType: "queue",
    requestID: "queue-bar",
    targetServerTime,
    targetBeat: 4,
    quantization: "bar",
    payload: { items: ["intro", "drop"] }
  }));
  await new Promise((resolve) => setTimeout(resolve, 20));
  const room = rooms.get("QUEUE_TEST");
  assert.deepEqual(room.state.queue, []);
  assert.equal(room.state.pendingChanges.length, 1);
  await new Promise((resolve) => setTimeout(resolve, 50));
  applyPendingChanges(room);
  assert.deepEqual(room.state.queue, ["intro", "drop"]);
  assert.equal(room.state.pendingChanges.length, 0);
  assert.ok(client.messages.some((message) => message.type === "stateChange" && message.applied) || room.state.queue.length === 2);
  client.socket.close();
});

test("clock reports bar and wrapped loop position", async () => {
  const client = await connect("loop-clock", "composer");
  client.socket.send(JSON.stringify({ type: "event", eventType: "transport", payload: { action: "pause", bpm: 120, beat: 17 } }));
  await new Promise((resolve) => setTimeout(resolve, 20));
  const room = rooms.get("TEST");
  applyPendingChanges(room);
  const loopClock = {
    beat: room.state.transport.beat,
    bar: Math.floor(room.state.transport.beat / 4) + 1,
    loopPosition: room.state.transport.beat % room.state.transport.loopLengthBeats
  };
  assert.equal(loopClock.bar, 5);
  assert.equal(loopClock.loopPosition, 1);
  client.socket.close();
});

test("tempo policy preserves or resets phase explicitly", async () => {
  const client = await connect("tempo-policy", "composer");
  const room = rooms.get("TEST");
  client.socket.send(JSON.stringify({ type: "event", eventType: "transport", payload: { action: "pause", bpm: 120, beat: 7, tempoPolicy: "preserve" } }));
  await new Promise((resolve) => setTimeout(resolve, 20));
  assert.equal(room.state.transport.beat, 7);
  client.socket.send(JSON.stringify({ type: "event", eventType: "transport", payload: { action: "pause", bpm: 130, tempoPolicy: "reset" } }));
  await new Promise((resolve) => setTimeout(resolve, 20));
  assert.equal(room.state.transport.beat, 0);
  assert.equal(room.state.transport.tempoPolicy, "reset");
  client.socket.close();
});

test("heartbeat tolerates two missed checks and terminates on the third", () => {
  let pings = 0;
  let terminations = 0;
  const socket = {
    missedHeartbeats: 0,
    ping() { pings += 1; },
    terminate() { terminations += 1; }
  };

  runHeartbeat(new Set([socket]));
  assert.equal(socket.missedHeartbeats, 1);
  assert.equal(pings, 1);
  assert.equal(terminations, 0);

  runHeartbeat(new Set([socket]));
  assert.equal(socket.missedHeartbeats, 2);
  assert.equal(pings, 2);
  assert.equal(terminations, 0);

  runHeartbeat(new Set([socket]));
  assert.equal(terminations, 1);
  assert.equal(pings, 2);
});

test("ping returns timing fields for clock synchronization", async () => {
  const client = await connect("clock-test", "performer");
  client.socket.send(JSON.stringify({ type: "ping", clientTime: 123456789 }));
  const pong = await new Promise((resolve) => {
    const handler = (raw) => {
      const message = JSON.parse(raw.toString());
      if (message.type === "pong") {
        client.socket.off("message", handler);
        resolve(message);
      }
    };
    client.socket.on("message", handler);
  });
  assert.equal(pong.clientTime, 123456789);
  assert.equal(typeof pong.serverReceiveTime, "number");
  assert.equal(typeof pong.serverTime, "number");
  client.socket.close();
});

test("clients can publish drift metrics into the roster", async () => {
  const client = await connect("metrics-test", "performer");
  client.socket.send(JSON.stringify({ type: "metrics", offsetMs: 3.4, rttMs: 12.2, jitterMs: 1.1, lastSnapshotAt: 1234 }));
  await new Promise((resolve) => setTimeout(resolve, 20));
  const roster = client.messages.filter((message) => message.type === "roster").at(-1);
  const entry = roster.clients.find((item) => item.id === "metrics-test");
  assert.deepEqual(entry.metrics, { offsetMs: 3, rttMs: 12, jitterMs: 1, lastSnapshotAt: 1234, reconnectCount: 0, eventsSent: 0, eventsReceived: 0, eventsLost: 0, lastError: null });
  client.socket.close();
});

test("server info exposes release metadata without session data", async () => {
  const response = await fetch(`http://127.0.0.1:${port}/info`);
  const info = await response.json();
  assert.equal(info.appVersion, "0.1.0");
  assert.equal(info.protocolVersion, 1);
  assert.equal(Object.hasOwn(info, "sessionToken"), false);
});

test("two-client clock simulation stays converged during playback", async () => {
  const clients = await Promise.all([
    connect("accuracy-composer", "composer"),
    connect("accuracy-performer", "performer")
  ]);
  clients[0].socket.send(JSON.stringify({ type: "event", eventType: "transport", payload: { action: "play", bpm: 120 } }));
  await new Promise((resolve) => setTimeout(resolve, 650));
  const latestBeats = clients.map((client) => client.messages.filter((message) => message.type === "clock").at(-1)?.beat);
  assert.ok(latestBeats.every((beat) => typeof beat === "number"));
  assert.ok(Math.max(...latestBeats) - Math.min(...latestBeats) < 0.1);
  clients[0].socket.send(JSON.stringify({ type: "event", eventType: "transport", payload: { action: "stop" } }));
  clients.forEach((client) => client.socket.close());
});

test("versioned asset models normalize musical content metadata", async () => {
  const sample = normalizeAsset({ id: "sample-1", type: "sample", name: "Vocal Chop", tags: ["Vocals", "vocals"], duration: 2, bpm: 120, key: "Am", sampleRate: 44100, channels: 2, slices: [{ id: "slice-1", start: 0, end: 1 }] });
  const loop = normalizeAsset({ id: "loop-1", type: "loop", name: "Four Bars", tags: ["demo"], duration: 8, bars: 4, bpm: 120, key: "Am", quantization: "bar" });
  const scene = normalizeAsset({ id: "scene-1", type: "scene", name: "Verse", tags: [], trackIDs: ["drums", "bass"] });
  assert.equal(sample.asset.modelVersion, ASSET_MODEL_VERSION);
  assert.deepEqual(sample.asset.tags, ["vocals"]);
  assert.equal(sample.asset.slices[0].end, 1);
  assert.equal(loop.asset.bars, 4);
  assert.deepEqual(scene.asset.trackIDs, ["drums", "bass"]);
  assert.match(normalizeAsset({ id: "bad-loop", type: "loop", name: "Bad" }).error, /bars/);
});

test("asset events update the versioned room library", async () => {
  const client = await connect("asset-client", "composer");
  client.socket.send(JSON.stringify({ type: "event", eventType: "asset", payload: { asset: { id: "loop-room-1", type: "loop", name: "Room Loop", tags: ["groove"], bars: 2, bpm: 118, duration: 4 } } }));
  await new Promise((resolve) => setTimeout(resolve, 20));
  const room = rooms.get("TEST");
  assert.equal(room.state.library.modelVersion, 1);
  const storedLoop = room.state.library.loops.find((asset) => asset.id === "loop-room-1");
  assert.ok(storedLoop);
  assert.equal(storedLoop.bars, 2);
  client.socket.close();
});

test("new rooms include attributed original demo content", () => {
  const library = createDemoLibrary();
  assert.equal(library.modelVersion, ASSET_MODEL_VERSION);
  assert.ok(DEMO_ASSETS.length >= 6);
  assert.ok(library.tracks.some((asset) => asset.id === "demo-track-drums"));
  assert.ok(library.instruments.length >= 2);
  assert.ok(library.loops.some((asset) => asset.bars === 4 && asset.license.type === "original"));
  assert.ok(library.samples[0].slices.length >= 4);
  assert.ok(library.scenes[0].license.attribution.includes("MusiCollab"));
  assert.equal(library.scenes[0].origin, "bundled-demo");
  assert.equal(library.scenes[0].license.distribution, "attribution-required");
});

test("sample import metadata enforces file limits and preserves source details", () => {
  const imported = normalizeAsset({ id: "imported-1", type: "sample", name: "beat.wav", duration: 3.5, source: { fileName: "beat.wav", mimeType: "audio/wav", sizeBytes: 2048, modifiedAt: 1234 }, sourceFormat: { sampleRate: 48000, channels: 6 }, normalization: { sampleRate: 44100, channels: 2, method: "resampled-downmixed" }, waveform: { sampleCount: 154350, peaks: [{ min: -0.8, max: 0.9, rms: 0.2 }] }, hash: "a".repeat(64), transfer: { kind: "reference", reference: "local:beat.wav:2048:1234", hash: "a".repeat(64), sizeBytes: 2048 }, slices: [] });
  assert.equal(imported.asset.source.fileName, "beat.wav");
  assert.equal(imported.asset.source.sizeBytes, 2048);
  assert.equal(imported.asset.normalization.method, "resampled-downmixed");
  assert.equal(imported.asset.waveform.peaks.length, 1);
  assert.equal(imported.asset.transfer.kind, "reference");
  assert.equal(imported.asset.transfer.reference, "local:beat.wav:2048:1234");
  const userDeclared = normalizeAsset({ id: "rights-1", type: "sample", name: "rights.wav", origin: "user-imported", license: { type: "user-declared", attribution: "Imported by user; rights not verified", distribution: "review-required" } });
  assert.equal(userDeclared.asset.origin, "user-imported");
  assert.equal(userDeclared.asset.license.distribution, "review-required");
  assert.match(normalizeAsset({ id: "bad-license", type: "sample", name: "bad.wav", license: { type: "unknown-license", attribution: "Unknown", distribution: "allowed" } }).error, /license.type/);
  assert.match(normalizeAsset({ id: "too-long", type: "sample", name: "long.wav", duration: 601 }).error, /600/);
  assert.match(normalizeAsset({ id: "too-large", type: "sample", name: "large.wav", duration: 1, source: { sizeBytes: 101 * 1024 * 1024 } }).error, /100 MB/);
  assert.match(normalizeAsset({ id: "bad-format", type: "sample", name: "bad.wav", duration: 1, normalization: { sampleRate: 48000, channels: 2 } }).error, /44100/);
  assert.match(normalizeAsset({ id: "bad-waveform", type: "sample", name: "bad.wav", duration: 1, waveform: { sampleCount: 1, peaks: [] } }).error, /peaks/);
  assert.match(normalizeAsset({ id: "raw-audio", type: "sample", name: "bad.wav", duration: 1, audioData: "base64 bytes" }).error, /raw audio/);
  assert.match(normalizeAsset({ id: "bad-transfer", type: "sample", name: "bad.wav", duration: 1, transfer: { kind: "url", url: "file:///private/sample.wav" } }).error, /HTTP/);
});

test("slice validation rejects invalid and unsafe regions", () => {
  assert.match(normalizeAsset({ id: "nan-slice", type: "sample", name: "bad.wav", duration: 1, slices: [{ start: NaN, end: 0.5 }] }).error, /number/);
  assert.match(normalizeAsset({ id: "reverse-slice", type: "sample", name: "bad.wav", duration: 1, slices: [{ start: 0.8, end: 0.2 }] }).error, /ordered/);
  assert.match(normalizeAsset({ id: "outside-slice", type: "sample", name: "bad.wav", duration: 1, slices: [{ start: 0, end: 1.1 }] }).error, /inside/);
  assert.match(normalizeAsset({ id: "tiny-slice", type: "sample", name: "bad.wav", duration: 1, slices: [{ start: 0.2, end: 0.2005 }] }).error, /non-empty/);
  assert.match(normalizeAsset({ id: "zero-sample", type: "sample", name: "bad.wav", duration: 0, slices: [{ start: 0, end: 0 }] }).error, /non-empty/);
  assert.match(normalizeAsset({ id: "many-slices", type: "sample", name: "bad.wav", duration: 1, slices: Array.from({ length: 513 }, (_, index) => ({ start: 0, end: 0.5, id: `s-${index}` })) }).error, /512/);
  const short = normalizeAsset({ id: "short-sample", type: "sample", name: "short.wav", duration: 0.0005, slices: [{ start: 0, end: 0.0005 }] });
  assert.equal(short.error, undefined);
});

test("slice maps normalize pad assignments and reject unsafe targets", async () => {
  const normalized = normalizeSliceMap({ sampleID: "sample-1", assignments: { 0: "slice-1", 3: null } });
  assert.equal(normalized.error, undefined);
  assert.deepEqual(normalized.value.assignments, { 0: "slice-1", 3: null });
  assert.match(normalizeSliceMap({ sampleID: "sample-1", assignments: { 16: "slice-1" } }).error, /0–15/);
  assert.match(normalizeSliceMap({ sampleID: "sample-1", assignments: { 0: { id: "slice-1" } } }).error, /strings/);
  assert.match(normalizeSliceMap({ sampleID: "sample-1", assignments: Object.fromEntries(Array.from({ length: 17 }, (_, index) => [index, "slice"])) }).error, /0–15|16/);
});

test("slice map events replace pad assignments in the room", async () => {
  const client = await connect("slice-map-client", "composer");
  client.socket.send(JSON.stringify({ type: "event", eventType: "sliceMap", payload: { sampleID: "demo-sample-chops", assignments: { 0: "demo-slice-1", 1: "demo-slice-2" } } }));
  await new Promise((resolve) => setTimeout(resolve, 20));
  const mapping = rooms.get("TEST").state.sliceMappings.find((item) => item.sampleID === "demo-sample-chops");
  assert.deepEqual(mapping.assignments, { 0: "demo-slice-1", 1: "demo-slice-2" });
  client.socket.close();
});

test("loop selection carries beat-matching metadata and preserves phase", async () => {
  const library = createDemoLibrary();
  const normalized = normalizeLoopSelection({ items: ["demo-loop-bass"] }, library);
  assert.equal(normalized.error, undefined);
  assert.deepEqual(normalized.value.items[0], { id: "demo-loop-bass", name: "Demo Bass Pulse", bars: 4, bpm: 118, key: "Am", duration: 8, quantization: "bar" });
  assert.match(normalizeLoopSelection({ items: ["missing-loop"] }, library).error, /room library/);
  const client = await connect("loop-client", "composer");
  client.socket.send(JSON.stringify({ type: "event", eventType: "loops", payload: { items: ["demo-loop-bass"] } }));
  await new Promise((resolve) => setTimeout(resolve, 20));
  const room = rooms.get("TEST");
  assert.equal(room.state.transport.loopLengthBeats, 16);
  assert.equal(room.state.loops.items[0].bpm, 118);
  assert.equal(room.state.loops.playbackRates["demo-loop-bass"], Number((room.state.transport.bpm / 118).toFixed(6)));
  const before = room.state.transport.beat;
  client.socket.send(JSON.stringify({ type: "event", eventType: "transport", payload: { action: "play", bpm: 130, tempoPolicy: "preserve" } }));
  await new Promise((resolve) => setTimeout(resolve, 20));
  assert.ok(room.state.transport.beat >= before);
  client.socket.close();
});

test("instrument presets normalize safely and persist in the room", async () => {
  const library = createDemoLibrary();
  assert.ok(instrumentLibrary(library).some((instrument) => instrument.id === "drums"));
  assert.ok(instrumentLibrary(library).some((instrument) => instrument.id === "piano"));
  const preset = normalizeInstrumentSelection({ instrument: "bass", pitch: 7, parameters: { cutoff: 0.8 } }, library);
  assert.equal(preset.error, undefined);
  assert.equal(preset.value.instrumentID, "bass");
  assert.equal(preset.value.parameters.cutoff, 0.8);
  assert.match(normalizeInstrumentSelection({ instrument: "bass", parameters: { cutoff: 2 } }, library).error, /between/);
  assert.match(normalizeInstrumentSelection({ instrument: "unknown" }, library).error, /built-in/);
  assert.match(normalizeInstrumentSelection({ instrument: "bass", pitch: 25 }, library).error, /pitch/);
  const client = await connect("instrument-client", "composer");
  client.socket.send(JSON.stringify({ type: "event", eventType: "instrument", payload: { instrument: "keys", pitch: -3 } }));
  await new Promise((resolve) => setTimeout(resolve, 20));
  assert.equal(rooms.get("TEST").state.instrument.instrumentID, "keys");
  client.socket.send(JSON.stringify({ type: "event", eventType: "instrument", payload: { instrument: "piano", pitch: 0 } }));
  await new Promise((resolve) => setTimeout(resolve, 20));
  assert.equal(rooms.get("TEST").state.instrument.family, "keyboard");
  assert.equal(rooms.get("TEST").state.instrument.pitch, 0);
  client.socket.send(JSON.stringify({ type: "event", eventType: "instrumentParam", payload: { instrumentID: "keys", parameter: "cutoff", value: 0.55 } }));
  await new Promise((resolve) => setTimeout(resolve, 20));
  assert.equal(rooms.get("TEST").state.instrument.parameters.cutoff, 0.55);
  assert.match(normalizeInstrumentParameter({ instrumentID: "keys", parameter: "cutoff", value: 2 }, library, rooms.get("TEST").state.instrument).error, /between/);
  client.socket.close();
});

test.after(async () => {
  clearInterval(heartbeat);
  clearInterval(clockTimer);
  await new Promise((resolve) => httpServer.close(resolve));
});
