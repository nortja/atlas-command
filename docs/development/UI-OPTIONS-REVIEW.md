# Atlas Command — UI options and camera verification

Owner: Jaison Norton. Review date: 2026-09-09.
Branch: develop/ui-directions. Development version 1.1.0.0, not submitted or approved.

## Implemented for review

Three bundled, selectable appearances share the same native workspace:
- A, Orbital: navy/cyan, rounded instrument cards and a luminous blue globe.
- B, Expedition: warm charcoal/brass, editorial serif headings and warmer globe contours.
- C, Signal Desk: graphite/mint, square panels, uppercase module headings and monospace readings.

The Appearance control persists the choice locally, serializes writes, reports save errors and restores the earlier selection after a rejected save. It does not change archaeological records, saved panel layouts, privacy choices, or the five established mystery-level colors.

The module navigation dock, original Atlas compass/globe mark, real site/filter/LiDAR/mission counts, and real mystery-rating count bars are implemented. The library remains 26 starter records, including four LiDAR records. The review tests add one actual starter site to the mission queue; screenshots do not claim it is a paid/confirmed expedition. No new archaeological discoveries or calibrated discovery probabilities were added.

Fixed the inherited collapsed-panel layout restoration error that could place the Expedition bar over the dossier after reload. Corrected heading word spacing and updated queue-change notifications. Comparison captures start at the top of the ordinary dossier scroll area and wait for the app's own transient toast to expire. They do not replace app content or insert illustrative data.

## Camera module

Real USGS panoramic and thermal JPEG snapshots were retrieved and rendered through the fixed-source native adapter after explicit consent. Their payloads are linked to the browser-rendered images by fetch-time and byte-length matches; image signature, dimensions and SHA-256 were checked. No fabricated image was substituted and the CSP was not loosened for test convenience. These are periodically updated still images, not continuous in-app video.

NASA and Yellowstone entries remain clearly labeled external official pages. The optional private field-camera adapter remains scoped, not implemented. The user's hardware type, on-site/remote use and actual permissions must still be established.

Manual weather refresh now persists, sends no automatic request after enabling in manual mode, and fetches a real point forecast on explicit Refresh. Preset refresh controls operate separately from software updates.

## Verification

Final successful workflow: https://github.com/nortja/atlas-command/actions/runs/34391008419
Job: 102599750862. Conclusion: success.
Input commit: 1dc9d1ebe8268eb5cb06edd21fe3d39b5ce6769a.
Tested materialized application-source commit: b193a7a896b4deaea9ab27d339e82c6240c77d59.

203 automated code checks passed. All 45 native UI/runtime checkpoints passed: 13 workspace/LiDAR, 7 unit preference, 13 cameras/refresh and 12 appearance checks. The appearance test fetched real Open-Meteo point weather and six batches totaling 288 global samples; the separate camera/refresh test fetched real USGS JPEGs and a real point forecast. No successful provider fixture replaced a live response.

The final artifact is 10119813877, atlas-ui-directions-preview.
Original archive SHA-256: adb89dcbc3c4c55471c338f7f275e9ac51df0e256db88469f7de0da5bc037972.
The downloaded archive digest and CRC were verified. All three final desktop captures and the Orbital laptop capture were visually inspected after the spacing and framing pass. Final UI reports contain source hashes and the successful materialized commit. Main-source generated changes are never pushed to the main branch by this workflow.

The tests use an unpackaged .NET helper and installed Microsoft Edge on disposable GitHub-hosted Windows Server 2022. This is not Windows 11 packaged-install, physical camera/touch testing, accessibility acceptance, a machine-wide security audit or SentinelOne clearance.

The camera report's legacy codeTests=175 field labels its older suite and is not the authoritative full-run test count; CODE-CHECKS.txt records the actual full suite.

## Earlier attempts and corrections

The initial appearance run (34388819249) exposed camera response-body inspection and focus-test assumptions, and visual inspection exposed the actual collapsed-panel overlap. The second attempt (34389661525) showed that a test fetch of a blob URL was rightly blocked by CSP and that the queue button was add-only, not a remove toggle. The final harness verifies the same cached native image bytes without a blob fetch, uses real Tab keyboard input for focus-visible, and checks idempotent queue additions. No application security policy was relaxed.

Run 34390196422 passed 203 code checks and 45 native checkpoints before final comparison framing refinements. Intermediate run 34390901625 started before the spacing stylesheet was committed; its source/UI steps passed but its generated-source commit step failed after the branch advanced. Its result is not used as the release or preview-verification basis. Final evidence is identified above.

## Release separation and next work

The main branch remains at 345552aa0761bc1bcbfeca68d8401a5fe2b32970. These actions do not modify the certified 1.0 MSIX, Partner Center, publishing hold, billing controls or any employer/personal computer. No replacement installer, certificate purchase, scheduled updater or Store publication was performed.

The review download contains eight actual appearance captures, four camera/refresh captures, test reports, a reading guide and an offline image gallery. No executable, installer or font files. Weather and camera values are timestamped capture examples, not current advice to use later. Do not replace the older certified package's Store screenshots with new-feature previews.

Next: owner feedback on the default appearance or a combination; consolidate source after review; finish complete media backup/recovery and precise privacy/feature disclosures; confirm and perform authorized Windows 11 package acceptance; then package and submit the new version. Ordinary data refresh is not a mechanism for bypassing software certification.
