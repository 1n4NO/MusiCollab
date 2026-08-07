import http from "node:http";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { WebSocket, WebSocketServer } from "ws";
import os from "node:os";
import { PROTOCOL_VERSION, errorMessage, normalizeRoom, validateMessage } from "./protocol.js";

const PORT = Number(process.env.PORT || 8787);
const HOST = process.env.HOST || "0.0.0.0";
const serverDirectory = path.dirname(fileURLToPath(import.meta.url));
const composerPath = path.join(serverDirectory, "..", "web", "composer", "index.html");
const companionPath = path.join(serverDirectory, "..", "web", "companion", "index.html");
const companionManifestPath = path.join(serverDirectory, "..", "web", "companion", "manifest.webmanifest");
const companionServiceWorkerPath = path.join(serverDirectory, "..", "web", "companion", "sw.js");
const startedAt = Date.now();

const rooms = new Map();

const MIN_BPM = 60;
const MAX_BPM = 180;
const DEFAULT_LOOP_LENGTH_BEATS = 16;
const VALID_TEMPO_POLICIES = new Set(["preserve", "reset"]);

function transportSnapshot(transport) {
  return {
    playing: transport.playing,
    bpm: transport.bpm,
    beat: transport.beat,
    bar: Math.floor(transport.beat / 4) + 1,
    loopLengthBeats: transport.loopLengthBeats,
    loopPosition: transport.loopLengthBeats > 0 ? transport.beat % transport.loopLengthBeats : 0,
    tempoPolicy: transport.tempoPolicy ?? "preserve"
  };
}

function advanceTransport(room, now = performance.now()) {
  const elapsed = Math.max(0, now - room.clockTime);
  room.clockTime = now;
  if (!room.state.transport.playing) return;
  room.state.transport.beat += (elapsed / 60_000) * room.state.transport.bpm;
}

function normalizeTransport(room, payload) {
  const current = room.state.transport;
  const requestedAction = typeof payload.action === "string" ? payload.action.toLowerCase() : null;
  const action = requestedAction || (payload.playing === true ? "play" : payload.playing === false ? "pause" : null);
  const next = { ...current };

  if (action === "play") next.playing = true;
  if (action === "pause") next.playing = false;
  if (action === "stop") {
    next.playing = false;
    next.beat = 0;
  }
  if (action && !["play", "pause", "stop"].includes(action)) return { error: "action must be play, pause, or stop." };

  const tempoPolicy = payload.tempoPolicy ?? current.tempoPolicy ?? "preserve";
  if (!VALID_TEMPO_POLICIES.has(tempoPolicy)) return { error: "tempoPolicy must be preserve or reset." };
  const bpmChanged = payload.bpm !== undefined && Number(payload.bpm) !== current.bpm;
  if (payload.bpm !== undefined) {
    const bpm = Number(payload.bpm);
    if (!Number.isFinite(bpm) || bpm < MIN_BPM || bpm > MAX_BPM) return { error: `bpm must be between ${MIN_BPM} and ${MAX_BPM}.` };
    next.bpm = Math.round(bpm);
  }
  next.tempoPolicy = tempoPolicy;
  if (bpmChanged && tempoPolicy === "reset") next.beat = 0;
  if (payload.beat !== undefined) {
    const beat = Number(payload.beat);
    if (!Number.isFinite(beat) || beat < 0) return { error: "beat must be a non-negative number." };
    next.beat = beat;
  }
  if (payload.loopLengthBeats !== undefined) {
    const loopLengthBeats = Number(payload.loopLengthBeats);
    if (!Number.isFinite(loopLengthBeats) || loopLengthBeats <= 0) return { error: "loopLengthBeats must be positive." };
    next.loopLengthBeats = loopLengthBeats;
  }

  return { state: transportSnapshot(next) };
}

function eventTiming(room, input, serverTime) {
  const transport = room.state.transport;
  const quantization = input.quantization ?? "immediate";
  let targetBeat = input.targetBeat;
  if (targetBeat === undefined && quantization !== "immediate") {
    const quantum = quantization === "2bar" ? 8 : quantization === "bar" ? 4 : 1;
    targetBeat = Math.ceil((transport.beat + 0.001) / quantum) * quantum;
  }
  targetBeat ??= transport.beat;
  const targetBar = input.targetBar ?? Math.floor(targetBeat / 4) + 1;
  const targetServerTime = input.targetServerTime ?? serverTime + Math.max(0, targetBeat - transport.beat) * (60_000 / transport.bpm);
  return { targetServerTime, targetBeat, targetBar, quantization };
}

