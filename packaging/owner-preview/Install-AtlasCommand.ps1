[CmdletBinding()]
param([switch]$DesktopShortcut)
Set-StrictMode -Version Latest
$ErrorActionPreference='Stop'
$Source=Split-Path -Parent $MyInvocation.MyCommand.Path
$Exe=Join-Path $Source 'AtlasCommand.exe'
if (-not (Test-Path -LiteralPath $Exe -PathType Leaf)) { throw 'AtlasCommand.exe is missing from this owner-preview folder.' }
if (Get-Process -Name 'AtlasCommand' -ErrorAction SilentlyContinue) { throw 'Close Atlas Command before installing this preview.' }
$Target=Join-Path $env:LOCALAPPDATA 'Programs\AtlasCommand'
$StartMenu=Join-Path $env:APPDATA 'Microsoft\Windows\Start Menu\Programs'
$Shortcut=Join-Path $StartMenu 'Atlas Command.lnk'
$DesktopLink=Join-Path ([Environment]::GetFolderPath('Desktop')) 'Atlas Command.lnk'
$null=New-Item -ItemType Directory -Force -Path $Target,$StartMenu
# Program files are replaceable; user data and protected camera credentials live elsewhere under LocalAppData\AtlasCommand.
Get-ChildItem -LiteralPath $Target -Force -ErrorAction SilentlyContinue | Remove-Item -Recurse -Force
Get-ChildItem -LiteralPath $Source -Force | ForEach-Object { Copy-Item -LiteralPath $_.FullName -Destination $Target -Recurse -Force }
$InstalledExe=Join-Path $Target 'AtlasCommand.exe'
if (-not (Test-Path -LiteralPath $InstalledExe)) { throw 'Installation copy did not produce AtlasCommand.exe.' }
$Shell=New-Object -ComObject WScript.Shell
$link=$Shell.CreateShortcut($Shortcut);$link.TargetPath=$InstalledExe;$link.WorkingDirectory=$Target;$link.IconLocation=$InstalledExe+',0';$link.Description='Atlas Command owner preview';$link.Save()
if ($DesktopShortcut) { $d=$Shell.CreateShortcut($DesktopLink);$d.TargetPath=$InstalledExe;$d.WorkingDirectory=$Target;$d.IconLocation=$InstalledExe+',0';$d.Description='Atlas Command owner preview';$d.Save() }
Write-Host 'Atlas Command owner preview installed for this Windows user.'
Write-Host ('Start menu shortcut: '+$Shortcut)
Write-Host 'No administrator access, execution-policy change, antivirus exception, service, task, or Store registration was created.'
Write-Host 'If Windows or endpoint security blocks the unsigned preview, stop and report the exact message; do not disable security controls.'
