# MusiCollab security acceptance

The local session server is intentionally LAN-scoped for the MVP. The release
acceptance boundary is:

- malformed JSON and unsupported message types return structured errors;
- room identifiers, event IDs, asset metadata, scene actions, and slice maps
  are validated before state mutation;
- sample uploads are metadata/reference messages, not raw audio transport;
- static routes cannot traverse outside the `web` directory;
- logs do not contain raw sample data, local sample paths, or session tokens;
- oversized or invalid audio metadata is rejected by the asset normalizer.

Run the automated protocol, asset, and privacy checks before distributing a
build. A public deployment additionally requires authenticated rooms and an
HTTPS/WSS reverse proxy.