function createRoom(roomID) {
  return {
    id: roomID,
    sequence: 0,
    stateVersion: 0,
    clients: new Map(),
    clockTime: performance.now(),
    state: {
      transport: transportSnapshot({ playing: false, bpm: 118, beat: 0, loopLengthBeats: DEFAULT_LOOP_LENGTH_BEATS }),
      queue: [],
      loops: [],
      sample: null,
      pendingChanges: []
    }
  };
}

function getRoom(roomID) {
  if (!rooms.has(roomID)) rooms.set(roomID, createRoom(roomID));
  return rooms.get(roomID);
}

function send(socket, message) {
  if (socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify(message));
  }
}

function clientList(room) {
  return [...room.clients.values()].map((client) => ({
    id: client.id,
    name: client.name,
    role: client.role,
    connectedAt: client.connectedAt,
    metrics: client.metrics
  }));
}

function sendSnapshot(room, socket = null) {
  const message = {
    version: PROTOCOL_VERSION,
    type: "snapshot",
    room: room.id,
    serverTime: Date.now(),
    sequence: room.sequence,
    stateVersion: room.stateVersion,
    state: room.state,
    clients: clientList(room)
  };

  if (socket) {
    const target = [...room.clients.values()].find((client) => client.socket === socket);
    if (target) target.metrics.lastSnapshotAt = Date.now();
    send(socket, message);
  } else {
    for (const client of room.clients.values()) send(client.socket, message);
  }
}

function broadcastRoster(room) {
  const message = {
    version: PROTOCOL_VERSION,
    type: "roster",
    room: room.id,
    serverTime: Date.now(),
    clients: clientList(room)
  };
  for (const client of room.clients.values()) send(client.socket, message);
}

function applyEvent(room, client, input) {
  const eventType = typeof input.eventType === "string" ? input.eventType : "unknown";
  const payload = input.payload && typeof input.payload === "object" ? input.payload : {};
  const sequence = ++room.sequence;
  const eventTime = Date.now();
  const event = {
    version: PROTOCOL_VERSION,
    type: "event",
    room: room.id,
    eventType,
    sequence,
    eventID: typeof input.eventID === "string" ? input.eventID : crypto.randomUUID(),
    sender: client.id,
    role: client.role,
    serverTime: eventTime,
    beat: typeof input.beat === "number" ? input.beat : null,
    payload,
    timing: eventTiming(room, input, eventTime)
  };

  if (eventType === "transport" && typeof payload === "object") {
    advanceTransport(room);
    const normalized = normalizeTransport(room, payload);
    if (normalized.error) {
      send(client.socket, errorMessage("INVALID_TRANSPORT", normalized.error, input.requestID ?? null));
      return;
    }
    room.state.transport = normalized.state;
    event.payload = normalized.state;
    room.clockTime = performance.now();
  }
  const isDeferred = ["queue", "scene"].includes(eventType) && event.timing.quantization !== "immediate";
  if (isDeferred) {
    const pending = { eventID: event.eventID, eventType, payload, timing: event.timing, sender: client.id };
    room.state.pendingChanges.push(pending);
    room.stateVersion += 1;
    event.stateVersion = room.stateVersion;
    event.pending = true;
    for (const peer of room.clients.values()) send(peer.socket, event);
    send(client.socket, { version: PROTOCOL_VERSION, type: "ack", requestID: input.requestID ?? null, eventID: event.eventID, sequence, stateVersion: room.stateVersion, pending: true, serverTime: event.serverTime });
    return;
  }
  if (eventType === "queue") room.state.queue = Array.isArray(payload.items) ? payload.items : room.state.queue;
  if (eventType === "scene") room.state.scene = payload;
  if (eventType === "loops") room.state.loops = Array.isArray(payload.items) ? payload.items : room.state.loops;
  if (eventType === "sample") room.state.sample = payload;

  room.stateVersion += 1;
  event.stateVersion = room.stateVersion;

  for (const peer of room.clients.values()) send(peer.socket, event);
  send(client.socket, {
    version: PROTOCOL_VERSION,
    type: "ack",
    requestID: input.requestID ?? null,
    eventID: event.eventID,
    sequence,
    stateVersion: room.stateVersion,
    serverTime: event.serverTime
  });
}

