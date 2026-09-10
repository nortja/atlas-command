# Optional My Field Camera module

Owner: Jaison Norton. Updated 2026-09-09.
Status: consolidated release design; NOT implemented as a private IP/field-camera player. The existing public USGS snapshot adapter does not connect to privately owned hardware.

## Owner direction

Original request: 'I would also like to add a field camera if needed.'
Usage: 'Probably both' on site and watching a remotely deployed camera from home.
Latest camera architecture clarification: owner wants broad standards-based camera support through manually entered IP address/hostname rather than one-brand-only support.
Latest hardware clarification: owner does not currently own a camera and expects to use a generic standards-based IP camera rather than targeting a specific make/model first.
Latest credential preference: owner wants camera credentials entered once and then saved securely for reuse on the same Windows user account.
Latest live-view preference: after a successful connection test, Atlas should NOT automatically open the camera stream. Show an explicit 'Open live view' button instead. When opened, live view should stay in a large workspace panel while the globe and selected-site information remain visible. Provide an optional larger expanded view on demand.
Latest layout preference: remember each camera's last live-view panel size and position, with a clean default layout available as a reset/fallback; always reopen in the normal workspace view for consistency rather than remembering expanded mode.
Latest recording preference: owner wants local recording support in addition to live view and snapshots when the camera/transport is actually supported and tested.

Design for manually adding authorized cameras by IP address, without a single-brand restriction. Do not require a model-specific catalog entry for every supported standards-based camera. Do not interpret this as universal camera compatibility, permission to connect now, or authorization to purchase equipment or services.

Because there is no first owned device to optimize around, the first compatibility target is intentionally vendor-neutral: prefer cameras that advertise standards-based ONVIF media services and expose RTSP H.264. Atlas should discover and use capabilities advertised by the exact user-entered device, then fall back to explicit manual stream settings when standards discovery is unavailable or incomplete. Vendor-specific path guessing remains out of scope.

## Add by IP workflow — planned, not delivered

My Field Camera > Add camera > IP address/hostname > Secure sign-in > Test camera > Choose stream when needed > Open live view.

Simple fields: friendly name, IP address or hostname, connection mode (On Site / Remote Watch), connection method, username and a separately entered masked password. Advanced fields expose ONVIF service port/path, RTSP port/path, channel/stream profile, supported transport/codec options and snapshot endpoint. Avoid implying that web UI, ONVIF service and RTSP streaming share one port.

The IP address identifies the endpoint; it is not necessarily the full stream address. Support a manually supplied stream path when the camera cannot supply it through a supported ONVIF media service. Do not guess a brand's path, bypass authentication, or probe unrelated addresses.

Test connection must be a deliberate action to the entered endpoint. Distinguish address/route failure, authentication failure, unsupported protocol/codec, certificate validation failure, and successful decoded video or snapshot. A response to ping, HTTP or authentication alone is not proof of live playback. After a successful test, show an 'Open live view' button. Do not auto-start video merely because the camera passed the test. Reconnecting a saved camera is a separate deliberate action; saving a profile does not activate it on future app starts.

## Credential storage design

The owner has selected 'enter once, save securely'. Credentials must therefore be stored outside the ordinary Atlas workspace and outside camera-profile metadata.

Implementation target:
- Store username/password secrets in a Windows-protected credential store bound to the current Windows user account. Prefer Windows Credential Manager or an equivalent Windows-protected mechanism that can be tested with the packaged Win32 app.
- Camera profile data stores only a non-secret credential reference identifier. It must never store the password, access token or full credential-bearing URL.
- Password fields are masked and never pre-populated with plaintext. The UI may show the saved username plus 'Credentials saved on this PC' without revealing the secret.
- A 'Forget credentials' control removes the saved secret without deleting the camera profile.
- Changing the camera address invalidates or re-confirms the credential association before reuse.
- Credentials must not appear in command-line arguments, process titles, logs, crash reports, diagnostic exports, screenshots, clipboard operations, ordinary backups, JSON/KML exports, GitHub Actions, or source control.
- Failed authentication must not dump server responses containing secrets. Diagnostics redact usernames when practical and never include passwords/tokens.
- Credentials are scoped to the current Windows user. Atlas must not claim the same secret automatically follows the profile to another PC. Profile transfer requires re-entry unless a future separately designed protected migration mechanism exists.
- The app must not silently retry a rejected password indefinitely. Repeated failures should stop and ask the user to update credentials.
- Remote Watch must not forward stored credentials to a different hostname/IP returned by a redirect or device response without explicit host validation.

This credential-storage design is approved as owner preference but still requires clean runtime validation before it can be described as release-ready. Do not request the owner's actual camera password in chat or commit any test secret to GitHub. Test credentials must be temporary synthetic values on disposable test systems.

