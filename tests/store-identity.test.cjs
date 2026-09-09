'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
const config=JSON.parse(read('packaging/store-config.json'));
const status=JSON.parse(read('submission/release-status.json'));
test('package name matches owner-supplied Partner Center value exactly',()=>{
  assert.equal(config.identityName,'AtlasCommandCenter.AtlasCommand');
  assert.match(config.identityName,/^[A-Za-z0-9.-]{3,50}$/);
});
test('publisher CN matches owner-supplied Partner Center value exactly',()=>{
  assert.equal(config.identityPublisher,'CN=C67667CB-8089-40FE-AA2B-2AC007243585');
});
test('Store display publisher is not silently replaced by author name',()=>{
  assert.equal(config.publisherDisplayName,'Atlas Command Center');
  assert.equal(status.ownerName,'Jaison Norton');
});
test('unexecuted Windows tests remain an explicit packaging blocker',()=>{
  assert.equal(config.maxVersionTested,'REPLACE_AFTER_WINDOWS_COMPATIBILITY_TEST');
  assert.equal(status.windowsInstallAndRuntimeTests,'NOT_RUN');
});
test('private free intent has not been misrepresented as an online setting',()=>{
  assert.equal(config.distributionIntent,'private');assert.equal(config.priceIntent,'free');
  assert.equal(config.makePublicOn,null);
  assert.equal(status.audienceConfiguration,'PRIVATE_INTENT_ONLY_NOT_APPLIED');
  assert.equal(status.paidServicesEnabled,false);
});
test('identity review XML is marked as non-deployable with Windows version still pending',()=>{
  const preview=read('packaging/AppxManifest.identity-preview.xml');
  assert.match(preview,/IDENTITY REVIEW ONLY/);
  assert.ok(preview.includes('Name="'+config.identityName+'"'));
  assert.ok(preview.includes('Publisher="'+config.identityPublisher+'"'));
  assert.ok(preview.includes('<PublisherDisplayName>'+config.publisherDisplayName+'</PublisherDisplayName>'));
  assert.match(preview,/\{\{MAX_VERSION_TESTED\}\}/);
});
test('real build runs identity tests as well as original source and logic checks',()=>{
  assert.ok(read('build/Build-Store.ps1').includes("'tests/store-identity.test.cjs'"));
});
test('configured repository path is a source review only and release remains blocked',()=>{
  assert.equal(status.remoteBuild,'NO_CONNECTED_OR_AUTHORIZED_RUNNER');
  assert.equal(status.storeSubmission,'NOT_SUBMITTED');assert.equal(status.storeSigning,'NOT_SIGNED');
  assert.equal(status.mayReleaseToOwner,false);
});
