# Atlas Command private researcher collaboration architecture

Status: development architecture only. No production relay, account system, wallet custody, or Midnight mainnet integration is enabled by this document.

## Goal
Atlas should let researchers and teams work together without turning the application into a surveillance service. Private notes, chats, files, field media, camera metadata, and sensitive site locations should remain under explicit user control.

## Collaboration model

### Local-first personal vault
- Each user keeps a local encrypted workspace containing private notes, drafts, attachments, field observations, and optional private site coordinates.
- Atlas should not require cloud storage for ordinary personal use.
- Export and backup remain explicit user actions.

### Private team spaces
- A user can create a Team Space and invite collaborators.
- Team Spaces have named roles: Owner, Researcher, Contributor, Viewer.
- Permissions are scoped per space and, where useful, per collection/site/file.
- Membership changes and role changes should be auditable to the team without exposing private content to Atlas operators.

### Private chat
- One-to-one and team-channel chat should be end-to-end encrypted.
- Message bodies, attachments, reactions, edits, and reply metadata should be encrypted before leaving the sender device.
- Atlas infrastructure should only see the minimum routing metadata needed for delivery.
- Disappearing messages are optional; persistent chat remains the default unless a team chooses otherwise.
- Voice notes and file attachments can be added later using the same encrypted envelope model.

### Shared research storage
- Files are encrypted client-side before upload to any optional relay/object store.
- Team storage should support folders/collections, version history, source citations, image/PDF/video attachments, checksums, and conflict-safe sync.
- Atlas should distinguish private originals from deliberately published/exported derivatives.
- Sensitive archaeological coordinates can be redacted or generalized when shared.

### Site collaboration
Each curated or private site can have:
- private personal notes;
- team-visible notes;
- source/citation thread;
- proposed edits with before/after review;
- evidence attachments;
- tasks/checklists;
- discussion channel;
- provenance and change history.

Curated Atlas records are never silently overwritten by team edits. Team proposals remain separate until accepted into the user's/team's working copy or submitted for Atlas catalog review.

## Selective privacy / Midnight direction
- NIGHT/DUST features are optional and separate from ordinary free collaboration.
- Midnight may be used for selective disclosure, proofs, consent receipts, contribution attestations, or sponsored privacy transactions where it adds real value.
- Do not put chat plaintext, private notes, camera media, exact sensitive locations, wallet secrets, or ordinary file contents on-chain.
- Founder-sponsored DUST should cover supported user transactions without requiring users to buy crypto first.
- The Privacy Center must explain in plain language what is local, what is encrypted and synced, what is public, and what is anchored/proved on-chain.

## Founder / organization command center boundaries
Allowed aggregate/operational controls:
- app/version health;
- team seat counts where applicable;
- aggregate storage use;
- delivery/relay health;
- opt-in diagnostics;
- catalog contribution queue;
- sponsored DUST capacity and aggregate consumption;
- privacy policy/configuration versioning.

Explicitly excluded:
- browsing users' private chat;
- reading private notes/files;
- viewing exact private site/location history;
- accessing camera streams/media;
- wallet seed phrases/private keys;
- individual private Midnight activity beyond information a user intentionally discloses.

## Sync architecture recommendation
1. Device identity keypair generated locally.
2. Team-space symmetric content key, wrapped separately for each authorized member/device.
3. Per-message/per-file authenticated encryption with unique nonces and versioned envelopes.
4. Relay stores ciphertext and minimal delivery metadata only.
5. Device-to-device key rotation when members are removed.
6. Local encrypted cache supports offline work and later reconciliation.
7. Signed change objects provide provenance for collaborative site edits.
8. Conflict UI favors understandable side-by-side merge rather than silent last-write-wins.

## Recovery
- Users should be offered an encrypted recovery bundle or recovery key they control.
- Atlas must clearly explain that strong end-to-end encryption limits server-side password recovery.
- Team Owners can rotate team-space access for remaining members but should not automatically gain access to another member's personal vault.

## UX principles
- Collaboration should feel like a familiar research messenger/workspace, not a blockchain dashboard.
- Show clear states: Private to me, Shared with team, Published/exported.
- One-click Share to Team from a site, note, file, or evidence record.
- Compact team/chat button in the main workspace.
- Search can span local and authorized team content without leaking queries to unrelated services.
- Privacy explanations are contextual and short, with deeper detail available from the shield icon.

## Delivery phases
Phase A: local encrypted team/chat/storage models and UI prototypes with no network transport.
Phase B: authenticated encrypted relay and multi-device sync on a test environment.
Phase C: attachments, version history, site proposal workflows, moderation controls.
Phase D: optional Midnight testnet proofs/sponsorship where useful.
Phase E: production hardening, external security review, abuse controls, rate limiting, privacy/legal review, and signed release.

## Non-goals
- No hidden telemetry.
- No ad targeting.
- No plaintext server-side search index of private content.
- No arbitrary remote code delivered through team content.
- No custody of user wallet seed phrases.
