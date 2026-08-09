export const ASSET_MODEL_VERSION = 1;
export const ASSET_TYPES = new Set(["track", "instrument", "loop", "sample", "scene", "slice"]);
export const QUANTIZATION_MODES = new Set(["immediate", "beat", "bar", "2bar"]);
const RAW_AUDIO_FIELDS = new Set(["audio", "audioData", "audioBytes", "base64Audio", "blob", "buffer", "bytes", "pcm"]);
const LICENSE_TYPES = new Set(["original", "public-domain", "cc0", "cc-by", "cc-by-sa", "cc-by-nc", "purchased", "user-declared", "unknown"]);
const DISTRIBUTION_STATUSES = new Set(["allowed", "attribution-required", "noncommercial-only", "prohibited", "review-required", "unknown"]);
const ORIGINS = new Set(["bundled-demo", "user-imported", "third-party", "unknown"]);

function number(value, field, minimum = 0) {
  if (value === undefined || value === null) return { value: undefined };
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < minimum) return { error: `${field} must be a number >= ${minimum}.` };
  return { value: parsed };
}

function tags(value) {
  if (value === undefined) return { value: [] };
  if (!Array.isArray(value) || value.some((tag) => typeof tag !== "string" || !tag.trim() || tag.length > 40)) {
    return { error: "tags must be an array of non-empty strings of at most 40 characters." };
  }
  return { value: [...new Set(value.map((tag) => tag.trim().toLowerCase()))] };
}

function license(value) {
  if (value === undefined) return { value: undefined };
  if (!value || typeof value !== "object" || Array.isArray(value) || typeof value.type !== "string" || typeof value.attribution !== "string") {
    return { error: "license requires type and attribution strings." };
  }
  if (!LICENSE_TYPES.has(value.type)) return { error: "license.type is unsupported; use a recognized license or user-declared." };
  const distribution = value.distribution === undefined ? "unknown" : value.distribution;
  if (!DISTRIBUTION_STATUSES.has(distribution)) return { error: "license.distribution is unsupported." };
  if (value.url !== undefined) {
    if (typeof value.url !== "string" || value.url.length > 2048) return { error: "license.url must be a valid HTTP(S) URL." };
    try { if (!['http:', 'https:'].includes(new URL(value.url).protocol)) return { error: "license.url must be a valid HTTP(S) URL." }; } catch { return { error: "license.url must be a valid HTTP(S) URL." }; }
  }
  return { value: { type: value.type, attribution: value.attribution.trim(), distribution, url: typeof value.url === "string" ? value.url : undefined, notice: typeof value.notice === "string" ? value.notice.trim().slice(0, 300) : undefined } };
}

function origin(value, licenseType) {
  const resolved = value === undefined ? (licenseType === "original" ? "bundled-demo" : "unknown") : value;
  return ORIGINS.has(resolved) ? { value: resolved } : { error: "origin must be bundled-demo, user-imported, third-party, or unknown." };
}

function transfer(value) {
  if (value === undefined) return { value: undefined };
  if (!value || typeof value !== "object" || Array.isArray(value)) return { error: "sample.transfer must be an object." };
  const kind = value.kind === "url" || value.kind === "reference" ? value.kind : null;
  if (!kind) return { error: "sample.transfer.kind must be url or reference." };
  const url = value.url === undefined ? undefined : value.url;
  if (url !== undefined) {
    if (typeof url !== "string" || url.length > 2048) return { error: "sample.transfer.url must be a valid HTTP(S) URL." };
    try {
      const parsed = new URL(url);
      if (!['http:', 'https:'].includes(parsed.protocol)) return { error: "sample.transfer.url must be a valid HTTP(S) URL." };
    } catch {
      return { error: "sample.transfer.url must be a valid HTTP(S) URL." };
    }
  }
  const reference = value.reference === undefined ? undefined : value.reference;
  if (reference !== undefined && (typeof reference !== "string" || !reference.trim() || reference.length > 256)) return { error: "sample.transfer.reference must be a non-empty string of at most 256 characters." };
  if (kind === "url" && url === undefined) return { error: "sample.transfer.url is required for url transfers." };
  if (kind === "reference" && reference === undefined) return { error: "sample.transfer.reference is required for reference transfers." };
  if (value.hash !== undefined && (typeof value.hash !== "string" || value.hash.length > 128)) return { error: "sample.transfer.hash must be at most 128 characters." };
  if (value.sizeBytes !== undefined && (!Number.isFinite(value.sizeBytes) || value.sizeBytes < 0 || value.sizeBytes > 100 * 1024 * 1024)) return { error: "sample.transfer.sizeBytes must be between 0 and 100 MB." };
  if (value.expiresAt !== undefined && (!Number.isFinite(value.expiresAt) || value.expiresAt < 0)) return { error: "sample.transfer.expiresAt must be a non-negative timestamp." };
  return { value: { kind, url, reference, hash: value.hash, sizeBytes: value.sizeBytes, expiresAt: value.expiresAt } };
}

