# Atlas Command — Store identity configured

**Owner/author: Jaison Norton. Store publisher display name supplied by the owner: Atlas Command Center.**

## Status: source handoff, NOT an installer
Microsoft developer account creation was reported complete by the owner. The three identity values supplied in the conversation have now been applied. This session has no authenticated Partner Center access and has not independently checked the account, reservation or identity values online.

No Windows executable or MSIX was compiled here, no signing occurred, and nothing was uploaded, submitted or published. Keep the original prototype quarantined. This archive is not a way to bypass SentinelOne.

## Configured identity
- Package name: `AtlasCommandCenter.AtlasCommand`
- Publisher: `CN=C67667CB-8089-40FE-AA2B-2AC007243585`
- Publisher display name: `Atlas Command Center`
- App display name retained: `Atlas Command`
- Package version planned: `1.0.0.0` (not a feature-completeness claim)

The first three values are in `packaging/store-config.json`. The assembly company follows the supplied publisher display name; copyright remains Jaison Norton. The config is intentionally trackable because it contains package metadata, not credentials. `packaging/store-config.example.json` remains a generic example, not the active configuration.

`packaging/AppxManifest.identity-preview.xml` is a readable review artifact with the identity inserted. It is NOT a deployable manifest: `MaxVersionTested` is still unresolved. Do not upload source XML or this ZIP to Partner Center's package upload form.

## Next build gate
An authorized Windows build/test environment is still needed. `maxVersionTested` remains deliberately pending actual compatibility testing. The optional private GitHub workflow has not been installed or run; reviewed action commit pins, account no-overage settings, explicit build authorization and the Windows test record must be established first. No paid service has been enabled.

The app remains the existing loopback-only native helper plus an Edge app-style interface, not an embedded WebView2 rewrite. Runtime files do not contain the old first-run compiler launcher. Source and build scripts are for a development runner, not installation on the owner's computer.

## Release gates that remain
Windows compilation, actual install/runtime/offline/storage and lifecycle tests, Windows App Certification Kit, SentinelOne detection review, completed listing/privacy/support information, verification of a free Private audience in Partner Center, certification and Store signing. Local private/free fields are intentions, not remote account changes.

No personal atlas or media is included. Preserve the original CSV/KML/KMZ and existing workspace backups. See `docs/IDENTITY-CONFIGURATION-REPORT.md` for this session's tests, and `docs/BUILD-HANDOFF.md` for the builder handoff. Reports in `docs/prior-preparation/` are historical results, not tests rerun in this session.
