# Windows builder handoff
This is for the authorized developer/build operator, not an end-user installation procedure.

## Prerequisites
A private, authorized Windows build runner with .NET Framework 4.8, the Windows SDK (MakeAppx), Node and PowerShell. No paid signing account is needed for the Store-MSIX route. A future hosted runner must remain inside approved no-charge usage; the included workflow has not been connected or run.

## Configure
The owner reports account creation complete and supplied the three Partner Center identity fields. They are applied in `packaging/store-config.json`; do not overwrite it with the generic example. The publisher display name is Atlas Command Center, while the owner/author remains Jaison Norton. Authenticated Partner Center verification has not occurred in this session. Set `maxVersionTested` only from the actual Windows compatibility testing record. Never store a password, ID image, token or private key here.

The initial MSIX version 1.0.0.0 is package numbering only; it does not represent a feature-complete 1.0 product.

## Build in the isolated Windows environment
Run `./build/Build-Store.ps1` with PowerShell on the build runner. This invokes the compiler there, not on the owner's PC. It uses a fixed payload list, adds executable metadata and the MSIX manifest, keeps MakeAppx's validation enabled, and creates an unsigned submission candidate plus BUILD-REPORT.json. It does not start or install the application.

No ExecutionPolicy change, antivirus exclusion, trust-store modification, paid certificate, self-signing or elevation step is supplied.

## Optional private GitHub workflow
Review and pin the official action versions to audited full commit SHAs first. The prepared workflow requires a manual invocation, `confirm_build=true`, and the repository variable `ATLAS_ALLOW_BUILD=true`. The workflow reads the checked-in non-secret `packaging/store-config.json`. It deliberately refuses to package while the Windows compatibility test version is pending. A connected authorized repository and Windows runner do not yet exist in this session. Keep artifact retention short and paid overage disabled. No scheduled trigger or submission credential is present.

## Before any release
Compilation and MakeAppx validation are not a functional test. Complete and record the release checklist separately, resolve permissions/support/privacy fields, and inspect the actual payload. Use only approved test procedures in the test environment. Submit to Microsoft's MSIX route, not the EXE/MSI installer route, after the owner verifies the private audience. A draft local MSIX is not a Store-signed end-user installer.

## Follow-on architecture work
An embedded WebView2 desktop shell could replace the separate Edge window/local server later. That rewrite is not hidden inside this packaging change and must have its own storage, offline, security and lifecycle tests.
