'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const js=fs.readFileSync('app/src/windows-webcam.js','utf8');
const css=fs.readFileSync('app/src/windows-webcam.css','utf8');
const integrate=fs.readFileSync('build/integrate_windows_webcam.py','utf8');

test('Windows webcam starts only from an explicit user action and requests video without audio',()=>{
 assert.match(js,/windowsWebcamStart[^\n]*onclick=start|\$\('#windowsWebcamStart'\)\.onclick=start/);
 assert.match(js,/getUserMedia\(\{video:videoConstraint,audio:false\}\)/);
 assert.doesNotMatch(js,/getUserMedia\([^)]*audio\s*:\s*true/);
});

test('Windows webcam performs no network discovery or remote transport',()=>{
 assert.doesNotMatch(js,/\bfetch\s*\(|XMLHttpRequest|WebSocket|RTCPeerConnection|onvif|rtsp:\/\//i);
 assert.match(js,/No camera is active|Camera is off/);
});

test('closing or hiding Atlas releases local webcam tracks',()=>{
 assert.match(js,/getTracks\(\)/);
 assert.match(js,/track\.stop\(\)/);
 assert.match(js,/visibilitychange/);
 assert.match(js,/beforeunload/);
});

test('snapshot and recording are explicit local file saves',()=>{
 assert.match(js,/windowsWebcamSnapshot[^\n]*onclick=snapshot|\$\('#windowsWebcamSnapshot'\)\.onclick=snapshot/);
 assert.match(js,/windowsWebcamRecord[^\n]*onclick=beginRecord|\$\('#windowsWebcamRecord'\)\.onclick=beginRecord/);
 assert.match(js,/MediaRecorder/);
 assert.match(js,/a\.download=name/);
 assert.doesNotMatch(js,/localStorage|sessionStorage|indexedDB/);
});

test('local webcam assets are included in both owner preview and Store runtime allowlists',()=>{
 for(const name of ['windows-webcam.js','windows-webcam.css'])assert.match(integrate,new RegExp(name.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')));
 assert.match(integrate,/Build-OwnerPreview\.ps1/);
 assert.match(integrate,/Build-Store\.ps1/);
 assert.match(integrate,/AtlasHost\.cs/);
 assert.match(css,/windows-webcam-view/);
});
