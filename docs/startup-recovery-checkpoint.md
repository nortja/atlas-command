# Startup recovery and backup inspection milestone

Started from e82e344, with native baseline c2a880b / run 34891320757 green.
Implementation is integrated and validated on develop/ui-directions. Extended-session
preferences remain in AGENTS.md. Tested executable source: f3a159203876746e2e23fa36110faedb6d121325.

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
  The startup mobile screenshot was visually checked. The final filter-disable change
  also passed the workspace recovery browser regression.
- Hosted Windows run 34895811375 passed all 442 logic tests, including the installer
  regression, packaging, and all 12 native runtime scripts. Real malformed JSON,
  unsupported schema and invalid UTF-8 recovery preserved exact original bytes;
  the 50-copy limit refused restoration without pruning or changing current data.
- Existing encrypted Teams/DPAPI/role checks, private log isolation, catalog intake,
  camera boundaries, Earth/layouts and secure shutdown/restart passed.

Green run: https://github.com/nortja/atlas-command/actions/runs/34895811375
Download: https://github.com/nortja/atlas-command/actions/runs/34895811375/artifacts/10369157155
Artifact expires September 17, 2026 at 21:02 UTC. The two earlier runs exposed an
existing asynchronous storage-badge test race and then an incorrect visibility
assumption for its collapsed panel. Tests now await the save and inspect attached
status. No application validation or CSP boundary was weakened.

Not verified on the owner's device: physical touch feel, Windows 10/11 installation,
signed upgrades, MSIX isolation or endpoint-security acceptance. Native tests used
disposable hosted Windows profiles; no local native app was installed or launched.

## Owner review and recovery behavior

Close the older Atlas instance, extract both the Actions artifact ZIP and enclosed
owner-preview ZIP into a fresh folder, then launch AtlasCommand.exe. Open Overview
then Recovery. Try the date search/type filter, review a backup, and choose Keep
current workspace. Check touch scrolling and readability on the actual device.
Normal edit/save/reopen can be checked with a disposable note. There is no need to
damage or restore real research to repeat the isolated native recovery tests.

If startup detects unreadable data, keep the original private workspace before manual
repair. The Windows recovery screen can open the data folder and inspect compatible
record backups. Restoration requires an explicit action, checks both revisions, and
preserves the exact existing file in a separate recovery-original file first.
An unsupported newer schema should normally be opened with a compatible Atlas version.
Browser previews can explicitly download the original ordinary workspace string;
they do not expose Windows backup files or reset browser storage automatically.

Next substantial recovery milestone: a bounded, media-inclusive archive with a
manifest, validated paths and quotas, read-only inspection, and transactional restore
tests. Retire legacy unguarded local writers before any future network sync. Keep
Teams cryptography and secret recovery on their existing separate documented path.

## Remaining limitations

Recovery copies contain ordinary private workspace plaintext and must remain private.
At 50 preserved originals restoration stops for manual review; copies are never pruned
automatically. Oversized, inaccessible or reparse-point current files require manual
data-folder recovery. Local processes with equivalent filesystem privileges remain
outside this protection. Record backups do not contain media files or Teams secrets.
Signed automatic updates and media-inclusive archives remain separate future work.
No production networking, signing, Store publication or changes to telemetry defaults
are part of this milestone.
