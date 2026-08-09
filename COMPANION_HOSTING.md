# Companion HTTPS hosting

The companion is a static progressive web app. `web/` is deployable as a static site; the repository includes Cloudflare Pages headers and a deployment command. HTTPS is required for service-worker installation on the iPhone 6 Plus (apart from localhost development).

## Deployment

Create a Cloudflare Pages project, authenticate Wrangler, and deploy:

```sh
cd /Users/ps/dev/MusiCollab
npm install --global wrangler
wrangler login
MUSICOLLAB_PAGES_PROJECT=musicollab-companion ./scripts/deploy-companion.sh
```

The deployment root is `/Users/ps/dev/MusiCollab/web`, which keeps `/companion`, `/companion/sw.js`, and `/companion/manifest.webmanifest` at the same paths used by the app. Cloudflare Pages provides the HTTPS URL. The `_headers` file keeps the service worker and manifest revalidating while allowing short-lived caching for companion HTML.

## WebSocket origin

The static host serves the UI; it does not run the MusiCollab session server. Production needs a public WSS endpoint for the Node session server, exposed directly at the same host under `/ws` or passed to the companion as the `ws` query parameter:

```text
https://companion.example.com/companion/?room=LOCAL&ws=wss%3A%2F%2Fsession.example.com%2Fws
```

The reverse proxy must forward WebSocket upgrade requests and allow the companion origin. Never use `ws://` from an HTTPS page because browsers block mixed content. Local development continues to use the Mac LAN server and `ws://`.

## Cache and version policy

- Update `APP_VERSION` in `web/companion/sw.js` and the manifest whenever the companion behavior changes.
- The service worker uses a versioned cache name and network-first fetching, with the last good shell as offline fallback.
- `sw.js` and the manifest are served with revalidation/no-store headers so a new service worker can activate.
- Keep HTML cache lifetime short; immutable hashed assets can use long-lived caching when the app gains external asset files.
- After deployment, open the HTTPS companion, reload once, confirm the service worker is active, and verify the displayed build before adding it to the iPhone 6 Plus Home Screen.
