'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const U=require('../app/src/weather-units.js');
test('new and legacy workspaces default to Fahrenheit and mph',()=>{assert.equal(U.DEFAULT,'us');for(const x of [null,undefined,'',{},'invalid'])assert.equal(U.normalize(x),'us');});
test('metric is explicitly selected and its definition is immutable',()=>{assert.equal(U.normalize('metric'),'metric');assert(Object.isFrozen(U.definitions.metric));});
test('invalid saves are refused, not silently treated as metric',()=>{for(const x of [null,undefined,{},'fahrenheit','celsius','US'])assert.throws(()=>U.requireSystem(x));assert.equal(U.requireSystem('us'),'us');});
test('freezing and boiling conversions',()=>{assert.equal(U.temperature(0),32);assert.equal(U.temperature(100),212);assert.equal(U.temperature(-40),-40);assert.equal(U.temperature(0,'metric'),0);});
test('wind and gust use the same conversion',()=>{assert.equal(U.wind(1.609344),1);assert.equal(U.wind(0),0);assert.equal(U.wind(10,'metric'),10);});
for(const x of [null,undefined,NaN,Infinity,'',false,'0'])test('missing or nonnumeric weather is never zero: '+String(x),()=>{assert.equal(U.temperature(x),null);assert.equal(U.wind(x),null);});
test('negative wind is missing while cold temperatures remain valid',()=>{assert.equal(U.wind(-1),null);assert.equal(U.temperature(-10),14);});
test('all quick-glance temperature and wind labels follow the shared preference',()=>{
 const s={temperatureC:20,feelsLikeC:18,windKmh:16.09344,gustKmh:32.18688};
 assert.deepEqual(U.quickGlance(s),{system:'us',label:'°F + mph',temperature:'68 °F',feelsLike:'64 °F',wind:'10 mph',gust:'20 mph'});
 assert.deepEqual(U.quickGlance(s,'metric'),{system:'metric',label:'°C + km/h',temperature:'20 °C',feelsLike:'18 °C',wind:'16 km/h',gust:'32 km/h'});
});
test('switching display units never mutates cached readings or accumulates rounding error',()=>{
 const sample={temperatureC:23.1234,windKmh:11.543},copy=structuredClone(sample),first=U.quickGlance(sample);
 for(let i=0;i<100;i++){U.quickGlance(sample,'metric');assert.deepEqual(U.quickGlance(sample),first);}assert.deepEqual(sample,copy);
});
test('absent readings display dashes, not fabricated current weather',()=>{assert.equal(U.quickGlance(null).temperature,'—');assert.equal(U.quickGlance({}).wind,'—');});
test('formatter and settings controller do not add network calls',()=>{const fs=require('node:fs');assert.doesNotMatch(fs.readFileSync(require.resolve('../app/src/weather-units.js'),'utf8'),/\bfetch\(|XMLHttpRequest|WebSocket|new Function|eval\(/);});
test('preference changes persist and notify consumers',async()=>{let state,stored,seen;const p=U.preferenceStore(()=>state,v=>state=v,async()=>{stored=state},v=>seen=v);assert.equal(p.getUnits(),'us');await p.setUnits('metric');assert.equal(stored,'metric');assert.equal(seen,'metric');assert.equal(p.getUnits(),'metric');});
test('failed persistence restores in-memory preference and reports failure',async()=>{let state='us',notified=false;const p=U.preferenceStore(()=>state,v=>state=v,async()=>{throw Error('disk full')},()=>notified=true);await assert.rejects(p.setUnits('metric'),/disk full/);assert.equal(state,'us');assert.equal(notified,false);});
test('quick successive selections are serialized',async()=>{let state;const stored=[];const p=U.preferenceStore(()=>state,v=>state=v,async()=>{await new Promise(r=>setTimeout(r,2));stored.push(state)});await Promise.all([p.setUnits('metric'),p.setUnits('us')]);assert.deepEqual(stored,['metric','us']);assert.equal(p.getUnits(),'us');});
test('failed save does not prevent a later retry',async()=>{let state='us',calls=0;const p=U.preferenceStore(()=>state,v=>state=v,async()=>{if(++calls===1)throw Error('full')});await assert.rejects(p.setUnits('metric'));await p.setUnits('metric');assert.equal(state,'metric');});
