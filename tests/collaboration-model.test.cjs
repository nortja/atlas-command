'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const C=require('../app/src/collaboration-model.js');
const space=()=>({schema:1,id:'s1',name:'Field team',members:[{id:'alice',role:'owner'},{id:'bob',role:'researcher'},{id:'carol',role:'contributor'},{id:'dan',role:'viewer'}]});
const note=(overrides={})=>({id:'n1',kind:'note',site:{id:'site1',sensitive:true,coordinates:{lat:0,lon:0}},payload:{body:'Private observation'},...overrides});
function session(){const s=C.createSession('alice');s.createSpace({id:'s1',name:'Field team'});return s;}
test('versioned spaces reject unknown fields, malformed roles and ambiguous membership',()=>{
  for(const change of [{schema:2},{url:'https://relay.invalid'},{members:[{id:'alice',role:'admin'}]},
    {members:[{id:'alice',role:'owner'},{id:'alice',role:'viewer'}]},
    {members:[{id:'alice',role:'owner'},{id:'bob',role:'owner'}]}, {members:[]}])assert.throws(()=>C.space({...space(),...change}));
});
test('role matrix is deny by default; removal revokes local access',()=>{
  for(const [actor,actions] of [['alice',['read','draft','review','manage']],['bob',['read','draft','review']],['carol',['read','draft']],['dan',['read']],['outsider',[]]]){
    for(const action of ['read','draft','review','manage','publish'])assert.equal(C.can(space(),actor,action),actions.includes(action));
  }
  const s=space();s.members=s.members.filter(m=>m.id!=='bob');assert.equal(C.can(s,'bob','read'),false);
  assert.equal(C.can(null,'alice','read'),false);
});
test('team ownership never overrides private ownership or cross-space boundaries',()=>{
  const r={spaceId:'s1',authorId:'bob',visibility:'private'};
  assert.equal(C.can(space(),'alice','read',r),false);assert.equal(C.can(space(),'bob','read',r),true);
  assert.equal(C.can(space(),'alice','read',{...r,visibility:'team'}),true);
  assert.equal(C.can(space(),'alice','read',{...r,spaceId:'s2',visibility:'team'}),false);
  assert.equal(C.can(space(),'outsider','read',{...r,visibility:'public'}),false);
});
test('drafts default private, cannot inject metadata, and snapshots are detached',()=>{
  const s=session(),input=note(),r=s.addDraft('s1',input);assert.equal(r.visibility,'private');assert.equal(r.delivery,'session-only');
  input.payload.body='mutated';r.payload.body='mutated';assert.equal(s.listDrafts('s1')[0].payload.body,'Private observation');
  assert.throws(()=>s.addDraft('s1',note()),/DUPLICATE_ID/);
  for(const patch of [{authorId:'bob'},{visibility:'everyone'},{kind:'script'},{payload:{body:'ok',url:'https://evil.invalid'}},{payload:{body:'x'.repeat(16001)}}, {site:{id:'s'}}]){
    assert.throws(()=>s.addDraft('s1',note({id:'other',...patch})));
  }
});
test('direct-chat model requires a member recipient and private visibility',()=>{
  // Sessions only create the local owner: no simulated invitations imply remote identity.
  const s=session();for(const recipientId of ['alice','outsider'])assert.throws(()=>s.addDraft('s1',{id:'m',kind:'message',payload:{channel:'direct',recipientId,body:'hi'}}),/INVALID_RECIPIENT/);
  const r=s.addDraft('s1',{id:'m',kind:'message',payload:{channel:'team',body:'Local draft'}});assert.equal(r.status,'draft');
});
test('redacted disclosure omits identifiers, free text, coordinates and filenames for every visibility',()=>{
  for(const visibility of C.VISIBILITIES){const s=session(),r=s.addDraft('s1',note({visibility}));const before=JSON.stringify(r),p=C.disclosurePreview(r);
    assert.equal(p.coordinates,'redacted');assert.equal(p.delivery,'not-shared');
    for(const secret of ['site1','Private observation','lat','lon','alice','s1'])assert.equal(JSON.stringify(p).includes(secret),false);
    assert.equal(JSON.stringify(r),before);
  }
});
test('proposal review checks base and record revisions without changing catalog objects',()=>{
  const catalog={name:'Original'},before=JSON.stringify(catalog),s=session();
  s.addDraft('s1',{id:'p',kind:'proposal',site:{id:'site1',sensitive:true},payload:{baseRevision:'r1',field:'name',before:catalog.name,after:'Suggested',reason:'Evidence'}});
  assert.throws(()=>s.reviewProposal('p',2,'accepted','r1'),/REVISION_CONFLICT/);
  assert.throws(()=>s.reviewProposal('p',1,'accepted','r2'),/REVISION_CONFLICT/);
  assert.equal(s.listDrafts('s1')[0].status,'draft');
  assert.equal(s.reviewProposal('p',1,'accepted','r1').status,'accepted');
  assert.throws(()=>s.reviewProposal('p',2,'accepted','r1'),/ALREADY_REVIEWED/);assert.equal(JSON.stringify(catalog),before);
});
test('file records contain metadata only and reject paths, URLs and oversized sizes',()=>{
  const s=session(),f={id:'f',kind:'file',payload:{name:'Evidence.pdf',mediaType:'application/pdf',size:1}};
  assert.equal(s.addDraft('s1',f).visibility,'private');
  for(const extra of [{path:'C:/private'},{url:'https://private.invalid'},{size:-1},{size:2**40},{mediaType:'text/html'}])assert.throws(()=>s.addDraft('s1',{...f,id:'f2',payload:{...f.payload,...extra}}));
});
test('locking clears session references and forbids continued use; reopen starts empty',()=>{
  const s=session();s.addDraft('s1',note());s.lock();assert.equal(s.locked,true);
  assert.throws(()=>s.listDrafts('s1'),/SESSION_LOCKED/);assert.throws(()=>s.listSpaces(),/SESSION_LOCKED/);
  assert.deepEqual(C.createSession('alice').listSpaces(),[]);
});
test('vault and relay interfaces fail closed for all operations',async()=>{
  assert.equal(C.vault.state,'unavailable');assert.equal(C.sync.state,'disabled');
  for(const provider of [C.vault,C.sync])for(const fn of Object.values(provider))if(typeof fn==='function')await assert.rejects(fn({plaintext:'secret'}),{code:'SECURE_PROVIDER_UNAVAILABLE'});
});
