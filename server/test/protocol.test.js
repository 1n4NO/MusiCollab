import assert from "node:assert/strict";
import test from "node:test";
import WebSocket from "ws";
import { clockTimer, heartbeat, httpServer, runHeartbeat } from "../index.js";

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

test.after(async () => {
  clearInterval(heartbeat);
  clearInterval(clockTimer);
  await new Promise((resolve) => httpServer.close(resolve));
});
