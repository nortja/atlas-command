'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const read=p=>fs.readFileSync(p,'utf8');
test('camera sign-in UI never stores password in profile data',()=>{const s=read('app/src/field-camera-auth.js');assert.match(s,/type="password"/);assert.match(s,/api\/field-camera-credentials\/\+action/);assert.doesNotMatch(s,/localStorage|sessionStorage|clipboard\.write|console\.log/);});
test('camera sign-in is deliberate and does not contact camera endpoints',()=>{const s=read('app/src/field-camera-auth.js');assert.match(s,/Secure sign-in/);assert.doesNotMatch(s,/onvif|rtsp:\/\/|WebSocket|getUserMedia|MediaRecorder/);});
test('native credential integration uses current-user Windows protection outside Data folder',()=>{const s=read('build/integrate_field_cameras.py');assert.match(s,/ProtectedData\.Protect/);assert.match(s,/DataProtectionScope\.CurrentUser/);assert.match(s,/CredentialDir/);assert.match(s,/field-camera-credentials/);assert.match(s,/System\.Security\.dll/);});
test('credential API supports status save and forget without returning passwords',()=>{const s=read('build/integrate_field_cameras.py');for(const x of ["action == 'save'","action == 'status'","action == 'forget'"])assert.match(s,new RegExp(x.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')));assert.doesNotMatch(s,/password[^\n]{0,80}SendJson/);});
