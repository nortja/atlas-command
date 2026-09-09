# Live Earth — verified development update

Owner: Jaison Norton. Date: 2026-09-09. Repository: nortja/atlas-command. Branch: develop/next-workspaces. Development version: 1.1.0.0; not submitted or approved for release.

## Implemented

- Opt-in Open-Meteo model weather; selected-area quick-glance card with current temperature, feels-like, wind/gusts, cloud cover, interval precipitation, six-hour temperature/rain-chance forecast, source timestamps and provider-calculated sunrise/sunset.
- Fahrenheit/mph default and persistent Celsius/km/h toggle. Unit changes reformat cached readings without another provider request.
- Subtle global clouds/precipitation from a fixed 288-point, 15-degree model-sampling grid, with stronger visual emphasis near the selected record. This is a stylized sampled model view, not satellite imagery, radar or a measured storm footprint.
- Approximate present-day solar day/night shading and mean-cycle lunar phase. Today's globe overlays hide in historical years; the weather card stays explicitly labeled TODAY.
- Idle globe focus and rotation after a 60-second inactivity threshold, checked on a 30-second timer. Input restores the previous focus/rotation. Reduced-motion settings are respected.
- Local cache, updated/cached/stale/unavailable states, request and size limits, opt-out. Local refresh: 20 minutes; global: 3 hours while visible and enabled.
- Fixed inherited normalizeSite behavior that reset updatedAt on reload. Valid edit timestamps persist; actual site edits advance them. The strict full-record preservation assertion was retained, not weakened.
- Updated module-registry and native diagnostic wording for the optional weather connection.

## Actual verification

Successful workflow: https://github.com/nortja/atlas-command/actions/runs/34375430452
Job: 102546909590, conclusion success.
Automation input: 3debe38487efec370755557e799547133a02b05a.
Tested materialized source: 7ca5f1aead325c56713f8c54264096dc4348f990.

The full 152-check Node suite passed locally; the identical checked-in suite passed in the Windows workflow. Native compilation passed. All 34 native-interface checkpoints passed: 13 workspace/LiDAR, 7 units, and 14 Live Earth checkpoints.

Live Earth used eight actual HTTP 200 Open-Meteo responses: two public starter locations and six batches totaling 288 global coordinates. No prerecorded/fabricated success response was substituted. Checks covered consent, request parameters, native cache writes, units, four viewport sizes, real idle timeout/wake-up, historical-view separation, changing selected sites, simulated network interruption, deliberately stale timestamps, opt-out/cache removal, renderer errors and actual native-host restart.

The first weather workflow 34374159721 failed after ten successful weather checkpoints because reloading site records changed their updatedAt timestamp. The second run fixed the underlying normalization and passed the same full-record equality assertion. The earlier failed run is not counted as successful.

Environment: real unpackaged .NET helper and installed Edge on a disposable GitHub-hosted Windows Server 2022 runner. Not Windows 11 packaged installation, physical-touch acceptance, a machine-wide network audit or SentinelOne clearance. The older unit-only report's no-live-connection wording describes its opt-out scenario; the separate Live Earth test verified the real connection.

## Preview provenance

Artifact: 10113784559, atlas-live-earth-preview.
Original ZIP SHA-256: 8733beba19d0ad4bf1825fda99ad4ccca21612029347566689c1ad85048333fc.
Downloaded ZIP hash and CRC were verified. Successful checkpoints and source hashes are in LIVE-WEATHER-RESULTS.json. Images were visually inspected: actual interface captures, not generated concepts.

Views: full observatory (2560x1440), selected-area card crop (368x457), laptop (1366x768), intentionally interrupted-network/cached view (2560x1440), and idle globe (2560x1440). The small card crop is a development detail preview, not a standalone Store-compliant desktop screenshot. Do not replace the older submitted package's listing images with new-feature previews. Weather values are captured examples, not forecasts for later use.

## Privacy, cost and release separation

Weather is off until explicit in-app consent. The provider receives connection IP and requested coordinates rounded to 0.01 degrees; rounding is not anonymization. Site names, notes, attachments and Microsoft-account details are not included in weather request parameters. The new CSP adds only the fixed HTTPS data origin to connect-src, without external scripts or unsafe-eval. No employer security settings were changed.

The free Open-Meteo endpoint is limited to personal/non-commercial use and provider usage limits. No paid account/subscription was created. Review licensing before wider or monetized distribution. A draft next-version weather privacy addendum was prepared separately; the full in-app/Store policy needs review before shipping 1.1. Weather cache in workspace settings may appear in exports/backups; Clear cached weather does not remove older copies or provider logs.

Main verified unchanged at 345552aa0761bc1bcbfeca68d8401a5fe2b32970. The owner's Partner Center screenshot shows the earlier 1.0 submission passed certification and remains Ready to publish on manual hold. This is screenshot evidence, not a Partner Center API read. No Store upload, publication, cancellation, certificate purchase, new MSIX installer, billing change or employer-device installation was performed.

## Remaining release work

Prepare the separately versioned weather package, update complete privacy disclosures and Store listing, validate package contents, and run packaged installation/update/storage/recovery checks on an authorized Windows 11 test system. Employer IT must authorize use on the managed work computer. The weather version needs its own Store submission/review; the certified 1.0 package does not contain these features.

Measured lightning, official severe-weather alerts, thunder audio, satellite-cloud imagery, solar-activity feed, precise historical ephemerides and raw LiDAR point-cloud viewing are not implemented. Do not describe the current model graphics as those capabilities.

Primary documentation checked 2026-09-09:
https://open-meteo.com/en/docs
https://open-meteo.com/en/terms
https://gml.noaa.gov/grad/solcalc/calcdetails.html
https://learn.microsoft.com/en-us/windows/apps/publish/publish-your-app/msix/publish-update-to-your-app-on-store
