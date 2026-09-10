<#
DEVELOPER BUILD SCRIPT ONLY. Run on an authorized Windows build runner, never as
an end-user installation step. It does not start the app, install a package,
change antivirus or execution policy, create certificates, or upload to Store.
Output is an unsigned MSIX submission candidate, NOT an approved installer.
#>
[CmdletBinding()]
param([string]$ConfigPath = '')
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
if ($env:OS -ne 'Windows_NT') { throw 'A Windows build runner with the Windows SDK is required.' }
$Root = Split-Path -Parent $PSScriptRoot
if (-not $ConfigPath) { $ConfigPath = Join-Path $Root 'packaging\store-config.json' }
if (-not (Test-Path -LiteralPath $ConfigPath -PathType Leaf)) {
    throw 'Store identity is not configured. Supply actual Partner Center identity; do not invent a Publisher CN.'
}
$Config = Get-Content -LiteralPath $ConfigPath -Raw | ConvertFrom-Json
foreach ($Field in @('identityName','identityPublisher','publisherDisplayName','displayName','version','maxVersionTested')) {
    $Property = $Config.PSObject.Properties[$Field]
    if ($null -eq $Property -or [string]::IsNullOrWhiteSpace([string]$Property.Value) -or [string]$Property.Value -match 'REPLACE|\{\{') {
        throw "Missing verified configuration field: $Field"
    }
}
if ([string]$Config.identityName -notmatch '^[A-Za-z0-9.-]{3,50}$') { throw 'Package identity name is not valid.' }
if ([string]$Config.identityPublisher -notmatch '^CN=') { throw 'Copy the exact Package/Identity/Publisher value from Partner Center.' }
if ($Config.distributionIntent -cne 'private' -or $Config.priceIntent -cne 'free' -or $null -ne $Config.makePublicOn) {
    throw 'This preparation is configured only for a free, private release with no public release date.'
}
# These local intentions do NOT change the remote audience; the owner must set
# Private audience in Partner Center and verify it before submitting.
if ([string]$Config.version -notmatch '^\d+\.\d+\.\d+\.0$') { throw 'Use a four-part Store version with a final zero.' }
$Version = [version]$Config.version
if ($Version.Major -lt 1 -or $Version.Major -gt 65535 -or $Version.Minor -gt 65535 -or $Version.Build -gt 65535) { throw 'Version is outside the permitted range.' }
if ([string]$Config.maxVersionTested -notmatch '^10\.0\.\d+\.\d+$') { throw 'Supply the actual target Windows test version.' }
if ([version]$Config.maxVersionTested -lt [version]'10.0.19041.0') { throw 'Tested version is below this build target.' }

$Compiler = Join-Path $env:WINDIR 'Microsoft.NET\Framework64\v4.0.30319\csc.exe'
if (-not (Test-Path -LiteralPath $Compiler)) { throw 'The .NET Framework C# compiler is missing on the BUILD runner.' }
$SdkRoot = Join-Path ${env:ProgramFiles(x86)} 'Windows Kits\10\bin'
$SdkDirs = @(Get-ChildItem -LiteralPath $SdkRoot -Directory | Where-Object { $_.Name -match '^10\.0\.\d+\.0$' } | Sort-Object { [version]$_.Name } -Descending)
$MakeAppx = $null
foreach ($Sdk in $SdkDirs) {
    $Candidate = Join-Path $Sdk.FullName 'x64\makeappx.exe'
    if (Test-Path -LiteralPath $Candidate) { $MakeAppx = $Candidate; break }
}
if (-not $MakeAppx) { throw 'MakeAppx.exe is missing. Install the Windows SDK on the authorized BUILD runner.' }
$null = Get-Command node -ErrorAction Stop
Push-Location $Root
try {
    & node --test 'tests/core.test.cjs' 'tests/source-checks.test.cjs' 'tests/store-identity.test.cjs' 'tests/workspace-layout.test.cjs' 'tests/lidar.test.cjs' 'tests/weather-units.test.cjs' 'tests/live-weather.test.cjs' 'tests/release-tools.test.cjs'
    if ($LASTEXITCODE -ne 0) { throw 'JavaScript or source checks failed.' }
} finally { Pop-Location }

