# Mac server startup

Use the controller script for the repeatable local workflow:

```sh
/Users/ps/dev/MusiCollab/scripts/musicollab-server.sh start
/Users/ps/dev/MusiCollab/scripts/musicollab-server.sh status
/Users/ps/dev/MusiCollab/scripts/musicollab-server.sh stop
```

If port 8787 is occupied, the start command prints the owning process and
exits safely. To use another port:

```sh
MUSICOLLAB_PORT=8789 /Users/ps/dev/MusiCollab/scripts/musicollab-server.sh start
```

For phone access, use the printed LAN URL, allow Node.js through the macOS
firewall, and confirm the Mac and phones are on the same non-isolated Wi-Fi.
