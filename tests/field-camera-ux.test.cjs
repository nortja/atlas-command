'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');
test('guided camera setup contains four clear stages',()=>{const s=read('app/src/field-camera-ux.js');for(const label of ['1 · Details','2 · Secure sign-in','3 · Test camera','4 · Open live view'])assert.ok(s.includes(label));assert.ok(s.includes('ONVIF first'));assert.ok(s.includes('RTSP/manual fallback'));assert.ok(s.includes('normal workspace panel'));});
test('guided setup itself is presentation only and adds no camera transport',()=>{const s=read('app/src/field-camera-ux.js');assert.doesNotMatch(s,/\bfetch\s*\(|XMLHttpRequest|WebSocket|getUserMedia|MediaRecorder|rtsp:\/\//i);});
test('guided setup assets and separate auth adapter are included by integration recipe',()=>{const s=read('build/integrate_field_cameras.py');for(const a of ['field-camera-ux.js','field-camera-ux.css','field-camera-auth.js'])assert.ok(s.includes(a));});
test('responsive setup keeps one-column compact layout',()=>{const s=read('app/src/field-camera-ux.css');assert.match(s,/@media\(max-width:520px\)/);assert.match(s,/grid-template-columns:1fr/);});
