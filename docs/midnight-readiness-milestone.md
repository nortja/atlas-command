# Midnight readiness: offline disclosure and sponsorship rehearsal

Design recorded before implementation, September 14, 2026. Baseline: 4a7ab2c,
owner-preview f3a1592 / run 34895811375 green. This milestone is not a wallet,
proof system, contract deployment or live DUST integration.

## Scope and security decisions

Build a Privacy Center desk with truthful readiness, fixed synthetic disclosure
examples, explicit short-lived review and a bounded sponsorship-policy rehearsal.
Use abstract example capacity units, never fabricated DUST balances or fee quotes.
Registered NIGHT generates DUST; sponsorship is fee support, not a DUST transfer.
Operator capacity must not confer authority to approve a user's disclosure.

The model accepts only allowlisted scenario/policy enums and bounded integers.
It never reads catalog records, team identities, addresses, wallet providers,
secrets, notes, coordinates or media. Nothing is exported, persisted or sent.
Review expires, is single-use, and is invalidated by any scenario/policy change,
closing the desk, losing page visibility or reloading. Changing a setting back
does not resurrect consent. Session events contain enumerated metadata only and
are bounded; no user content or exact identifiers enter them.

Network capability remains a fail-closed interface: connect/prove/submit reject.
Do not install SDKs, discover injected wallets, provision keys, create proofs,
invent cryptography, select a production network or introduce endpoints here.
Local review is a UI rehearsal, never cryptographic authorization or a reusable
consent receipt. Hostile same-process code can bypass local policy; there is no
claim of server-side abuse protection, Sybil resistance or chain finality.

## Threats and future integration gate

- Malicious sponsor/relay: eventually bind the reviewed contract, network, action,
  public fields and maximum fee to the official authenticated transaction intent.
  Sponsorship must not change the intent or grant access to user signing keys.
- Wallet/prover compromise: use maintained official tooling, pin compatible versions,
  validate the selected network and endpoints, and review which private inputs a
  proving service can observe. Do not silently accept remote proving or wallet URLs.
- Accidental leakage: no catalog, Teams, wallet discovery, external icon, telemetry,
  log or export access in this rehearsal. Public hashes can leak low-entropy inputs;
  do not hash coordinates or private notes into an alleged privacy proof.
- Replay/stale consent: bind real review to exact immutable transaction bytes and
  policy version, require explicit authorization, invalidate on all relevant changes.
- Revocation: stopping future sharing cannot recall published ledger data, prior
  proofs or copies. No deletion/revocation guarantee for already public records.
- Stolen/lost device: the desk stores no keys or durable consent. Existing encrypted
  workspace/DPAPI protections and limitations remain unchanged.
- Compromised member: Midnight must not replace authenticated team membership/roles
  or disclose a team identity just because an operator pays a transaction fee.

Next integration step: a separately reviewed, isolated official-tooling preproduction
spike with synthetic fixtures. Pin network/SDK/connector/Compact versions and reviewed
contract; test authorization versus sponsorship, altered payloads, wrong networks,
expired/replayed requests, sponsor refusal/exhaustion, prover privacy and interrupted
submission. Require a threat-model review before any real research or networking.
The existing production-networking and Store-publication holds remain in force.

## Sources checked September 14, 2026

- [Official DUST sponsorship guide](https://midnight.network/blog/dust-sponsorship-on-midnight)
  describes separate user authorization and fee sponsorship.
- [Official DUST generation guide](https://midnight.network/blog/understanding-the-multiple-pathways-to-generating-dust)
  describes registration rather than automatic generation from an unregistered holding.
- [Official connector reference](https://docs.midnight.network/api-reference/dapp-connector)
  currently labels API v4.0.0 and documents explicit wallet connection and configuration.
  This is research, not a pinned dependency or a compatibility claim for Atlas.

## Implementation checkpoint

Implemented: immutable synthetic example model; fail-closed transport interface;
bounded memory-only policy/events; explicit single-use 120-second review; change,
expiry, cancellation and hidden-page invalidation; Privacy Center and founder-policy
entry points; responsive 48px controls; fixed public-field tables and disclosure risks.

453 locally runnable staged logic tests passed (including 12 new boundary tests).
The installer fixture is reserved for hosted Windows due local script policy.
Midnight browser flow passed: no injected wallet discovery, no outgoing requests,
no rehearsal storage changes, expiry, capacity outcomes, phone layout and clearing.
Existing page-hide lifecycle legitimately changes the ordinary savedAt timestamp;
the test verifies every other stored field and private storage remain unchanged.
Local native compilation passed without installation or launching on owner data.
All nine browser regression suites passed, preserving Earth/touch, catalog import,
startup/record recovery and encrypted collaboration. The final close-button touch
target was rechecked with the Midnight browser suite. Hosted Windows native validation
must finish before delivery.
