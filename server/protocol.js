export const PROTOCOL_VERSION = 1;

export const VALID_ROLES = new Set(["composer", "performer", "companion"]);
export const VALID_EVENT_TYPES = new Set([
  "padHit",
  "transport",
  "queue",
  "loops",
  "sample",
  "scene",
  "instrument"
]);

const ROOM_PATTERN = /^[A-Z0-9_-]{1,32}$/;
const ID_PATTERN = /^[A-Za-z0-9._:-]{1,80}$/;

function text(value, field, maxLength = 80) {
  if (typeof value !== "string" || !value.trim() || value.length > maxLength) {
    return `${field} must be a non-empty string of at most ${maxLength} characters.`;
  }
  return null;
}

export function normalizeRoom(value) {
  const room = typeof value === "string" && value.trim() ? value.trim().toUpperCase() : "LOCAL";
  return ROOM_PATTERN.test(room) ? room : null;
}

export function validateMessage(message) {
  if (!message || typeof message !== "object" || Array.isArray(message)) {
    return { ok: false, code: "INVALID_MESSAGE", message: "Message must be a JSON object." };
  }

  const typeError = text(message.type, "type", 32);
  if (typeError) return { ok: false, code: "INVALID_TYPE", message: typeError };

  if (message.type === "hello") {
    const room = normalizeRoom(message.room);
    if (!room) return { ok: false, code: "INVALID_ROOM", message: "Room must contain 1–32 letters, numbers, underscores, or hyphens." };
    if (typeof message.clientID !== "string" || !ID_PATTERN.test(message.clientID)) {
      return { ok: false, code: "INVALID_CLIENT_ID", message: "clientID contains unsupported characters or is too long." };
    }
    const nameError = text(message.name, "name");
    if (nameError) return { ok: false, code: "INVALID_NAME", message: nameError };
    if (!VALID_ROLES.has(message.role)) return { ok: false, code: "INVALID_ROLE", message: "role must be composer, performer, or companion." };
    return { ok: true };
  }

  if (message.type === "event") {
    if (!VALID_EVENT_TYPES.has(message.eventType)) return { ok: false, code: "INVALID_EVENT_TYPE", message: "Unsupported event type." };
    if (!message.payload || typeof message.payload !== "object" || Array.isArray(message.payload)) {
      return { ok: false, code: "INVALID_PAYLOAD", message: "event payload must be an object." };
    }
    if (message.eventID !== undefined && (typeof message.eventID !== "string" || message.eventID.length > 100)) {
      return { ok: false, code: "INVALID_EVENT_ID", message: "eventID must be at most 100 characters." };
    }
    return { ok: true };
  }

  if (!["requestSnapshot", "ping"].includes(message.type)) {
    return { ok: false, code: "UNKNOWN_MESSAGE", message: `Unsupported message type: ${message.type}.` };
  }
  return { ok: true };
}

export function errorMessage(code, message, requestID = null) {
  return { version: PROTOCOL_VERSION, type: "error", code, message, requestID };
}
