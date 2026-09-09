# Windows 11 owner target and engineering package check

The owner confirmed Windows 11 in the project conversation. Exact build, edition and CPU architecture are not yet confirmed; the existing candidate is x64.

Next manual workflow: **Build Windows package**. This prepares an unsigned engineering MSIX on a disposable Windows Server 2022 runner, validates its manifest and byte inventory, and retains only the package and reports in this private repository for three days. It does not install anything on the owner's computer or submit to Microsoft.

The workflow checks GitHub's actual successful runtime run 34310991868 and requires its tested application inputs to remain unchanged. The evidence is for unpackaged execution on Windows Server 2022, not Windows 11 installation. The engineering manifest uses 10.0.20348.0 as a clearly identified interim baseline; it does not invent a Windows 11 test result. The production configuration's compatibility placeholder and existing release gates remain unchanged.

Do not install or submit this engineering artifact. Windows 11 packaged installation, local storage and upgrade acceptance, SentinelOne review, Store certification and signing remain pending. All app delivery remains private and manually controlled. Keep the existing account-level $0 Actions budget with Stop usage enabled.

References:
- Runtime evidence: https://github.com/nortja/atlas-command/actions/runs/34310991868
- Microsoft manifest field semantics: https://learn.microsoft.com/en-us/uwp/schemas/appxpackage/uapmanifestschema/element-f-targetdevicefamily
- Manual workflows: https://docs.github.com/en/actions/how-tos/manage-workflow-runs/manually-run-a-workflow
