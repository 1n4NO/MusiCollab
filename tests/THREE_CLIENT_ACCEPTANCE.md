# Three-client MVP acceptance

The automated smoke test exercises the Mac Composer, iPhone 14 performer, and
iPhone 6 Plus companion in one room.

It verifies:

- all three roles join the same room and appear in the roster;
- the Composer pad event reaches the performer and companion session;
- session resumption does not create a duplicate Composer client; and
- the shared protocol remains usable after reconnect.

Run it with:

```sh
PORT=0 npm run test:smoke
```

Physical audio and legacy Safari validation remain separate device checks.