## Standards-based compatibility targets

- ONVIF media capability/profile queries for the single entered device: retrieve supported stream/snapshot URIs where offered. Automatic mode tries ONVIF first for the exact saved device only, then offers RTSP/manual fallback when needed. This is an implementation target, not a claim that Atlas is ONVIF-conformant or certified.
- Direct RTSP video input with H.264 as the initial generic decoder target. Qualify transports, authentication and codecs explicitly. H.265/other codecs, RTSPS/SRTP and vendor-specific behavior need their own implementation and tests; do not mark them supported merely because an address is accepted.
- Explicit HTTP(S) JPEG snapshot endpoints and MJPEG streams where implemented and verified. Keep periodically refreshed JPEG stills distinct from continuous video.
- PTZ, audio, device telemetry, recording and retrieval of device-side recordings only when both camera and Atlas adapter support and have tested them. Controls for absent functions stay unavailable with a reason.

Recommended generic camera baseline for future owner purchase/testing: ONVIF Profile T or compatible media-service support, RTSP H.264 main/sub stream, local LAN access without a mandatory cloud relay, documented local credentials, and optional HTTPS/snapshot support. Treat this as a compatibility preference, not a purchasing endorsement of any brand.

Broad compatibility means compatible interfaces, codecs and authentication across brands, not every camera with an IP address. Cameras limited to proprietary provider services may need a supported provider integration and may not work by IP alone. No brand or subscription has been selected.

The native media/transport implementation is still to be chosen and reviewed. An RTSP address must not be handed to the existing browser UI as if that alone supplies a working decoder. Do not download executable adapters or arbitrary player code as ordinary data updates. Test and bundle required components through the normal application release path.

## On Site, Remote Watch and offline media

On Site: manually connect to a reachable camera on the user's local network or authorized camera network. Built-in/USB and phone/action-camera integrations remain separate optional adapters, not presumed supported by the IP workflow. Working local camera networking can be independent of internet service; the selected connection still needs to be reachable.

Remote Watch: use the authorized remote network through a properly configured authenticated VPN/private route or a specifically supported secure provider integration. A private LAN IP is not automatically reachable from another internet location. Do not instruct the owner to publish an unauthenticated stream, open camera ports to the internet, turn on UPnP mapping, or weaken endpoint/firewall protections. A vendor's remote-view app does not imply it exposes an API or a route usable by Atlas. Connectivity, power, any provider costs, and exact remote transport must be verified separately.

Offline media: import originals from a camera/memory card when available. Preserve capture metadata separately from import time. Device-side recording and later file import are not live remote viewing or implemented automatic synchronization.

Remote Watch is a user-opened viewing session. Do not claim the desktop app records while closed or asleep. Background recording, device event alerts and overnight jobs require separate implementation and acceptance.

## Recording design

Recording is an approved product target, but it must remain deliberate and visible. It is not active yet.

- Recording starts only from an explicit Record control while a verified live view is open.
- Default destination is Atlas local media storage on the current PC; do not silently write to cloud services or camera-side storage.
- Show a persistent red recording indicator, elapsed time and a clearly reachable Stop recording control.
- Never start recording automatically on app launch, camera reconnect, motion event, or scheduled background task unless a future separately approved feature adds that behavior.
- Keep audio off by default. If camera audio is supported, recording audio requires a separate visible user choice and must not imply talkback/microphone capture.
- Preserve source camera profile ID, start/end timestamps, codec/container metadata actually known, and linked site/mission reference as metadata. Do not claim camera GPS or capture location unless the camera reports it or the user explicitly labels it.
- If storage is low, stream drops, codec changes, or the app closes, stop safely and preserve the last valid recording segment when possible; never display an incomplete/corrupt file as a successful recording.
- Recording files must be clearly separated from credentials. Credentials must never be embedded in filenames, metadata exports, logs, or media paths.
- Initial recording target should favor passthrough/remux of a verified H.264 stream when technically safe, reducing unnecessary CPU load and quality loss. Transcoding should be a later compatibility path, not assumed.
- Recording while Atlas is closed, Windows is sleeping, or the user is signed out is out of scope for the first finished version.

## Interface and privacy

Retain B — Expedition: warm charcoal, brass accents, editorial camera/site headings, modern controls and aligned readings. Use On Site / Remote Watch tabs, a prominent preview, optional saved-camera selector and compact controls. Public Cameras and My Field Camera remain separately identified.

Camera setup should follow a smooth guided four-step journey: 1) Details, 2) Secure sign-in, 3) Test camera, 4) Open live view. After step 3 succeeds, present a clear primary 'Open live view' button. Do not automatically start streaming.