function applyPendingChanges(room, now = Date.now()) {
  if (!room.state.pendingChanges.length) return;
  const currentBeat = room.state.transport.beat;
  const ready = room.state.pendingChanges.filter((change) => now >= change.timing.targetServerTime || currentBeat >= change.timing.targetBeat);
  if (!ready.length) return;
  room.state.pendingChanges = room.state.pendingChanges.filter((change) => !ready.includes(change));
  for (const change of ready) {
    if (change.eventType === "queue" && Array.isArray(change.payload.items)) room.state.queue = change.payload.items;
    if (change.eventType === "scene") room.state.scene = change.payload;
    room.stateVersion += 1;
    const message = { version: PROTOCOL_VERSION, type: "stateChange", room: room.id, eventType: change.eventType, eventID: change.eventID, stateVersion: room.stateVersion, applied: true, payload: change.payload, timing: change.timing, serverTime: now };
    for (const client of room.clients.values()) send(client.socket, message);
  }
}

function broadcastClock() {
  const now = performance.now();
  for (const room of rooms.values()) {
    advanceTransport(room, now);
    room.state.transport = transportSnapshot(room.state.transport);
    applyPendingChanges(room);
    if (room.clients.size > 0) {
      const message = {
        version: PROTOCOL_VERSION,
        type: "clock",
        room: room.id,
        serverTime: Date.now(),
          beat: room.state.transport.beat,
          bar: room.state.transport.bar,
          loopPosition: room.state.transport.loopPosition,
          loopLengthBeats: room.state.transport.loopLengthBeats,
        bpm: room.state.transport.bpm,
        playing: room.state.transport.playing
      };
      for (const client of room.clients.values()) send(client.socket, message);
    }
  }
}

function removeClient(client) {
  if (!client.room) return;
  const room = rooms.get(client.room);
  if (!room) return;
  room.clients.delete(client.id);
  broadcastRoster(room);
  if (room.clients.size === 0) rooms.delete(room.id);
}

function handleMessage(client, message) {
  const validation = validateMessage(message);
  if (!validation.ok) {
    send(client.socket, errorMessage(validation.code, validation.message, message?.requestID ?? null));
    return;
  }

  if (message.type === "hello") {
    const roomID = normalizeRoom(message.room);
    const role = message.role;
    client.id = message.clientID;
    client.name = message.name.trim();
    client.role = role;
    client.room = roomID;

    const room = getRoom(roomID);
    if (room.clients.has(client.id)) {
      send(client.socket, errorMessage("CLIENT_ID_IN_USE", "Another client is already using this clientID."));
      return;
    }
    room.clients.set(client.id, client);
    send(client.socket, {
      version: PROTOCOL_VERSION,
      type: "welcome",
      room: roomID,
      clientID: client.id,
      role: client.role,
      serverTime: Date.now(),
      protocolVersion: PROTOCOL_VERSION
    });
    send(client.socket, { version: PROTOCOL_VERSION, type: "ack", requestID: message.requestID ?? null, acknowledged: "hello", serverTime: Date.now() });
    sendSnapshot(room, client.socket);
    broadcastRoster(room);
    return;
  }

  if (!client.room) {
    send(client.socket, errorMessage("HELLO_REQUIRED", "Send hello before other messages.", message.requestID ?? null));
    return;
  }

  const room = rooms.get(client.room);
  if (!room) return;

  if (message.type === "event") {
    applyEvent(room, client, message);
  } else if (message.type === "metrics") {
    client.metrics = {
      offsetMs: Math.round(message.offsetMs),
      rttMs: Math.round(Math.max(0, message.rttMs)),
      jitterMs: Math.round(Math.max(0, message.jitterMs)),
      lastSnapshotAt: Number.isFinite(message.lastSnapshotAt) ? message.lastSnapshotAt : client.metrics.lastSnapshotAt
    };
    broadcastRoster(room);
  } else if (message.type === "requestSnapshot") {
    sendSnapshot(room, client.socket);
    send(client.socket, { version: PROTOCOL_VERSION, type: "ack", requestID: message.requestID ?? null, acknowledged: "requestSnapshot", serverTime: Date.now() });
  } else if (message.type === "ping") {
    const serverReceiveTime = Date.now();
    send(client.socket, {
      version: PROTOCOL_VERSION,
      type: "pong",
      clientTime: message.clientTime ?? null,
      serverReceiveTime,
      serverTime: Date.now()
    });
  }
}

