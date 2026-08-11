import assert from "node:assert/strict";
import test from "node:test";
import { clockTimer, heartbeat, httpServer } from "../index.js";

const port = await new Promise((resolve) => {
  if (httpServer.address()) return resolve(httpServer.address().port);
  httpServer.once("listening", () => resolve(httpServer.address().port));
});

async function get(path) {
  const response = await fetch(`http://127.0.0.1:${port}${path}`);
  return { response, body: await response.text() };
}

test("composer and sequencer routes serve usable HTML shells", async () => {
  const composer = await get("/composer");
  const sequencer = await get("/sequencer");
  const sampleEditor = await get("/sample-editor");
  assert.equal(composer.response.status, 200);
  assert.equal(sequencer.response.status, 200);
  assert.equal(sampleEditor.response.status, 200);
  assert.match(sequencer.body, /MusiCollab Composer/);
  assert.match(sequencer.body, /vendor\/zustand\/vanilla\.mjs/);
  const zustand = await get("/vendor/zustand/vanilla.mjs");
  assert.equal(zustand.response.status, 200);
  assert.match(zustand.body, /createStore/);
  assert.match(composer.body, /MusiCollab Composer/);
  assert.match(composer.body, /Desktop monitor volume/);
  assert.match(composer.body, /location\.protocol === 'https:' \? 'wss' : 'ws'/);
  assert.match(composer.body, /id="play"/);
  assert.match(composer.body, /id="drumLane"/);
  assert.match(composer.body, /id="clients"/);
  assert.match(composer.body, /id="events"/);
  assert.match(composer.body, /id="arrangementViewport"/);
  assert.match(composer.body, /id="arrangementPlayhead"/);
  assert.match(composer.body, /function renderArrangement\(beat=state.beat\)/);
  assert.match(composer.body, /id="drumLane"/);
  assert.match(composer.body, /function renderTrackControls\(tracks=\{\}\)/);
  assert.match(composer.body, /function renderLoopLibrary\(loops, active=\[\]\)/);
  assert.match(composer.body, /id="waveformCanvas"/);
  assert.match(composer.body, /id="composerQueueInput"/);
  assert.match(composer.body, /function sendComposerQueue\(\)/);
  assert.match(composer.body, /COMPOSER_PREFS_KEY/);
  assert.match(composer.body, /function resetComposerPrefs\(\)/);
  assert.match(composer.body, /event\.code==='Space'/);
  assert.match(composer.body, /event\.key==='Escape'/);
  assert.match(composer.body, /function monitorRemoteEvent\(message\)/);
  assert.match(composer.body, /function emergencyStop\(\)/);
  assert.match(composer.body, /function installSequencer\(\)/);
  assert.match(composer.body, /function renderSequencer\(\)/);
  assert.match(composer.body, /id="sequencerGrid"/);
  assert.match(composer.body, /SEQUENCER/);
  assert.match(composer.body, /function ensureMonitorAudio\(\)/);
  assert.match(composer.body, /function playSequencerStep\(step\)/);
  assert.match(composer.body, /id:'sample',name:'SLICES'/);
  assert.match(composer.body, /function playSequencerSample\(\)/);
  assert.match(composer.body, /id="sequencerOutput"/);
  assert.match(composer.body, /id="sequencerDivision"/);
  assert.match(composer.body, /value="connected">CONNECTED APP/);
  assert.match(composer.body, /function sequencerDivisionLabel\(\)/);
  assert.match(composer.body, /function sendSequencerNote\(row,step\)/);
  assert.match(composer.body, /className='stepKey'/);
  assert.match(composer.body, /sequencerStepKeys/);
  assert.match(composer.body, /function setDesktopEffect\(name,value\)/);
  assert.match(composer.body, /function toggleSequencerRecording\(\)/);
  assert.match(composer.body, /function encodeWav\(chunks,sampleRate\)/);
  assert.match(composer.body, /function addSequencerRow\(type\)/);
  assert.match(composer.body, /function recordMobileSequencerEvent\(message\)/);
  assert.match(composer.body, /instrument:'piano'/);
  assert.match(composer.body, /instrument:'pad'/);
  assert.match(composer.body, /instrument:'lead'/);
  assert.match(composer.body, /instrument:'pluck'/);
  assert.match(composer.body, /function playRemoteInstrumentNote\(message\)/);
  assert.match(composer.body, /audioContext\.resume\(\)/);
  assert.match(composer.body, /id="monitorMute"/);
  assert.match(composer.body, /id="panic"/);
  assert.match(composer.body, /id="statusText"/);
  assert.match(composer.body, /role:'composer'/);
  assert.match(composer.body, /function scheduleReconnect\(\)/);
  assert.match(composer.body, /connectionState='reconnecting'/);
  assert.match(composer.body, /function renderClients\(list\)/);
  assert.match(composer.body, /Waiting for clients/);
  assert.match(composer.body, /id="stop"/);
  assert.match(composer.body, /id='floatingRecord'/);
  assert.match(sampleEditor.body, /sampleEditorTab/);
  assert.match(sampleEditor.body, /samplePreviewEdited/);
  assert.match(sampleEditor.body, /sampleLibrarySearch/);
  assert.match(sampleEditor.body, /sampleImportPanel/);
  assert.match(sampleEditor.body, /connectSampleModulation/);
  assert.match(sampleEditor.body, /sampleModTarget/);
  assert.match(composer.body, /id="minus"/);
  assert.match(composer.body, /id="plus"/);
  assert.match(composer.body, /function renderClockQuality\(message\)/);
  assert.match(composer.body, /message\.type==='error'/);
  assert.match(composer.body, /connection closed — retrying/);
  assert.match(composer.body, /api\/samples\/upload/);
});

test("the retired companion PWA is no longer served", async () => {
  const companion = await get("/companion/");
  const manifest = await get("/companion/manifest.webmanifest");
  const worker = await get("/companion/sw.js");
  const webMark = await get("/branding/musicollab-web-mark.svg");
  assert.equal(companion.response.status, 404);
  assert.equal(manifest.response.status, 404);
  assert.equal(worker.response.status, 404);
  assert.equal(webMark.response.status, 200);
  assert.match(webMark.response.headers.get("content-type"), /image\/svg\+xml/);
  assert.match(webMark.body, /MusiCollab web mark/);
});

test("static error and health responses remain browser-readable", async () => {
  const health = await get("/health");
  const missing = await get("/does-not-exist");
  assert.equal(health.response.status, 200);
  assert.equal(health.response.headers.get("content-type"), "application/json");
  assert.equal(JSON.parse(health.body).ok, true);
  assert.equal(missing.response.status, 404);
  assert.match(missing.response.headers.get("content-type"), /text\/plain/);
});

test.after(() => {
  clearInterval(clockTimer);
  clearInterval(heartbeat);
  httpServer.close();
});
