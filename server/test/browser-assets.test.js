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
  assert.equal(companion.response.status, 200);
  assert.match(companion.body, /MusiCollab Companion/);
  assert.match(companion.body, /manifest\.webmanifest/);
  assert.match(companion.body, /APPLY TO iPHONE 14/);
  assert.match(companion.body, /location\.protocol==='https:'\?'wss':'ws'/);
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
