import http from "node:http";
import https from "node:https";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { WebSocket, WebSocketServer } from "ws";
import os from "node:os";
import { PROTOCOL_VERSION, errorMessage, normalizeRoom, validateMessage } from "./protocol.js";
import { ASSET_MODEL_VERSION, normalizeAsset, normalizeLibraryAction, normalizeLoopSelection, normalizeSceneAction, normalizeSliceMap } from "./assets.js";
import { createDemoLibrary } from "./demo-content.js";
import { normalizeInstrumentParameter, normalizeInstrumentSelection } from "./instruments.js";

const PORT = Number(process.env.PORT || 8787);
const HOST = process.env.HOST || "0.0.0.0";
const TLS_KEY_PATH = process.env.MUSICOLLAB_TLS_KEY || "";
const TLS_CERT_PATH = process.env.MUSICOLLAB_TLS_CERT || "";
const TLS_ENABLED = Boolean(TLS_KEY_PATH || TLS_CERT_PATH);
if (TLS_ENABLED && (!TLS_KEY_PATH || !TLS_CERT_PATH)) {
  throw new Error("MUSICOLLAB_TLS_KEY and MUSICOLLAB_TLS_CERT must be provided together.");
}
const APP_VERSION = "0.1.0";
const serverDirectory = path.dirname(fileURLToPath(import.meta.url));
const composerPath = path.join(serverDirectory, "..", "web", "composer", "index.html");
const zustandVanillaPath = path.join(serverDirectory, "node_modules", "zustand", "esm", "vanilla.mjs");
const brandingDirectory = path.join(serverDirectory, "..", "branding");
const samplesDirectory = path.join(serverDirectory, "samples");
const MAX_SAMPLE_UPLOAD_BYTES = 100 * 1024 * 1024;
fs.mkdirSync(samplesDirectory, { recursive: true });
const startedAt = Date.now();
const serverInstanceID = crypto.randomBytes(12).toString("hex");

const rooms = new Map();

function sampleFileName(originalName = "sample.audio") {
  const extension = path.extname(String(originalName)).toLowerCase().replace(/[^a-z0-9.]/g, "").slice(0, 8) || ".audio";
  return `${Date.now()}-${crypto.randomUUID()}${extension}`;
}

function jsonResponse(response, status, value) {
  const body = JSON.stringify(value);
  response.writeHead(status, { "content-type": "application/json", "content-length": Buffer.byteLength(body) });
  response.end(body);
}

const MIN_BPM = 60;
const MAX_BPM = 180;
const DEFAULT_LOOP_LENGTH_BEATS = 16;
const VALID_TEMPO_POLICIES = new Set(["preserve", "reset"]);
const LATE_EVENT_GRACE_MS = 100;
const LATE_BEAT_GRACE = 0.25;

function normalizeTrackControl(payload, currentTracks) {
  const trackID = typeof payload.trackID === "string" && /^[A-Za-z0-9._:-]{1,80}$/.test(payload.trackID) ? payload.trackID : null;
  if (!trackID) return { error: "trackControl.trackID is required." };
  const current = currentTracks[trackID] || { trackID, name: trackID, volume: 1, mute: false, solo: false, arm: false, instrumentID: "drums" };
  const next = { ...current, trackID };
  if (payload.volume !== undefined) {
    const volume = Number(payload.volume);
    if (!Number.isFinite(volume)) return { error: "trackControl.volume must be a number." };
    next.volume = Math.max(0, Math.min(1, volume));
  }
  for (const key of ["mute", "solo", "arm"]) {
    if (payload[key] !== undefined) {
      if (typeof payload[key] !== "boolean") return { error: `trackControl.${key} must be boolean.` };
      next[key] = payload[key];
    }
  }
  if (payload.instrumentID !== undefined) {
    if (typeof payload.instrumentID !== "string" || !/^[A-Za-z0-9._:-]{1,80}$/.test(payload.instrumentID)) return { error: "trackControl.instrumentID is invalid." };
    next.instrumentID = payload.instrumentID;
  }
  return { value: next };
}

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

function lateEventPolicy(room, eventType, input, serverTime) {
  const lateByTime = Number.isFinite(input.targetServerTime) && input.targetServerTime < serverTime - LATE_EVENT_GRACE_MS;
  const lateByBeat = Number.isFinite(input.targetBeat) && input.targetBeat < room.state.transport.beat - LATE_BEAT_GRACE;
  if (!lateByTime && !lateByBeat) return null;
  if (eventType === "padHit") return { late: true, policy: "apply-immediately" };
  return { error: `${eventType} target is late; resend against the latest snapshot or omit the stale target.` };
}

