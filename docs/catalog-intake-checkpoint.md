# Catalog intake and evidence review checkpoint

Batch started September 14, 2026 on develop/ui-directions, from green native
preview 7ab4ea7. Existing HD Earth, collaboration, privacy and lifecycle behavior
remain required. No production networking, Store publication or updater activation.

## Planned integrated batch

1. Review all incoming records with paged search, row selection, duplicate/conflict
   comparison and complete invalid-row feedback. Retain CSV, JSON, GeoJSON, KML
   and KMZ point imports. Never silently overwrite an existing record.
2. Bind commit to the reviewed local catalog state; wait for successful storage,
   report failures honestly, and provide guarded undo for the last session import.
3. Add a searchable evidence-review desk for missing sources, unresolved dates,
   unrated records and imported records, with direct navigation to site research.
4. Refine keyboard/touch flows, run source/browser/native checks, and provide one
   consolidated owner review. Preserve curated records and private team isolation.

## Checkpoint

Implemented the local intake model, full paged review, cross-page selection,
duplicate/ID comparison, invalid-row feedback, persisted add-only commit, guarded
session undo and evidence desk under Overview. CSV, JSON/workspace JSON, GeoJSON
points, KML and KMZ retain the existing parsers. No curated records were changed.
The selected-site API and appearance integration anchors are preserved; regression
checks now catch broken generated syntax and missing site selection.

Source/logic suite: 426 passing in the owner integration stage. Catalog browser
checks cover pagination, selection, escaped input, all supported formats, save
failure/retry, undo, reload persistence, evidence navigation and phone-width layout.
Owner-preview compilation passed locally without installation or launch.

All six final browser regression suites passed. Final executable/package source:
**f9baa4583d5c93bc7749ea1429d5c1592bd94d31**. Hosted Windows run **34888673347**
passed all **427** source/logic tests, package verification and native suites,
including catalog import/undo, strict request boundaries, atomic save/restart,
cameras, layouts, lifecycle, encrypted team persistence and DPAPI identity.
The optional installer copy regression also passed on the hosted runner; local
script policy was preserved. New native polling uses locators compatible with the
existing CSP. No CSP exceptions were added.

Download: https://github.com/nortja/atlas-command/actions/runs/34888673347/artifacts/10366385780
Artifact expires September 17, 2026 at 19:50 UTC. See app-update-delivery.md for
portable launch and the still-manual preview update channel.

Milestone complete. Next substantial candidate: revision-aware catalog storage
and media-inclusive recovery, with stale-instance conflict tests before any
future synchronization. Keep production networking and Store publication paused.
Physical touchscreen feel remains an owner device check.

## Storage and privacy limits

- Incoming review objects are copied; callers cannot mutate the approved payload.
  Only valid new rows are selectable. Duplicate and ID-conflict rows cannot write
  over existing notes, dates, ratings, media or extended research metadata.
- Review and undo bind to the local catalog and mission queue. Any intervening
  change invalidates them. Undo is session-only and disappears on reload; it is
  not a replacement for a backup. Unselected rows are never saved.
- The bridge drains older scheduled writes, checks the review again, waits for
  persistence and rolls back the in-memory catalog on a reported save failure.
  This is a local-session guard, not a cross-window transaction protocol. Native
  state storage still lacks compare-and-swap revisions; concurrent application
  instances and uncertain responses after disk writes remain existing limitations.
- The desk reads ordinary catalog records only. It never reads the encrypted team
  vault, sends requests to source URLs, publishes contributions or enables telemetry.
  Catalog imports are ordinary local catalog data, not encrypted team storage.
  Keep confidential team research in Teams and its encrypted backup workflow.
- Imported strings are escaped in the review, and malformed document contents do
  not enter console diagnostics. Source/date/rating flags describe missing fields;
  they are not evidence-quality scores. The Imported filter reflects the record's
  existing origin label, which is preserved rather than rewritten.
- Duplicate matching retains the established name/source plus coordinates rounded
  to three decimals. Comparisons show core research fields; extended metadata is
  not silently merged. Resolve conflicts in the source file and review again.

## Consolidated device review

Install/extract the new private owner preview using its included instructions.
Open Overview → Catalog review; search and filter evidence, then tap a site.
Import a small CSV or JSON file, deselect a row, confirm, and try Undo last import.
Check Earth drag/pinch and touch controls on the physical touchscreen. Real device
gesture feel and the chosen signed automatic-update channel remain owner review
items; automatic updates are not activated by this milestone.
