'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const s=fs.readFileSync('build/integrate_field_camera_onvif_service.py','utf8');

test('native ONVIF transport is explicit same-host POST only',()=>{
  assert.match(s,/api\/field-camera-test\/onvif/);
  assert.match(s,/method != "POST"/);
  assert.match(s,/CameraProfileHost\(id\)/);
  assert.match(s,/String\.Equals\(host,saved,StringComparison\.Ordinal\)/);
});

test('ONVIF transport resolves the saved camera host once per connection attempt and follows no redirects',()=>{
  assert.match(s,/ResolveFieldCameraHostOnce\(host\)/);
  assert.match(s,/redirectsFollowed/);
  assert.match(s,/ONVIF redirects are not followed/);
  assert.doesNotMatch(s,/AllowAutoRedirect\s*=\s*true|MaximumAutomaticRedirections/);
});

test('ONVIF response and request sizes are bounded',()=>{
  assert.match(s,/64\*1024/);
  assert.match(s,/1024\*1024/);
  assert.match(s,/soapText\.Length>64\*1024/);
  assert.match(s,/timeoutMs<1000\|\|timeoutMs>8000/);
});

test('unauthenticated ONVIF stage never loads or sends saved credentials',()=>{
  assert.doesNotMatch(s,/ReadCameraSecret|UsernameToken|Authorization: Basic|Authorization: Digest/);
  assert.match(s,/credentialsUsed/);
  assert.match(s,/authRequired/);
});

test('TLS path requires normal certificate validation',()=>{
  assert.match(s,/SslPolicyErrors\.None/);
  assert.match(s,/AuthenticateAsClient\(host\)/);
  assert.doesNotMatch(s,/return true;\}\);\s*ssl/);
});
