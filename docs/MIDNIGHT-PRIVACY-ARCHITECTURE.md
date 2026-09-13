# Atlas Command · Midnight privacy architecture

Status: development architecture for Atlas owner preview. This document does not provision keys, move tokens, connect wallets, or deploy contracts.

## Product principles

1. **Private by default.** Atlas should not collect user content, location history, camera media, notes, searches, wallet identifiers, or usage telemetry unless the user explicitly chooses to share a narrowly described field.
2. **Selective disclosure, not blanket collection.** Midnight should be used to prove or share only what is necessary while leaving private state local to the user.
3. **Education before consent.** Every privacy action must explain what stays local, what becomes public, what can be selectively disclosed, and how to revoke or stop future sharing.
4. **Free personal use.** Privacy features must not require ads, subscriptions, or sale of user data.
5. **No silent wallet custody.** Atlas should never take custody of a user's NIGHT. Wallet connection and any chain action must be explicit.
6. **DUST sponsorship without surveillance.** Founder-sponsored network capacity should be designed so a user can receive/use sponsored capacity without exposing unrelated private activity to the Atlas operator.

## Midnight model used by Atlas

- **NIGHT** is the public/unshielded native token used to generate DUST and participate in the Midnight ecosystem.
- **DUST** is a shielded, non-transferable network resource consumed for transaction execution.
- Because DUST is non-transferable, Atlas should not model founder support as a normal token transfer. The implementation should use supported Midnight resource-generation/sponsorship patterns backed by founder-controlled NIGHT, subject to the official SDK/protocol available at deployment time.
- Midnight's dual-state model is a strong fit for Atlas: public state can contain only proofs/necessary public contract state while private user data remains local.

## User-facing Privacy Center

The Privacy Center should be reachable from the top bar with one clear shield icon. It should contain:

### 1. Privacy at a glance
- Local data: green indicator
- Shared by user: explicit count of categories currently shared
- Public/on-chain: explicit count of proofs or public records
- Sponsored DUST: available / unavailable / not connected

### 2. Plain-language education cards
- **Local means local** — Atlas keeps notes, saved places, camera profiles, media, and private preferences on the user's device unless the user explicitly exports or shares them.
- **Selective disclosure** — prove a fact without revealing the underlying private information.
- **NIGHT vs DUST** — NIGHT generates capacity; DUST powers transactions and is not a normal transferable coin.
- **What a proof reveals** — clearly list each field/proof before confirmation.
- **What Atlas never needs** — seed phrase, wallet recovery phrase, unrelated wallet history, private camera credentials, private notes.

### 3. Data controls
All collection defaults to OFF.

Candidate opt-in categories:
- Anonymous crash diagnostics
- Anonymous performance metrics
- Feature-use counts
- Voluntary feedback
- Voluntary catalog corrections
- Voluntary research contributions

Never collect by default:
- exact user location
- location history
- camera imagery/video/audio
- private notes
- private searches
- wallet secret material
- seed/recovery phrases
- private DUST transaction history
- contact lists

Each opt-in must show:
- purpose
- exact fields
- retention period
- destination
- whether data is local, server-side, or on-chain
- how to turn it off

### 4. Midnight connection
Stages:
1. Learn
2. Connect wallet
3. Review what Atlas can see
4. Enable sponsored privacy features
5. Confirm each disclosure/transaction

No connection should happen automatically at startup.

## Founder Command Center

The founder/admin side should control **capacity and consent policy**, not private user behavior.

### Safe operator-visible metrics
- total installs / active versions, if users opt into anonymous metrics
- aggregate crash counts
- aggregate feature-use counts
- catalog contribution queue
- signed content-update status
- number of users who opted into sponsored Midnight features
- founder NIGHT resource pool status
- estimated DUST-generation capacity / sponsorship budget
- aggregate sponsored transaction count and aggregate resource consumption, when supported without deanonymizing users

### Operator controls
- enable/disable sponsorship program
- set total DUST sponsorship budget/capacity
- set per-device or per-proof rate limits without storing personal identity where possible
- pause a broken contract or provider integration
- rotate content-signing keys through a documented process
- publish privacy-policy revisions
- configure telemetry categories and force all-new categories to default OFF

### What the founder dashboard must not expose
- user seed phrases or private keys
- private wallet balances unless a user explicitly discloses them
- private DUST transaction graph
- private site searches or saved locations
- private notes or media
- camera feeds
- exact location history

## 300-site content target

Atlas target: **300 high-quality bundled or signed-content sites** before calling the catalog mature.

Quality gate per site:
1. authoritative or peer-reviewed source preferred
2. coordinates checked to suitable precision
3. chronology stated with uncertainty
4. mainstream interpretation separated from alternative/disputed claims
5. mystery rating backed by the Atlas rubric
6. no duplicate site under alternate spelling
7. globally balanced coverage
8. useful site-intelligence summary and research question

## Search beyond the bundled catalog

The Discovery Atlas should have two scopes:

- **Atlas** — the curated 300-site catalog and user's private records
- **Discover** — user-initiated external search for unlisted places

External search rules:
- never send the user's existing private catalog, notes, or history
- send only the search text the user explicitly submits
- show the external source and source URL for every candidate
- show 'Not yet curated by Atlas' until reviewed
- allow **Add privately** immediately
- allow **Suggest correction / contribute** only through explicit opt-in
- never overwrite a curated Atlas record automatically
- offer a side-by-side merge/review workflow when a user proposes an update to an existing site

## Recommended implementation phases

### Phase A — local-first UI and policy
- Privacy Center UI
- collection switches default OFF
- privacy education
- disclosure preview component
- founder dashboard data model using synthetic/local data only

### Phase B — discovery beyond Atlas
- external search adapter
- source provenance
- add-private workflow
- propose-update workflow
- moderation/review queue

### Phase C — Midnight testnet
- official Midnight wallet/SDK integration
- tNIGHT/DUST test flow
- Compact contract prototype for selective disclosure
- founder sponsorship prototype
- threat model and privacy review

### Phase D — production
- production contract review/audit
- provision founder NIGHT resource pool
- signed policy/config updates
- privacy-preserving aggregate metrics only
- explicit user consent for every new collection/disclosure category

## Non-negotiable UX rule

Privacy controls must read like normal human language. No user should need to understand zero-knowledge cryptography to know what Atlas will reveal. The confirmation screen should always answer: **What stays private? What leaves this PC? Who can see it? Can I stop it later?**
