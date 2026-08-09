import assert from "node:assert/strict";
import test from "node:test";
import WebSocket from "ws";
import { clockTimer, heartbeat, httpServer } from "../index.js";

const port = await new Promise((resolve) => {
  if (httpServer.address()) return resolve(httpServer.address().port);
  httpServer.once("listening", () => resolve(httpServer.address().port));
});

test.after(() => {
  clearInterval(clockTimer);
  clearInterval(heartbeat);
  httpServer.close();
});

function connect(clientID, room, sessionToken = null, targetPort = port) {
  return new Promise((resolve, reject) => {
    const socket = new WebSocket(`ws://127.0.0.1:${targetPort}/ws`);
    const messages = [];
    let settled = false;
    const finish = (value) => { if (!settled) { settled = true; resolve(value); } };
    socket.on("message", (raw) => {
      const message = JSON.parse(raw.toString());
      messages.push(message);
      if (message.type === "welcome") finish({ socket, messages, welcome: message });
    });
    socket.on("error", (error) => { socket.close(); if (!settled) reject(error); });
    socket.on("open", () => socket.send(JSON.stringify({ type: "hello", room, clientID, name: clientID, role: "composer", ...(sessionToken ? { sessionToken } : {}) })));
  });
}

function waitFor(socket, messages, type, timeoutMs = 1000) {
  const existing = messages.find((message) => message.type === type);
  if (existing) return Promise.resolve(existing);
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => { socket.off("message", onMessage); reject(new Error(`Timed out waiting for ${type}`)); }, timeoutMs);
    const onMessage = (raw) => {
      const message = JSON.parse(raw.toString());
      messages.push(message);
      if (message.type === type) { clearTimeout(timer); socket.off("message", onMessage); resolve(message); }
    };
    socket.on("message", onMessage);
  });
}

test("brief Wi-Fi loss resumes the session without refresh", async () => {
  const first = await connect("wifi-brief", "INTERRUPTION_BRIEF");
  const token = first.welcome.sessionToken;
  const peer = await connect("wifi-brief-peer", "INTERRUPTION_BRIEF");
  await waitFor(first.socket, first.messages, "snapshot");
  first.socket.close();
  await new Promise((resolve) => setTimeout(resolve, 20));
  const resumed = await connect("wifi-brief-reconnected", "INTERRUPTION_BRIEF", token);
  const snapshot = await waitFor(resumed.socket, resumed.messages, "snapshot");
  assert.equal(resumed.welcome.sessionResumed, true);
  assert.equal(snapshot.room, "INTERRUPTION_BRIEF");
  peer.socket.close();
  resumed.socket.close();
});

test("network switch and router isolation recover when the LAN path returns", async () => {
  const first = await connect("wifi-switch", "INTERRUPTION_SWITCH");
  const token = first.welcome.sessionToken;
  const peer = await connect("wifi-switch-peer", "INTERRUPTION_SWITCH");
  first.socket.close();
  await assert.rejects(connect("wifi-isolated", "INTERRUPTION_SWITCH", token, port + 1000));
  const recovered = await connect("wifi-new-address", "INTERRUPTION_SWITCH", token);
  assert.equal(recovered.welcome.sessionResumed, true);
  peer.socket.close();
  recovered.socket.close();
});

test("Mac sleep/server pause and port changes produce a failed path then recover on the configured port", async () => {
  await assert.rejects(connect("server-paused", "INTERRUPTION_PORT", null, port + 1001));
  const recovered = await connect("server-returned", "INTERRUPTION_PORT");
  const snapshot = await waitFor(recovered.socket, recovered.messages, "snapshot");
  assert.equal(snapshot.sequence, 0);
  recovered.socket.close();
});
