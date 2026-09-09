# Verified Windows runtime test result

## Evidence

- Workflow: Windows app test, run 1.
- Run: https://github.com/nortja/atlas-command/actions/runs/34310991868
- Job: 102337449327 (test), completed with conclusion `success`.
- Tested source commit: `c1c1264667650c41e534ec8d6fb1e722871d39a9`.
- Runtime assertions completed: 2026-09-09 at 04:27:29 UTC, according to the job log.
- Environment: disposable GitHub-hosted Windows Server 2022, OS 10.0.20348; installed Edge browser, including headless renderer inspection.
- Verification: workflow job status and its decoded log were read through the connected GitHub integration.

## Results

All 43 application logic, source and Store identity checks passed. Native compilation passed. All 14 native smoke-test checkpoints passed:

1. Unmodified host starts and launches its isolated Edge profile.
2. Native HTTP responses provide expected security headers.
3. All renderer assets are available through the real local host.
4. Edge renders 26 starter records using the native host without a mock storage adapter.
5. Wrong host, origin, initiating site and session path are refused.
6. Path traversal, executable serving and direct workspace serving are refused.
7. An unmarked cross-context write is refused.
8. A synthetic zero-coordinate record is saved to disk and read back exactly.
9. Atomic replacement retains the previous workspace and a daily backup.
10. Invalid schema, duplicate identifiers, coordinates and malformed JSON preserve saved data.
11. A synthetic attachment is saved intact; duplicate upload cannot overwrite it.
12. Attachment byte ranges work and unsupported file extensions are refused.
13. Native exit request stops the host cleanly.
14. Saved notes, coordinates and attachment bytes survive an actual host restart.

Temporary executable cleanup also passed. This run did not upload an application artifact or submit an application to Microsoft. It made no changes to the owner's computer, security software or billing settings.

## Scope and remaining work

This is evidence for the exact tested source, not a general security clearance. It supersedes earlier pending statements only for native compilation and these unpackaged runtime smoke tests.

Windows 10/11 client installation and interactive acceptance, packaged-app storage behavior and upgrades, SentinelOne review, Microsoft Store certification and signing remain unverified. No signed replacement installer is available from this run.

Do not rerun the quarantined launcher. Do not run the existing Store preparation workflow yet: its compatibility and release gates remain pending. The next release-planning input is the owner's actual Windows client version; build-machine success must not be relabeled as testing on that client version.
