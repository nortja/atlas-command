# Atlas Command — consolidated release scope

Owner: Jaison Norton. Date: 2026-09-09. Branch: develop/next-workspaces. Status: planning plus development work; NOT a declaration that the complete product is implemented or approved.

## Release approach

Finish and test a coherent private Windows release before making one consolidated Store submission, rather than submitting every small change. Ordinary weather responses, camera imagery and research records can be data inside existing features. New application code/features still require the Store update process; this plan is not 'approved once forever' and does not permit unreviewed downloaded code. Preserve the earlier 1.0 submission's existing manual publishing hold and private audience. Do not publish or cancel it without an explicit owner action.

Keep Store MSIX distribution: Microsoft handles Store package signing and software delivery. An external installer would shift signing, hosting and updates to the owner. A web/PWA deployment would change local/offline behavior. Arbitrary executable plug-ins expand security and review requirements. No architecture switch, paid subscription, account-wide GitHub access or hardware purchase is authorized by this scope.

## First-release module decisions and gaps

- Command center: rotating globe, Observatory/Mission, saved layouts, laptop/ultrawide controls, idle mode. Still needs final visual, accessibility, touch/DPI and personal Windows packaged testing.
- Ancient atlas: local editing and CSV/KML/KMZ imports, chronology and five mystery levels. Current starter catalogue is 26 records, not the complete Google Earth atlas. Import and audit the prior catalogue, sources, images, duplicate pins and globally balanced coverage; initial ceiling remains 1,000 records, not a count claim.
- LiDAR: all-era evidence desk. Survey footprints and source-reviewed expansion remain. Raw LAS/LAZ rendering is a distinct specialist feature, not delivered by a metadata table.
- Live Earth: model-based clouds/rain, selected-area card, cached/stale labels, present-day solar shading and approximate lunar phase. Satellite clouds, measured lightning, official severe-weather alerts, solar activity and precise historical ephemerides still require validated providers/implementations.
- Public cameras: camera desk source code adds three fixed USGS JPEG snapshot sources and official NASA/NPS continuous-video links. Snapshots must not be called continuous video; a link is not an embedded player. Native/source tests must pass before delivery claims.
- My Field Camera: newly requested optional private module. See FIELD-CAMERA-SCOPE.md. Hardware class, remote-versus-on-site use and authenticated transport are not yet selected. No field device is connected or recording.
- Scientific research: retain manual sourced alignment workbench. Historical magnetic/sky calculations require dated models, uncertainty, orientation evidence and appropriate comparison sites; no lossless 100,000 BCE celestial reconstruction or calibrated discovery probability is implied.
- Minerals/fossils: records and field notes. Reviewed locations, collecting/land-access rights and current local conditions remain separate evidence tasks.
- Expeditions: mission queue, manual budgets and checklist already exist. Current advisories, real travel-time/cost options and guide directory need sources and update times. Booking/payment handling is not connected and must not be represented as functional.
- Updates: real weather refresh modes and optional snapshot refresh, while app/panel visible. Still needed: schema-validated research content packs with review/accept/rollback and protection of private notes; no executable or HTML/JS update channel.
- Recovery: current record saves are atomic; JSON backup does not include attachments. Media-inclusive backup/restore, missing-file diagnostics and upgrade/uninstall recovery remain release work.
- Privacy/release: consolidate disclosures for every implemented data provider and optional camera capture. Complete package validation and authorized personal Windows 11 tests, accurate listing/screenshots/ratings and the new submission review. Existing 1.0 certification does not certify 1.1.

## Prioritized completion path

1. Finish and verify public camera desk and data-refresh controls; finalize field-camera use case before choosing hardware/transport.
2. Complete safe data import/update and media-inclusive backup/recovery.
3. Audit/import the earlier atlas and implement provider-backed research/expedition features selected for the release. Unsupported features stay out of marketing and active controls.
4. Freeze first-release scope, test the exact package on authorized Windows, then prepare a single complete submission for owner review.

Chat/collaboration, VR, commercial booking, arbitrary executable plug-ins and resale/rebroadcasting of third-party camera footage require additional explicit scope/licensing/privacy decisions; they are not silently included.

## References

Microsoft update process: https://learn.microsoft.com/en-us/windows/apps/publish/publish-your-app/msix/publish-update-to-your-app-on-store
Microsoft Store policies: https://learn.microsoft.com/en-us/windows/apps/publish/store-policies
GitHub permission scopes: https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax#permissions
