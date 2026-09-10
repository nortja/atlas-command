<#
Build a private owner-preview ZIP for same-day hands-on testing.
This is an unsigned development preview, not a Store-certified release.
It does not install anything on the build runner or the owner's PC.
#>
[CmdletBinding()]
param()
Set-StrictMode -Version Latest
$ErrorActionPreference='Stop'
if($env:OS -ne 'Windows_NT'){throw 'Windows build runner required.'}
$Root=Split-Path -Parent $PSScriptRoot
$Config=Get-Content -LiteralPath (Join-Path $Root 'packaging\store-config.json') -Raw | ConvertFrom-Json
if($Config.developmentStatus -cne 'NOT_SUBMITTED_NOT_APPROVED'){throw 'Owner preview requires development status NOT_SUBMITTED_NOT_APPROVED.'}
if($Config.distributionIntent -cne 'private'){throw 'Owner preview must remain private.'}
$Compiler=Join-Path $env:WINDIR 'Microsoft.NET\Framework64\v4.0.30319\csc.exe'
if(-not (Test-Path -LiteralPath $Compiler)){throw '.NET Framework compiler missing.'}
$Dist=Join-Path $Root 'dist'
$Stage=Join-Path $Dist 'AtlasCommand-OwnerPreview'
$Zip=Join-Path $Dist ('AtlasCommand-OwnerPreview-'+$Config.version+'-x64.zip')
if(Test-Path -LiteralPath $Stage){Remove-Item -LiteralPath $Stage -Recurse -Force}
if(Test-Path -LiteralPath $Zip){Remove-Item -LiteralPath $Zip -Force}
$null=New-Item -ItemType Directory -Force -Path $Stage
$RuntimeFiles=@(
 'index.html',
 'src/app.js','src/core.js','src/globe.js','src/styles.css','src/next-ui.css','src/workspace-layout.js',
 'src/weather-units.js','src/live-weather.js','src/live-weather.css','src/data-refresh.js',
 'src/cameras.js','src/cameras.css','src/ui-directions.js','src/ui-directions.css','src/ui-refinement.css',
 'src/field-cameras.js','src/field-camera-desk.js','src/field-cameras.css','src/field-camera-ux.js','src/field-camera-ux.css',
 'src/field-camera-auth.js','src/field-camera-test.js','src/field-camera-diagnostics.js','src/field-camera-onvif.js',
 'src/field-camera-onvif-parser.js','src/field-camera-transport.js','src/field-camera-layout.js','src/field-camera-recordings.js',
 'src/lidar.js','assets/world.js','assets/icon.svg','assets/COUNTRYINFO-LICENSE.txt','data/seed.js'
)
foreach($Relative in $RuntimeFiles){
 $Source=Join-Path (Join-Path $Root 'app') $Relative
 if(-not (Test-Path -LiteralPath $Source -PathType Leaf)){throw ('Missing owner-preview runtime file: '+$Relative)}
 $Destination=Join-Path $Stage $Relative
 $null=New-Item -ItemType Directory -Force -Path (Split-Path -Parent $Destination)
 Copy-Item -LiteralPath $Source -Destination $Destination
}
Copy-Item -LiteralPath (Join-Path $Root 'native\AtlasCommand.exe.config') -Destination $Stage
Copy-Item -LiteralPath (Join-Path $Root 'packaging\owner-preview\Install-AtlasCommand.ps1') -Destination $Stage
Copy-Item -LiteralPath (Join-Path $Root 'packaging\owner-preview\Uninstall-AtlasCommand.ps1') -Destination $Stage
Copy-Item -LiteralPath (Join-Path $Root 'docs\RECOVERY.txt') -Destination (Join-Path $Stage 'RECOVERY.txt')
$VersionSource=Join-Path $env:RUNNER_TEMP ('AtlasOwnerVersion-'+[guid]::NewGuid().ToString('N')+'.cs')
[IO.File]::WriteAllText($VersionSource,('using System.Reflection; [assembly: AssemblyVersion("'+$Config.version+'")] [assembly: AssemblyFileVersion("'+$Config.version+'")]'),[Text.UTF8Encoding]::new($false))
try{
 $Exe=Join-Path $Stage 'AtlasCommand.exe'
 $Args=@('/nologo','/codepage:65001','/target:winexe','/platform:x64','/optimize+','/warn:4','/warnaserror+',('/out:'+$Exe),('/win32manifest:'+(Join-Path $Root 'native\WindowsApp.manifest')),('/win32icon:'+(Join-Path $Root 'native\AtlasCommand.ico')),'/reference:System.dll,System.Core.dll,System.Security.dll,System.Web.Extensions.dll,System.Windows.Forms.dll',(Join-Path $Root 'native\AtlasHost.cs'),(Join-Path $Root 'native\AssemblyInfo.cs'),$VersionSource)
 & $Compiler @Args
 if($LASTEXITCODE -ne 0 -or -not (Test-Path -LiteralPath $Exe)){throw 'Owner-preview native compilation failed.'}
}finally{if(Test-Path -LiteralPath $VersionSource){Remove-Item -LiteralPath $VersionSource -Force}}
$Readme=@"
Atlas Command Owner Preview $($Config.version)

This private x64 development build is for the owner to test today. It is NOT Store-certified or signed.

Fastest way to play:
1. Extract the ZIP.
2. Double-click AtlasCommand.exe for portable use.

Per-user install:
1. Right-click Install-AtlasCommand.ps1 and choose Run with PowerShell.
2. The app installs under %LOCALAPPDATA%\Programs\AtlasCommand and adds a Start Menu shortcut.
3. No administrator access is requested and no security policy is weakened.

If Windows, SmartScreen, or endpoint security blocks this unsigned preview, stop and report the exact message. Do not disable antivirus or endpoint protection.

Uninstall-AtlasCommand.ps1 removes program files and shortcuts while preserving local Atlas data by default.
"@
[IO.File]::WriteAllText((Join-Path $Stage 'README-FIRST.txt'),$Readme,[Text.UTF8Encoding]::new($false))
$Hashes=@(Get-ChildItem -LiteralPath $Stage -Recurse -File | Sort-Object FullName | ForEach-Object {('{0}  {1}' -f (Get-FileHash -LiteralPath $_.FullName -Algorithm SHA256).Hash.ToLowerInvariant(),$_.FullName.Substring($Stage.Length+1).Replace('\','/'))})
[IO.File]::WriteAllLines((Join-Path $Stage 'SHA256SUMS.txt'),$Hashes,[Text.UTF8Encoding]::new($false))
Compress-Archive -LiteralPath $Stage -DestinationPath $Zip -CompressionLevel Optimal
$Report=[ordered]@{generatedUtc=[DateTime]::UtcNow.ToString('o');sourceCommit=$env:GITHUB_SHA;version=$Config.version;architecture='x64';previewType='PRIVATE_OWNER_DEVELOPMENT';signed=$false;storeCertified=$false;installerType='PER_USER_SCRIPT_PLUS_PORTABLE';zip=[IO.Path]::GetFileName($Zip);sha256=(Get-FileHash -LiteralPath $Zip -Algorithm SHA256).Hash.ToLowerInvariant();securityBypass=$false;adminRequired=$false}
$Report|ConvertTo-Json -Depth 5|Set-Content -LiteralPath (Join-Path $Dist 'OWNER-PREVIEW-REPORT.json') -Encoding utf8
Write-Host ('Owner preview created: '+$Zip)
Write-Host 'Unsigned private development build only; no installation or Store submission performed on this runner.'
