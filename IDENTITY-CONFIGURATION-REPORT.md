# Atlas Command — Store identity configuration report

## Completed in this session

The existing Store-preparation archive was inspected and copied to a new source directory. The previous archive and quarantined prototype were not modified or launched.

These values were copied verbatim from the owner's message:

| Field | Value |
| --- | --- |
| Package/Identity/Name | `AtlasCommandCenter.AtlasCommand` |
| Package/Identity/Publisher | `CN=C67667CB-8089-40FE-AA2B-2AC007243585` |
| Package/Properties/PublisherDisplayName | `Atlas Command Center` |

The active configuration is `packaging/store-config.json`. The assembly company metadata now follows the Store display name. Jaison Norton remains the author/copyright credit. The app display name remains Atlas Command. These supplied values were NOT independently retrieved from an authenticated Microsoft account.

A review-only XML file demonstrates the identity substitution. The packaging script will still reject the unresolved Windows compatibility version; no Windows test result was invented. The workflow reads the non-secret checked-in config and now includes the additional identity tests.

## Tests actually executed here

Environment: Linux container, Node.js v22.16.0.

Command:

```text
node --test tests/core.test.cjs tests/source-checks.test.cjs tests/store-identity.test.cjs
```

**43 passed; 0 failed; 0 skipped.** This consists of 24 inherited application-logic tests, 11 updated source checks and 8 new identity/configuration checks. The identity preview was also parsed with Python's XML parser and the three inserted values were checked. This checks XML structure, NOT Windows SDK or Store manifest validation.

The new checks cover exact identity matching, author/publisher separation, private/free intent, unresolved Windows testing, honest release status, review-only manifest labelling and inclusion of identity tests in the build procedure. Static source checks are not a security audit or proof that a program is safe.

The renderer code was not changed. The previous browser UI test reports are retained in `docs/prior-preparation/` as historical records. **Browser UI tests were not rerun in this session.**

## Not completed

- Windows compilation and MSIX packaging.
- Native Windows launch, storage, offline, install/update/uninstall testing.
- Windows App Certification Kit testing.
- Investigation or clearance of the SentinelOne detection.
- Authenticated verification of the Microsoft account and product identity.
- A connected/authorized private build repository or a remote Windows run.
- Reviewed immutable action pins and confirmation of no-charge runner limits.
- Remote Private audience settings, Store submission, certification or signing.

**This archive is source, not an installer and not an uploadable Store package.** No paid service was enabled. No background updater or remote job was started. Leave the original blocked program quarantined.

## Next build gate

Authorize a private Windows build/test environment. A GitHub connection was offered in the conversation but no connection is assumed. Review available runner quota and ensure paid overage cannot occur before any job is enabled. Do not publish the source or upload private atlas data. A compiled candidate, Windows test record and security review must precede release.

## Official references checked for this update

- Microsoft product identity fields: https://learn.microsoft.com/en-us/windows/apps/publish/view-app-identity-details
- Microsoft TargetDeviceFamily and MaxVersionTested: https://learn.microsoft.com/en-us/uwp/schemas/appxpackage/uapmanifestschema/element-f-targetdevicefamily
- GitHub Actions allowance/billing: https://docs.github.com/en/billing/concepts/product-billing/github-actions
- GitHub guidance for immutable action pins: https://docs.github.com/en/actions/reference/security/secure-use
