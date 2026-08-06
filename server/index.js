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

function createRoom(roomID) {
  return {
    id: roomID,
    sequence: 0,
    clients: new Map(),
    clockTime: performance.now(),
    state: {
      transport: { playing: false, bpm: 118, beat: 0 },
      queue: [],
      loops: [],
      sample: null
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
    connectedAt: client.connectedAt
  }));
}

function sendSnapshot(room, socket = null) {
  const message = {
    version: PROTOCOL_VERSION,
    type: "snapshot",
    room: room.id,
    serverTime: Date.now(),
    sequence: room.sequence,
    state: room.state,
    clients: clientList(room)
  };

  if (socket) {
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
  const event = {
    version: PROTOCOL_VERSION,
    type: "event",
    room: room.id,
    eventType,
    sequence,
    eventID: typeof input.eventID === "string" ? input.eventID : crypto.randomUUID(),
    sender: client.id,
    role: client.role,
    serverTime: Date.now(),
    beat: typeof input.beat === "number" ? input.beat : null,
    payload
  };

  if (eventType === "transport" && typeof payload === "object") {
    room.state.transport = { ...room.state.transport, ...payload };
    room.clockTime = performance.now();
  }
  if (eventType === "queue") room.state.queue = Array.isArray(payload.items) ? payload.items : room.state.queue;
  if (eventType === "loops") room.state.loops = Array.isArray(payload.items) ? payload.items : room.state.loops;
  if (eventType === "sample") room.state.sample = payload;

  for (const peer of room.clients.values()) send(peer.socket, event);
  send(client.socket, {
    version: PROTOCOL_VERSION,
    type: "ack",
    requestID: input.requestID ?? null,
    eventID: event.eventID,
    sequence,
    serverTime: event.serverTime
  });
}

function broadcastClock() {
  const now = performance.now();
  for (const room of rooms.values()) {
    const elapsed = now - room.clockTime;
    room.clockTime = now;
    if (room.state.transport.playing) {
      room.state.transport.beat += (elapsed / 60_000) * room.state.transport.bpm;
    }
    if (room.clients.size > 0) {
      const message = {
        version: PROTOCOL_VERSION,
        type: "clock",
        room: room.id,
        serverTime: Date.now(),
        beat: room.state.transport.beat,
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
  } else if (message.type === "requestSnapshot") {
    sendSnapshot(room, client.socket);
    send(client.socket, { version: PROTOCOL_VERSION, type: "ack", requestID: message.requestID ?? null, acknowledged: "requestSnapshot", serverTime: Date.now() });
  } else if (message.type === "ping") {
    send(client.socket, { version: PROTOCOL_VERSION, type: "pong", clientTime: message.clientTime ?? null, serverTime: Date.now() });
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
  const client = { socket, id: null, name: null, role: null, room: null, connectedAt: Date.now() };
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

export { httpServer, rooms, heartbeat, clockTimer, runHeartbeat, broadcastClock };
