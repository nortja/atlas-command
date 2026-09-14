# Local encrypted team workspace threat model

Design recorded before Phase 2 implementation, September 14, 2026.
This is a local development feature, not reviewed production collaboration.

## Assets and trust boundaries

Protect chat, site notes, proposal text, member names, file names/bytes, coordinate
references and version history at rest and in backups. Keep them out of ordinary
catalog JSON, media directories, normal exports, diagnostics and telemetry.
The existing trusted renderer decrypts only after explicit passphrase entry.
The native helper transports/stores ciphertext and never receives the passphrase
or key. Its existing random session path, loopback binding, Host/Origin/fetch-site
checks, explicit local-action header, size limits and asset allowlist remain.

Threats addressed: reading copied vault files/backups without the passphrase;
accidental plaintext persistence/export; tampered encrypted content or metadata;
stale concurrent saves; malformed/oversized imports; unauthorized local model
operations; accidental catalog overwrite by proposals; unintentional disclosure
of precise site locations. Neither encryption nor role labels hide ciphertext
length, file existence, save timing or the existence of a local workspace.

Not addressed: malware, an administrator or another process controlling this
Windows account, renderer compromise/XSS, keyloggers, screenshots, memory/swap
inspection while unlocked, denial of service, or a full rollback of local storage.
JavaScript cannot guarantee erasure of RAM. A holder of a decrypted backup/key
can inspect all its contents and bypass application role rules. Team membership
is local planning metadata, not authenticated multi-user identity. Removing a
member does not revoke previously copied keys or backups. No invitation, relay,
account, wallet, Midnight, sponsorship or network sharing is implemented.

## Platform cryptography

Use the platform [Web Cryptography API](https://www.w3.org/TR/WebCryptoAPI/),
not a JavaScript cipher implementation. PBKDF2-HMAC-SHA-256 derives a nonextractable
AES-256-GCM key from a user passphrase, a fresh 16-byte random salt and 600,000
iterations. The work factor follows the current
[OWASP PBKDF2 guidance](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html).
Passphrases require at least 16 characters; longer randomly chosen word sequences
are preferable. This is an offline-guessing cost, not a password-strength proof.
For browser portability this phase uses native PBKDF2; it does not claim FIPS
certification or substitute a home-made memory-hard KDF.

Each encryption uses a new 96-bit IV from `crypto.getRandomValues`, with a
128-bit authentication tag. Never reuse an IV intentionally. The bounded local
workload is far below GCM's per-key usage limits. Fixed, versioned authenticated
additional data binds the envelope format, workspace ID, revision, KDF profile,
salt and record purpose. File envelopes also bind file ID and file version.
Reject unknown algorithms, KDF costs, envelope fields, bad encodings and excessive
sizes before expensive work. Authentication must succeed before parsing data.
All crypto errors exposed to UI/logs are fixed messages without content.

Keys and passphrases are never stored. Closing/reloading the page, locking or
shutdown drops key/content references. No automatic unlock or password recovery
exists. Losing the passphrase loses access; imports require the backup passphrase.
Backups contain only the encrypted envelope, with a generic filename. A future
reviewed key-wrapping and rotation design is needed before real team sharing.

## Storage, versions and recovery

Native mode uses a dedicated fixed file outside catalog/media storage, served only
by the guarded team-vault API. Browser preview uses a dedicated IndexedDB store
containing ciphertext only. Native mode never falls back to browser persistence
on a failed request. Atomic compare-and-swap rejects a stale envelope revision;
failed writes preserve the preceding committed ciphertext. An encrypted backup
import is validated and decrypted in memory before replacing any local state;
replacement is an explicit user operation. Bad passwords, corruption, unknown
schemas or stale commits preserve the current vault. Imports keep internal IDs
and use the backup key/context, with a fresh outer IV and the next local storage
revision. The backup passphrase becomes the unlock passphrase. This keeps file
envelopes bound to their original workspace; the UI explicitly states replacement.

Attachments use the same platform primitive in separate versioned authenticated
file envelopes, then reside inside the encrypted workspace snapshot. This bounded
prototype favors simple atomic backups over large-file throughput. Initial limits
must be enforced for file bytes, revisions, records and total envelope size.
No executable/HTML preview is supported; no plaintext thumbnails or media copies
are written to the ordinary Atlas store.

Owner/Admin/Researcher/Viewer checks apply to every model mutation. Only the Owner
may grant/revoke Admin; an Admin cannot change the Owner. Private records remain
author-scoped in the application policy. Notes/files retain immutable versions.
Proposals compare the observed before value with the current local working copy,
reject stale approvals and record approve/reject decisions. Approval changes only
the team's working copy, never bundled or personal Atlas catalog records.

Visibility labels (Private to me / Shared with team / Public contribution) are
local intent until transport/publication exists. No public-content export is
provided. Disclosure previews omit all free text, file names, site IDs and
coordinates; these fields can reveal sensitive locations indirectly.

## Required evidence

Test wrong passwords, bit flips, metadata substitution, malformed/oversized input,
unknown versions/KDF parameters, distinct IVs, file swapping, lock during async
operations, failed/stale writes, backup round trips, role denial, private ownership,
version conflicts, coordinate redaction and unchanged catalogs. Exercise native
request guards and verify its vault/temp/backup files contain ciphertext only.
Inspect browser storage, normal exports, request bodies and error logs for unique
synthetic secret markers. Keep existing security, UI, camera and lifecycle tests.
Production release still requires independent security review and Windows package
acceptance; passing these tests is not a production-security certification.
