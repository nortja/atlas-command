# Verified engineering package build

## Evidence

- Workflow: Build Windows package, run 1.
- Run: https://github.com/nortja/atlas-command/actions/runs/34311837415
- Job: 102339928877 (package), completed with conclusion `success`.
- Source commit: `480595180a5889b692604dda2fed09e4f89fc056`.
- Build report generated at 2026-09-09T04:40:08.3067127Z.
- Artifact: 10088636799, `atlas-engineering-package-DO-NOT-INSTALL`.
- Artifact expiry reported by GitHub: 2026-09-12T04:40:08Z.
- Tool used by the Windows runner: Windows SDK 10.0.26100.0 MakeAppx.

## Verified results

The connected GitHub workflow job reports success for native-test evidence verification, recipe checks, compilation, packaging, private artifact retention, and cleanup. BUILD-REPORT.json records compilation and MakeAppx validation as PASSED.

The artifact was downloaded through the connected GitHub integration and inspected as an archive, without executing or installing its contents. Independent checks passed:

1. Downloaded ZIP SHA-256 matches the GitHub artifact digest: `93aafb621467822e79f297c85eaa7b4d5e1d6d66b0cc266855864579f91affe0`.
2. MSIX SHA-256 matches BUILD-REPORT.json and SHA256SUMS.txt: `5154c573d351e89f98164299ee5b2291af2806ae431e3bf4c57142312334e2f9`.
3. All 16 payload file hashes match the build report.
4. MSIX ZIP CRC checks pass.
5. Manifest identity matches the owner-supplied values: Name `AtlasCommandCenter.AtlasCommand`, Publisher `CN=C67667CB-8089-40FE-AA2B-2AC007243585`, version `1.0.0.0`, architecture `x64`.
6. The archive contains no .cmd, .bat, .cs, .ps1, .pfx, or .pem files.

No AppxSignature.p7x is present. The package is unsigned. Hash verification establishes integrity relative to this build's records; it is NOT independent malware clearance.

## Remaining release work

This engineering artifact is not approved for installation or Store submission. Its filename is `AtlasCommand_1.0.0.0_x64_ENGINEERING-DO-NOT-INSTALL.msix`.

- Owner's operating system: Windows 11, confirmed in conversation. Exact client version and processor architecture remain unconfirmed.
- Prior actual runtime evidence covers the unpackaged host on GitHub-hosted Windows Server 2022, not Windows 11 installation or packaged storage.
- Current manifest MinVersion: 10.0.19041.0. MaxVersionTested: 10.0.20348.0, an engineering baseline only, not a claim of Windows 11 acceptance.
- Windows 11 packaged installation, storage persistence, upgrades, and interactive acceptance remain untested.
- SentinelOne review, Store certification, and signing remain pending.
- Private/free intent in repository configuration does not set the online Store audience. The owner must configure the Partner Center draft as Private audience, using their personal Microsoft account in the allowed group, with no automatic public-release date.

This evidence-only commit does not modify application code, change billing/security policy, launch a workflow, install a package, or submit/publish to Microsoft. Keep the previous launcher quarantined.
