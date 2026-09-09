# Weather display units — development update

Owner: Jaison Norton. Date: 2026-09-09. Branch: develop/next-workspaces.

## Implemented

- Fahrenheit and mph are the default for new and legacy workspaces with no saved unit preference.
- Settings contains two ordinary, clearly labeled buttons: °F + mph and °C + km/h, with selected state and save feedback.
- Preference is saved locally as settings.weatherUnits. It survives changing the selected site, page reload and native-host restart.
- Bundled modules share AtlasWorkspace.weather.getUnits/setUnits. AtlasWeatherUnits.quickGlance formats temperature, feels-like, wind and gusts consistently from canonical Celsius/km/h readings; it does not mutate readings or accumulate conversion rounding errors.
- Missing readings display a dash rather than fabricated zero values. Invalid unit writes are rejected. Saves are serialized; failures are reported and the previous in-memory preference is restored. A failed response does not guarantee the state of disk if an acknowledgement was lost.
- Native serving and future package file lists include the bundled units module. No remote-data permission, feed, signing, Store upload or installation was added.

## Verified tests

21 unit/formatting/persistence-controller checks passed in local Node tests. The full 113-check development Node suite and native compilation passed in the Windows workflow.
Successful workflow: https://github.com/nortja/atlas-command/actions/runs/34367834453
Job: 102521049928, conclusion success.
Input commit: abdd25cf3df3f2760436522523c4695f35e0bbec.
Tested generated source commit: c05b9c7f7ac1e153afdf37cac9f5577d2dcef539.

Seven actual native UI checkpoints passed:
1. Default Fahrenheit/mph selected in Settings.
2. Switching to metric writes to native disk without changing site records.
3. Metric choice survives renderer reload.
4. Deliberately failed local write shows an error and restores prior in-memory selection.
5. Retry succeeds; selecting another location does not reset the preference.
6. Choice survives actual native-host stop and restart.
7. No uncaught page errors or external renderer requests occurred during these interactions.

Environment: unpackaged native helper and installed Microsoft Edge on GitHub-hosted Windows Server 2022. Not a Windows 11 packaged-install, physical-touch or endpoint-clearance test. Initial workflow 34367473993 failed because the test assumed the first debounced workspace save had already occurred; the corrected test explicitly saves through the real default-unit button before inspecting disk. No application security setting was weakened.

Artifact: 10110633679; SHA-256 9fba7ef94d01519ecfbde7fbc50902c211188de90855349d4b405b4c864184e8. Downloaded archive hash and CRC verified. It contains an actual 1920x1080 Settings screenshot and WEATHER-UNITS-RESULTS.json only.

## Still to build

Live weather is not connected in this preference-only update. The actual weather quick-glance card, provider integration, cached feed freshness, global cloud/rain layers, selected-area emphasis, day/night and solar/lunar enhancements remain next work. Do not present a simulated lightning pulse as a measured live strike.

The owner has specified subtle weather globally, stronger emphasis around the selected area, and a readable quick-glance weather card. That card and any overlay labels should use this single saved units preference rather than independent settings. No additional units decision is needed.

Main was checked and remains 345552aa0761bc1bcbfeca68d8401a5fe2b32970. No submitted MSIX, Partner Center setting, billing control or employer-device configuration was changed by this update. This development source is not a new installer or a release approval.
