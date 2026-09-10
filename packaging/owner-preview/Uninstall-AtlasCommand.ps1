[CmdletBinding()]
param([switch]$RemoveUserData)
Set-StrictMode -Version Latest
$ErrorActionPreference='Stop'
if (Get-Process -Name 'AtlasCommand' -ErrorAction SilentlyContinue) { throw 'Close Atlas Command before uninstalling.' }
$Target=Join-Path $env:LOCALAPPDATA 'Programs\AtlasCommand'
$Shortcut=Join-Path $env:APPDATA 'Microsoft\Windows\Start Menu\Programs\Atlas Command.lnk'
$DesktopLink=Join-Path ([Environment]::GetFolderPath('Desktop')) 'Atlas Command.lnk'
foreach($link in @($Shortcut,$DesktopLink)){ if(Test-Path -LiteralPath $link){ Remove-Item -LiteralPath $link -Force } }
if(Test-Path -LiteralPath $Target){ Remove-Item -LiteralPath $Target -Recurse -Force }
if($RemoveUserData){
  $DataRoot=Join-Path $env:LOCALAPPDATA 'AtlasCommand'
  if(Test-Path -LiteralPath $DataRoot){ Remove-Item -LiteralPath $DataRoot -Recurse -Force }
  Write-Host 'Atlas Command program files and local user data were removed.'
}else{
  Write-Host 'Atlas Command program files were removed. Local workspace data and protected camera credentials were preserved.'
}
