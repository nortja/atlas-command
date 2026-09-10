'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const build=fs.readFileSync('build/Build-OwnerPreview.ps1','utf8');
const install=fs.readFileSync('packaging/owner-preview/Install-AtlasCommand.ps1','utf8');
const uninstall=fs.readFileSync('packaging/owner-preview/Uninstall-AtlasCommand.ps1','utf8');

test('owner preview remains private unsigned development output',()=>{
  assert.match(build,/PRIVATE_OWNER_DEVELOPMENT/);
  assert.match(build,/signed=\$false/);
  assert.match(build,/storeCertified=\$false/);
  assert.doesNotMatch(build,/SignTool|signtool|Partner Center|Store submission/i);
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
