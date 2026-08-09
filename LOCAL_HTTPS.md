# Local HTTPS development

HTTP remains the default for the Mac LAN workflow. Use local HTTPS when testing PWA installation, secure-context behavior, or a WSS path. TLS is opt-in and requires both certificate files.

## Create a trusted development certificate

`mkcert` is recommended because iOS will not trust a plain self-signed certificate automatically:

```sh
brew install mkcert
mkcert -install
mkdir -p /Users/ps/dev/MusiCollab/.local-certs
mkcert \
  -cert-file /Users/ps/dev/MusiCollab/.local-certs/musicollab.pem \
  -key-file /Users/ps/dev/MusiCollab/.local-certs/musicollab-key.pem \
  localhost 127.0.0.1 ::1 <Mac-LAN-IP>
```

Replace `<Mac-LAN-IP>` with the Mac address printed by `scripts/musicollab-server.sh`. The certificate and key are ignored by Git and must never be committed.

To trust the local certificate on the iPhone, install the mkcert local CA on the device, enable full trust under **Settings → General → About → Certificate Trust Settings**, and use a hostname/IP covered by the certificate SAN list. Remove the test CA after local testing.

## Start the secure server

```sh
cd /Users/ps/dev/MusiCollab
MUSICOLLAB_TLS_KEY=/Users/ps/dev/MusiCollab/.local-certs/musicollab-key.pem \
MUSICOLLAB_TLS_CERT=/Users/ps/dev/MusiCollab/.local-certs/musicollab.pem \
./scripts/musicollab-server.sh restart
```

The controller prints `https://` and `wss://` URLs when TLS is enabled. Its health check uses `curl --insecure` only for the loopback probe; the browser/device must still trust the certificate for a secure PWA context.

Return to normal HTTP development with:

```sh
./scripts/musicollab-server.sh stop
./scripts/musicollab-server.sh start
```

## Boundaries

- The same HTTPS server carries WebSocket upgrades; browser clients automatically choose `wss://` when loaded over HTTPS.
- Native iPhone builds still use the configured `MusiCollabServerURL`; set it to a trusted `wss://` endpoint only when testing TLS.
- This is development TLS, not a production certificate or public hosting strategy. Use a managed certificate and reverse proxy for production.
