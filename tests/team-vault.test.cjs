'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const C=require('../app/src/team-crypto.js'),M=require('../app/src/team-model.js'),V=require('../app/src/team-vault.js');
const PASS='orchid river moon granite lantern',SECRET='secret-coordinate-34.25-note',clone=x=>structuredClone(x);
function store(){let value=null;return {read:async()=>clone(value),write:async(e,n)=>{assert.equal(value?.revision||0,n);value=clone(e);}};}
test('platform envelopes authenticate ciphertext, metadata and file purpose',async()=>{
 const ctx=await C.context(PASS),a=await C.seal(ctx,'vault',1,'workspace',C.encode({secret:SECRET})),b=await C.seal(ctx,'vault',1,'workspace',C.encode({secret:SECRET}));
 assert.equal(ctx.key.extractable,false);assert.notEqual(a.iv,b.iv);assert(!JSON.stringify(a).includes(SECRET));assert.deepEqual(C.decode(await C.open(ctx,a,'vault','workspace')),{secret:SECRET});
 for(const change of [{id:'other'},{revision:2},{purpose:'file'},{salt:btoa('1234567890123456')},{iv:b.iv},{ciphertext:b.ciphertext}])await assert.rejects(()=>C.open(ctx,{...a,...change},'vault','workspace'));
 await assert.rejects(async()=>C.open(await C.context('wrong password long enough',a.salt),a,'vault','workspace'));
 for(const change of [{iterations:1},{version:2},{extra:SECRET},{id:null},{iv:'bad'},{ciphertext:'A==='}])assert.throws(()=>C.validate({...a,...change}));
 assert.throws(()=>C.parse('x'.repeat(C.MAX+1)));await assert.rejects(()=>C.context('short'));
 const f=await C.seal(ctx,'vault:file',1,'file',new Uint8Array([1,2,3]));await assert.rejects(()=>C.open(ctx,f,'vault:other','file',1));await assert.rejects(()=>C.open(ctx,f,'vault:file','file',2));
});
test('roles, private visibility, immutable versions, proposal conflicts and redaction',()=>{
 let d=M.create('vault','owner','Research');
 for(const role of ['Admin','Researcher','Viewer'])d=M.apply(d,'owner',{type:'member',id:role,name:role,role});
 assert.throws(()=>M.apply(d,'Admin',{type:'member',id:'owner',name:'x',role:'Viewer'}));assert.throws(()=>M.apply(d,'Admin',{type:'member',id:'other',name:'x',role:'Admin'}));
 const op={type:'create',kind:'note',id:'note',body:SECRET,site:SECRET};
 assert.throws(()=>M.apply(d,'Viewer',op));d=M.apply(d,'Researcher',op);assert.equal(M.view(d,'Viewer').records.length,0);assert.equal(M.view(d,'owner').records.length,0);
 assert.throws(()=>M.apply(d,'owner',{type:'revise',id:'note',body:'oops',expectedVersion:1}));
 const prior=clone(d);d=M.apply(d,'Researcher',{type:'revise',id:'note',body:'revision two',expectedVersion:1});assert.equal(prior.records[0].versions.length,1);assert.equal(d.records[0].versions[0].body,SECRET);assert.throws(()=>M.apply(d,'Researcher',{type:'revise',id:'note',body:'stale',expectedVersion:1}));
 assert(!JSON.stringify(M.disclosure(d,'Researcher')).includes(SECRET));
 for(const id of ['p1','p2'])d=M.apply(d,'Researcher',{type:'create',kind:'proposal',id,site:'site',body:id,visibility:'team'});
 assert.throws(()=>M.apply(d,'Researcher',{type:'decide',id:'p1',expectedVersion:1,decision:'approved'}));d=M.apply(d,'Admin',{type:'decide',id:'p1',expectedVersion:1,decision:'approved'});assert.equal(d.working[0].body,'p1');assert.throws(()=>M.apply(d,'owner',{type:'decide',id:'p2',expectedVersion:1,decision:'approved'}));d=M.apply(d,'owner',{type:'decide',id:'p2',expectedVersion:1,decision:'rejected'});assert.equal(d.records.at(-1).status,'rejected');
 d=M.apply(d,'owner',{type:'create',kind:'proposal',id:'private',site:'site',body:SECRET});assert.throws(()=>M.apply(d,'owner',{type:'decide',id:'private',expectedVersion:1,decision:'approved'}));
});
test('encrypted persistence, files, backups, rollback on failure and lock races',async()=>{
 const s=store(),v=V.create(s);await v.create(PASS,'Secret team');await v.mutate({type:'create',id:'chat',kind:'chat',body:SECRET});
 await v.file({id:'file',body:'secret-file.txt'},new TextEncoder().encode(SECRET));await v.file({id:'file',body:'v2.txt',expectedVersion:1},new Uint8Array([4,5]));assert.equal(new TextDecoder().decode(await v.readFile('file',1)),SECRET);
 const backup=await v.backup();assert(!backup.includes(SECRET));assert(!backup.includes('Secret team'));assert(!backup.includes('secret-file'));const before=await s.read();
 await assert.rejects(()=>v.restore(backup,'wrong password long enough',true));assert.deepEqual(await s.read(),before);await assert.rejects(()=>v.restore(backup,PASS,false));
 v.lock();assert.throws(()=>v.view());await v.unlock(PASS);assert.equal(v.view().records[0].versions[0].body,SECRET);
 const restored=V.create(store());await restored.restore(backup,PASS,true);assert.deepEqual(restored.view(),v.view());assert.deepEqual(await restored.readFile('file',2),new Uint8Array([4,5]));
 const originalWrite=s.write;s.write=async()=>{throw new Error(SECRET);};await assert.rejects(()=>v.mutate({type:'create',id:'fail',kind:'chat',body:SECRET}),e=>!e.message.includes(SECRET));assert.equal(v.view().records.length,2);s.write=originalWrite;
 const stale=V.create(s);await stale.unlock(PASS);await v.mutate({type:'create',id:'next',kind:'chat',body:'next'});await assert.rejects(()=>stale.mutate({type:'create',id:'stale',kind:'chat',body:'stale'}));
 v.lock();const pending=v.unlock(PASS);v.lock();await assert.rejects(()=>pending);assert(v.locked);
 await v.unlock(PASS);const saving=v.mutate({type:'create',id:'race',kind:'chat',body:SECRET});v.lock();await assert.rejects(()=>saving);assert(v.locked);
 await assert.rejects(()=>restored.file({body:'big'},new Uint8Array(2*1024*1024+1)));
});
test('private modules avoid catalog exports, telemetry, logging and unsafe HTML',()=>{
 for(const name of ['team-crypto.js','team-model.js','team-vault.js','team-shell.js']){
  const source=fs.readFileSync(path.join(__dirname,'../app/src',name),'utf8');assert.doesNotMatch(source,/console\.|sendBeacon|localStorage|sessionStorage|innerHTML|insertAdjacentHTML/);assert.doesNotMatch(source,/api\/state|api\/media|telemetry|AtlasWorkspace\.(?:save|export)/);
 }
 const host=fs.readFileSync(path.join(__dirname,'../build/team-vault-host.cs.txt'),'utf8');assert.doesNotMatch(host,/Log\(|ex\.Message|SendFile\(/);assert.match(host,/File\.Replace/);assert.match(host,/Private storage conflict/);
});
test('authenticated but malformed backup and substituted files preserve the current vault',async()=>{
 const s=store(),v=V.create(s);await v.create(PASS,'Research');await v.file({id:'file',body:'evidence'},new Uint8Array([7]));
 const before=await s.read(),ctx=await C.context(PASS,before.salt),d=C.decode(await C.open(ctx,before,before.id,'workspace'));
 for(const corrupt of [{...d,schema:999},{...d,records:[{...d.records[0],versions:[{...d.records[0].versions[0],number:99}]}]}]){
  const e=await C.seal(ctx,before.id,1,'workspace',C.encode(corrupt));await assert.rejects(()=>v.restore(JSON.stringify(e),PASS,true));assert.deepEqual(await s.read(),before);
 }
 const swapped=clone(d);swapped.records[0].versions[0].envelope.id=d.id+':other';const e=await C.seal(ctx,before.id,1,'workspace',C.encode(swapped));await assert.rejects(()=>v.restore(JSON.stringify(e),PASS,true));assert.deepEqual(await s.read(),before);
});
test('encrypted team assets and native route are explicitly integrated without CSP expansion',()=>{
 for(const name of ['app/index.html','app/workspace-preview.html','native/AtlasHost.cs','build/Build-OwnerPreview.ps1','build/Build-Store.ps1']){
  const source=fs.readFileSync(path.join(__dirname,'..',name),'utf8');for(const asset of ['team-crypto.js','team-model.js','team-vault.js','team-shell.js','team-shell.css'])assert(source.includes('src/'+asset),name+': '+asset);
 }
 const recipe=fs.readFileSync(path.join(__dirname,'../build/integrate_team_vault.py'),'utf8');assert.doesNotMatch(recipe,/connect-src|unsafe-eval|unsafe-inline/);
 const workflow=fs.readFileSync(path.join(__dirname,'../.github/workflows/owner-preview.yml'),'utf8');assert(workflow.includes('python tests/team_vault_native.py'));for(const trigger of ["'app/src/team-*'","'tests/team*'","'build/team-vault-host.cs.txt'"])assert(workflow.includes(trigger));
});
