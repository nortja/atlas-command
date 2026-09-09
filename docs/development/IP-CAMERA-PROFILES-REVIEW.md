# Atlas Command — manual IP camera profiles

Owner: Jaison Norton. Date: 2026-09-09.
Development branch: develop/ui-directions. Development version: 1.1.0.0.

## Delivered in development source

Camera desk > My IP cameras > Add IP camera now opens a working private camera-profile manager, styled with the current Atlas appearance. The review captures use B — Expedition, with warm charcoal/brass and classic headings plus modern controls.

Only camera name and IP address/hostname are required. Optional fields include a friendly location label, town/locality, state/region, country, description, local/on-site vs remote vs both, linked research site, reference latitude/longitude, viewing direction, mounting/access notes, placement date/status, make/model, and tags. Advanced setup fields record a planned connection method, service/stream port and path. These are setup metadata, not proof of supported playback.

Profiles can be created, edited, searched, filtered and removed after confirmation. Edits persist locally through application restarts. Unsaved-change prompts, input validation, revision checks, serialized writes and failed-save rollback protect data. Corrupt or future profile schemas refuse replacement instead of silently resetting the profile library. Up to 200 profiles are supported by the current model.

Reference coordinates are explicitly user-entered, not measured camera GPS. Linking a research site does not copy the site's coordinates or modify its research records. Deployed/planned/stored are the user's placement notes, not device reachability or telemetry. No private-camera pins were added to globe rendering in this increment.

The ordinary workspace JSON exchange omits private camera profiles. Site KML contains sites, not these profiles. Full native Data-folder backups still include camera metadata and should remain private. Camera records are stored as local metadata, not as an encrypted credential vault. No password/login storage is implemented. Credential-bearing endpoint URLs are refused and unknown credential properties are not profile fields; free-text descriptions are not a secret detector. Users must not place passwords or tokens in notes or stream paths.

## Clear limits

This is working profile management, NOT private IP video playback. ONVIF, RTSP/RTSPS, MJPEG and snapshot selections record the intended setup only. No camera was scanned, contacted, authenticated, activated or recorded. No network connection test exists in this increment. The UI says Not connected and makes the unavailable playback explicit. No microphone is activated and no camera credentials were requested from the owner. Public camera viewing remains separate.

Next camera milestone: a reviewed secure credential store and actual transport/decoder adapter, followed by authorized local/remote hardware tests. Broad protocol goals are not universal camera compatibility.

## Verification for this iteration

Workflow run: 34410732355, Validate private IP camera profiles, conclusion success.
Input commit: d20f39186c37a5403663b32bef76471a0680d5e5.
Tested integrated source commit: 43e76a3f818a91a3f7eaa92903fe8bdb1979d7ed.
Artifact: 10127171751, atlas-field-camera-profiles-preview.
Original archive SHA-256: 08c01b60556c59d9fe8ff1e53ddfb36b6bbefe843da3874c99f19985670099b6.

256 automated code checks passed, including 53 new camera-profile checks.
33 native-interface/runtime checkpoints passed: 13 workspace/LiDAR, 7 units, and 13 camera-profile checks. The new tests cover real native disk persistence, invalid address rejection, optional metadata, zero-coordinate pairs, linked-site isolation, search, unsaved-change protection, failed saves/retry, untrusted text rendering, several screen sizes, actual JSON export privacy, delete confirmation, reload and native-helper restart. No external requests were made during the new profile test.

The initial run 34410427529 passed code/compilation and existing UI tests but the new test harness called the nonexistent weather.read API. It was corrected to the existing weather.getUnits API. No application behavior or security control was weakened to pass the test. The final successful run above is the evidence for this iteration.

Tests used the real unpackaged .NET helper and installed Edge on a disposable GitHub Windows Server 2022 runner. These are not Windows 11 packaged-install acceptance, physical touch/camera tests, IP video-stream tests, or SentinelOne clearance. Existing live online weather/public-camera functionality was not retested by this new profile workflow.

The downloaded archive digest and CRC were verified; source hashes were compared with the inspected source, accounting for Windows checkout line endings. All three included native UI captures were visually reviewed. Their camera is explicitly labelled Demo and uses example profile data; it is not an installed camera or a claim of a live field view.

## Scope and release separation

The main branch is still 345552aa0761bc1bcbfeca68d8401a5fe2b32970. No Store submission, published listing, certificate, installer, billing setting, endpoint policy, employer computer or personal computer was changed. The existing certified 1.0 package remains separate from this development source. No broad GitHub permissions were requested.

Owner preview files contain three screenshots, this report, a static offline gallery and test results only. No executables, installers, credentials or fonts.