Default live-view layout: open the camera inside a large resizable workspace panel, not a modal takeover. Keep the globe visible and interactive, and keep the selected-site dossier visible at the same time. Preserve camera name, location, linked site, stream status, last-contact/frame freshness and key controls around the preview. The camera panel may temporarily reduce less-important secondary panels, but it must not hide the globe or selected-site context by default.

Per-camera layout memory: after the user moves or resizes a live-view panel, save that panel geometry for that specific camera profile and relevant viewport class (laptop/desktop/ultrawide). Reopening that camera should restore its last valid size and position. Clamp restored geometry to the current usable workspace so panels cannot reopen off-screen after monitor changes, resolution changes, docking, or window resizing. Never let remembered geometry cover required close/stop controls. Provide a simple 'Reset camera layout' action that returns the active camera to the clean default panel placement without deleting the camera profile or credentials. Always reopen in normal view; expanded state is intentionally not remembered.

Expanded live view: provide a deliberate 'Expand' / 'Larger view' control. Expanded mode may occupy most of the Atlas workspace but should still preserve a compact way to see the selected-site identity and return to the normal command-center layout. It is not an automatic fullscreen mode. A separate true fullscreen option can be evaluated later if useful.

The live-view controls should remain simple: Open live view, Stop live view, Expand/Restore, Mute/unmute camera audio only when supported, Snapshot once implemented, Record/Stop recording once tested, and status. Do not crowd the default view with PTZ, codec, transport or diagnostics controls; place advanced supported controls in a secondary drawer or menu.

Show friendly name, linked site/mission, last contact, capture time if supplied, and explicit Live video / Snapshot / Recording / Paused / Unavailable status. Connection, recording and frame freshness are separate indicators. Do not infer power or network failure solely from an old image. Never show a cached image as LIVE.

Battery, signal, storage, solar input and other telemetry appear only when actually reported. Otherwise show 'Not reported'. Before saving media, confirm the destination site. A linked site's coordinates must not be written as measured camera GPS. Keep device addresses, locations and media private by default.

Credentials must stay separate from research records and ordinary settings/export files. The chosen design is one-time entry followed by Windows-protected reuse on the same Windows user account. Never place credentials or tokenized URLs in GitHub, logs, previews, command-line process arguments, shared exports or chat. Redact endpoint secrets from diagnostics.

Camera activation, camera audio, microphone/talkback and recording require separate deliberate controls. Audio and microphone off by default; a visible recording indicator and tested stop/disconnect are required before recording ships. No covert capture or internet/LAN scanning. Use only owned or expressly authorized devices and respect placement/recording rights.

Do not turn the fixed-source public camera adapter into an unrestricted URL proxy. A private-camera transport must authorize the selected endpoint, validate any device-returned URL and redirect, bound responses/timeouts/retries, guard against unrelated local services or metadata endpoints, and not forward credentials to a new host without verification. Do not disable TLS certificate checks globally. Address-family and private-route handling need tests rather than blanket blocking of all legitimate local camera addresses.

## Release gates

Implement the saved-profile UI, Windows-protected credential handling and narrowly scoped transport. Qualify supported protocols/codecs, consent, image/video decoding, interruptions, local media saves, recording start/stop/recovery, wrong-password behavior, unsupported devices, credential removal and changed-address behavior. Because there is no owner camera yet, automated/synthetic ONVIF and transport tests can advance development, but final compatibility acceptance still requires a real authorized standards-based camera before claiming hardware support.

Update privacy disclosures, Store declarations, ratings and feature claims to exactly match delivered functions. No claims of full ONVIF conformance, remote recording or universal IP-camera support without evidence. The existing certified package remains separate from this design.

This commit updates scope documentation only. No new camera transport, decoder, installer, Store submission, publishing hold, billing, network settings or camera/microphone permissions have changed.

## Primary technical references reviewed 2026-09-09

- ONVIF profiles and cross-vendor feature boundaries: https://www.onvif.org/profiles/
- Profile T scope and conditional features: https://www.onvif.org/profiles/profile-t/
- ONVIF media operations including GetProfiles, GetStreamUri and GetSnapshotUri: https://www.onvif.org/onvif/ver20/util/operationIndex.html
- Axis RTSP addressing, credentials and transport examples: https://developer.axis.com/video-streaming-and-recording/video-streaming/how-to-guides/rtsp/
- Axis remote access guidance discouraging port mapping: https://help.axis.com/en-us/axis-camera-station-pro-integrator-guide
- Windows camera/microphone privacy: https://support.microsoft.com/en-us/windows/privacy/windows-camera-microphone-and-privacy
