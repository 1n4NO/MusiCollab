import assert from "node:assert/strict";
import test from "node:test";
import WebSocket from "ws";
import { clockTimer, heartbeat, httpServer } from "../index.js";

const durationSeconds = Math.max(1, Number(process.env.SOAK_DURATION_SECONDS || 10));
const port = await new Promise((resolve) => {
  if (httpServer.address()) return resolve(httpServer.address().port);
  httpServer.once("listening", () => resolve(httpServer.address().port));
});

function connect(clientID) {
  return new Promise((resolve, reject) => {
    const socket = new WebSocket(`ws://127.0.0.1:${port}/ws`);
    let welcomed = false;
    socket.on("open", () => socket.send(JSON.stringify({ type: "hello", room: "SOAK_TEST", clientID, name: clientID, role: clientID === "composer" ? "composer" : "performer" })));
    socket.on("message", (raw) => {
      const message = JSON.parse(raw.toString());
      if (message.type === "welcome" && !welcomed) { welcomed = true; resolve(socket); }
    });
    socket.on("error", reject);
  });
}

test(`two-client soak remains stable for ${durationSeconds}s`, async () => {
  const clients = await Promise.all([connect("composer"), connect("performer")]);
  let receivedEvents = 0;
  let disconnects = 0;
  const listeners = clients.map((socket) => {
    const onMessage = (raw) => { if (JSON.parse(raw.toString()).type === "event") receivedEvents += 1; };
    const onClose = () => { disconnects += 1; };
    socket.on("message", onMessage);
    socket.on("close", onClose);
    return { onMessage, onClose };
  });
  const samples = [];
  const startedAt = Date.now();
  const startCPU = process.cpuUsage();
  let lastTick = performance.now();
  let maxEventLoopLag = 0;
  const sampler = setInterval(() => {
    const now = performance.now();
    maxEventLoopLag = Math.max(maxEventLoopLag, Math.max(0, now - lastTick - 1000));
    lastTick = now;
    samples.push({ atMs: Date.now() - startedAt, rssBytes: process.memoryUsage().rss });
  }, 1000);
  const eventLoop = setInterval(() => {
    const payload = { type: "event", eventType: "padHit", eventID: `${Date.now()}-${Math.random()}`, payload: { pad: Math.floor(Math.random() * 8), velocity: 0.8 } };
    clients[0].send(JSON.stringify(payload));
  }, 100);
  await new Promise((resolve) => setTimeout(resolve, durationSeconds * 1000));
  clearInterval(eventLoop);
  clearInterval(sampler);
  clients.forEach((socket, index) => { socket.off("message", listeners[index].onMessage); socket.off("close", listeners[index].onClose); socket.close(); });
  const cpu = process.cpuUsage(startCPU);
  const rssValues = samples.map((sample) => sample.rssBytes);
  const initialRSS = rssValues[0] || process.memoryUsage().rss;
  const peakRSS = Math.max(...rssValues, process.memoryUsage().rss);
  const growth = peakRSS - initialRSS;
  const cpuPercent = ((cpu.user + cpu.system) / 1000) / Math.max(1, Date.now() - startedAt) * 100;
  console.log(`SOAK duration=${durationSeconds}s events=${receivedEvents} peakRSS=${Math.round(peakRSS / 1048576)}MB growth=${Math.round(growth / 1048576)}MB cpu=${cpuPercent.toFixed(1)}% maxEventLoopLag=${Math.round(maxEventLoopLag)}ms`);
  assert.equal(disconnects, 0);
  assert.ok(receivedEvents >= durationSeconds * 5, "event throughput dropped below the soak floor");
  assert.ok(peakRSS < 512 * 1048576, "server RSS exceeded 512 MB");
  assert.ok(growth < 128 * 1048576, "server RSS grew by more than 128 MB during the soak");
  assert.ok(maxEventLoopLag < 1000, "event loop stalled for more than 1 second");
});

test.after(() => {
  clearInterval(clockTimer);
  clearInterval(heartbeat);
  httpServer.close();
});
