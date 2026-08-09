const BUILTIN_INSTRUMENTS = [
  { id: "drums", name: "Drums", family: "percussion", parameters: { voiceCount: 8, character: 0.35 } },
  { id: "bass", name: "Bass", family: "synth", parameters: { voiceCount: 1, cutoff: 0.42, character: 0.28 } },
  { id: "keys", name: "Keys", family: "synth", parameters: { voiceCount: 8, cutoff: 0.7, character: 0.2 } },
  { id: "sampler", name: "Sampler", family: "sample", parameters: { voiceCount: 8, attack: 0.01, release: 0.35 } }
];

function safeParameters(value) {
  if (value === undefined) return { value: {} };
  if (!value || typeof value !== "object" || Array.isArray(value)) return { error: "instrument.parameters must be an object." };
  const parameters = {};
  for (const [key, raw] of Object.entries(value)) {
    if (!/^[A-Za-z][A-Za-z0-9_]{0,31}$/.test(key) || !Number.isFinite(Number(raw))) return { error: "instrument parameters must use safe numeric keys and values." };
    const number = Number(raw);
    if (key === "voiceCount") {
      if (!Number.isInteger(number) || number < 1 || number > 32) return { error: "instrument.voiceCount must be an integer from 1 to 32." };
      parameters[key] = number;
    } else {
      if (number < -1 || number > 1) return { error: "instrument." + key + " must be between -1 and 1." };
      parameters[key] = number;
    }
  }
  return { value: parameters };
}

export function instrumentLibrary(library) {
  const custom = (library?.instruments || []).map((asset) => ({
    id: asset.id,
    name: asset.name,
    family: typeof asset.parameters?.family === "string" ? asset.parameters.family : "custom",
    parameters: Object.fromEntries(Object.entries(asset.parameters || {}).filter(([key, value]) => key !== "family" && Number.isFinite(Number(value))))
  }));
  const all = [...BUILTIN_INSTRUMENTS, ...custom];
  return [...new Map(all.map((instrument) => [instrument.id, instrument])).values()];
}

export function normalizeInstrumentSelection(input, library) {
  if (!input || typeof input !== "object" || Array.isArray(input)) return { error: "instrument payload must be an object." };
  const requestedID = typeof input.instrumentID === "string" ? input.instrumentID : typeof input.instrument === "string" ? input.instrument : "";
  const available = instrumentLibrary(library);
  const instrument = available.find((item) => item.id === requestedID || item.name.toLowerCase() === requestedID.toLowerCase());
  if (!instrument) return { error: "instrument must reference a built-in or room-library instrument." };
  const parameterResult = safeParameters({ ...instrument.parameters, ...(input.parameters || {}) });
  if (parameterResult.error) return { error: parameterResult.error };
  const pitch = input.pitch === undefined ? 0 : Number(input.pitch);
  if (!Number.isInteger(pitch) || pitch < -24 || pitch > 24) return { error: "instrument.pitch must be an integer from -24 to 24." };
  return { value: { instrumentID: instrument.id, instrument: instrument.id, name: instrument.name, family: instrument.family, engine: "abstract", parameters: parameterResult.value, pitch } };
}

export function normalizeInstrumentParameter(input, library, current = {}) {
  if (!input || typeof input !== "object" || Array.isArray(input)) return { error: "instrumentParam payload must be an object." };
  if (typeof input.parameter !== "string" || !/^[A-Za-z][A-Za-z0-9_]{0,31}$/.test(input.parameter)) return { error: "instrumentParam.parameter is invalid." };
  const instrumentID = typeof input.instrumentID === "string" ? input.instrumentID : current.instrumentID || current.instrument;
  const parameters = { ...(current.parameters || {}), [input.parameter]: input.value };
  const normalized = normalizeInstrumentSelection({ instrumentID, parameters, pitch: current.pitch || 0 }, library);
  if (normalized.error) return { error: normalized.error };
  return { value: { instrumentID: normalized.value.instrumentID, parameter: input.parameter, value: normalized.value.parameters[input.parameter], parameters: normalized.value.parameters, automation: "step" } };
}

export { BUILTIN_INSTRUMENTS };
