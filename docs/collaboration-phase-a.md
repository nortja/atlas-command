# Collaboration foundation: session prototype

This increment implements the data model and UI shell from
`private-collaboration-architecture.md`. It is not an encrypted vault or working
messenger. No invitations, upload, publication, network relay, wallet or telemetry
are enabled. Private drafts must not be written to the existing workspace JSON,
localStorage, IndexedDB, native state API, backups, logs or exports.

## Model and authority

`app/src/collaboration-model.js` is the source module. Schema 1 covers spaces,
membership roles and session drafts for channel/direct messages, site notes,
proposals and file metadata. A draft's private/team/public value is its **intended
visibility**, not evidence that it was delivered or published. Every draft starts
private unless explicitly selected otherwise. Public intent never grants access
to an outsider through the local permission policy.

Owner: read, draft, review, manage. Researcher: read, draft, review.
Contributor: read, draft. Viewer: read. Unknown roles/actions fail closed.
All policy decisions require same-space membership. Owners cannot inspect another
member's personal drafts. These checks are local policy contracts, not a substitute
for cryptographically authenticated identity or server/device authorization.
Only the local owner can currently be created; no fake remote members are added.

Proposals carry base and record revisions. Review rejects stale revisions and
records a decision without applying it to any catalog. File records hold metadata
only, with no file bytes, remote URLs or device paths. Disclosure previews omit
all content, identifiers and coordinates, even for public intent. Redacting just
latitude/longitude would leak locations through names, notes or proposal values.

## Secure interfaces, deliberately unavailable

The exported `vault` contract reserves asynchronous `seal`, `open`, `put`, `get`.
The exported `sync` contract reserves `enqueue` and `reconcile`. Every operation
rejects with `SECURE_PROVIDER_UNAVAILABLE`; there is no plaintext fallback and no
way to enable a provider with a UI toggle. These are interface placeholders, not
encryption implementations. No algorithm or serialized envelope format is frozen.

A future reviewed implementation must define a versioned authenticated envelope,
binding protocol version, space, object ID, author/device, membership epoch and
object/base revision as authenticated associated data. Key generation, per-device
wrapping, nonce uniqueness, removal/rotation, replay protection, recovery, payload
limits and conflict reconciliation require a threat model and independent tests.
The vault must encrypt before durable storage; an offline outbox may contain only
validated encrypted envelopes. Relay authorization cannot trust renderer roles.
Publication requires a separate explicit, field-by-field disclosure review.
NIGHT/DUST remains a later optional interface, with no private content on-chain.

## Lifecycle

Session drafts live in a bounded, isolated in-memory store. Lock drops the store's
references and disallows further operations. This is not guaranteed RAM erasure
in JavaScript. Page exit/reload starts empty; nothing is restored from disk.
The shell must say this before accepting input and clear rendered content when
locked. Existing globe/workspace save and secure native exit behavior stay intact.

## Baseline inspected on 2026-09-13

Starting commit: `26916124ffa4924ffadef2b2258416bd1618717d` on
`develop/ui-directions`. Recent changes add the collaboration architecture,
catalog revisions 7/8, privacy integration and bounded native loopback retries.

[Owner preview run 34791099670](https://github.com/nortja/atlas-command/actions/runs/34791099670)
passed source checks, build, native request-boundary checks, persistence and restart.
It failed in `next_ui_test.py`: bundled unique IDs were 127 while the generated
assertion required at least 150. No artifact was uploaded. This existing catalog
failure is separate from collaboration; its threshold is not relaxed here.

The checked-in app is partially integrated. Full materialization runs the owner
preview recipe sequence: release tools, UI directions, field cameras, camera route
test, ONVIF service, webcam, experience, HD visuals, catalog revision 6 chain
(privacy, revisions 7/8), power lifecycle. Scripts patch HTML, app/native source,
packaging asset lists and some test expectations. Test generated output in a
disposable copy; do not commit the entire materialized tree as a feature change.

Baseline Node checks pass after materialization (377 existing checks). Running
the raw checkout directly has one pre-existing weather CSP integration failure.
The first collaboration block adds 10 passing model tests, for 387 total.
