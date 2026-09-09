<#
Engineering MSIX only, on a disposable runner. This checks packaging BEFORE
Windows 11 client acceptance; it does not replace the release compatibility gate.
No certificates, installation, endpoint changes, Store upload, or end-user scripts.
#>
[CmdletBinding()]
param()
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
if ($env:OS -ne 'Windows_NT' -or $env:GITHUB_ACTIONS -ne 'true' -or $env:RUNNER_ENVIRONMENT -ne 'github-hosted') {
    throw 'Use a disposable GitHub-hosted Windows build runner only.'
}
if ([Environment]::OSVersion.Version.Build -ne 20348) {
    throw 'This engineering baseline is specific to the recorded Windows Server 2022 test.'
}
$Root = Split-Path -Parent $PSScriptRoot
$OriginalConfig = Join-Path $Root 'packaging/store-config.json'
$OriginalHash = (Get-FileHash -LiteralPath $OriginalConfig -Algorithm SHA256).Hash
$Config = Get-Content -LiteralPath $OriginalConfig -Raw | ConvertFrom-Json
if ($Config.maxVersionTested -cne 'REPLACE_AFTER_WINDOWS_COMPATIBILITY_TEST') {
    throw 'Release configuration has changed. Review the package-check procedure first.'
}
$Dist = Join-Path $Root 'dist'
if (Test-Path -LiteralPath $Dist) { throw 'Expected a clean checkout without a dist directory.' }
$TemporaryConfig = Join-Path $env:RUNNER_TEMP ('atlas-engineering-' + [guid]::NewGuid().ToString('N') + '.json')
try {
    # Engineering compatibility baseline from the actual unpackaged runtime test.
    # NOT a claim of Windows 11 or packaged-app acceptance. Release config is unchanged.
    $Config.maxVersionTested = '10.0.20348.0'
    $Config | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath $TemporaryConfig -Encoding utf8
    & (Join-Path $PSScriptRoot 'Build-Store.ps1') -ConfigPath $TemporaryConfig

    $OriginalPackage = Join-Path $Dist ('AtlasCommand_' + $Config.version + '_x64_STORE-SUBMISSION-ONLY.msix')
    $Package = Join-Path $Dist ('AtlasCommand_' + $Config.version + '_x64_ENGINEERING-DO-NOT-INSTALL.msix')
    Move-Item -LiteralPath $OriginalPackage -Destination $Package
    $ReportPath = Join-Path $Dist 'BUILD-REPORT.json'
    $Report = Get-Content -LiteralPath $ReportPath -Raw | ConvertFrom-Json
    $AllowedPayload = @(
        'index.html','src/app.js','src/core.js','src/globe.js','src/styles.css',
        'assets/world.js','assets/icon.svg','assets/COUNTRYINFO-LICENSE.txt','data/seed.js',
        'AtlasCommand.exe','AtlasCommand.exe.config','RECOVERY.txt','AppxManifest.xml',
        'StoreAssets/StoreLogo.png','StoreAssets/Square150x150Logo.png','StoreAssets/Square44x44Logo.png'
    )
    $AllowedGenerated = @('AppxBlockMap.xml','[Content_Types].xml','AppxMetadata/CodeIntegrity.cat')
    Add-Type -AssemblyName System.IO.Compression.FileSystem
    $Archive = [IO.Compression.ZipFile]::OpenRead($Package)
    try {
        $Entries = @{}
        foreach ($Entry in $Archive.Entries) {
            $Name = $Entry.FullName.Replace('\','/')
            if ($Name.EndsWith('/')) { throw 'Unexpected explicit directory entry.' }
            if ($Entries.ContainsKey($Name)) { throw 'Duplicate or case-colliding archive path.' }
            if ($Name -cnotin $AllowedPayload -and $Name -cnotin $AllowedGenerated) { throw ('Unexpected packaged file: ' + $Name) }
            if ($Entry.Length -gt 16MB) { throw 'Unexpectedly large payload.' }
            $Entries[$Name] = $Entry
        }
        foreach ($Name in ($AllowedPayload + @('AppxBlockMap.xml','[Content_Types].xml'))) {
            if (-not $Entries.ContainsKey($Name)) { throw ('Missing packaged file: ' + $Name) }
        }
        if ($Report.packagedFiles.Count -ne $AllowedPayload.Count) { throw 'Build inventory count differs.' }
        $ReportedPaths = @{}
        foreach ($File in $Report.packagedFiles) {
            $Name = $File.path.Replace('\','/')
            if ($Name -cnotin $AllowedPayload -or $ReportedPaths.ContainsKey($Name)) { throw 'Unexpected or duplicate inventory path.' }
            $ReportedPaths[$Name] = $true
            $Stream = $Entries[$Name].Open()
            $Hasher = [Security.Cryptography.SHA256]::Create()
            try { $Hash = [BitConverter]::ToString($Hasher.ComputeHash($Stream)).Replace('-','').ToLowerInvariant() }
            finally { $Stream.Dispose(); $Hasher.Dispose() }
            if ($Hash -cne $File.sha256) { throw ('Packaged bytes differ: ' + $Name) }
        }
        $Reader = [IO.StreamReader]::new($Entries['AppxManifest.xml'].Open())
        try { [xml]$Manifest = $Reader.ReadToEnd() } finally { $Reader.Dispose() }
        if ($Manifest.Package.Identity.Name -cne $Config.identityName -or
            $Manifest.Package.Identity.Publisher -cne $Config.identityPublisher -or
            $Manifest.Package.Identity.Version -cne $Config.version -or
            $Manifest.Package.Identity.ProcessorArchitecture -cne 'x64' -or
            $Manifest.Package.Properties.PublisherDisplayName -cne $Config.publisherDisplayName) {
            throw 'Packaged Microsoft Store identity mismatch.'
        }
        if ($Manifest.Package.Dependencies.TargetDeviceFamily.MaxVersionTested -cne '10.0.20348.0') {
            throw 'Engineering manifest baseline mismatch.'
        }
    } finally { $Archive.Dispose() }
    $Report.packageName = [IO.Path]::GetFileName($Package)
    $Report.signing = 'UNSIGNED_ENGINEERING_PACKAGE_NOT_FOR_INSTALL_OR_SUBMISSION'
    $Report | Add-Member -NotePropertyName engineeringScope -NotePropertyValue ([ordered]@{
        intendedOwnerOS='Windows 11 (owner confirmed)'; candidateArchitecture='x64';
        ownerProcessorArchitecture='NOT_CONFIRMED'; windows11InstallAcceptance='NOT_RUN';
        sourceRuntimeEvidence='https://github.com/nortja/atlas-command/actions/runs/34310991868';
        sourceRuntimeScope='Unpackaged host on Windows Server 2022 with Edge';
        manifestBaseline='10.0.20348.0; engineering only, not Windows 11 acceptance';
        archiveIdentityAndPayloadHashes='PASSED'; releaseConfigurationChanged=$false;
        maySubmitToStore=$false; mayInstallOnOwnerPC=$false
    })
    $Report | ConvertTo-Json -Depth 10 | Set-Content -LiteralPath $ReportPath -Encoding utf8
    $Hash = (Get-FileHash -LiteralPath $Package -Algorithm SHA256).Hash.ToLowerInvariant()
    if ($Hash -cne $Report.sha256) { throw 'Package hash differs from original build report.' }
    ($Hash + '  ' + [IO.Path]::GetFileName($Package)) | Set-Content -LiteralPath (Join-Path $Dist 'SHA256SUMS.txt') -Encoding utf8
    @'
ATLAS COMMAND: ENGINEERING PACKAGE ONLY
Do not double-click, install, submit, or distribute this unsigned MSIX.
This artifact checks packaging and exact payload hashes. It is not Windows 11 acceptance.
No signing certificate has been created; no application was installed by this workflow.
The production configuration and Microsoft Store release gates remain unchanged.
Windows 11 installation, packaged storage, updates, endpoint review and Store certification remain pending.
The artifact expires after three days; your repository source is unaffected.
'@ | Set-Content -LiteralPath (Join-Path $Dist 'READ-FIRST.txt') -Encoding utf8
    @(
        '## Windows package check passed', '',
        'MakeAppx semantic validation, archive inventory, payload hashes and Store identity passed.',
        ('Source commit: ' + $env:GITHUB_SHA), ('Package SHA-256: ' + $Hash), '',
        'Intended owner OS: Windows 11. Actual Windows 11 installation tests remain pending.',
        'The attached engineering MSIX is UNSIGNED. Do not install or submit it.',
        'No release configuration, endpoint protection, account spending settings or Store settings were changed.'
    ) | Out-File -FilePath $env:GITHUB_STEP_SUMMARY -Append -Encoding utf8
} finally {
    if (Test-Path -LiteralPath $TemporaryConfig) { Remove-Item -LiteralPath $TemporaryConfig -Force }
    if ((Get-FileHash -LiteralPath $OriginalConfig -Algorithm SHA256).Hash -cne $OriginalHash) {
        throw 'The production configuration unexpectedly changed.'
    }
}
