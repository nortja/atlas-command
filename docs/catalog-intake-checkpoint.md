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

All six final browser regression suites passed, and the integrated milestone was
pushed as 9f3f39e on develop/ui-directions. Hosted native validation is in progress.
A delivery check also found the optional installer used Copy-Item -LiteralPath
with a wildcard. It now enumerates source items and copies each literal path.
Its new real-filesystem copy regression was blocked locally by Windows script
execution policy; no policy was changed. The hosted Windows suite must pass it
before delivery. Native execution remains restricted to the disposable runner.

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

## Consolidated device review (after native CI)

Install/extract the new private owner preview using its included instructions.
Open Overview → Catalog review; search and filter evidence, then tap a site.
Import a small CSV or JSON file, deselect a row, confirm, and try Undo last import.
Check Earth drag/pinch and touch controls on the physical touchscreen. Real device
gesture feel and the chosen signed automatic-update channel remain owner review
items; automatic updates are not activated by this milestone.
