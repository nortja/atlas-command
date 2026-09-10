'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const D=require('../app/src/field-camera-diagnostics.js');
const p={id:'cam-1',host:'camera.local'};
function through(stage='decode'){
 let s=D.start(p,'2026-09-10T05:00:00Z');
 for(const id of D.STAGES){s=D.setStage(s,id,'ready',id+' verified');if(id===stage)break;}return s;
}
test('diagnostic stages are ordered route service auth media profile decode',()=>assert.deepEqual(D.STAGES,['route','service','auth','media-profile','decode']));
test('route success alone never claims connection or live view',()=>{let s=D.start(p,'2026-09-10T05:00:00Z');s=D.setStage(s,'route','ready','TCP endpoint reachable');assert.equal(s.canOpenLiveView,false);assert.notEqual(s.summary,'Media verified · ready to open live view');});
test('later stages cannot skip earlier verification',()=>{const s=D.start(p,'2026-09-10T05:00:00Z');assert.throws(()=>D.setStage(s,'service','ready','ONVIF response'),/earlier/);});
test('auth requirement is explicit and still not playback',()=>{let s=D.start(p,'2026-09-10T05:00:00Z');s=D.setStage(s,'route','ready');s=D.setStage(s,'service','ready');s=D.setStage(s,'auth','needs-auth','Camera requires sign-in');assert.equal(s.summary,'Sign-in required');assert.equal(s.canOpenLiveView,false);});
test('only decoded media enables Open live view',()=>{const s=through();assert.equal(s.canOpenLiveView,true);assert.match(s.summary,/ready to open live view/);});
test('unsupported media profile stops before decode',()=>{let s=through('auth');s=D.setStage(s,'media-profile','unsupported','Codec not supported');assert.equal(s.canOpenLiveView,false);assert.match(s.summary,/Codec not supported/);});
test('diagnostic detail redacts common secret labels',()=>{let s=D.start(p,'2026-09-10T05:00:00Z');s=D.setStage(s,'route','failed','authorization=abc123 token:xyz password=hunter2');const detail=D.stage(s,'route').detail;assert.doesNotMatch(detail,/abc123|xyz|hunter2/);assert.match(detail,/\[redacted\]/);});
test('model is pure and contains no network, capture, or secret-bearing APIs',()=>{const s=fs.readFileSync('app/src/field-camera-diagnostics.js','utf8');assert.doesNotMatch(s,/\bfetch\s*\(|XMLHttpRequest|WebSocket|getUserMedia|MediaRecorder|TcpClient|Dns\.|localStorage|sessionStorage|document\.cookie|password\s*=|authorization\s*:/i);});
test('session remains bound to saved profile and host',()=>{const s=D.start(p,'2026-09-10T05:00:00Z');assert.equal(s.profileId,'cam-1');assert.equal(s.host,'camera.local');assert.throws(()=>D.blank({id:'bad',host:'camera.local'}));});
test('finish time cannot precede start',()=>{const s=D.start(p,'2026-09-10T05:00:00Z');assert.throws(()=>D.finish(s,'2026-09-10T04:59:59Z'),/precede/);assert.equal(D.finish(s,'2026-09-10T05:00:01Z').finishedAt,'2026-09-10T05:00:01.000Z');});
