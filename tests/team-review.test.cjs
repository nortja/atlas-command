'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),H=require('../app/src/team-review.js'),V=require('../app/src/team-vault.js');
const PASS='orchid river moon granite lantern',MEMBER='member willow fern stone lantern';
function storage(){let value=null;return {read:async()=>structuredClone(value),write:async(e,n)=>{assert.equal(value?.revision||0,n);value=structuredClone(e);}};}
test('local filters search authorized history, preserve inputs and combine visibility/status',()=>{
 const records=[{id:'1',kind:'note',site:'Göbekli',visibility:'private',versions:[{body:'original source'},{body:'revised'}]},{id:'2',kind:'proposal',site:'Troy',visibility:'team',status:'pending',versions:[{body:'draft'}]}],original=JSON.stringify(records);
 assert.equal(H.select(records,{query:'gobekli',kind:'note'})[0].id,'1');assert.equal(H.select(records,{query:'original'})[0].id,'1');assert.equal(H.select(records,{visibility:'team',status:'pending'})[0].id,'2');assert.equal(H.select(records,{kind:'note',visibility:'team'}).length,0);assert.equal(JSON.stringify(records),original);
});
test('bounded comparisons preserve text and distinguish added, removed and unchanged lines',()=>{
 const rows=H.diff('one\nold\nlast','one\n<img src=x>\nlast');assert.deepEqual(rows,[{type:'same',text:'one'},{type:'removed',text:'old'},{type:'added',text:'<img src=x>'},{type:'same',text:'last'}]);assert.equal(H.diff('same','same')[0].type,'same');assert.equal(H.diff('\n'.repeat(8000),'new').length,2);
 assert.deepEqual(H.memberRoles('Admin','Admin'),[]);assert.deepEqual(H.memberRoles('Admin','Researcher'),['Researcher','Viewer']);assert.deepEqual(H.memberRoles('Viewer','Researcher'),[]);
});
test('inactivity locks once; returning from a hidden page cannot reset an expired deadline',()=>{
 let now=0,locks=0;const idle=H.inactivity({now:()=>now,onLock:()=>locks++,idleMs:100,hiddenMs:20});idle.start();now=50;idle.touch();now=140;assert(idle.check());now=150;assert(!idle.check());assert.equal(locks,1);idle.touch();idle.check();assert.equal(locks,1);
 idle.start();idle.hidden(true);now=171;idle.hidden(false);idle.touch();assert.equal(locks,2);idle.start();idle.stop();now=999;idle.check();assert.equal(locks,2);
});
test('backup inspection is read-only, summaries omit content and confirmation is single-use',async()=>{
 let now=0;const s=storage(),v=V.create(s,{now:()=>now});await v.create(PASS,'Recovery');await v.mutate({type:'create',id:'n',kind:'note',body:'secret-marker',site:'secret-coordinates'});const backup=await v.backup(),before=await s.read();const p=await v.inspectBackup(backup,PASS);assert.deepEqual(await s.read(),before);assert.equal(p.records,1);assert(!JSON.stringify(p).includes('secret-'));await v.restoreReviewed(p.token,true);assert.equal(v.view().records[0].versions[0].body,'secret-marker');await assert.rejects(()=>v.restoreReviewed(p.token,true));
 const expiry=await v.inspectBackup(backup,PASS);now=120000;await assert.rejects(()=>v.restoreReviewed(expiry.token,true));assert.equal(v.view().records.length,1);
});
test('review cannot survive changed storage, mutations, cancellation, sign-out or lock',async()=>{
 const s=storage(),v=V.create(s);await v.create(PASS,'Recovery');const backup=await v.backup();let p=await v.inspectBackup(backup,PASS);await v.mutate({type:'create',id:'new',kind:'chat',body:'keep'});await assert.rejects(()=>v.restoreReviewed(p.token,true));assert.equal(v.view().records.length,1);
 p=await v.inspectBackup(backup,PASS);v.cancelRestore(p.token);await assert.rejects(()=>v.restoreReviewed(p.token,true));p=await v.inspectBackup(backup,PASS);v.signOut();await assert.rejects(()=>v.restoreReviewed(p.token,true));await v.authenticate(v.identities()[0].id,PASS);
 p=await v.inspectBackup(backup,PASS);const other=V.create(s);await other.unlock(PASS);await other.mutate({type:'create',id:'other',kind:'note',body:'other'});await assert.rejects(()=>v.restoreReviewed(p.token,true));v.lock();await v.unlock(PASS);assert.equal(v.view().records.length,2);
 p=await v.inspectBackup(backup,PASS);v.lock();await assert.rejects(()=>v.restoreReviewed(p.token,true));
});
test('non-Owners cannot inspect full backups; bad passwords and cancellation preserve storage',async()=>{
 const s=storage(),v=V.create(s);await v.create(PASS,'Recovery');const backup=await v.backup();await v.enroll({id:'viewer',name:'Viewer',role:'Viewer'},MEMBER);const before=await s.read();await assert.rejects(()=>v.inspectBackup(backup,'wrong long enough passphrase'));assert.deepEqual(await s.read(),before);await v.authenticate('viewer',MEMBER);await assert.rejects(()=>v.inspectBackup(backup,PASS));assert.equal(v.health().records,undefined);
 const empty=V.create(storage());const preview=await empty.inspectBackup(backup,PASS);await empty.restoreReviewed(preview.token,true);assert.equal(empty.principal.role,'Owner');
});
