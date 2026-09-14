# Local research review and recovery desk

This milestone extends the Phase 3 local workstation model. It adds no relay,
remote invitations, wallet integration or telemetry. The security boundaries and
remaining risks in `collaboration-phase-3-security.md` still apply.

## Completed functionality

- Search visible chat, notes, files and proposals, including earlier text versions.
  Combine search with visibility and proposal-decision filters. Search runs only
  over the authenticated member's authorized view and is never persisted or sent.
- Compare note versions and proposed edits with explicit added/removed lines.
  File comparison shows names only; file bytes require an explicit audited download.
  Text is rendered as DOM text, never HTML. Long comparisons use bounded work.
- Show only role changes the current Owner/Admin can make. Member removal offers
  an in-app confirmation explaining retained private content and prior copies.
- Review human-readable audit actions, filter by role/action and page through
  50 events at a time. Audit content remains the existing encrypted allowlisted
  metadata; no private text or sensitive identifiers are added.
- Show saved revision and local capacity/recovery guidance. Global capacity is
  Owner-only; other members see only their visible record count and general limits.
- Inspect an encrypted backup before interactive replacement. Inspection verifies
  credentials and accessible files without writing storage, and reports workspace,
  revision, record/member/version counts and opaque private member envelopes.
  It flags an older or different workspace. It never previews message/file text.
- Confirmation refers to the exact inspected snapshot, expires after two minutes,
  and is single-use. Lock, member switch, cancellation, a committed mutation or
  changed storage invalidates it. Changing the selected file/password clears the
  UI review. A stale confirmation never overwrites newer data.
- Lock Teams after ten minutes of application inactivity or one minute while the
  page is hidden. Returning to the page checks expiry before accepting activity.
  Locking clears decrypted UI, search state and pending backup recovery material.
  These are local session controls, not OS memory-erasure guarantees.
- Clear the UI if a save discovers a newer workspace and the controller locks.
  A stale decrypted view is not left on screen after the failed operation.

## Source and validation

`team-review.js` contains pure filtering, bounded comparison, UI role options and
inactivity deadline logic. `team-session.js` owns recovery authorization and token
binding; `team-shell.js` integrates the review/recovery/member/audit UI. Integration
recipes keep exact renderer/native/package assets synchronized.

The test suite adds `team-review.test.cjs` and `team_review_ui.cjs`. Existing team,
authentication and session-shell browser regressions remain required. The native
team test also exports, inspects and restores a real encrypted backup through the
guarded Windows host and verifies that inspection does not advance the revision.
Browser tests use isolated profiles and synthetic research; native tests use only
fresh GitHub-hosted Windows runners. Responsive checks cover a 390-pixel viewport.
Timed browser checks use the browser test driver's clock, not a production bypass.

## One owner review checklist

1. Open the successful **Build Atlas owner preview** run for this milestone on
   `develop/ui-directions`. Download its private `atlas-owner-preview-windows-x64`
   artifact, extract both the artifact archive and the enclosed preview ZIP into a
   new folder, then run `AtlasCommand.exe` from that folder. This is an unsigned
   development preview, not an installer. Do not run inside the ZIP, and do not
   bypass endpoint-security blocks. Keep a separate encrypted team backup first.
2. In **Teams**, search a note, save a second version and open **Version history**.
   Check the comparison and narrow-window readability with your own display scaling.
3. In **Backup & privacy**, export and inspect that backup. Review the counts and
   cancel first. Restore only a disposable/test workspace when evaluating replacement.
4. Check **Members** role choices/removal cancellation and **Audit** filters. Leave
   Teams inactive, or minimize/hide the page for over a minute, then confirm it locks
   and can be reopened with the expected credentials.

Actual Windows display scaling, touch behavior, endpoint-security acceptance and
the owner's installed data/profile remain device checks. Automated validation does
not claim Store certification, real phone installation or independent security review.
Production synchronization remains a separate, reviewed Phase 4 project.
