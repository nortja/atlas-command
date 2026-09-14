const {test}=require('node:test'),assert=require('node:assert/strict'),C=require('../app/src/core.js'),I=require('../app/src/catalog-intake.js');
const site=(name,extra={})=>C.normalizeSite({name,lat:10,lon:20,...extra},'import');
test('intake preserves curated metadata, lists every invalid row and compares duplicates without overwriting',()=>{
 const original=site('Curated',{notes:'Keep this',research:{citation:'Archive'},source:'https://example.org/a'}),before=JSON.stringify(original);
 const r=I.prepare([{...original,notes:'Changed'},site('New',{lat:11}),{name:'Invalid',lat:100,lon:0},site('Other',{id:original.id,lat:12})],[original]);
 assert.deepEqual(r.counts,{new:1,duplicate:1,conflict:1,invalid:1});assert(r.rows[0].differences.some(d=>d.field==='notes'));assert.equal(JSON.stringify(original),before);
 assert.equal(I.prepare(Array.from({length:30},()=>({name:'Bad',lat:200})),[]).counts.invalid,30);
});
test('incoming duplicates and conflicts point to their first matching row',()=>{const s=site('One');const r=I.prepare([s,s,{...s,name:'Two',lat:11}],[]);assert.equal(r.rows[1].matchRow,1);assert.equal(r.rows[2].status,'conflict');});
test('selection is bound to immutable reviewed rows and allows no overwrite',async()=>{
 let sites=[site('Original')];const service=I.create({read:()=>sites,write:async n=>{sites=n;}});const r=service.review([site('New',{lat:12}),sites[0]]);r.rows[0].site.name='Tampered';
 await assert.rejects(service.commit([2]),/Only new/);await assert.rejects(service.commit([1,1]),/valid rows/);await service.commit([1]);assert.equal(sites[1].name,'New');assert(service.undoAvailable());await service.undo();assert.equal(sites.length,1);
});
test('catalog and mission changes invalidate reviewed commits and undo',async()=>{
 let sites=[],queue=[];const s=I.create({read:()=>sites,guard:()=>JSON.stringify({sites,queue}),write:async n=>{sites=n;}});
 s.review([site('New')]);queue.push('mission');await assert.rejects(s.commit([1]),/changed/);s.review([site('New')]);await s.commit([1]);queue.push(sites[0].id);assert(!s.undoAvailable());await assert.rejects(s.undo(),/changed/);assert.equal(sites.length,1);
});
test('failed saves remain retryable and concurrent operations cannot alter a pending review',async()=>{
 let sites=[],fail=true,release;const s=I.create({read:()=>sites,write:async n=>{if(fail)throw Error('Storage unavailable');await new Promise(r=>release=r);sites=n;}});
 s.review([site('New')]);await assert.rejects(s.commit([1]),/Storage/);assert.equal(sites.length,0);assert(!s.undoAvailable());fail=false;const pending=s.commit([1]);assert.throws(()=>s.review([]),/Wait/);assert.throws(()=>s.cancel(),/Wait/);release();await pending;assert.equal(sites.length,1);
});
test('evidence filters describe gaps without rewriting dates, ratings or research',()=>{
 const s=site('Café',{age:'unresolved era',mystery:null,source:'javascript:bad()',notes:'Retained'}),before=JSON.stringify(s);
 assert.deepEqual(I.flags(s),['source','date','rating','imported']);assert.equal(I.evidence([s],{query:'cafe',issue:'date'}).length,1);assert.equal(JSON.stringify(s),before);
 assert.equal(I.filtered(I.prepare([s],[]).rows,{query:'cafe',status:'new'}).length,1);
});
