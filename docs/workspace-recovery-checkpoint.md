# Workspace save protection and recovery milestone

Started from bf60aae, following green native run 34888673347. Workflow preferences
remain in AGENTS.md. This milestone is in progress, not ready for device review.

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

Local checkpoint: native compilation passed; 434 source/logic tests passed, with
the installer script test excluded locally because existing execution policy blocks
it (the hosted runner runs it). Two-window conflict and catalog flows passed.
Existing Earth/team browser regressions are finishing. Next: save logical commits,
push only develop/ui-directions, and complete hosted native restoration/lifecycle
validation before one consolidated review. This checkpoint is not a green-native
delivery claim.

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
- Legacy local API writers remain compatible but unguarded. Their writes invalidate
  the new client's revision. They must be retired before production synchronization.
