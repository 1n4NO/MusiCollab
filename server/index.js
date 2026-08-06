import http from "node:http";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { WebSocket, WebSocketServer } from "ws";

const PORT = Number(process.env.PORT || 8787);
const HOST = process.env.HOST || "0.0.0.0";
const PROTOCOL_VERSION = 1;
const VALID_ROLES = new Set(["composer", "performer", "companion"]);
const serverDirectory = path.dirname(fileURLToPath(import.meta.url));
const composerPath = path.join(serverDirectory, "..", "web", "composer", "index.html");

const rooms = new Map();

function createRoom(roomID) {
  return {
    id: roomID,
    sequence: 0,
    clients: new Map(),
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
  }
  if (eventType === "queue") room.state.queue = Array.isArray(payload.items) ? payload.items : room.state.queue;
  if (eventType === "loops") room.state.loops = Array.isArray(payload.items) ? payload.items : room.state.loops;
  if (eventType === "sample") room.state.sample = payload;

  for (const peer of room.clients.values()) send(peer.socket, event);
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
  if (!message || typeof message !== "object") return;

  if (message.type === "hello") {
    const role = VALID_ROLES.has(message.role) ? message.role : "companion";
    const roomID = typeof message.room === "string" && message.room.trim() ? message.room.trim().toUpperCase() : "LOCAL";
    client.id = typeof message.clientID === "string" && message.clientID.trim() ? message.clientID : crypto.randomUUID();
    client.name = typeof message.name === "string" && message.name.trim() ? message.name : client.id;
    client.role = role;
    client.room = roomID;

    const room = getRoom(roomID);
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
    sendSnapshot(room, client.socket);
    broadcastRoster(room);
    return;
  }

  if (!client.room) {
    send(client.socket, { version: PROTOCOL_VERSION, type: "error", code: "HELLO_REQUIRED", message: "Send hello before other messages." });
    return;
  }

  const room = rooms.get(client.room);
  if (!room) return;

  if (message.type === "event") {
    applyEvent(room, client, message);
  } else if (message.type === "requestSnapshot") {
    sendSnapshot(room, client.socket);
  } else if (message.type === "ping") {
    send(client.socket, { version: PROTOCOL_VERSION, type: "pong", clientTime: message.clientTime ?? null, serverTime: Date.now() });
  }
}

const httpServer = http.createServer((request, response) => {
  if (request.url === "/composer" || request.url === "/composer/") {
    const body = fs.readFileSync(composerPath);
    response.writeHead(200, { "content-type": "text/html; charset=utf-8", "content-length": body.length });
    response.end(body);
    return;
  }
  if (request.url === "/health") {
    const body = JSON.stringify({ ok: true, rooms: rooms.size, clients: [...rooms.values()].reduce((total, room) => total + room.clients.size, 0) });
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
      send(socket, { version: PROTOCOL_VERSION, type: "error", code: "INVALID_JSON", message: "Message must be valid JSON." });
    }
  });
  socket.on("close", () => removeClient(client));
  socket.on("error", () => removeClient(client));
});

const heartbeat = setInterval(() => {
  for (const client of websocketServer.clients) {
    if (client.missedHeartbeats >= 2) {
      client.terminate();
      continue;
    }
    client.missedHeartbeats += 1;
    client.ping();
  }
}, 20_000);

httpServer.listen(PORT, HOST, () => {
  console.log(`MusiCollab session server listening on http://127.0.0.1:${PORT}`);
  console.log(`WebSocket endpoint: ws://127.0.0.1:${PORT}/ws`);
});

function shutdown() {
  clearInterval(heartbeat);
  websocketServer.close();
  httpServer.close(() => process.exit(0));
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

export { httpServer, rooms, heartbeat };
