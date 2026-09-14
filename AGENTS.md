# Atlas Command project instructions

## Agreed product and security direction

- Repository: `nortja/atlas-command`; work on `develop/ui-directions`.
- Preserve working functionality, curated catalog records, existing tests, and the
  premium, friendly Earth/weather/currents/research/camera UI direction.
- Collaboration stays local-first and encrypted. Preserve role enforcement,
  private author content isolation, coordinate redaction, and secure lock/reopen.
- Do not add production relay networking or invitations without an agreed,
  reviewed identity/key-management/sync design. Do not invent cryptography.
- Telemetry/data collection remain opt-in and OFF by default.
- Never modify or push `main`, publish to the Microsoft Store, bypass endpoint
  security, or run disposable-runner native tests against the owner's profile.
- Read the applicable security design in `docs/collaboration-phase-3-security.md`.

## Development workflow preferences

- Review actual code, agreed requirements, and remaining work. Select a substantial
  milestone that groups several related improvements.
- State the milestone briefly, then implement it immediately. A plan is not a
  handoff; do not stop after presenting one.
- Complete the milestone end to end: features, integration, interface refinement,
  related bug fixes, automated checks, and affected user-flow verification.
- Make routine implementation decisions independently within the agreed direction.
  Do not repeatedly ask for approval or whether to continue after each improvement.
- Ask only for decisions or access that genuinely block progress. Continue any
  independent work while a necessary answer is pending.
- Give short progress updates while continuing work. Prefer larger development
  batches and fewer interruptions for feedback or phone testing.
- Use small logical commits within the milestone and test each major block.
- Run available builds and relevant automated tests, exercise affected flows where
  tools permit, and fix failures before requesting the owner's testing.
- Request device testing once the milestone is integrated and ready for a meaningful
  review. Distinguish verified behavior from what still needs testing on the device.
- At handoff, give concise completed changes, remaining issues, and one short testing
  checklist with concrete launch or installation instructions.
- If forced to stop early, save a progress checkpoint with exact next steps. Never
  describe unfinished work as complete.

## Source, generated output, and validation

- Integration recipes in `build/integrate_*.py` materialize the owner-preview app.
  Native team handlers have source fragments in `build/team-*-host.cs.txt`.
- Keep exact native/static/package allowlists synchronized through the recipes.
  Do not commit a whole generated staging tree or overwrite unrelated source.
- `tests/collaboration_build.py` stages the exact owner-preview integration chain
  in a fresh ignored test directory and checks final integration idempotence.
- Run the full `tests/*.test.cjs` suite inside that stage. Browser collaboration
  tests use Node Playwright/Edge with `ATLAS_TEST_APP_DIR` pointing at staged `app`.
- Native lifecycle/storage tests require fresh GitHub-hosted Windows runners.
  Local owner-preview compilation is allowed; compiling does not authorize
  installing or launching an executable against the owner's data.
- Push validated milestones only to `develop/ui-directions`; use the existing
  `[atlas-owner-preview]` commit marker and applicable workflow paths for native CI.