$Obj = Join-Path $Root ('obj\' + [guid]::NewGuid().ToString('N'))
$Stage = Join-Path $Obj 'package'
$Dist = Join-Path $Root 'dist'
$null = New-Item -ItemType Directory -Force -Path $Stage,$Dist
# Runtime content is an explicit allow-list. No compiler, batch file, C# source,
# private workspace, personal photos, signing keys or build scripts are shipped.
$RuntimeFiles = @(
    'index.html','src/app.js','src/core.js','src/globe.js','src/styles.css','src/workspace-layout.js','src/weather-units.js','src/live-weather.js','src/live-weather.css','src/data-refresh.js','src/cameras.js','src/cameras.css','src/ui-directions.js','src/ui-directions.css','src/ui-refinement.css','src/field-camera-diagnostics.js','src/field-camera-onvif.js','src/field-camera-transport.js','src/field-camera-layout.js','src/field-camera-recordings.js','src/field-camera-ux.js','src/field-camera-ux.css','src/field-camera-auth.js','src/field-cameras.js','src/field-camera-desk.js','src/field-cameras.css','src/lidar.js','src/next-ui.css',
    'assets/world.js','assets/icon.svg','assets/COUNTRYINFO-LICENSE.txt','data/seed.js'
)
foreach ($Relative in $RuntimeFiles) {
    $Source = Join-Path (Join-Path $Root 'app') $Relative
    $Destination = Join-Path $Stage $Relative
    $null = New-Item -ItemType Directory -Force -Path (Split-Path -Parent $Destination)
    Copy-Item -LiteralPath $Source -Destination $Destination
}
Copy-Item -LiteralPath (Join-Path $Root 'native\AtlasCommand.exe.config') -Destination $Stage
Copy-Item -LiteralPath (Join-Path $Root 'packaging\StoreAssets') -Destination $Stage -Recurse
Copy-Item -LiteralPath (Join-Path $Root 'docs\RECOVERY.txt') -Destination (Join-Path $Stage 'RECOVERY.txt')
$VersionSource = Join-Path $Obj 'VersionInfo.cs'
[IO.File]::WriteAllText($VersionSource, ('using System.Reflection;' + [Environment]::NewLine +
    '[assembly: AssemblyVersion("' + $Config.version + '")]' + [Environment]::NewLine +
    '[assembly: AssemblyFileVersion("' + $Config.version + '")]'), [Text.UTF8Encoding]::new($false))
$Exe = Join-Path $Stage 'AtlasCommand.exe'
$CompilerArgs = @('/nologo','/codepage:65001','/target:winexe','/platform:x64','/optimize+','/warn:4','/warnaserror+',
    "/out:$Exe",('/win32manifest:' + (Join-Path $Root 'native\WindowsApp.manifest')),
    ('/win32icon:' + (Join-Path $Root 'native\AtlasCommand.ico')),
    '/reference:System.dll,System.Core.dll,System.Security.dll,System.Web.Extensions.dll,System.Windows.Forms.dll',
    (Join-Path $Root 'native\AtlasHost.cs'),(Join-Path $Root 'native\AssemblyInfo.cs'),$VersionSource)
& $Compiler @CompilerArgs
if ($LASTEXITCODE -ne 0 -or -not (Test-Path -LiteralPath $Exe)) { throw 'Native compilation failed; no release was produced.' }
$Assembly = [Reflection.AssemblyName]::GetAssemblyName($Exe)
if ($Assembly.Version.ToString() -ne $Config.version) { throw 'Compiled assembly version does not match configuration.' }

$Manifest = Get-Content -LiteralPath (Join-Path $Root 'packaging\AppxManifest.template.xml') -Raw
$Replacements = @{
    IDENTITY_NAME=$Config.identityName; IDENTITY_PUBLISHER=$Config.identityPublisher;
    PUBLISHER_DISPLAY_NAME=$Config.publisherDisplayName; DISPLAY_NAME=$Config.displayName;
    VERSION=$Config.version; MAX_VERSION_TESTED=$Config.maxVersionTested
}
foreach ($Key in $Replacements.Keys) {
    $Manifest = $Manifest.Replace('{{' + $Key + '}}',[Security.SecurityElement]::Escape([string]$Replacements[$Key]))
}
if ($Manifest -match '\{\{') { throw 'Unresolved manifest template field.' }
$null = [xml]$Manifest
[IO.File]::WriteAllText((Join-Path $Stage 'AppxManifest.xml'),$Manifest,[Text.UTF8Encoding]::new($false))
$Package = Join-Path $Dist ('AtlasCommand_' + $Config.version + '_x64_STORE-SUBMISSION-ONLY.msix')
# Keep semantic validation enabled. This does not install or trust the package.
& $MakeAppx pack /d $Stage /p $Package /o
if ($LASTEXITCODE -ne 0 -or -not (Test-Path -LiteralPath $Package)) { throw 'MSIX packaging or manifest validation failed.' }
$FileHashes = @(Get-ChildItem -LiteralPath $Stage -Recurse -File | ForEach-Object {
    [ordered]@{path=$_.FullName.Substring($Stage.Length+1);sha256=(Get-FileHash -LiteralPath $_.FullName -Algorithm SHA256).Hash.ToLowerInvariant()}
})
$Report = [ordered]@{
    generatedUtc=[DateTime]::UtcNow.ToString('o'); sourceCommit=$env:GITHUB_SHA;
    publisherDisplayName=$Config.publisherDisplayName; packageName=[IO.Path]::GetFileName($Package);
    sha256=(Get-FileHash -LiteralPath $Package -Algorithm SHA256).Hash.ToLowerInvariant();
    compiler=$Compiler; makeAppx=$MakeAppx; assemblyVersion=$Assembly.Version.ToString();
    compilation='PASSED'; makeAppxValidation='PASSED';
    nativeRuntimeTests='NOT_RUN_BY_THIS_SCRIPT'; storeInstallTests='NOT_RUN_BY_THIS_SCRIPT';
    endpointReview='REQUIRED'; certification='NOT_SUBMITTED'; signing='UNSIGNED_STORE_SUBMISSION_CANDIDATE';
    distributionAudience='MUST_BE_SET_IN_PARTNER_CENTER'; mayDistributeAsInstaller=$false;
    packagedFiles=$FileHashes
}
$Report | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath (Join-Path $Dist 'BUILD-REPORT.json') -Encoding utf8
Write-Host 'Build candidate created. It is NOT a signed installer or a passed Windows runtime test.'
Write-Host 'Complete Windows functional tests, endpoint review, and private Store certification before installing for the owner.'
