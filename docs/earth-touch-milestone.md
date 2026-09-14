# Offline HD Earth and touch exploration

Implemented on develop/ui-directions, September 14, 2026.

## What changed

- Replaced the flat CSS background approximation with a WebGL orthographic
  projection matching the globe's latitude/longitude and site markers. The
  original NASA texture is bundled locally: 2048 by 1024 pixels, not a claim of
  4K terrain or live satellite imagery. Drawing supports up to 2x display density
  with a 2048-pixel surface limit, mipmapped sampling and bounded GPU memory.
- No startup image request leaves the device. When graphics are unavailable or
  lost, the existing offline vector globe remains interactive. Context restoration
  rebuilds the local texture. The existing weather/current consent remains separate.
- Removed the central introduction and instrument dashboard from the exploration
  scene. Overview opens the live workspace counts in a keyboard-accessible dialog.
  Reduced marker glow and incidental labels; selected/hovered labels remain.
- Put reversible Earth only / Show panels beside the main zoom controls. Saved
  panel layouts and all research modules remain available. No catalog data changes.
- Added automatic coarse-pointer sizing and an explicit Touch controls toggle.
  Only the input-size preference is saved in local storage. Touch controls use
  48-pixel buttons, larger fields and checkboxes, and scrollable module navigation.
- Added two-finger pinch zoom, clean transition back to one-finger rotation,
  cancellation/capture-loss handling, and wider touch marker targets. Keyboard
  arrow and zoom controls remain. Reduced-motion settings remain respected.

## Source and validation

Source: satellite-earth.js/css, globe.js, earth-physical.js, exploration-ui.js/css.
Build integration: integrate_exploration_ui.py and the owner-preview workflow;
renderer/native/package allowlists include the same local assets. No remote code,
production collaboration networking, custom cryptography or telemetry was added.

Automated coverage includes touch gesture cancellation and capture loss, zoom
bounds, original asset dimensions/hash, package inclusion, GPU projection samples
against the source image, GPU context loss/restoration, no external image requests,
Overview, keyboard controls, tablet alignment, and narrow-screen overflow. The
native visual test verifies the texture is served by the guarded host and checks
Overview and touch control sizing. Existing collaboration regression flows remain
required. Hardware touch, Windows display scaling and graphics-driver differences
still require device acceptance; browser emulation is not a physical device test.

## NASA asset provenance

Source: https://svs.gsfc.nasa.gov/2915/
Original file: https://svs.gsfc.nasa.gov/vis/a000000/a002900/a002915/bluemarble-2048.png
Credit: NASA/Goddard Space Flight Center Scientific Visualization Studio.
Bundled bytes are unchanged, SHA-256:
`ae6214b078ed0864c96f74bcb10ae3021f6eb116f8059797efe0fa9ea8b89d35`.
In-app attribution and the mosaic/terrain distinction appear under Overview.

## Single owner review

Download the successful owner-preview artifact for this milestone, extract both
archives into a fresh folder, and run AtlasCommand.exe. Keep an encrypted team
backup separately. Check Earth rotation/zoom and site alignment; try Earth only
and Overview; toggle Touch controls and, on touch hardware, drag and pinch. Confirm
research panels and Teams still reopen. This remains a development ZIP with manual
updates; the separate automatic release-update requirement is not implemented here.

## Native validation corrections

The first native run repeated the earlier unmarked-write TCP reset. Rejection now
sends the same 403 before dispatch, half-closes sending, and discards only a declared
body of at most 8192 bytes within a 250 ms monotonic deadline. Discarded bytes are
never parsed or logged and the scratch buffer is cleared. Authentication, origin,
path, method and data limits remain unchanged. Four native delayed-body requests
must receive the exact 403 without retries and preserve the saved workspace.
Static serving also explicitly recognizes the allowlisted local PNG's MIME type.

The native test harness also replaces sequential recursive taskkill calls with
snapshot-based identification of the exact disposable Edge profile and its Edge
descendants, direct Stop-Process calls, and a bounded exit check. It never targets
all Edge processes by name. This affects runner cleanup only, not app lifecycle
behavior or endpoint policy; all existing shutdown/reopen assertions remain.