function createRoom(roomID) {
  const library = createDemoLibrary();
  return {
    id: roomID,
    sequence: 0,
    stateVersion: 0,
    clients: new Map(),
    sessions: new Map(),
    eventHistory: new Map(),
    clockTime: performance.now(),
    state: {
      transport: transportSnapshot({ playing: false, bpm: 118, beat: 0, loopLengthBeats: DEFAULT_LOOP_LENGTH_BEATS }),
      queue: [],
      loops: [],
      instrument: { instrumentID: "drums", instrument: "drums", name: "Drums", family: "percussion", engine: "abstract", parameters: { voiceCount: 8, character: 0.35 }, pitch: 0 },
      tracks: { drums: { trackID: "drums", name: "Drum Kit", volume: 1, mute: false, solo: false, arm: true, instrumentID: "drums" } },
      sample: null,
      scene: { sceneID: "demo-scene-default" },
      sceneOrder: library.scenes.map((scene) => scene.id),
      sliceMappings: [],
      pendingChanges: [],
      library
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
    serverInstanceID,
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

function storeAsset(room, asset) {
  const collection = room.state.library[`${asset.type}s`];
  if (!Array.isArray(collection)) return;
  const index = collection.findIndex((existing) => existing.id === asset.id);
  if (index >= 0) collection[index] = asset;
  else collection.push(asset);
}

function applySceneAction(room, action) {
  const scenes = room.state.library.scenes;
  if (action.action === "recall") {
    room.state.scene = { sceneID: action.sceneID };
    return;
  }
  if (action.action === "rename") {
    const scene = scenes.find((item) => item.id === action.sceneID);
    if (scene) scene.name = action.name;
    return;
  }
  if (action.action === "reorder") {
    room.state.sceneOrder = [...action.order];
    return;
  }
  const index = scenes.findIndex((item) => item.id === action.scene.id);
  if (index >= 0) scenes[index] = action.scene;
  else {
    scenes.push(action.scene);
    room.state.sceneOrder.push(action.scene.id);
  }
  room.state.scene = { sceneID: action.scene.id };
}

function applyLibraryAction(room, action) {
  const collections = ["tracks", "instruments", "loops", "samples", "scenes", "slices"];
  const asset = collections.flatMap((collection) => room.state.library[collection] || []).find((item) => item.id === action.assetID);
  if (!asset) return;
  if (action.action === "delete") {
    const collection = `${asset.type}s`;
    room.state.library[collection] = (room.state.library[collection] || []).filter((item) => item.id !== action.assetID);
    return;
  }
  if (action.action === "favorite") asset.favorite = action.favorite;
  if (action.action === "tags") asset.tags = action.tags;
  if (action.action === "missing" || action.action === "recover") asset.missing = action.missing;
}

function applyEvent(room, client, input) {
  const eventType = typeof input.eventType === "string" ? input.eventType : "unknown";
  const payload = input.payload && typeof input.payload === "object" ? input.payload : {};
  const eventID = typeof input.eventID === "string" ? input.eventID : null;
  if (eventID && room.eventHistory.has(eventID)) {
    const previous = room.eventHistory.get(eventID);
    send(client.socket, { version: PROTOCOL_VERSION, type: "ack", requestID: input.requestID ?? null, eventID, sequence: previous.sequence, stateVersion: previous.stateVersion, pending: previous.pending, duplicate: true, serverTime: previous.serverTime });
    return;
  }
  const eventTime = Date.now();
  const latePolicy = lateEventPolicy(room, eventType, input, eventTime);
  if (latePolicy?.error) {
    send(client.socket, errorMessage("LATE_EVENT", latePolicy.error, input.requestID ?? null));
    return;
  }
  const sequence = ++room.sequence;
  const event = {
    version: PROTOCOL_VERSION,
    type: "event",
    room: room.id,
    eventType,
    sequence,
    eventID: eventID || crypto.randomUUID(),
    sender: client.id,
    role: client.role,
    serverTime: eventTime,
    beat: typeof input.beat === "number" ? input.beat : null,
    payload,
    timing: eventTiming(room, input, eventTime)
  };
  if (Number.isFinite(input.clientSentAt)) {
    event.latency = { clientToServerMs: Math.max(0, Math.round(eventTime - input.clientSentAt)) };
  }
  if (latePolicy?.late) Object.assign(event.timing, latePolicy);

  let normalizedAsset;
  if (eventType === "asset" || eventType === "sample") {
    const source = eventType === "asset" ? payload.asset : { ...payload, type: "sample", id: payload.id || crypto.randomUUID() };
    const result = normalizeAsset(source);
    if (result.error) {
      send(client.socket, errorMessage("INVALID_ASSET", result.error, input.requestID ?? null));
      return;
    }
    normalizedAsset = result.asset;
    storeAsset(room, normalizedAsset);
    event.payload = eventType === "asset" ? { asset: normalizedAsset } : normalizedAsset;
  }

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
  if (eventType === "sliceMap") {
    const result = normalizeSliceMap(payload);
    if (result.error) {
      send(client.socket, errorMessage("INVALID_SLICE_MAP", result.error, input.requestID ?? null));
      return;
    }
    const sample = room.state.library.samples.find((asset) => asset.id === result.value.sampleID);
    if (!sample) {
      send(client.socket, errorMessage("INVALID_SLICE_MAP", "sliceMap.sampleID does not exist in the room library.", input.requestID ?? null));
      return;
    }
    const sliceIDs = new Set((sample.slices || []).map((slice) => slice.id));
    if (Object.values(result.value.assignments).some((sliceID) => sliceID !== null && !sliceIDs.has(sliceID))) {
      send(client.socket, errorMessage("INVALID_SLICE_MAP", "sliceMap assignments must reference slices from the selected sample.", input.requestID ?? null));
      return;
    }
    event.payload = result.value;
    const index = room.state.sliceMappings.findIndex((mapping) => mapping.sampleID === result.value.sampleID && mapping.sceneID === result.value.sceneID);
    if (index >= 0) room.state.sliceMappings[index] = result.value;
    else room.state.sliceMappings.push(result.value);
  }
  if (eventType === "loops") {
    const result = normalizeLoopSelection(payload, room.state.library);
    if (result.error) {
      send(client.socket, errorMessage("INVALID_LOOPS", result.error, input.requestID ?? null));
      return;
    }
    const bpm = room.state.transport.bpm;
    event.payload = { ...result.value, loopLengthBeats: result.value.items[0] ? result.value.items[0].bars * 4 : DEFAULT_LOOP_LENGTH_BEATS, playbackRates: Object.fromEntries(result.value.items.map((loop) => [loop.id, Number((bpm / loop.bpm).toFixed(6))])) };
    room.state.transport.loopLengthBeats = event.payload.loopLengthBeats;
  }
  if (eventType === "instrument") {
    const result = normalizeInstrumentSelection(payload, room.state.library);
    if (result.error) {
      send(client.socket, errorMessage("INVALID_INSTRUMENT", result.error, input.requestID ?? null));
      return;
    }
    event.payload = result.value;
    room.state.instrument = result.value;
  }
  if (eventType === "instrumentParam") {
    const result = normalizeInstrumentParameter(payload, room.state.library, room.state.instrument);
    if (result.error) {
      send(client.socket, errorMessage("INVALID_INSTRUMENT_PARAMETER", result.error, input.requestID ?? null));
      return;
    }
    event.payload = { ...result.value, targetBeat: event.timing.targetBeat };
    room.state.instrument = { ...room.state.instrument, parameters: result.value.parameters };
  }
  if (eventType === "trackControl") {
    const result = normalizeTrackControl(payload, room.state.tracks);
    if (result.error) {
      send(client.socket, errorMessage("INVALID_TRACK_CONTROL", result.error, input.requestID ?? null));
      return;
    }
    event.payload = result.value;
    room.state.tracks[result.value.trackID] = result.value;
  }
  if (eventType === "scene") {
    const result = normalizeSceneAction(payload, room.state.library);
    if (result.error) {
      send(client.socket, errorMessage("INVALID_SCENE", result.error, input.requestID ?? null));
      return;
    }
    event.payload = result.value;
    applySceneAction(room, result.value);
  }
  if (eventType === "library") {
    const result = normalizeLibraryAction(payload, room.state.library);
    if (result.error) {
      send(client.socket, errorMessage("INVALID_LIBRARY", result.error, input.requestID ?? null));
      return;
    }
    event.payload = result.value;
    applyLibraryAction(room, result.value);
  }
  const isDeferred = ["queue"].includes(eventType) && event.timing.quantization !== "immediate";
  if (isDeferred) {
    const pending = { eventID: event.eventID, eventType, payload, timing: event.timing, sender: client.id };
    room.state.pendingChanges.push(pending);
    room.stateVersion += 1;
    event.stateVersion = room.stateVersion;
    event.pending = true;
    room.eventHistory.set(event.eventID, { sequence, stateVersion: room.stateVersion, pending: true, serverTime: event.serverTime });
    if (room.eventHistory.size > 512) room.eventHistory.delete(room.eventHistory.keys().next().value);
    for (const peer of room.clients.values()) send(peer.socket, event);
    send(client.socket, { version: PROTOCOL_VERSION, type: "ack", requestID: input.requestID ?? null, eventID: event.eventID, sequence, stateVersion: room.stateVersion, pending: true, serverTime: event.serverTime });
    return;
  }
  if (eventType === "queue") room.state.queue = Array.isArray(payload.items) ? payload.items : room.state.queue;
  if (eventType === "loops") room.state.loops = event.payload;
  if (eventType === "instrument") room.state.instrument = event.payload;
  if (eventType === "sample") room.state.sample = normalizedAsset;

  room.stateVersion += 1;
  event.stateVersion = room.stateVersion;
  room.eventHistory.set(event.eventID, { sequence, stateVersion: room.stateVersion, pending: false, serverTime: event.serverTime });
  if (room.eventHistory.size > 512) room.eventHistory.delete(room.eventHistory.keys().next().value);

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
  if (room.clients.get(client.id) !== client) return;
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
    const room = getRoom(roomID);
    const savedSession = message.sessionToken ? room.sessions.get(message.sessionToken) : null;
    const role = savedSession?.role || message.role;
    client.id = savedSession?.clientID || message.clientID;
    client.name = savedSession?.name || message.name.trim();
    client.role = role;
    client.room = roomID;
    client.sessionToken = message.sessionToken || crypto.randomBytes(24).toString("base64url");
    if (room.clients.has(client.id)) {
      const existing = room.clients.get(client.id);
      if (savedSession && existing.sessionToken === client.sessionToken) {
        room.clients.delete(client.id);
        existing.room = null;
        existing.socket.close(1000, "session resumed");
      } else {
        send(client.socket, errorMessage("CLIENT_ID_IN_USE", "Another client is already using this clientID."));
        return;
      }
    }
    room.sessions.set(client.sessionToken, { clientID: client.id, name: client.name, role: client.role, lastSeenAt: Date.now() });
    room.clients.set(client.id, client);
    send(client.socket, {
      version: PROTOCOL_VERSION,
      type: "welcome",
      room: roomID,
      clientID: client.id,
      role: client.role,
      sessionToken: client.sessionToken,
      sessionResumed: Boolean(savedSession),
      serverInstanceID,
      serverRestarted: Boolean(message.sessionToken && !savedSession),
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
      lastSnapshotAt: Number.isFinite(message.lastSnapshotAt) ? message.lastSnapshotAt : client.metrics.lastSnapshotAt,
      reconnectCount: Number.isInteger(message.reconnectCount) ? message.reconnectCount : client.metrics.reconnectCount,
      eventsSent: Number.isInteger(message.eventsSent) ? message.eventsSent : client.metrics.eventsSent,
      eventsReceived: Number.isInteger(message.eventsReceived) ? message.eventsReceived : client.metrics.eventsReceived,
      eventsLost: Number.isInteger(message.eventsLost) ? message.eventsLost : client.metrics.eventsLost,
      lastError: typeof message.lastError === "string" ? message.lastError : client.metrics.lastError
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

const requestHandler = (request, response) => {
  const requestURL = new URL(request.url, "http://localhost");
  const requestPath = requestURL.pathname;
  if (requestPath === "/api/samples/upload" && request.method === "POST") {
    const chunks = [];
    let total = 0;
    let rejected = false;
    request.on("data", (chunk) => {
      total += chunk.length;
      if (total > MAX_SAMPLE_UPLOAD_BYTES) {
        rejected = true;
        return;
      }
      chunks.push(chunk);
    });
    request.on("end", () => {
      if (rejected) return jsonResponse(response, 413, { error: "Sample upload exceeds the 100 MB limit." });
      if (!total) return jsonResponse(response, 400, { error: "Sample upload is empty." });
      const fileName = sampleFileName(requestURL.searchParams.get("name") || "sample.audio");
      const destination = path.join(samplesDirectory, fileName);
      try {
        fs.writeFileSync(destination, Buffer.concat(chunks));
        const scheme = TLS_ENABLED ? "https" : "http";
        const host = request.headers.host || `127.0.0.1:${PORT}`;
        return jsonResponse(response, 201, { fileName, sizeBytes: total, url: `${scheme}://${host}/samples/${fileName}` });
      } catch (error) {
        return jsonResponse(response, 500, { error: `Could not store sample: ${error.message}` });
      }
    });
    return;
  }
  if (requestPath.startsWith("/samples/") && request.method === "DELETE") {
    const fileName = path.basename(requestPath.slice("/samples/".length));
    const filePath = path.join(samplesDirectory, fileName);
    if (!fileName || fileName !== requestPath.slice("/samples/".length) || !fs.existsSync(filePath)) {
      response.writeHead(404, { "content-type": "text/plain" });
      response.end("Sample not found\n");
      return;
    }
    try {
      fs.unlinkSync(filePath);
      response.writeHead(204);
      response.end();
    } catch (error) {
      jsonResponse(response, 500, { error: `Could not delete sample: ${error.message}` });
    }
    return;
  }
  if (requestPath.startsWith("/samples/") && request.method === "GET") {
    const fileName = path.basename(requestPath.slice("/samples/".length));
    const filePath = path.join(samplesDirectory, fileName);
    if (!fileName || fileName !== requestPath.slice("/samples/".length) || !fs.existsSync(filePath)) {
      response.writeHead(404, { "content-type": "text/plain" });
      response.end("Sample not found\n");
      return;
    }
    const extension = path.extname(fileName).toLowerCase();
    const contentType = extension === ".wav" ? "audio/wav" : extension === ".m4a" ? "audio/mp4" : extension === ".mp3" ? "audio/mpeg" : "application/octet-stream";
    response.writeHead(200, { "content-type": contentType, "cache-control": "no-cache" });
    fs.createReadStream(filePath).pipe(response);
    return;
  }
  if (requestPath === "/composer" || requestPath === "/composer/") {
    const body = fs.readFileSync(composerPath);
    response.writeHead(200, { "content-type": "text/html; charset=utf-8", "cache-control": "no-store", "content-length": body.length });
    response.end(body);
    return;
  }
  if (requestPath === "/sequencer" || requestPath === "/sequencer/") {
    const body = fs.readFileSync(composerPath);
    response.writeHead(200, { "content-type": "text/html; charset=utf-8", "cache-control": "no-store", "content-length": body.length });
    response.end(body);
    return;
  }
  if (requestPath === "/sample-editor" || requestPath === "/sample-editor/") {
    const body = fs.readFileSync(composerPath);
    response.writeHead(200, { "content-type": "text/html; charset=utf-8", "cache-control": "no-store", "content-length": body.length });
    response.end(body);
    return;
  }
  if (requestPath === "/vendor/zustand/vanilla.mjs") {
    const body = fs.readFileSync(zustandVanillaPath);
    response.writeHead(200, { "content-type": "application/javascript; charset=utf-8", "cache-control": "public, max-age=3600" });
    response.end(body);
    return;
  }
  if (requestPath === "/branding/musicollab-app-mark.svg" || requestPath === "/branding/musicollab-web-mark.svg" || requestPath === "/branding/musicollab-wordmark.svg") {
    const fileName = path.basename(requestPath);
    const body = fs.readFileSync(path.join(brandingDirectory, fileName));
    response.writeHead(200, { "content-type": "image/svg+xml; charset=utf-8", "cache-control": "public, max-age=3600" });
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
    const scheme = TLS_ENABLED ? "https" : "http";
    const socketScheme = TLS_ENABLED ? "wss" : "ws";
    const body = JSON.stringify({ appVersion: APP_VERSION, protocolVersion: PROTOCOL_VERSION, room: "LOCAL", secure: TLS_ENABLED, lanAddress: address, composerURL: address ? `${scheme}://${address}:${PORT}/composer` : null, websocketURL: address ? `${socketScheme}://${address}:${PORT}/ws` : null });
    response.writeHead(200, { "content-type": "application/json", "content-length": Buffer.byteLength(body) });
    response.end(body);
    return;
  }
  response.writeHead(404, { "content-type": "text/plain" });
  response.end("MusiCollab session server\n");
};

const httpServer = TLS_ENABLED
  ? https.createServer({ key: fs.readFileSync(TLS_KEY_PATH), cert: fs.readFileSync(TLS_CERT_PATH) }, requestHandler)
  : http.createServer(requestHandler);

const websocketServer = new WebSocketServer({ server: httpServer, path: "/ws" });

websocketServer.on("connection", (socket) => {
  const client = { socket, id: null, name: null, role: null, room: null, sessionToken: null, connectedAt: Date.now(), metrics: { offsetMs: null, rttMs: null, jitterMs: null, lastSnapshotAt: null, reconnectCount: 0, eventsSent: 0, eventsReceived: 0, eventsLost: 0, lastError: null } };
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
  const scheme = TLS_ENABLED ? "https" : "http";
  const socketScheme = TLS_ENABLED ? "wss" : "ws";
  console.log(`MusiCollab session server listening on ${scheme}://127.0.0.1:${PORT}`);
  console.log(`WebSocket endpoint: ${socketScheme}://127.0.0.1:${PORT}/ws`);
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