export function normalizeSliceMap(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) return { error: "sliceMap payload must be an object." };
  if (typeof input.sampleID !== "string" || !input.sampleID.trim() || input.sampleID.length > 80) return { error: "sliceMap.sampleID is required." };
  if (!input.assignments || typeof input.assignments !== "object" || Array.isArray(input.assignments)) return { error: "sliceMap.assignments must be an object." };
  const assignments = {};
  for (const [pad, sliceID] of Object.entries(input.assignments)) {
    if (!/^\d+$/.test(pad) || Number(pad) < 0 || Number(pad) > 15) return { error: "sliceMap pad assignments must target pads 0–15." };
    if (sliceID !== null && (typeof sliceID !== "string" || !sliceID.trim() || sliceID.length > 128)) return { error: "sliceMap slice IDs must be non-empty strings or null." };
    assignments[String(Number(pad))] = sliceID === null ? null : sliceID.trim();
  }
  if (Object.keys(assignments).length > 16) return { error: "sliceMap may contain at most 16 pad assignments." };
  return { value: { sampleID: input.sampleID.trim(), sceneID: typeof input.sceneID === "string" ? input.sceneID.slice(0, 80) : undefined, assignments } };
}

export function normalizeLoopSelection(input, library) {
  if (!input || typeof input !== "object" || Array.isArray(input) || !Array.isArray(input.items)) return { error: "loops payload.items must be an array." };
  if (input.items.length > 32) return { error: "loops payload may contain at most 32 loops." };
  const available = new Map((library?.loops || []).map((loop) => [loop.id, loop]));
  const items = [];
  for (const item of input.items) {
    const id = typeof item === "string" ? item : item?.id;
    const loop = available.get(id);
    if (!loop) return { error: "loops items must reference loops in the room library." };
    items.push({ id: loop.id, name: loop.name, bars: loop.bars, bpm: loop.bpm, key: loop.key, duration: loop.duration, quantization: loop.quantization || "bar" });
  }
  return { value: { items } };
}

export function normalizeLibraryAction(input, library) {
  if (!input || typeof input !== "object" || Array.isArray(input)) return { error: "library payload must be an object." };
  const action = typeof input.action === "string" ? input.action.toLowerCase() : "favorite";
  const assets = ["tracks", "instruments", "loops", "samples", "scenes", "slices"].flatMap((collection) => library?.[collection] || []);
  const asset = assets.find((item) => item.id === input.assetID);
  if (!asset) return { error: "library.assetID must reference an asset in the room library." };
  if (action === "favorite") {
    if (typeof input.favorite !== "boolean") return { error: "library.favorite must be boolean." };
    return { value: { action, assetID: asset.id, favorite: input.favorite } };
  }
  if (action === "tags") {
    const result = tags(input.tags);
    if (result.error) return { error: result.error };
    return { value: { action, assetID: asset.id, tags: result.value } };
  }
  if (action === "missing") {
    if (typeof input.missing !== "boolean") return { error: "library.missing must be boolean." };
    return { value: { action, assetID: asset.id, missing: input.missing } };
  }
  if (action === "recover") return { value: { action, assetID: asset.id, missing: false } };
  return { error: "library.action must be favorite, tags, missing, or recover." };
}

export function normalizeSceneAction(input, library) {
  if (!input || typeof input !== "object" || Array.isArray(input)) return { error: "scene payload must be an object." };
  const action = typeof input.action === "string" ? input.action.toLowerCase() : "recall";
  const scenes = library?.scenes || [];
  const findScene = (id) => scenes.find((scene) => scene.id === id);
  if (!["save", "create", "rename", "duplicate", "reorder", "recall"].includes(action)) return { error: "scene.action must be save, create, rename, duplicate, reorder, or recall." };
  if (["recall", "rename", "duplicate"].includes(action) && (typeof input.sceneID !== "string" || !findScene(input.sceneID))) return { error: "scene.sceneID must reference a scene in the room library." };
  if (action === "recall") return { value: { action, sceneID: input.sceneID, scene: findScene(input.sceneID) } };
  if (action === "rename") {
    if (typeof input.name !== "string" || !input.name.trim() || input.name.length > 80) return { error: "scene.name must be a non-empty string of at most 80 characters." };
    return { value: { action, sceneID: input.sceneID, name: input.name.trim() } };
  }
  if (action === "reorder") {
    if (!Array.isArray(input.order) || input.order.length !== scenes.length || new Set(input.order).size !== scenes.length || input.order.some((id) => !findScene(id))) return { error: "scene.order must contain each room scene exactly once." };
    return { value: { action, order: input.order } };
  }
  let source = input.scene;
  if (action === "duplicate") source = { ...findScene(input.sceneID), id: input.newID, name: input.name || `${findScene(input.sceneID).name} Copy` };
  if (!source || typeof source !== "object" || Array.isArray(source)) return { error: "scene.scene is required for create or save." };
  if (typeof source.id !== "string" || !source.id.trim() || source.id.length > 80) return { error: "scene.id must be a non-empty string of at most 80 characters." };
  if (typeof source.name !== "string" || !source.name.trim() || source.name.length > 80) return { error: "scene.name must be a non-empty string of at most 80 characters." };
  const normalized = normalizeAsset({ ...source, type: "scene", tags: source.tags || [] });
  if (normalized.error) return { error: normalized.error };
  const availableIDs = new Set([...(library?.tracks || []), ...(library?.loops || []), ...(library?.instruments || [])].map((asset) => asset.id));
  if ((normalized.asset.trackIDs || []).some((id) => !availableIDs.has(id))) return { error: "scene.trackIDs must reference tracks, loops, or instruments in the room library." };
  return { value: { action: action === "create" ? "create" : "save", scene: normalized.asset } };
}

