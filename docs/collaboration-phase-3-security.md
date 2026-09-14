# Phase 3 security review and local identity design

Design recorded before implementation, September 14, 2026. This review is an
internal focused review, not independent certification. Phase 2 remains the
legacy schema; migration must preserve records and never silently downgrade.

## Findings and implementation plan

High: the Phase 2 controller unconditionally uses ownerId. Model role checks
exist, but no member authentication reaches them. File reads also omit private
ownership checks. Backups expose the entire workspace to a passphrase holder and
replacement has no active-role gate. Fix with authenticated local sessions,
authorization on every controller entry point, Owner-only full backup operations,
and separate author-key encryption of private record bodies, site references,
proposal comparisons and file bytes. No caller-provided actor or role is trusted.

Medium: no passphrase change, bounded content-free audit trail, or protected device
anchor exists. Add current-passphrase verification and atomic re-encryption,
encrypted audit metadata with an exact field allowlist, and a random local device
anchor protected with Windows DPAPI CurrentUser. Never store workspace keys or
passphrases with the ciphertext or enable automatic unlock.

## Threats and boundaries

| Threat | Protection and residual risk |
| --- | --- |
| Stolen vault/backups | AES-GCM authentication and PBKDF2 password cost; private author content additionally needs that author's credential. Weak passwords remain guessable offline. |
| Lost device | Locked vault remains encrypted; device anchor is DPAPI CurrentUser protected. An unlocked session, recovered Windows credentials or disk/memory compromise is outside this boundary. Device identity is not a recovery key. |
| Malicious local application user | Password proof selects the actor; controller enforces roles and private ownership. No caller can merely select Owner. This assumes an intact application and Windows account. Debugging/patching the process or replacing all local files can bypass local application policy. |
| Compromised member | Access limited to own private records and shared/public-intent content through the controller. Previously copied content cannot be revoked. Owner-managed enrollment is not remote identity proof. |
| Future compromised relay | No relay exists. Future design must authenticate membership and operations end to end, encrypt before transport and reject replay/rollback; TLS or server ACLs alone are insufficient. Traffic analysis and denial of service remain. |
| Accidental plaintext leakage | Separate vault store; no team content in normal catalog/export/telemetry. Fixed errors, text-only UI, content-free encrypted audit, explicit plaintext file downloads only. JavaScript cannot guarantee RAM erasure. |

The Owner opens a local workstation session with the workspace passphrase. Other
members then authenticate their own local credential within that session. Closing
or locking drops both workspace and member keys. This is not simultaneous remote
multi-user operation. The Owner is custodian of shared data and membership; an
Owner who changes client code is not a cryptographically constrained adversary.
Private member content uses a distinct credential-derived key and is not returned
by the Owner's normal view or decryptable with the workspace key alone. Enrollment
passphrases must be entered by the member; an administrator who knows one can
impersonate that member until it is changed. No password-reset bypass is provided.

## Key management and recovery

Use only platform Web Crypto PBKDF2-HMAC-SHA256 (600,000 iterations, fresh 128-bit
salt) and AES-256-GCM (fresh 96-bit IV, 128-bit tag). Keys are nonextractable,
memory-only CryptoKeys. Public salts/IVs are not secrets. Existing envelope AAD
binds purpose, workspace/record IDs and version. Credential proofs use fresh salts
and authenticated encrypted identity values, not plaintext passwords or stored
reusable login tokens. Private record metadata and file envelopes bind author,
workspace, record and version. No custom cipher or network authentication protocol.

Changing a member passphrase requires its current proof and re-encrypts all that
member's private versions atomically. Changing the Owner passphrase additionally
re-encrypts the workspace and shared file envelopes. A failed write leaves the
previous passphrase and ciphertext valid. Old backups and native .bak snapshots
still require their old passwords and are not remotely revoked or erased.

Full encrypted export/import is Owner-only while a workspace is open. Restore into
an empty/locked workstation requires the backup's Owner passphrase and explicit
replacement. A logged-in non-Owner cannot invoke replacement. A portable backup
does not include the DPAPI device secret. Owner recovery requires an encrypted
backup plus its passphrase; member private data additionally requires that member's
matching passphrase. Losing either necessary password can make content unrecoverable.
Device/Windows password changes do not change Atlas passwords. DPAPI failure must
fail closed, not silently replace an existing device anchor.

## Identity and Phase 4 recommendation

