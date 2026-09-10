'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const L=require('../app/src/field-camera-layout.js');
test('viewport classes are stable',()=>{assert.equal(L.viewportClass(1366),'laptop');assert.equal(L.viewportClass(1920),'desktop');assert.equal(L.viewportClass(3440),'ultrawide');});
test('defaults always reopen normal rather than expanded',()=>{for(const [w,h] of [[1366,768],[1920,1080],[3440,1440]])assert.equal(L.defaults(w,h).expanded,false);});
test('saved geometry is per camera and viewport class',()=>{let m=L.save({},'cam-a',{x:500,y:100,width:700,height:500},1920,1080);m=L.save(m,'cam-b',{x:600,y:120,width:800,height:600},1920,1080);assert.notDeepEqual(L.restore(m,'cam-a',1920,1080),L.restore(m,'cam-b',1920,1080));assert.notDeepEqual(L.restore(m,'cam-a',3440,1440),L.restore(m,'cam-a',1920,1080));});
test('restore clamps offscreen geometry and keeps controls reachable',()=>{const m={'cam-a|desktop':{x:99999,y:99999,width:99999,height:99999}},g=L.restore(m,'cam-a',1920,1080);assert.ok(g.x>=12&&g.y>=72);assert.ok(g.x+g.width<=1908);assert.ok(g.y+g.height<=1068);assert.equal(g.expanded,false);});
test('reset deletes only current camera viewport geometry',()=>{const m={'cam-a|desktop':{x:10,y:80,width:600,height:400},'cam-a|ultrawide':{x:20,y:90,width:900,height:500},'cam-b|desktop':{x:30,y:100,width:700,height:500}},r=L.reset(m,'cam-a',1920,1080);assert.ok(!('cam-a|desktop' in r.memory));assert.ok('cam-a|ultrawide' in r.memory);assert.ok('cam-b|desktop' in r.memory);});
test('model contains no media or network behavior',()=>{const s=fs.readFileSync('app/src/field-camera-layout.js','utf8');assert.doesNotMatch(s,/\bfetch\s*\(|XMLHttpRequest|WebSocket|MediaRecorder|getUserMedia|TcpClient|RTSP|ONVIF/);});
