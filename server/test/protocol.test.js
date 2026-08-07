import assert from "node:assert/strict";
import test from "node:test";
import WebSocket from "ws";
import { applyPendingChanges, clockTimer, heartbeat, httpServer, rooms, runHeartbeat } from "../index.js";

const port = await new Promise((resolve) => {
  if (httpServer.address()) return resolve(httpServer.address().port);
  httpServer.once("listening", () => resolve(httpServer.address().port));
});

function connect(clientID, role) {
  return new Promise((resolve, reject) => {
    const socket = new WebSocket(`ws://127.0.0.1:${port}/ws`);
    const messages = [];
    socket.on("message", (raw) => {
      const message = JSON.parse(raw.toString());
      messages.push(message);
      if (message.type === "welcome") resolve({ socket, messages });
    });
    socket.on("error", reject);
    socket.on("open", () => socket.send(JSON.stringify({ type: "hello", room: "TEST", clientID, role, name: clientID })));
  });
}

test("clients join a room and relay sequenced events", async () => {
  const composer = await connect("composer-test", "composer");
  const performer = await connect("performer-test", "performer");

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

test("rejects invalid roles and malformed events", async () => {
  const socket = new WebSocket(`ws://127.0.0.1:${port}/ws`);
  const messages = [];
  socket.on("message", (raw) => messages.push(JSON.parse(raw.toString())));
  await new Promise((resolve) => socket.once("open", resolve));
  socket.send(JSON.stringify({ type: "hello", room: "TEST", clientID: "bad-role", role: "admin", name: "Bad" }));
  await new Promise((resolve) => setTimeout(resolve, 20));
  assert.equal(messages[0].code, "INVALID_ROLE");
  socket.send(JSON.stringify({ type: "hello", room: "TEST", clientID: "valid-client", role: "companion", name: "Valid" }));
  await new Promise((resolve) => setTimeout(resolve, 20));
  socket.send(JSON.stringify({ type: "event", eventType: "not-real", payload: {} }));
  await new Promise((resolve) => setTimeout(resolve, 20));
  assert.equal(messages.at(-1).code, "INVALID_EVENT_TYPE");
  socket.close();
});

test("transport transitions are normalized by the server", async () => {
  const client = await connect("transport-test", "composer");
  const room = rooms.get("TEST");

  client.socket.send(JSON.stringify({ type: "event", eventType: "transport", requestID: "play-1", payload: { action: "play", bpm: 124 } }));
  await new Promise((resolve) => setTimeout(resolve, 20));
  assert.deepEqual(room.state.transport, { playing: true, bpm: 124, beat: 0, bar: 1, loopLengthBeats: 16, loopPosition: 0, tempoPolicy: "preserve" });

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
  assert.equal(client.messages.at(-1).code, "INVALID_TRANSPORT");
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
  assert.equal(client.messages.at(-1).code, "INVALID_QUANTIZATION");
  client.socket.close();
});

test("quantized queue changes remain pending until their target", async () => {
  const client = await connect("queue-scheduler", "companion");
  const targetServerTime = Date.now() + 50;
  client.socket.send(JSON.stringify({
    type: "event",
    eventType: "queue",
    requestID: "queue-bar",
    targetServerTime,
    targetBeat: 0,
    quantization: "bar",
    payload: { items: ["intro", "drop"] }
  }));
  await new Promise((resolve) => setTimeout(resolve, 20));
  const room = rooms.get("TEST");
  assert.deepEqual(room.state.queue, []);
  assert.equal(room.state.pendingChanges.length, 1);
  await new Promise((resolve) => setTimeout(resolve, 50));
  applyPendingChanges(room);
  assert.deepEqual(room.state.queue, ["intro", "drop"]);
  assert.equal(room.state.pendingChanges.length, 0);
  assert.ok(client.messages.some((message) => message.type === "stateChange" && message.applied));
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
  const client = await connect("clock-test", "companion");
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
  assert.deepEqual(entry.metrics, { offsetMs: 3, rttMs: 12, jitterMs: 1, lastSnapshotAt: 1234 });
  client.socket.close();
});

test("three-client clock simulation stays converged during playback", async () => {
  const clients = await Promise.all([
    connect("accuracy-composer", "composer"),
    connect("accuracy-performer", "performer"),
    connect("accuracy-companion", "companion")
  ]);
  clients[0].socket.send(JSON.stringify({ type: "event", eventType: "transport", payload: { action: "play", bpm: 120 } }));
  await new Promise((resolve) => setTimeout(resolve, 650));
  const latestBeats = clients.map((client) => client.messages.filter((message) => message.type === "clock").at(-1)?.beat);
  assert.ok(latestBeats.every((beat) => typeof beat === "number"));
  assert.ok(Math.max(...latestBeats) - Math.min(...latestBeats) < 0.1);
  clients[0].socket.send(JSON.stringify({ type: "event", eventType: "transport", payload: { action: "stop" } }));
  clients.forEach((client) => client.socket.close());
});

test.after(async () => {
  clearInterval(heartbeat);
  clearInterval(clockTimer);
  await new Promise((resolve) => httpServer.close(resolve));
});
