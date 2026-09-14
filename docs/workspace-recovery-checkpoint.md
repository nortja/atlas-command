# Workspace save protection and recovery milestone

Started from bf60aae, following green native run 34888673347. Workflow preferences
remain in AGENTS.md. This milestone is complete and ready for consolidated device review.

## Design before implementation

Serialize all ordinary workspace writes per renderer. Native guarded writes compare
a SHA-256 revision of the stored JSON under the existing DataLock before atomic
replacement. SHA-256 is a change token, not encryption or authorization. Browser
preview uses Web Locks plus comparison against the last stored JSON. Never merge
conflicting private research automatically or retry with a newer revision blindly.

Use a versioned native state endpoint. Existing local API remains compatible for
older test/tool clients; changes through it invalidate new clients' revisions.
Older clients themselves cannot gain protection retroactively. Remove unguarded
legacy writes before future network synchronization. No networking is added.

Recovery UI offers explicit research JSON download, saved-copy reload, and native
record-backup inspection/restoration. Backups remain the existing previous/daily
workspace JSON files, not encrypted team backups or media-inclusive archives.
Do not expose paths, coordinates, messages or credentials in status diagnostics.
Do not change team vault storage, public exports, CSP, telemetry or signing policy.

Restoration must bind to both the inspected backup revision and current workspace
revision; stale or changed backups must be reviewed again. Validate backup content
before displaying it as usable. Display counts and timestamps, not private content.
Keep all existing media files and encrypted vaults in place. Full media-inclusive
recovery remains a later milestone rather than a misleading record-backup claim.

## Planned verification

Tests for overlapping writes, stale clients, write failure/retry, revision changes,
backup allowlists, changed-backup refusal and restoration; browser conflict/recovery
flows; existing Earth and encrypted-team regressions; native hosted validation.

Implemented the serialized writer, browser Web Locks adapter, guarded native
endpoint and record-backup allowlist/review/restore handlers. All new native errors
use fixed messages without logging document contents. Close-beacons use the
guarded endpoint; discard and restoration suppress old in-memory close writes.
The recovery desk is under Overview and fits desktop and phone-width layouts.

Final tested executable/package source: **c2a880be1dd66dfd37cd925822888d4d91ed75a6**.
Hosted Windows run **34891320757** passed all **436** source/logic tests and the
complete native suite, including stale and missing revisions, changed/invalid
backup refusal, reviewed restoration without close-beacon overwrite, media/vault
file preservation, cameras, layouts, shutdown/reopen and encrypted Teams/DPAPI.
Local compilation passed. Seven browser suites passed; recovery and catalog flows
were rerun after the queued-write fix. Local source testing passed 435 tests; the
installer copy test ran successfully on the hosted runner without changing local
script policy.

Download: https://github.com/nortja/atlas-command/actions/runs/34891320757/artifacts/10366809855
Expires September 17, 2026 at 20:20 UTC. See app-update-delivery.md for launch steps.

Changes are in workspace-storage.js, workspace-recovery-ui.js/CSS, the workspace
save/native source fragments, and integrate_workspace_recovery.py. The recipe
updates exact assets, endpoints, lifecycle writes and the versioned renderer API.
New model/browser/native tests cover the milestone; existing native failure-injection
fixtures now intercept the guarded endpoint rather than the legacy endpoint.

Queued snapshots behind a failed write are cancelled so rolled-back optimistic
edits cannot be persisted by an older queued snapshot. Conflicts never automatically
adopt a newer revision and overwrite it. No production networking was added.

Device review: close the older Atlas instance, extract the downloaded preview,
launch AtlasCommand.exe, and open Overview → Recovery. Review a backup and choose
Keep current workspace. Check readability and touch scrolling; normal edit/save/
reopen may be checked with a disposable test note. No need to restore real research
solely to repeat the native automated restoration test.

Next substantial candidates: startup recovery for an unreadable main workspace,
media-inclusive archives with reviewed restore, and migration away from unguarded
legacy local writers before any network synchronization. Automatic updates remain
blocked on trusted distribution/signing prerequisites and the publication hold.

## Practical limits

- Whole-workspace revisions intentionally refuse stale saves rather than guessing
  which notes/settings to merge. Reload requires an explicit discard action.
- Unsaved JSON preservation includes current ordinary workspace data, not text in
  unsubmitted forms. It excludes camera profiles and Teams content through the
  existing export boundary. It is plaintext and does not include media bytes.
- Browser preview requires Web Locks for writes. Abrupt browser/process termination
  can still lose unsaved edits; use explicit save/shutdown where available.
- Native previous/daily snapshots are ordinary local JSON backups. Encrypted team
  backups, DPAPI secrets and media-inclusive recovery remain separate workflows.
- Follow-up: `guarded-recovery-milestone.md` retires the legacy api/state endpoint
  and corrects the same-context closing allowance to use revision-checked saves.

- Follow-up: the startup recovery milestone in `startup-recovery-checkpoint.md`
  supersedes the readable-workspace limitation above. It adds original preservation,
  damaged-workspace recovery and media availability inspection.
