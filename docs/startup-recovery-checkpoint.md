# Startup recovery and backup inspection milestone

Started from e82e344, with native baseline c2a880b / run 34891320757 green.
Implementation is integrated; hosted Windows validation is next. Extended-session
preferences remain in AGENTS.md.

## Scope and threat model before implementation

Provide a recovery screen when saved JSON, schema or site validation prevents
normal startup. Do not seed a fresh workspace, autosave, clear data or show raw
parse errors in this mode. Normal startup must continue unchanged when data is valid.

Native health reports only status, revision and size. Reviewed restoration remains
bound to both current and backup revisions. Before replacing an existing workspace,
preserve its original bytes under a unique allowlisted recovery filename. A failed
preservation must abort restoration. Copies are ordinary local private JSON, not
encrypted team backups. Never silently prune these originals.

Add paged/searchable backup browsing, client validation, and local media availability
counts. Counts do not verify media contents or create media-inclusive archives.
Do not follow URLs, reparse points or arbitrary backup paths. Keep errors and logs
free of document text and coordinates. Teams vaults and device secrets are untouched.

Browser startup recovery may explicitly download only the original ordinary
workspace string; warn that it can contain private camera metadata. Never export
all browser storage, reset data automatically, or include encrypted Teams storage.

## Plan and validation

Build shared inspection/controller logic, native health/preservation/media summaries,
startup screen and the improved normal recovery desk. Test corrupt/schema/site
failures, no-write startup, stale restores, original-byte preservation, invalid
backups, bounded browsing and privacy. Run existing source/browser suites, compile
locally and validate the native app only on disposable hosted Windows.

## Implementation checkpoint

- Shared read-only inspection and searchable backup browser with 12 rows per page.
- Startup recovery for malformed JSON, unsupported schemas, invalid site records,
  and invalid UTF-8 native files. Explicitly stored null never seeds a fresh catalog.
- Native metadata-only health, guarded restoration, exact-byte original copies,
  and media present/missing/unverified counts. No media reads or downloads.
- Normal recovery uses the same inspection browser. Review cancellation is read-only.
- Browser recovery downloads only the original ordinary workspace on explicit action.
- Local staged logic tests: 441 passed. One installer regression is reserved for the
  hosted Windows suite because local script execution policy blocks its fixture.
- Local owner-preview compilation passed without installation or native launch.
- All eight browser regression suites passed, including startup recovery, workspace
  recovery, catalog intake, Earth exploration and four encrypted collaboration flows.
  The startup mobile screenshot was visually checked. Hosted native verification is
  required before delivery.

Next: commit/push only develop/ui-directions, and run the
owner-preview workflow. Fix any failures and record the green artifact here.

## Remaining limitations

Recovery copies contain ordinary private workspace plaintext and must remain private.
At 50 preserved originals restoration stops for manual review; copies are never pruned
automatically. Oversized, inaccessible or reparse-point current files require manual
data-folder recovery. Local processes with equivalent filesystem privileges remain
outside this protection. Record backups do not contain media files or Teams secrets.
Signed automatic updates and media-inclusive archives remain separate future work.
No production networking, signing, Store publication or changes to telemetry defaults
are part of this milestone.
