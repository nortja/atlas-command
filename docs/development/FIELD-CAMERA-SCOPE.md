# Optional My Field Camera module

Owner request, 2026-09-09: 'I would also like to add a field camera if needed.'
Status: included in the consolidated release planning; NOT connected or implemented as a live field-camera adapter. The public USGS snapshot adapter does not connect to a user's hardware.

## One outstanding choice

Will the owner primarily leave a camera at a remote location and watch from home, or use the camera while physically at the site? This determines the transport, power and storage design. No hardware purchase or subscription has been selected.

## Options to consider before feature freeze

1. On-site / tethered camera: supported built-in or USB camera preview with explicit Windows/browser permission, capture actions and local attachment saves. Camera and microphone activation are separate; microphone off by default. Actual camera compatibility and permission-denied paths require physical-device testing.
2. Remote deployed camera: explicit pairing of the owner's known device/provider, authenticated supported transport and real status. Requires the particular camera's supported live-view/API capabilities and working connectivity at both ends. Do not assume every cellular/trail camera supports continuous live video. Do not promise operation without signal or free cellular/satellite transport.
3. Offline expedition camera: import original photos/clips from camera/SD card when available, attach them to a mission/site and preserve provenance. Offline capture/recording belongs to the device unless a local capture implementation is provided; it is not live remote viewing.

## Proposed common interface

An optional Field Camera tile/panel with friendly camera name, selected site/mission, last-contact time, capture time when supplied, live/snapshot/recording/offline state, Connect/Stop controls and a clear privacy indicator. Battery, signal, local storage, temperature, solar power or PTZ appear only when the device actually reports/supports them. Missing telemetry is 'not reported', never invented.

Manual snapshot, clip capture or import should explicitly identify the destination site before saving. A selected site's coordinates must not be written as measured camera GPS. Preserve original capture metadata separately from import time and user-entered location. Keep field-camera locations, media and pairing credentials private by default.

## Security and recording rules

- User-owned or explicitly authorized devices only. No automatic internet/LAN camera scanning, credential guessing, covert camera activation, or access to other people's feeds.
- No usernames, passwords, stream tokens or pairing secrets in GitHub, logs, screenshots, atlas exports or ordinary site notes. Choose a proper local credential store during the transport implementation.
- Camera/video connection and microphone/audio consent are separate. Preview off until a user action. Visible recording indicator, explicit start/stop, and a tested disconnect behavior are required before recording ships.
- Do not expose a raw camera feed to the public internet or change firewall/endpoint policies as a setup shortcut. Remote access must use a supported authenticated connection.
- Public provider viewing rights do not permit arbitrary recording/rebroadcasting. Private field recordings likewise need lawful placement and consent where appropriate.
- Disconnection, full storage, lost power and incomplete transfers must be visible. Do not fill gaps with simulated footage or mark a cached image LIVE.

## Release gates

Select hardware class/transport; verify provider/device access and cost; implement and test the chosen adapter, consent, local media persistence, credential handling and interruption cases on the authorized personal Windows computer. Update the complete privacy policy, Store declarations, ratings and listing to match the actual delivered feature. There is no field-camera hardware or microphone-permission change in this planning commit.

Microsoft camera/Edge privacy reference: https://support.microsoft.com/en-us/windows/privacy/windows-camera-microphone-and-privacy
