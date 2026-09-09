# Workspace and LiDAR development update

Date: 2026-09-09. Owner: Jaison Norton. Development branch: `develop/next-workspaces`.

This report updates the implementation/test status in NEXT-BUILD.md. It is not a release approval or an installer.

## Implemented and integrated

- Explore, Research and Expedition panel presets; custom Save/Restore; reversible globe focus; separate desktop and ultrawide layout scopes; explicit save errors with state rollback.
- Versioned AtlasWorkspace API for the bundled modules. Record reads are copies. No arbitrary executable plug-in loader was added.
- Dedicated all-era LiDAR desk: search, verification filters, publication dates, research organization, dating confidence, location extent, evidence notes and access notes. Metadata is stored locally under each record's research.lidar property.
- Unreviewed records are not labelled unvisited. Verification/dating claims require both a source URL and evidence notes; the app does not independently validate the claims. Publication dates do not become archaeological dates.
- LiDAR Show on globe clears incompatible catalog filters, while retaining the all-era exception.
- Magnetic comparison saves preserve other modules' research metadata instead of replacing the whole research object.
- Corrected malformed HTML option tags inherited in the mystery-rating dropdown so all five choices are selectable; added a regression check.
- Added guards for malformed saved panel positions, bounded panel dragging, open-dialog hover protection, responsive controls and a visible development label.
- Native serving and future package allow-lists include the bundled new JS/CSS. The development version is 1.1.0.0 with NOT_SUBMITTED_NOT_APPROVED status. Publisher identity is unchanged.

No new archaeological discoveries were imported: the starter library still contains 26 records, including four generalized LiDAR survey records. There is no raw LiDAR point-cloud viewer, live discovery feed, historical magnetic model or calibrated prediction engine in this update.

## Actual test evidence

Successful workflow: https://github.com/nortja/atlas-command/actions/runs/34323685594
Job: 102375928857, conclusion success.
Automation input commit: `4d550253ca6b264a6449e8e585d5324227cdd293`.
Materialized, tested source committed to the development branch: `0c17c5a0a2eca6f2539f36ea1da49a89d9c8b1a2`.

All 92 code checks passed locally; the same source-check command passed on the Windows runner. Native compilation and all 13 UI/runtime checkpoints passed. The run used the real unpackaged native host and installed Microsoft Edge on a disposable GitHub-hosted Windows Server 2022 machine, not mocked native storage.

1. Integrated modules start through the versioned API in native storage mode.
2. Module record views do not expose mutable workspace objects.
3. All three presets and custom layout save/restore work through real local writes.
4. Layouts survive page reload from native disk storage without changing site records.
5. Globe focus can be reversed.
6. All-era LiDAR records remain in the desk; search and verification filters work.
7. Unsupported verification claims are refused without changing saved records.
8. Evidence notes and publication dates persist to disk and reload.
9. Magnetic saves retain LiDAR metadata.
10. A deliberately failed local save reports the error and rolls back layout state.
11. Laptop, ultrawide and compact viewports operate without horizontal page overflow; pointer taps were emulated, not tested on physical touch hardware.
12. No uncaught renderer errors or external renderer requests occurred during the tested interactions. This is not a machine-wide network audit.
13. Metadata survives an actual native-host stop and restart.

The first three attempts exposed and corrected two test/build harness issues (relative C# compiler paths and CSP-incompatible string polling) and the inherited malformed dropdown markup. Those attempts were failures, not silently counted as successful tests. No CSP or endpoint security setting was weakened.

## Actual previews

Artifact 10092894616, `atlas-next-workspace-preview`, contains four PNG screenshots and NEXT-TEST-RESULTS.json only. No executable or installer is included.
Artifact SHA-256: `3722c4a31b06a0205671caeb88bbff39ccd1bcb574a6375d97ecee351a131a69`.
The downloaded archive digest and CRC were verified; the test report records the tested source-file hashes.

- 01-Next-Observatory.png: 2560 x 1440.
- 02-Workspace-Chooser.png: 2560 x 1440.
- 03-LiDAR-Research-Desk.png: 2560 x 1440.
- 04-Laptop-Workspace.png: 1366 x 768.

These are development previews of actual application UI. Do not replace the screenshots for the older submitted package with these new-feature images.

## Isolation and remaining work

The main branch was checked and remains at `345552aa0761bc1bcbfeca68d8401a5fe2b32970`. The submitted 1.0.0.0 MSIX, Store listing, publishing hold and employer computer were not changed by these development actions. No billing settings were changed; the owner's existing zero-dollar Actions spending block remains required. No scheduled updates, signing service or new installer was enabled.

Windows 11 packaged installation, upgrades and uninstall/recovery behavior, physical touch hardware, accessibility acceptance, employer IT/SentinelOne review and certification of this new version remain unverified. There is no approved replacement installer from this update.

Next priorities: complete-media backup and recovery; import/media provenance and missing-file handling; source-reviewed expansion of the LiDAR register; validated magnetic/celestial provider interfaces. Keep the submitted release separate until new-version tests and the relevant release reviews are complete.
