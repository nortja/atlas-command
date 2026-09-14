# App downloads and automatic update delivery

Owner request, September 14, 2026: released Atlas versions should update
automatically. This is a requirement, not a claim that auto-update is enabled.

## Current preview

The tested collaboration milestone is commit
`554d352b0332e68af7a0e2a528bfaef302fc98c7` on `develop/ui-directions`.
Owner-preview run 34876280684 completed successfully on attempt 2. Its first
attempt failed with a Windows connection reset in the existing native smoke
test while checking a rejected write. The unchanged rerun passed; this is not
evidence that the intermittent transport failure has been permanently fixed.
GitHub's email about attempt 1 remains an accurate historical notification.

- Run: https://github.com/nortja/atlas-command/actions/runs/34876280684
- Download: https://github.com/nortja/atlas-command/actions/runs/34876280684/artifacts/10361880258
- Artifact: `atlas-owner-preview-windows-x64`, expires September 17, 2026.

Sign in with repository access, download the artifact, extract it and the enclosed
preview ZIP into a fresh folder, then run `AtlasCommand.exe`. Preserve a separate
encrypted team backup. This is an unsigned development preview, not an installer.
Do not bypass endpoint security. Expiring Actions artifacts are test delivery,
not a durable automatic update feed.

## Delivery decision and next steps

The existing consolidated release scope selects Microsoft Store MSIX delivery.
After an explicitly approved release, Store delivery supplies signing and app
updates subject to device/Store update settings. The publication hold still
applies; this request does not publish the app or release every development commit.

If private previews must update before Store release, first confirm a separate
channel and provision a trusted publisher signing identity and stable HTTPS
package/App Installer hosting. No signing secret, hosting account, or access token
has been provisioned for that channel here. Use Windows App Installer and signed
MSIX packages rather than a renderer executable-download mechanism. GitHub
credentials must never be bundled into the application.

For either channel, complete these release checks before enabling delivery:

1. Preserve package identity and assign monotonically increasing package versions.
2. Validate signed installation and upgrade on an authorized disposable Windows
   client, including ordinary data, encrypted workspace, device protection and
   backup recovery across the unpackaged-to-packaged transition.
3. Test offline start, interrupted upgrade, invalid signature, downgrade refusal,
   locked/unlocked workspace behavior, and data compatibility on recovery.
4. Keep updates separate from catalog content feeds and team sync. Send no private
   research content in update requests and retain telemetry OFF by default.
5. Promote only tested releases after the applicable release approval. Document
   installation and recovery before handing over one integrated release.

Until the channel and prerequisites are resolved, automatic app updating is
blocked. Do not present a placeholder switch as working automatic updates.

## Build notification emails

Build failures are developer CI notifications, not proof that the installed app
failed. Fix reproducible failures; do not disable tests or silently retry every
failure to make emails disappear. If the owner wants less email, GitHub Settings
> Notifications > System > Actions permits choosing On GitHub without Email.
This is an account notification preference and has not been changed for the owner.

## Official references checked September 14, 2026

- https://docs.github.com/en/subscriptions-and-notifications/how-tos/managing-github-actions-notifications
- https://learn.microsoft.com/en-us/windows/msix/app-installer/installing-windows10-apps-web
- https://learn.microsoft.com/en-us/windows/msix/app-installer/update-settings
- Existing release direction: `docs/development/CONSOLIDATED-RELEASE-SCOPE.md`