function lanAddress() {
  const interfaces = os.networkInterfaces();
  for (const entries of Object.values(interfaces)) {
    for (const entry of entries ?? []) {
      if (entry.family === "IPv4" && !entry.internal) return entry.address;
    }
  }
  return null;
}

const httpServer = http.createServer((request, response) => {
  const requestPath = new URL(request.url, "http://localhost").pathname;
  if (requestPath === "/composer" || requestPath === "/composer/") {
    const body = fs.readFileSync(composerPath);
    response.writeHead(200, { "content-type": "text/html; charset=utf-8", "content-length": body.length });
    response.end(body);
    return;
  }
  if (requestPath === "/companion" || requestPath === "/companion/") {
    const body = fs.readFileSync(companionPath);
    response.writeHead(200, { "content-type": "text/html; charset=utf-8", "content-length": body.length });
    response.end(body);
    return;
  }
  if (requestPath === "/companion/manifest.webmanifest") {
    const body = fs.readFileSync(companionManifestPath);
    response.writeHead(200, { "content-type": "application/manifest+json; charset=utf-8", "cache-control": "no-cache" });
    response.end(body);
    return;
  }
  if (requestPath === "/companion/sw.js") {
    const body = fs.readFileSync(companionServiceWorkerPath);
    response.writeHead(200, { "content-type": "application/javascript; charset=utf-8", "cache-control": "no-cache", "service-worker-allowed": "/companion/" });
    response.end(body);
    return;
  }
  if (requestPath === "/health") {
    const body = JSON.stringify({ ok: true, rooms: rooms.size, clients: [...rooms.values()].reduce((total, room) => total + room.clients.size, 0), uptimeSeconds: Math.floor((Date.now() - startedAt) / 1000), protocolVersion: PROTOCOL_VERSION });
    response.writeHead(200, { "content-type": "application/json", "content-length": Buffer.byteLength(body) });
    response.end(body);
    return;
  }
  if (requestPath === "/info") {
    const address = lanAddress();
    const body = JSON.stringify({ protocolVersion: PROTOCOL_VERSION, room: "LOCAL", lanAddress: address, composerURL: address ? `http://${address}:${PORT}/composer` : null, websocketURL: address ? `ws://${address}:${PORT}/ws` : null });
    response.writeHead(200, { "content-type": "application/json", "content-length": Buffer.byteLength(body) });
    response.end(body);
    return;
  }
  response.writeHead(404, { "content-type": "text/plain" });
  response.end("MusiCollab session server\n");
});

const websocketServer = new WebSocketServer({ server: httpServer, path: "/ws" });

websocketServer.on("connection", (socket) => {
  const client = { socket, id: null, name: null, role: null, room: null, connectedAt: Date.now(), metrics: { offsetMs: null, rttMs: null, jitterMs: null, lastSnapshotAt: null } };
  socket.missedHeartbeats = 0;
  socket.on("pong", () => { socket.missedHeartbeats = 0; });
  socket.on("message", (raw) => {
    try {
      handleMessage(client, JSON.parse(raw.toString()));
    } catch {
      send(socket, errorMessage("INVALID_JSON", "Message must be valid JSON."));
    }
  });
  socket.on("close", () => removeClient(client));
  socket.on("error", () => removeClient(client));
});

function runHeartbeat(clients) {
  for (const client of clients) {
    if (client.missedHeartbeats >= 2) {
      client.terminate();
      continue;
    }
    client.missedHeartbeats += 1;
    client.ping();
  }
}

const heartbeat = setInterval(() => runHeartbeat(websocketServer.clients), 20_000);
const clockTimer = setInterval(broadcastClock, 100);

httpServer.listen(PORT, HOST, () => {
  console.log(`MusiCollab session server listening on http://127.0.0.1:${PORT}`);
  console.log(`WebSocket endpoint: ws://127.0.0.1:${PORT}/ws`);
});

function shutdown() {
  clearInterval(heartbeat);
  clearInterval(clockTimer);
  websocketServer.close();
  httpServer.close(() => process.exit(0));
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

export { httpServer, rooms, heartbeat, clockTimer, runHeartbeat, broadcastClock, applyPendingChanges };
