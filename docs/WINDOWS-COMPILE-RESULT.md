# Windows compilation result

Observed from GitHub Actions run 34310389656, job 102335676232.

- Workflow: Windows compile check, run 1, attempt 1.
- Source commit: 435d5bbe8570cc56dc335f80a571a5caebf762a1.
- Conclusion: success.
- All 43 application-logic, source, and Store-identity tests passed; zero failed or skipped.
- PowerShell packaging recipe parsed without syntax errors.
- Native x64 application compiled successfully with warnings treated as errors.
- The compiler step verified the assembly version against the configured Store version.
- Actual build host: Microsoft Windows Server 2022, OS 10.0.20348, GitHub-hosted runner.
- Run completed: 2026-09-09T04:17:57Z.

Evidence: https://github.com/nortja/atlas-command/actions/runs/34310389656

## Limits

The successful compile check did not launch or install the application. It removed the temporary executable and did not upload a binary artifact. It does not establish Windows 10/11 compatibility, MSIX installation behavior, SentinelOne clearance, or Microsoft Store certification/signing. Earlier preparation reports describe their own historical test state; this record supplements them.

## Next check

The separate manual **Windows app test** workflow is intended to exercise the unmodified native host, real local HTTP storage, Edge headless rendering, synthetic attachment handling, request validation, and save/restart persistence on a disposable Windows Server runner. Its addition is not a claim that it has run or passed. It does not alter endpoint policy, install certificates, upload artifacts, change paid-usage settings, or publish to the Store.
