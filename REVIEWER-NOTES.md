> Current configuration: publisher display name **Atlas Command Center**; owner/author **Jaison Norton**. The owner supplied Store identity values; no online submission or audience change has occurred. Earlier setup instructions below are draft checklist items, not evidence of completed remote actions.

# Reviewer notes — preparation, not an approval
## Intended use
Private, local-first exploration notebook for Jaison Norton. The app's intended audience is initially one personal Microsoft account. No commercial booking or payments are implemented.

## Why this is a desktop app
The packaged executable is a normal-user .NET Framework helper. It serves bundled HTML/JavaScript from an ephemeral IPv4 loopback port and opens Microsoft Edge in an app-style window with its own profile. It saves local workspace data and copies media selected by the user. It can open its own data folder in Windows Explorer and an attached PDF in the user's configured viewer. No service, startup registration, remote access server, PowerShell launcher, compiler or executable-plugin loader is installed.

The runFullTrust capability is proposed because this is an existing desktop helper, not a UWP AppContainer application. It does not request administrator elevation. Explain these functions truthfully in the restricted-capability review; approval is not assumed.

## Security history
The owner's screenshots show Start Atlas.cmd marked “Suspicious file executed” and both Start Atlas.cmd and AtlasCommand.exe quarantined. The specific detection engine, file hashes from the PC and process story have not been supplied. A false-positive determination has NOT been made.

The old first-run batch compiler is removed from this source distribution. The optional Windows runner compiles before distribution; build scripts and C# sources are excluded from the MSIX staging list. This removes that installation behavior but preserves the loopback/Edge architecture. It does not, by itself, settle the original detection.

## Changes in this preparation
- Assembly publisher/product metadata added; Store package identity left as explicit required input.
- No first-run compilation instructions in the renderer or a runtime .cmd launcher.
- Runtime file serving narrowed to an explicit asset list.
- Explorer is launched by its Windows-directory path rather than a bare executable name.
- Storage instructions no longer promise the old path survives MSIX redirection or uninstall.
- Candidate builder fails on placeholder identity, keeps MakeAppx validation enabled, and emits a checksum/build report without installing or publishing.

## Test limitations
Read docs/TEST-REPORT.md for tests actually executed. Windows compilation, managed-Windows runtime behavior, real C# file operations, MSIX installation, migration, signing, Windows App Certification Kit and SentinelOne behavior all require separate evidence. Browser-fixture tests are not those tests.

Do not remove security controls to reproduce or approve the app.
