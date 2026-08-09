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

test("composer and companion routes serve usable HTML shells", async () => {
  const composer = await get("/composer");
  const companion = await get("/companion/");
  assert.equal(composer.response.status, 200);
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
  assert.match(composer.body, /id="minus"/);
  assert.match(composer.body, /id="plus"/);
  assert.match(composer.body, /function renderClockQuality\(message\)/);
  assert.match(composer.body, /message\.type==='error'/);
  assert.match(composer.body, /connection closed — retrying/);
  assert.equal(companion.response.status, 200);
  assert.match(companion.body, /MusiCollab Companion/);
  assert.match(companion.body, /manifest\.webmanifest/);
  assert.match(companion.body, /APPLY TO iPHONE 14/);
  assert.match(companion.body, /location\.protocol==='https:'\?'wss':'ws'/);
  assert.match(companion.body, /id="queueList"/);
  assert.match(companion.body, /data-action="up"/);
  assert.match(companion.body, /id="pitch"/);
  assert.match(companion.body, /min="-24" max="24"/);
  assert.match(companion.body, /connectionState='reconnecting'/);
  assert.match(companion.body, /function renderSample\(sample\)/);
});

test("companion PWA assets advertise landscape and versioned offline behavior", async () => {
  const manifest = await get("/companion/manifest.webmanifest");
  const worker = await get("/companion/sw.js");
  assert.equal(manifest.response.status, 200);
  assert.match(manifest.response.headers.get("content-type"), /manifest\+json/);
  assert.match(manifest.body, /"orientation": "landscape"/);
  assert.match(manifest.body, /"start_url": "\/companion\//);
  assert.equal(worker.response.status, 200);
  assert.match(worker.response.headers.get("service-worker-allowed"), /\/companion\//);
  assert.match(worker.body, /const APP_VERSION = '0\.1\.0'/);
  assert.match(worker.body, /musicollab-companion-v\$\{APP_VERSION\}/);
  assert.match(worker.body, /caches\.match/);
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
