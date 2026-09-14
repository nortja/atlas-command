# Guarded saves and read-only conflict comparison

Design before implementation, September 14, 2026. Baseline 3fe9adb, executable
86acea9 / native run 34904302531 green. Branch develop/ui-directions only.

Close the remaining legacy ordinary-workspace endpoint, migrate native test helpers
to explicit revision-bearing reads/writes, and add a read-only newer-copy comparison
in Recovery. Never fetch a new revision and silently retry an old user's write.
Tests may explicitly read an expected revision before constructing a fixture save;
the actual renderer keeps its existing revision, conflict lock and deliberate reload.

Comparison validates both workspaces, reports added/removed/changed site names and
field-category labels, and counts changes to queue, plans, layout and settings.
It does not return note text, coordinate values, camera details, media keys or team
content. This summary stays in the local dialog; no persistence, logs or export.
It is a point-in-time inspection, not authorization to merge or overwrite. Opening
comparison never changes the active writer's revision. Invalid/unreadable newer data
must not enable discard or restore automatically. Existing manual recovery remains.

Threat boundary: revision checks prevent stale cooperative clients from overwriting
newer state through supported host APIs. They do not defeat an application with the
same filesystem privileges, rollbacks or a patched host. Teams cryptography and
Midnight remain separate. Legacy clients receive a fixed retirement error, not an
unguarded compatibility write. Private diagnostics remain fixed and content-free.

Plan: model and tests; integrated comparison UI; retire endpoint and migrate native
fixtures; full staged/browser checks and local compile; push dev and validate native
on disposable Windows. Keep telemetry OFF and no production networking or Store work.

## Implementation checkpoint

Implemented metadata-only saved-copy comparison, 12-row pagination/search/type
filters, fixed failures, cancellation and preserved conflict lock. Invalid saved
copies never replace the active workspace or adopt their revision.

The legacy api/state endpoint now returns a fixed 410 after existing request guards.
Native fixtures use api/state-v2 with an explicit expected revision. Same-context
close beacons now reach the guarded endpoint (the prior host allowance still named
the old endpoint). Stale revisions and unmarked cross-context writes remain refused.
The renderer suppresses closing beacons after save failure until a successful retry.

463 locally runnable logic tests passed; the installer fixture remains hosted-only
because local execution policy blocks its generated script. All nine browser suites
passed; recovery was rechecked after the final closing safeguard. Local native
compilation passed without installation or launch on owner data. Hosted native
validation is complete. The phone-width recovery screenshot was checked.

Native CI caught an overbroad integration replacement that removed neighboring camera
test routes. The recipe now ends at the exact legacy block, with source assertions
that both route/ONVIF handlers survive. The corrected stage passed all local tests and
compiled; final native verification passed. Comparison also normalizes
legacy display names and clears previous errors on retry without mutating records.

## Device review

Extract both ZIPs from the green preview artifact into a fresh folder, close the old
Atlas, then run AtlasCommand.exe. Open Overview → Recovery → Compare saved copy.
An unchanged workspace should show no changes. Check the search/type controls and
phone/touch readability; closing the comparison should leave everything unchanged.
Optionally save a disposable note and verify normal shutdown/reopen. No need to
manufacture a conflict or restore real research: those paths are automated tests.
Physical touch feel and Windows 10/11 installation remain owner-device checks.

## Remaining scope

Comparison is not a merge engine or content editor; site names appear locally, while
field values stay out of summaries. Old clients cannot use the retired endpoint.
Open the newly packaged app rather than mixing an older renderer with this host.
Media-inclusive archives and signed update delivery remain future milestones.
This does not add networking, wallet access, or cryptographic authorization.

## Verified delivery

Executable source d9f3ef8b5551903bdbccac02cb995338a4f25b9d on develop/ui-directions.
Run 34907814676 passed all 464 logic tests, packaging and all 13 native runtime
scripts. Camera/ONVIF routes, metadata-only comparison, guarded closing writes,
stale/cross-context refusal, corrupt-workspace preservation, encrypted Teams/DPAPI
and Midnight rehearsal all passed. Earlier runs 34907358863 and 34907612287 used
the overbroad integration range; the final run verifies its correction.

- Run: https://github.com/nortja/atlas-command/actions/runs/34907814676
- Download: https://github.com/nortja/atlas-command/actions/runs/34907814676/artifacts/10374015208
- Artifact expires September 17, 2026 at 23:22 UTC.

Changed source: workspace-comparison model/UI, workspace-recovery-ui and
workspace-storage; integrate_guarded_recovery recipe; owner-preview workflow;
comparison/close-save tests and native fixture migration; AGENTS and recovery docs.
Generated app/native outputs stay in ignored staging. No main or Store changes.
