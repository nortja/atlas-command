'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const M=require('../app/src/field-cameras.js');
const base={name:'River camp',host:'192.0.2.50'};

test('automatic setup is the default and begins with ONVIF',()=>{
 const p=M.normalize(base),plan=M.connectionPlan(p);
 assert.equal(p.method,'undecided');
 assert.equal(M.METHODS.undecided,'Automatic · try ONVIF first');
 assert.equal(plan.mode,'auto-onvif-first');
 assert.equal(plan.steps[0].id,'onvif');
 assert.equal(plan.steps[1].id,'onvif-capabilities');
 assert.equal(plan.steps[2].id,'rtsp-fallback');
 assert.equal(plan.scansNetwork,false);
 assert.equal(plan.guessesCredentials,false);
});

test('automatic setup never changes the saved camera address',()=>{
 const p=M.normalize({...base,host:'CAMERA.LOCAL'}),before=JSON.stringify(p),plan=M.connectionPlan(p);
 assert.equal(plan.host,'camera.local');
 assert.equal(JSON.stringify(p),before);
 assert.ok(plan.steps.every(s=>!/(subnet|scan all|discover network)/i.test(s.detail)));
});

test('explicit ONVIF keeps a manual media fallback',()=>{
 const plan=M.connectionPlan({...base,method:'onvif',port:80});
 assert.equal(plan.mode,'manual-or-explicit');
 assert.equal(plan.steps[0].id,'onvif');
 assert.ok(plan.steps.some(s=>s.id==='rtsp-fallback'));
});

test('explicit RTSP does not silently run ONVIF',()=>{
 const plan=M.connectionPlan({...base,method:'rtsp',port:554,path:'/stream1'});
 assert.equal(plan.steps[0].id,'manual');
 assert.ok(!plan.steps.some(s=>s.id==='onvif'));
 assert.match(plan.steps[0].detail,/RTSP stream/);
});

test('remote automatic setup requires private-route verification',()=>{
 const plan=M.connectionPlan({...base,mode:'remote'});
 const route=plan.steps.find(s=>s.id==='route');
 assert.ok(route);
 assert.equal(route.state,'needs-test');
 assert.match(route.detail,/VPN|private route/);
});

test('readiness treats automatic ONVIF-first as configured without inventing playback',()=>{
 const r=M.readiness(base);
 assert.equal(r.canRouteTest,true);
 assert.equal(r.canPlayback,false);
 assert.equal(r.plan.mode,'auto-onvif-first');
 assert.ok(r.checks.some(c=>c.id==='method'&&c.state==='ready'));
 assert.ok(r.checks.some(c=>c.id==='port'&&c.state==='optional'));
 assert.ok(r.checks.some(c=>c.id==='playback'&&c.state==='blocked'));
});
