# Phase 2: local encrypted research workspace

Historical Phase 2 behavior. See [Phase 3 security and identity changes](collaboration-phase-3-security.md)
for authenticated sessions, private author keys, audits and passphrase changes.

The Teams button now opens one persistent encrypted workspace on this device.
The earlier session model and shell remain available to their regression tests.
This is a bounded local prototype, with no networking, invitations or publication.
See [the pre-implementation threat model](private-team-threat-model.md).

## Source and integration

- `app/src/team-crypto.js`: platform Web Crypto envelope and strict decoding.
- `app/src/team-model.js`: Owner/Admin/Researcher/Viewer policy, private defaults,
  immutable note/file versions, proposal decisions and disclosure redaction.
- `app/src/team-vault.js`: encrypted persistence, optimistic revision checks,
  file envelopes, lock generation checks and encrypted backup restoration.
- `app/src/team-shell.js` / `.css`: accessible local workspace and member shell.
- `build/team-vault-host.cs.txt`: native ciphertext-only handler source.
- `build/integrate_team_vault.py`: exact asset/package allowlists and native route.
  The existing final collaboration recipe invokes it. Changes belong in these
  source files; the entire owner-preview integration chain is materialized in an
  isolated test directory before tests/builds. Do not commit that generated tree.

Native ciphertext is in `%LOCALAPPDATA%/AtlasCommand/TeamWorkspace/vault.json`,
separate from ordinary `Data/workspace.json` and media. Atomic saves retain one
encrypted `.bak`. Native mode requires its guarded API and never falls back to
browser persistence. Browser preview uses only the dedicated
`atlas-private-team-v1` IndexedDB database. Browser storage is tied to the preview
origin and browser profile; use an encrypted backup before changing either.

## Behavior and limits

The current local user is the Owner. Member names and role assignments are local
planning metadata; they do not authenticate another person or grant remote access.
Model tests exercise all roles. A passphrase holder can decrypt the whole backup,
so these labels are not cryptographic separation between team members.

Chat and site notes default to Private to me. Shared with team and Public
contribution are local intent labels only. No public exporter is implemented.
Disclosure previews withhold free text, names, IDs and all coordinates, even if
the record is not marked sensitive. Raw team content remains visible only in the
unlocked workspace and explicit decrypted file downloads.

Proposals compare against a separate team research working copy. Owner/Admin may
approve or reject; stale approvals fail. Approval never updates Atlas catalog data.
Private proposals cannot be approved into the shared working copy: recreate one
with team visibility after reviewing its content. Accepted working copies retain
their proposal evidence/history; notes and files retain numbered versions.

Initial bounds: one workspace, 100 member entries, 200 records, 200 working copies,
20 versions per record, 8,000 characters per text version, 2 MiB per file,
8 MiB decrypted snapshot, and 12 MiB encoded envelope/import. Limits fail without
discarding the preceding committed version. There is no silent history pruning.

Backups include encrypted file envelopes and all versions. Restore requires the
backup passphrase and explicit replacement selection. It authenticates and
validates every file before saving, retains the backup's workspace/key context,
and uses a fresh outer IV plus the next local storage revision. The backup
passphrase then unlocks the restored workspace. Ordinary JSON/KML exports do not
include team records. A normal Data-folder backup is not a team-vault backup.

Lock & close, Escape, page unload and native shutdown discard unlocked references.
JavaScript cannot guarantee RAM erasure. There is no password recovery, automatic
unlock, cross-device synchronization, key rotation, real member revocation or
large-file streaming. Telemetry remains off; this feature adds no collector.

## Validation and next work

Run `python tests/collaboration_build.py`, then the complete `tests/*.test.cjs`
suite in its printed directory. Point `ATLAS_TEST_APP_DIR` at that stage's `app`
and run `tests/collaboration_ui.cjs` and `tests/team_ui.cjs` with Node Playwright
and installed Edge. Native `tests/team_vault_native.py` intentionally requires a
fresh GitHub-hosted Windows runner; it must not be run against an owner's profile.

Tests cover envelope authentication, bad passwords, malformed imports, file
substitution, permission denial, private ownership, immutable history, stale
proposals/saves, lock races, failed-write preservation, browser reload, backup
round trips, real native restart and separation from diagnostics/catalog exports.

Next: independent security review, reviewed key management/rotation and recovery,
authenticated identities and membership, and only then a separately reviewed
sync/relay protocol. Midnight NIGHT/DUST selective disclosure and sponsored
capacity remain future integration work. No Store publishing is part of this phase.
