'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const C=require('../app/src/team-crypto.js'),M=require('../app/src/team-model.js'),V=require('../app/src/team-vault.js');
const OWNER='owner orchid river moon granite',MEMBER='member willow fern stone lantern',NEXT='changed passphrase long enough',SECRET='private-coordinate-34.2500-and-wallet-marker';
function storage(initial=null){let value=structuredClone(initial);return {read:async()=>structuredClone(value),write:async(e,n)=>{if((value?.revision||0)!==n)throw new Error('Conflict');value=structuredClone(e);}};}
async function fixture(){const s=storage(),v=V.create(s);await v.create(OWNER,'Research');const owner=v.principal.id;for(const role of ['Admin','Researcher','Viewer'])await v.enroll({id:role,name:role,role},MEMBER);return {s,v,owner};}
test('credentials select actor; every role is enforced at the controller boundary',async()=>{
 const {v,owner}=await fixture();await v.authenticate('Viewer',MEMBER);assert.equal(v.principal.role,'Viewer');
 for(const fn of [()=>v.mutate({type:'create',kind:'chat',id:'x',body:'x'}),()=>v.file({body:'x'},new Uint8Array([1])),()=>v.enroll({name:'x',role:'Owner'},MEMBER),()=>v.backup(),()=>v.restore('{}',OWNER,true)])await assert.rejects(fn);
 await assert.rejects(()=>v.authenticate(owner,MEMBER));assert.equal(v.authenticated,false);assert.throws(()=>v.view());
 await v.authenticate('Researcher',MEMBER);await v.mutate({type:'create',id:'p',kind:'proposal',body:'change',visibility:'team'});await assert.rejects(()=>v.mutate({type:'decide',id:'p',expectedVersion:1,decision:'approved'}));
 await v.authenticate('Admin',MEMBER);await v.mutate({type:'decide',id:'p',expectedVersion:1,decision:'approved'});await assert.rejects(()=>v.mutate({type:'member',id:owner,name:'Owner',role:'Viewer'}));await assert.rejects(()=>v.enroll({name:'Admin2',role:'Admin'},MEMBER));
 await v.authenticate(owner,OWNER);await v.mutate({type:'member',id:'Researcher',name:'Researcher',role:'Viewer'});await v.authenticate('Researcher',MEMBER);await assert.rejects(()=>v.mutate({type:'create',id:'no',kind:'note',body:'no'}));
});
test('member private content requires its author key, including files and visibility changes',async()=>{
 const {s,v,owner}=await fixture();await v.authenticate('Researcher',MEMBER);await v.mutate({type:'create',id:'note',kind:'note',site:SECRET,body:SECRET});await v.file({id:'file',body:SECRET},new TextEncoder().encode(SECRET));
 const envelope=await s.read(),key=await C.context(OWNER,envelope.salt),plain=C.decode(await C.open(key,envelope,envelope.id,'workspace'));assert(!JSON.stringify(plain).includes(SECRET));
 await v.authenticate(owner,OWNER);assert.equal(v.view().records.length,0);await assert.rejects(()=>v.readFile('file',1));await assert.rejects(()=>v.visibility('note','team',1));
 await v.authenticate('Researcher',MEMBER);assert.equal(v.view().records[0].versions[0].body,SECRET);assert.equal(new TextDecoder().decode(await v.readFile('file',1)),SECRET);
 await v.visibility('file','team',1);await v.authenticate('Viewer',MEMBER);assert.equal(new TextDecoder().decode(await v.readFile('file',1)),SECRET);await assert.rejects(()=>v.visibility('file','private',1));
 await v.authenticate('Researcher',MEMBER);await v.visibility('file','private',1);await v.authenticate('Viewer',MEMBER);await assert.rejects(()=>v.readFile('file',1));
});
test('passphrase changes preserve history, invalidate old current credentials and recover old backups explicitly',async()=>{
 const {s,v,owner}=await fixture();await v.authenticate('Researcher',MEMBER);await v.file({id:'private',body:SECRET},new TextEncoder().encode(SECRET));await v.changePassphrase(MEMBER,NEXT);await assert.rejects(()=>v.authenticate('Researcher',MEMBER));await v.authenticate('Researcher',NEXT);assert.equal(new TextDecoder().decode(await v.readFile('private',1)),SECRET);
 await v.authenticate(owner,OWNER);await v.file({id:'shared',body:'shared',visibility:'team'},new Uint8Array([1,2,3]));const backup=await v.backup();await v.changePassphrase(OWNER,NEXT);v.lock();await assert.rejects(()=>v.unlock(OWNER));await v.unlock(NEXT);assert.deepEqual(await v.readFile('shared',1),new Uint8Array([1,2,3]));await v.authenticate('Researcher',NEXT);assert.equal(new TextDecoder().decode(await v.readFile('private',1)),SECRET);
 const recovered=V.create(storage());await recovered.restore(backup,OWNER,true);await recovered.authenticate('Researcher',NEXT);assert.equal(new TextDecoder().decode(await recovered.readFile('private',1)),SECRET);
 const before=await s.read();await assert.rejects(()=>v.changePassphrase('wrong long enough password',OWNER));assert.deepEqual(await s.read(),before);
 await v.authenticate(owner,NEXT);const write=s.write;s.write=async()=>{throw new Error('Disk full');};await assert.rejects(()=>v.changePassphrase(NEXT,OWNER));s.write=write;v.lock();await v.unlock(NEXT);
});
test('removal, stale authorization, ID reuse and lock races fail closed',async()=>{
 const {s,v,owner}=await fixture(),other=V.create(s);await other.unlock(OWNER);await other.authenticate('Researcher',MEMBER);
 await v.mutate({type:'member',id:'Researcher',role:'Researcher',remove:true});await assert.rejects(()=>other.mutate({type:'create',id:'stale',kind:'chat',body:'stale'}));assert(other.locked);
 await assert.rejects(()=>v.authenticate('Researcher',MEMBER));await v.authenticate(owner,OWNER);await assert.rejects(()=>v.enroll({id:'Researcher',name:'Reused',role:'Viewer'},MEMBER));
 const login=v.authenticate('Viewer',MEMBER);v.lock();await assert.rejects(()=>login);assert(v.locked);
 await v.unlock(OWNER);const changing=v.changePassphrase(OWNER,NEXT);v.lock();await assert.rejects(()=>changing);assert(v.locked);await v.unlock(OWNER);
});
test('audit events contain exact safe metadata and backup import/export are authenticated',async()=>{
 const {s,v}=await fixture();await v.mutate({type:'create',kind:'proposal',id:'p',body:SECRET,site:SECRET,visibility:'team'});await v.mutate({type:'decide',id:'p',expectedVersion:1,decision:'rejected'});await v.file({id:'file',body:SECRET},new Uint8Array([1]));const backup=await v.backup();await v.restore(backup,OWNER,true);
 const events=v.audit();for(const a of events)assert.deepEqual(Object.keys(a).sort(),['action','at','role','sequence']);assert(!JSON.stringify(events).includes(SECRET));for(const action of ['proposal_created','proposal_rejected','file_added','backup_export','backup_import'])assert(events.some(a=>a.action===action));
 const before=await s.read();v.lock();await assert.rejects(()=>v.restore(backup,OWNER,true));assert.deepEqual(await s.read(),before);
 await v.unlock(OWNER);const key=await C.context(OWNER,before.salt),doc=C.decode(await C.open(key,before,before.id,'workspace'));doc.security.audit[0].plaintext=SECRET;const forged=await C.seal(key,doc.id,1,'workspace',C.encode(doc));await assert.rejects(()=>v.restore(JSON.stringify(forged),OWNER,true));
});
test('legacy migration preserves private versions and shared catalog independence',async()=>{
 const key=await C.context(OWNER),legacy=M.apply(M.create('legacy','owner','Legacy'),'owner',{type:'create',kind:'note',id:'note',body:SECRET,site:SECRET});const e=await C.seal(key,'legacy',1,'workspace',C.encode(legacy)),s=storage(e),v=V.create(s);await v.unlock(OWNER);assert.equal(v.view().records[0].versions[0].body,SECRET);assert.equal((await s.read()).revision,2);assert.equal(legacy.records[0].versions[0].body,SECRET);
 const saved=await s.read(),d=C.decode(await C.open(key,saved,'legacy','workspace'));assert(!JSON.stringify(d).includes(SECRET));assert.equal(d.security.version,3);
});