function slices(value, duration) {
  if (value === undefined) return { value: [] };
  if (!Array.isArray(value)) return { error: "slices must be an array." };
  if (value.length > 512) return { error: "slices must contain at most 512 regions." };
  const normalized = [];
  for (let index = 0; index < value.length; index += 1) {
    const slice = value[index];
    if (!slice || typeof slice !== "object" || Array.isArray(slice)) return { error: `slices[${index}] must be an object.` };
    const start = number(slice?.start, `slices[${index}].start`);
    const end = number(slice?.end, `slices[${index}].end`);
    if (start.error || end.error || start.value === undefined || end.value === undefined) return { error: start.error || end.error || `slices[${index}] requires start and end.` };
    const minimumLength = duration !== undefined && duration > 0 ? Math.min(0.001, duration) : 0;
    if (end.value <= start.value || end.value - start.value < minimumLength || (duration !== undefined && end.value > duration)) return { error: `slices[${index}] must be ordered, non-empty, and inside the sample duration.` };
    const id = String(slice.id || `slice-${index + 1}`);
    if (id.length > 128) return { error: `slices[${index}].id must be at most 128 characters.` };
    normalized.push({ id, name: typeof slice.name === "string" && slice.name.trim() ? slice.name.trim().slice(0, 80) : `Slice ${index + 1}`, start: start.value, end: end.value });
  }
  return { value: normalized };
}