User identity: stable random user ID, independent of display name; Phase 3 proves
only a local credential. Device identity: stable public fingerprint of a random
DPAPI-protected device anchor; it is not a transferable remote credential. Team
identity: stable workspace UUID. Membership: roles bound to user IDs, with removal
denying subsequent authentication and stale saves. Private orphaned records are
retained encrypted when a member is removed; IDs must never be reused to inherit
that member's records. Re-admission requires an explicit future recovery design.

Phase 4 should begin with protocol design and an independent review, then a
loopback-only sync simulator. Adopt a maintained, reviewed group protocol/library
(evaluate MLS for group membership and epoch rekeying) rather than extending these
password proofs into a network protocol. Use user signing identities, per-device
keys and signed device bindings; separate identity keys from content keys. Bind
roles to authenticated membership epochs and signed operations. Invitations must
be short-lived, single-use, addressed to verified identity/device keys and require
out-of-band verification. Owner/Admin authorization must be verified client-side.
Revocation/member removal/device loss must advance the group epoch and rotate
future content keys; historical copies remain readable to prior recipients.
Require explicit device enrollment and recovery approval, authenticated version
history, replay/conflict tests, encrypted attachments, and minimal routing metadata.
Treat the relay as an untrusted ciphertext mailbox; never send passwords, plaintext,
wallet secrets or exact coordinates in routing metadata. Do not deploy a relay
until malicious-server, replay, removed-device and recovery tests pass review.
Midnight and wallet integration remain outside this phase. Telemetry stays OFF.

## Implemented behavior and validation map

`team-session.js` now owns authentication and all controller authorization. The
outer envelope stays compatible with the ciphertext-only native store. Its
encrypted document carries a version-3 security section, credential proofs,
retired member IDs and audit metadata. Legacy schema-2 documents migrate only
after successful Owner authentication; a failed migration never writes.
Private author payloads use the `private` authenticated purpose, credential
proofs use `credential`, and attachments use `file`, preventing cross-purpose
substitution. Private site references, file names and all private text versions
are inside the author envelope. Public contribution is an application visibility
state, not publication. Changing shared content to private cannot recall copies.

Full restore authenticates shared files and the Owner's private files. Other
authors' private envelopes are structurally validated but can only be decrypted
and fully validated when those authors authenticate. Export preserves these
opaque envelopes; it does not discard content the Owner cannot decrypt.
Audit entries contain only sequence, enumerated action, enumerated role and local
timestamp. They are inside the encrypted snapshot, bounded at 4,096 events, and
fail closed on exhaustion. They contain no user-supplied identifiers or text.
They are not independently signed, externally anchored or tamper-proof against
an Owner with the workspace key; backup restore can restore older history.

The device anchor lives in `TeamSecrets/device.bin`, separate from
`TeamWorkspace/vault.json`. Only a SHA-256 fingerprint is returned through the
guarded local action. The random secret is protected with DPAPI CurrentUser;
neither secret nor fingerprint grants workspace access. It is intentionally
absent from portable backups. Browser previews explicitly have no DPAPI identity.

Additional reviewed limitations: membership and audit policy are enforced by the
trusted local controller, not by an untrusted-storage signature protocol. A local
filesystem attacker can replace ciphertext or roll back a whole backup. Revoking
a member blocks future application authentication and stale writes; it cannot
erase a prior decrypted view. No automatic passphrase recovery or cross-user OS
service exists. Recovering a removed member's orphaned private data requires
restoring a suitable older backup in a separate trusted recovery environment with
the corresponding passwords. Do not reuse the removed identity ID.

Tests: `team-auth.test.cjs` exercises credential/role denial, private author
encryption, file visibility, removal/reuse/staleness, passphrase changes, recovery,
audit allowlists and migration. `team_auth_ui.cjs` exercises real browser member
switching, Viewer controls, password changes and private/audit isolation. The
existing `team_ui.cjs` still covers normal JSON/KML export isolation.
`team_vault_native.py` verifies real native persistence, authenticated Viewer UI,
DPAPI fingerprint stability, corrupt-anchor refusal and request guards on a fresh
GitHub Windows runner. The entire prior suite remains required.

References: [Web Crypto](https://www.w3.org/TR/WebCryptoAPI/),
[Microsoft DPAPI](https://learn.microsoft.com/en-us/dotnet/standard/security/how-to-use-data-protection).
