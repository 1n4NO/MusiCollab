# Remote instrument and pitch

The companion/composer sends the abstract `instrument` preset. The iPhone 14
applies it from both the authoritative snapshot and live event stream before
the next local or scheduled remote pad sound. This includes the preset’s
instrument identity, parameters, and pitch.

The server validates pitch to -24…+24 semitones. The native engine repeats that
bound and also clamps numeric preset parameters (`voiceCount` to 1…32 and
other parameters to -1…+1) before accepting them. Changing the preset clears
cached synthesized buffers, so the next hit uses the new settings.

Verification: select Drums, Bass, Keys, or Sampler on the Composer, set pitch
to -24, 0, and +24, then trigger pads from both the iPhone 14 and a remote
client. Confirm the native status line reports the selected preset and pitch,
and that out-of-range server requests are rejected.
