import assert from "node:assert/strict";
import test from "node:test";
import WebSocket from "ws";
import { clockTimer, heartbeat, httpServer } from "../index.js";

const port = await new Promise((resolve) => {
  if (httpServer.address()) return resolve(httpServer.address().port);
  httpServer.once("listening", () => resolve(httpServer.address().port));
});

function connect(clientID, role, room = "SMOKE_TEST", sessionToken = null) {
  return new Promise((resolve, reject) => {
    const socket = new WebSocket(`ws://127.0.0.1:${port}/ws`);
    const messages = [];
    let settled = false;
    socket.on("open", () => socket.send(JSON.stringify({ type: "hello", room, clientID, name: clientID, role, ...(sessionToken ? { sessionToken } : {}) })));
    socket.on("message", (raw) => {
      const message = JSON.parse(raw.toString());
      messages.push(message);
      if (message.type === "welcome" && !settled) { settled = true; resolve({ socket, messages, welcome: message }); }
    });
    socket.on("error", (error) => { socket.terminate(); if (!settled) reject(error); });
  });
}

function waitFor(socket, messages, predicate) {
  const existing = messages.find(predicate);
  if (existing) return Promise.resolve(existing);
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => { socket.off("message", onMessage); reject(new Error("Timed out waiting for smoke-test message")); }, 1500);
    const onMessage = (raw) => {
      const message = JSON.parse(raw.toString());
      messages.push(message);
      if (predicate(message)) { clearTimeout(timer); socket.off("message", onMessage); resolve(message); }
    };
    socket.on("message", onMessage);
  });
}

test("Mac and iPhone 14 complete a smoke session and recover", async () => {
  const composer = await connect("mac-composer", "composer");
  const performer = await connect("iphone14", "performer");
  const roster = await waitFor(composer.socket, composer.messages, (message) => (message.type === "snapshot" || message.type === "roster") && message.clients.some((client) => client.role === "performer"));
  assert.deepEqual(new Set(roster.clients.map((client) => client.role)), new Set(["composer", "performer"]));

  const eventID = "smoke-pad-event";
  composer.socket.send(JSON.stringify({ type: "event", eventType: "padHit", eventID, requestID: "smoke-pad-request", payload: { pad: 0, velocity: 0.8 } }));
  const event = await waitFor(performer.socket, performer.messages, (message) => message.type === "event" && message.eventID === eventID);
  assert.equal(event.sender, "mac-composer");
  assert.equal(event.eventType, "padHit");

  const token = composer.welcome.sessionToken;
  composer.socket.close();
  await new Promise((resolve) => setTimeout(resolve, 20));
  const resumedComposer = await connect("mac-composer-reconnected", "composer", "SMOKE_TEST", token);
  const resumedSnapshot = await waitFor(resumedComposer.socket, resumedComposer.messages, (message) => message.type === "snapshot");
  assert.equal(resumedComposer.welcome.sessionResumed, true);
  assert.equal(resumedSnapshot.clients.filter((client) => client.role === "composer").length, 1);

  performer.socket.close();
  resumedComposer.socket.close();
});

test.after(() => {
  clearInterval(clockTimer);
  clearInterval(heartbeat);
  httpServer.close();
});
