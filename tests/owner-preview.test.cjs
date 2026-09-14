'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const build=fs.readFileSync('build/Build-OwnerPreview.ps1','utf8');
const install=fs.readFileSync('packaging/owner-preview/Install-AtlasCommand.ps1','utf8');
const uninstall=fs.readFileSync('packaging/owner-preview/Uninstall-AtlasCommand.ps1','utf8');

test('owner installer copies nested files and literal bracketed names on Windows',{skip:process.platform!=='win32'},()=>{
  const path=require('node:path'),os=require('node:os'),{execFileSync}=require('node:child_process');
  const fixture=fs.mkdtempSync(path.join(os.tmpdir(),'atlas-installer-copy-'));
  try{
    const source=path.join(fixture,'source [preview]'),target=path.join(fixture,'target');fs.mkdirSync(path.join(source,'app','src'),{recursive:true});fs.mkdirSync(target);
    fs.writeFileSync(path.join(source,'AtlasCommand.exe'),'copy fixture, not an executable');fs.writeFileSync(path.join(source,'app','src','literal [asset].js'),'fixture payload');
    // Exercise the shipped copy operation, without installation, deletion, COM or launch.
    const operation=install.split(/\r?\n/).find(line=>line.includes('Copy-Item'));
    assert(operation);const script=path.join(fixture,'copy.ps1');fs.writeFileSync(script,'$ErrorActionPreference="Stop"\n$Source=$env:ATLAS_COPY_SOURCE\n$Target=$env:ATLAS_COPY_TARGET\n'+operation);
    execFileSync('powershell.exe',['-NoProfile','-NonInteractive','-File',script],{env:{...process.env,ATLAS_COPY_SOURCE:source,ATLAS_COPY_TARGET:target},timeout:20000});
    assert.equal(fs.readFileSync(path.join(target,'AtlasCommand.exe'),'utf8'),'copy fixture, not an executable');assert.equal(fs.readFileSync(path.join(target,'app','src','literal [asset].js'),'utf8'),'fixture payload');
  }finally{fs.rmSync(fixture,{recursive:true,force:true});}
});

test('owner preview remains private unsigned development output',()=>{
  assert.match(build,/PRIVATE_OWNER_DEVELOPMENT/);
  assert.match(build,/signed=\$false/);
  assert.match(build,/storeCertified=\$false/);
  assert.doesNotMatch(build,/\bSignTool(?:\.exe)?\b|\bsigntool(?:\.exe)?\b|Add-AppxPackage|New-SelfSignedCertificate|Submit.*Store|Upload.*Store/i);
});

test('preview installer is per-user and does not request elevation or weaken security',()=>{
  assert.match(install,/LOCALAPPDATA/);
  assert.match(install,/Programs\\AtlasCommand/);
  assert.doesNotMatch(install,/RunAs|Verb\s*=\s*['"]runas|ExecutionPolicy\s+Bypass|Set-ExecutionPolicy|Add-MpPreference|Set-MpPreference|Defender|SentinelOne/i);
  assert.match(install,/do not disable security controls/i);
});

test('preview uninstaller preserves user data by default',()=>{
  assert.match(uninstall,/param\(\[switch\]\$RemoveUserData\)/);
  assert.match(uninstall,/preserved/i);
  assert.match(uninstall,/LOCALAPPDATA/);
});

test('owner preview explicitly includes current private-camera runtime modules',()=>{
  for(const name of ['field-camera-auth.js','field-camera-test.js','field-camera-onvif.js','field-camera-onvif-parser.js','field-camera-diagnostics.js','field-camera-layout.js']) assert.match(build,new RegExp(name.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')));
});
