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

Repository, recent commits and CI inspected. Latest native run 34882445026 is green;
older failures were resolved before that run. Extended-session preferences saved
in AGENTS.md. Implementation has not yet been completed.

Next: build/test the intake model and transaction service, then connect the import
UI and evidence desk through the versioned AtlasWorkspace API. Keep diagnostics
free of incoming document text. Review dialogs are local and do not publish data.