export function normalizeAsset(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) return { error: "asset must be an object." };
  const type = typeof input.type === "string" ? input.type.toLowerCase() : "";
  if (!ASSET_TYPES.has(type)) return { error: "asset.type must be track, instrument, loop, sample, scene, or slice." };
  if (type === "sample" && Object.keys(input).some((key) => RAW_AUDIO_FIELDS.has(key))) return { error: "raw audio bytes are not accepted in sample metadata; provide a hash or transfer reference." };
  const id = typeof input.id === "string" && input.id.trim() ? input.id.trim() : null;
  if (!id) return { error: "asset.id is required." };
  const name = typeof input.name === "string" && input.name.trim() ? input.name.trim() : "Untitled";
  const tagResult = tags(input.tags);
  if (tagResult.error) return { error: tagResult.error };

  const asset = { modelVersion: ASSET_MODEL_VERSION, id, type, name, tags: tagResult.value, favorite: input.favorite === true, missing: input.missing === true };
  const licenseResult = license(input.license);
  if (licenseResult.error) return { error: licenseResult.error };
  if (licenseResult.value) asset.license = licenseResult.value;
  const originResult = origin(input.origin, licenseResult.value?.type);
  if (originResult.error) return { error: originResult.error };
  asset.origin = originResult.value;
  const duration = number(input.duration, "duration");
  if (duration.error) return { error: duration.error };
  if (duration.value !== undefined) asset.duration = duration.value;
  if (input.bpm !== undefined) {
    const bpm = number(input.bpm, "bpm", 1);
    if (bpm.error) return { error: bpm.error };
    asset.bpm = bpm.value;
  }
  if (input.key !== undefined) {
    if (typeof input.key !== "string" || input.key.length > 16) return { error: "key must be a short string." };
    asset.key = input.key;
  }

  if (type === "loop") {
    if (!Number.isInteger(input.bars) || input.bars < 1) return { error: "loop.bars must be a positive integer." };
    if (input.quantization !== undefined && !QUANTIZATION_MODES.has(input.quantization)) return { error: "loop.quantization is unsupported." };
    asset.bars = input.bars;
    asset.quantization = input.quantization || "bar";
  }
  if (type === "sample") {
    if (duration.value !== undefined && duration.value > 600) return { error: "sample.duration must be at most 600 seconds." };
    const sampleRate = number(input.sampleRate, "sampleRate", 1);
    if (sampleRate.error) return { error: sampleRate.error };
    if (sampleRate.value !== undefined) asset.sampleRate = sampleRate.value;
    if (input.channels !== undefined && (!Number.isInteger(input.channels) || input.channels < 1)) return { error: "channels must be a positive integer." };
    if (input.channels !== undefined) asset.channels = input.channels;
    if (input.sourceFormat !== undefined) {
      if (!input.sourceFormat || typeof input.sourceFormat !== "object" || !Number.isFinite(input.sourceFormat.sampleRate) || !Number.isInteger(input.sourceFormat.channels) || input.sourceFormat.sampleRate < 8000 || input.sourceFormat.sampleRate > 192000 || input.sourceFormat.channels < 1 || input.sourceFormat.channels > 32) return { error: "sample.sourceFormat must contain a valid sampleRate and channel count." };
      asset.sourceFormat = { sampleRate: input.sourceFormat.sampleRate, channels: input.sourceFormat.channels };
    }
    if (input.normalization !== undefined) {
      if (!input.normalization || typeof input.normalization !== "object" || !Number.isFinite(input.normalization.sampleRate) || !Number.isInteger(input.normalization.channels) || input.normalization.sampleRate !== 44100 || input.normalization.channels < 1 || input.normalization.channels > 2) return { error: "sample.normalization must target 44100 Hz and one or two channels." };
      asset.normalization = { sampleRate: input.normalization.sampleRate, channels: input.normalization.channels, method: typeof input.normalization.method === "string" ? input.normalization.method : "canonical-pcm" };
    }
    if (input.waveform !== undefined) {
      if (!input.waveform || typeof input.waveform !== "object" || !Array.isArray(input.waveform.peaks) || input.waveform.peaks.length < 1 || input.waveform.peaks.length > 1024 || !Number.isInteger(input.waveform.sampleCount) || input.waveform.sampleCount < 1) return { error: "sample.waveform must contain 1–1024 peaks and a positive sampleCount." };
      if (input.waveform.peaks.some((peak) => !peak || !Number.isFinite(peak.min) || !Number.isFinite(peak.max) || !Number.isFinite(peak.rms) || peak.min > peak.max || peak.rms < 0)) return { error: "sample.waveform peaks contain invalid values." };
      asset.waveform = { modelVersion: ASSET_MODEL_VERSION, sampleCount: input.waveform.sampleCount, peaks: input.waveform.peaks.map((peak) => ({ min: peak.min, max: peak.max, rms: peak.rms })) };
    }
    if (input.hash !== undefined && (typeof input.hash !== "string" || input.hash.length > 128)) return { error: "hash must be at most 128 characters." };
    if (input.hash !== undefined) asset.hash = input.hash;
    const transferResult = transfer(input.transfer);
    if (transferResult.error) return { error: transferResult.error };
    if (transferResult.value) asset.transfer = transferResult.value;
    if (input.source !== undefined) {
      if (!input.source || typeof input.source !== "object" || Array.isArray(input.source)) return { error: "sample.source must be an object." };
      asset.source = {
        fileName: typeof input.source.fileName === "string" ? input.source.fileName : name,
        mimeType: typeof input.source.mimeType === "string" ? input.source.mimeType : "application/octet-stream",
        sizeBytes: Number.isFinite(input.source.sizeBytes) ? input.source.sizeBytes : undefined,
        modifiedAt: Number.isFinite(input.source.modifiedAt) ? input.source.modifiedAt : undefined
      };
      if (asset.source.sizeBytes !== undefined && (asset.source.sizeBytes < 0 || asset.source.sizeBytes > 100 * 1024 * 1024)) return { error: "sample.source.sizeBytes must be at most 100 MB." };
    }
    const sliceResult = slices(input.slices, duration.value);
    if (sliceResult.error) return { error: sliceResult.error };
    asset.slices = sliceResult.value;
  }
  if (type === "slice") {
    const sliceResult = slices([input], duration.value);
    if (sliceResult.error) return { error: sliceResult.error };
    Object.assign(asset, sliceResult.value[0]);
  }
  if (type === "scene" && input.trackIDs !== undefined) {
    if (!Array.isArray(input.trackIDs) || input.trackIDs.some((trackID) => typeof trackID !== "string")) return { error: "scene.trackIDs must be an array of strings." };
    asset.trackIDs = input.trackIDs;
  }
  if (type === "instrument" && input.parameters !== undefined) {
    if (!input.parameters || typeof input.parameters !== "object" || Array.isArray(input.parameters)) return { error: "instrument.parameters must be an object." };
    asset.parameters = input.parameters;
  }
  return { asset };
}
