# Optional My Field Camera module

Owner: Jaison Norton. Updated 2026-09-09.
Original request: 'I would also like to add a field camera if needed.'
Status: included in consolidated release planning; NOT connected or implemented as a live field-camera adapter. The public USGS snapshot adapter does not connect to a user's hardware.

## Owner direction

Asked whether he would primarily use a camera at the site or leave it remotely and watch from home, the owner answered: 'Probably both'.

Plan for both workflows under one optional My Field Camera module, with separate On Site and Remote Watch connection profiles. This is a tentative usage preference, not selection of hardware, authorization to activate a camera, approval to purchase a subscription, or confirmation that one camera will support every workflow.

## Options to consider before feature freeze

1. On Site: supported built-in or USB camera preview with explicit Windows/browser permission, deliberate capture actions and local attachment saves. A phone or action-camera connection is an additional adapter option, not presumed compatible. Camera and microphone activation are separate; microphone off by default. Actual camera compatibility and permission-denied paths require physical-device testing.
2. Remote Watch: explicit pairing of the owner's known device/provider, authenticated supported transport and real status. Requires the particular camera's supported live-view/API capabilities and working connectivity at both ends. Do not assume every cellular/trail camera supports continuous live video. Do not promise operation without signal or free cellular/satellite transport. Review actual power, transport, data costs and provider restrictions before selecting an adapter.
3. Offline expedition media: import original photos/clips from camera/SD card when available, attach them to a mission/site and preserve provenance. Offline capture/recording belongs to the device unless a local capture implementation is provided; it is not live remote viewing. On-device recordings can be imported later; automated synchronization is not implemented or promised.

## Proposed common interface

Use the refined B — Expedition visual language: warm charcoal, restrained brass, editorial camera/site headings, modern controls and aligned numerical readings. One optional Field Camera panel has On Site and Remote Watch tabs, a prominent preview, a compact control bar and a camera/source selector. Public Cameras remains separately identified from private owner devices.

Show friendly camera name, linked site/mission, last-contact time, capture time when supplied, and an explicit Live video / Snapshot / Recording / Paused / Offline state. Connection, recording, and data freshness are separate indicators. Preview and microphone are off until deliberate action. Recording controls must remain unavailable until the selected adapter has a tested recording implementation.

Battery, signal, local storage, temperature, solar power or PTZ appear only when the device actually reports/supports them. Missing telemetry is 'not reported', never invented. Device connection or power failure must not be inferred merely from a stale picture.

Manual snapshot, clip capture or import should explicitly identify the destination site before saving. A selected site's coordinates must not be written as measured camera GPS. Preserve original capture metadata separately from import time and user-entered location. Keep field-camera locations, media and pairing credentials private by default.

Remote Watch is a proposed user-opened viewing session. Do not imply this desktop app watches or records while closed or while the computer sleeps. Background services, automatic overnight recording and device-side event alerts require separate implementation and testing. Refresh of snapshots is not continuous video.

## Security and recording rules

- User-owned or explicitly authorized devices only. No automatic internet/LAN camera scanning, credential guessing, covert camera activation, or access to other people's feeds.
- No usernames, passwords, stream tokens or pairing secrets in GitHub, logs, screenshots, atlas exports or ordinary site notes. Choose a proper local credential store during the transport implementation.
- Camera/video connection and microphone/audio consent are separate. Preview off until a user action. Visible recording indicator, explicit start/stop, and a tested disconnect behavior are required before recording ships.
- Do not expose a raw camera feed to the public internet or change firewall/endpoint policies as a setup shortcut. Remote access must use a supported authenticated connection.
- Public provider viewing rights do not permit arbitrary recording/rebroadcasting. Private field recordings likewise need lawful placement and consent where appropriate.
- Disconnection, full storage, lost power and incomplete transfers must be visible. Do not fill gaps with simulated footage or mark a cached image LIVE.

## Next question

Does the owner already have a camera to connect, and if so what make/model, or are we selecting the first supported device from scratch? Ask this as one question. No hardware purchase or subscription has been selected. Do not request camera credentials in chat.

## Release gates

Select hardware class/transport; verify provider/device access and cost; implement and test the chosen adapter, consent, local media persistence, credential handling and interruption cases on the authorized personal Windows computer. Update the complete privacy policy, Store declarations, ratings and listing to match the actual delivered feature. Each supported workflow needs its own acceptance checks; one successful adapter test is not universal camera compatibility.

This update changes scope documentation only. No runtime code, installer, Store submission, publishing hold, billing, camera permission or microphone permission has changed. No tests were rerun for this documentation-only update. Do not describe this scope as delivered field-camera support.

Microsoft camera/Edge privacy reference: https://support.microsoft.com/en-us/windows/privacy/windows-camera-microphone-and-privacy
