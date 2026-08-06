import assert from "node:assert/strict";
import test from "node:test";
import WebSocket from "ws";
import { heartbeat, httpServer } from "../index.js";

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

  composer.socket.close();
  performer.socket.close();
});

test.after(async () => {
  clearInterval(heartbeat);
  await new Promise((resolve) => httpServer.close(resolve));
});
