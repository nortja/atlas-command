/* Authenticated local workstation sessions. No remote authentication protocol. */
(function(root,factory){if(typeof module==='object')module.exports=factory;else root.AtlasTeamSession=factory;})(globalThis,function(C,M,store,options){
'use strict';
const now=options?.now||(()=>performance.now());
const fail=()=>{throw new Error('Authentication, permission, version or encrypted storage check failed.');};
const copy=x=>JSON.parse(JSON.stringify(x));
const actions=['workspace_created','legacy_migrated','record_created','record_revised','visibility_changed','proposal_created','proposal_approved','proposal_rejected','file_added','file_revised','file_export','member_enrolled','member_role_changed','member_removed','backup_export','backup_import','passphrase_changed'];
let doc=null,rootKey=null,actor=null,actorKey=null,cached=null,pendingRestore=null,revision=0,epoch=0,busy=false;
function lock(){epoch++;doc=rootKey=actor=actorKey=cached=pendingRestore=null;revision=0;}
function current(e){if(e!==epoch)fail();}
function role(){const m=doc?.members.find(m=>m.id===actor);if(!m||!actorKey)fail();return m.role;}
function owner(){if(role()!=='Owner')fail();}
function audit(d,action,actingRole){if(!actions.includes(action)||!M.roles.includes(actingRole)||d.security.audit.length>=4096)fail();d.security.audit.push({sequence:d.security.audit.length+1,action,role:actingRole,at:Date.now()});}
function validate(d){
  M.validate(d);const s=d.security;
  if(!s||s.version!==3||!Array.isArray(s.credentials)||!Array.isArray(s.retired)||!Array.isArray(s.audit)||s.credentials.length>100||s.retired.length>1000||s.audit.length>4096)fail();
  const seen=new Set();for(const c of s.credentials){if(!d.members.some(m=>m.id===c.id)||seen.has(c.id)||Object.keys(c).sort().join(',')!=='id,proof')fail();seen.add(c.id);C.validate(c.proof);if(c.proof.id!==d.id+':'+c.id+':credential'||c.proof.purpose!=='credential'||c.proof.revision!==1)fail();}
  if(!seen.has(d.ownerId)||new Set(s.retired).size!==s.retired.length||s.retired.some(id=>d.members.some(m=>m.id===id)))fail();
  for(let i=0;i<s.audit.length;i++){const a=s.audit[i];if(Object.keys(a).sort().join(',')!=='action,at,role,sequence'||a.sequence!==i+1||!actions.includes(a.action)||!M.roles.includes(a.role)||!Number.isSafeInteger(a.at)||a.at<0)fail();}
  for(const r of d.records){if(r.visibility==='private'){C.validate(r.privateEnvelope);if(r.privateEnvelope.id!==d.id+':'+r.authorId+':'+r.id+':private'||r.privateEnvelope.revision!==r.versions.length||r.privateEnvelope.purpose!=='private')fail();}}
  return d;
}
async function exclusive(fn){if(busy)fail();busy=true;const e=epoch;try{return await fn(e);}catch{fail();}finally{busy=false;}}
async function fresh(){if(!doc)fail();const saved=await store.read();if(saved?.revision!==revision||saved?.id!==doc.id){lock();fail();}}
async function credential(key,d,id){return {id,proof:await C.seal(key,d.id+':'+id+':credential',1,'credential',C.encode({userId:id,version:1}))};}
async function prove(d,id,pass){const c=d.security.credentials.find(c=>c.id===id);if(!c||!d.members.some(m=>m.id===id))fail();const key=await C.context(pass,c.proof.salt),bytes=await C.open(key,c.proof,d.id+':'+id+':credential','credential',1);try{const p=C.decode(bytes);if(p.userId!==id||p.version!==1)fail();return key;}finally{bytes.fill(0);}}
async function privateRecord(d,r,key){const bytes=await C.open(key,r.privateEnvelope,d.id+':'+r.authorId+':'+r.id+':private','private',r.versions.length);try{const plain=C.decode(bytes);for(const k of ['id','authorId','kind','visibility','sensitive'])if(plain[k]!==r[k])fail();if(plain.versions.length!==r.versions.length)fail();M.validate({...d,records:[plain]});return plain;}finally{bytes.fill(0);}}
async function protect(d,id,key){
  for(let i=0;i<d.records.length;i++){const r=d.records[i];if(r.visibility!=='private'||r.privateEnvelope)continue;if(r.authorId!==id)fail();
    const bytes=C.encode(r);let envelope;try{envelope=await C.seal(key,d.id+':'+id+':'+r.id+':private',r.versions.length,'private',bytes);}finally{bytes.fill(0);}
    d.records[i]={id:r.id,authorId:r.authorId,kind:r.kind,visibility:'private',sensitive:r.sensitive,site:'Private record',versions:r.versions.map(v=>({number:v.number,body:'Encrypted private content'})),...(r.kind==='proposal'?{status:r.status,before:'',baseVersion:r.baseVersion}:{}),privateEnvelope:envelope};
  }
  return d;
}
async function files(d,key,id,privateKey){
  for(const stored of d.records){const r=stored.privateEnvelope?(stored.authorId===id?await privateRecord(d,stored,privateKey):null):stored;if(!r||r.kind!=='file')continue;for(const v of r.versions){const bytes=await C.open(r.visibility==='private'?privateKey:key,v.envelope,d.id+':'+r.id,'file',v.number);try{if(bytes.length>2*1024*1024)fail();}finally{bytes.fill(0);}}}
}
async function renderView(d,id,key){const v=M.view(d,id);delete v.security;for(let i=0;i<v.records.length;i++)if(v.records[i].privateEnvelope)v.records[i]=await privateRecord(d,v.records[i],key);return v;}
async function persist(d,key,expected,e,id=actor,privateKey=actorKey){
  validate(d);const nextView=await renderView(d,id,privateKey),bytes=C.encode(d);let envelope;try{envelope=await C.seal(key,d.id,expected+1,'workspace',bytes);}finally{bytes.fill(0);}current(e);await store.write(envelope,expected);current(e);
  doc=d;rootKey=key;revision=envelope.revision;actor=id;actorKey=privateKey;cached=nextView;
  pendingRestore=null;
}
async function decode(envelope,key){const bytes=await C.open(key,envelope,envelope.id,'workspace');try{const d=M.validate(C.decode(bytes));if(d.id!==envelope.id)fail();return d;}finally{bytes.fill(0);}}
async function migrate(d,key){
  if(d.security)return validate(d);
  d.security={version:3,credentials:[await credential(key,d,d.ownerId)],retired:[],audit:[]};
  await protect(d,d.ownerId,key);audit(d,'legacy_migrated','Owner');return validate(d);
}
async function editable(){const d=copy(doc);for(let i=0;i<d.records.length;i++)if(d.records[i].privateEnvelope&&d.records[i].authorId===actor)d.records[i]=await privateRecord(d,d.records[i],actorKey);return d;}
function record(d,id){const r=d.records.find(r=>r.id===id);if(!r||(r.visibility==='private'&&r.authorId!==actor))fail();return r;}
return Object.freeze({
  lock,get locked(){return !doc;},get authenticated(){return !!actorKey;},get principal(){return actorKey?{id:actor,role:role()}:null;},
  exists:async()=>!!await store.read(),
  identities:()=>{if(!doc)fail();return doc.members.filter(m=>doc.security.credentials.some(c=>c.id===m.id)).map(m=>({id:m.id,name:m.name}));},
  create:(pass,name)=>exclusive(async e=>{if(await store.read())fail();const key=await C.context(pass),d=M.create(C.id(),C.id(),name);d.security={version:3,credentials:[await credential(key,d,d.ownerId)],retired:[],audit:[]};audit(d,'workspace_created','Owner');await persist(d,key,0,e,d.ownerId,key);}),
  unlock:pass=>exclusive(async e=>{lock();const active=epoch,envelope=C.validate(await store.read()),key=await C.context(pass,envelope.salt),d=await decode(envelope,key),legacy=!d.security;await migrate(d,key);const own=await prove(d,d.ownerId,pass);await files(d,key,d.ownerId,own);current(active);if(legacy)await persist(d,key,envelope.revision,active,d.ownerId,own);else{const v=await renderView(d,d.ownerId,own);current(active);doc=d;rootKey=key;actor=d.ownerId;actorKey=own;cached=v;revision=envelope.revision;}}),
  authenticate:(id,pass)=>exclusive(async e=>{if(!doc)fail();actor=actorKey=cached=pendingRestore=null;await fresh();const key=await prove(doc,id,pass);await files(doc,rootKey,id,key);const v=await renderView(doc,id,key);current(e);actor=id;actorKey=key;cached=v;}),
  signOut:()=>{epoch++;actor=actorKey=cached=pendingRestore=null;},
  view:()=>{role();return copy(cached);},
  disclosure:()=>{role();return M.disclosure(cached,actor);},
  audit:()=>{if(!['Owner','Admin'].includes(role()))fail();return copy(doc.security.audit);},
  health:()=>{const own=role()==='Owner';return {revision,visibleRecords:cached.records.length,maxVersions:20,maxFileBytes:2*1024*1024,...(own?{records:doc.records.length,maxRecords:200,snapshotBytes:C.encode(doc).length,maxSnapshotBytes:8*1024*1024,auditEvents:doc.security.audit.length,maxAuditEvents:4096}:{})};},
  cancelRestore:token=>{if(!token||pendingRestore?.token===token)pendingRestore=null;},
  inspectBackup:(text,pass)=>exclusive(async e=>{pendingRestore=null;const previous=await store.read();if(previous){owner();await fresh();}const envelope=C.parse(text),key=await C.context(pass,envelope.salt),d=await decode(envelope,key);await migrate(d,key);const own=await prove(d,d.ownerId,pass);await files(d,key,d.ownerId,own);current(e);
    const token=C.id();pendingRestore={token,key,d,own,expected:previous?.revision||0,currentId:previous?.id||null,epoch:e,expires:now()+120000};
    return {token,name:d.name,workspaceId:d.id,backupRevision:envelope.revision,currentRevision:previous?.revision||0,differentWorkspace:!!previous&&previous.id!==d.id,older:!!previous&&previous.id===d.id&&envelope.revision<previous.revision,records:d.records.length,members:d.members.length,versions:d.records.reduce((n,r)=>n+r.versions.length,0),privateEnvelopes:d.records.filter(r=>r.authorId!==d.ownerId&&r.visibility==='private').length};
  }),
  restoreReviewed:(token,replace)=>exclusive(async e=>{const p=pendingRestore;pendingRestore=null;if(replace!==true||!p||token!==p.token||p.epoch!==e||now()>=p.expires)fail();const previous=await store.read();if((previous?.revision||0)!==p.expected||(previous?.id||null)!==p.currentId)fail();if(previous){owner();await fresh();}audit(p.d,'backup_import','Owner');await persist(p.d,p.key,p.expected,e,p.d.ownerId,p.own);}),
  enroll:(input,pass)=>exclusive(async e=>{await fresh();const acting=role(),id=input.id||C.id();if(doc.security.retired.includes(id)||doc.security.credentials.some(c=>c.id===id))fail();const d=M.apply(doc,actor,{...input,type:'member',id});const key=await C.context(pass);d.security.credentials.push(await credential(key,d,id));audit(d,'member_enrolled',acting);await persist(d,rootKey,revision,e);return id;}),
  mutate:op=>exclusive(async e=>{await fresh();const acting=role();if(op.kind==='file'||doc.records.find(r=>r.id===op.id)?.kind==='file')fail();if(op.type==='member'&&!doc.members.some(m=>m.id===op.id))fail();let d=M.apply(await editable(),actor,op);
    if(op.type==='member'&&op.remove){d.security.credentials=d.security.credentials.filter(c=>c.id!==op.id);d.security.retired.push(op.id);}
    await protect(d,actor,actorKey);const action=op.type==='member'?(op.remove?'member_removed':'member_role_changed'):op.type==='decide'?'proposal_'+op.decision:op.type==='visibility'?'visibility_changed':op.type==='create'?(op.kind==='proposal'?'proposal_created':'record_created'):'record_revised';audit(d,action,acting);await persist(d,rootKey,revision,e);
  }),
  file:(input,data)=>exclusive(async e=>{await fresh();const acting=role();if(acting==='Viewer'||!(data instanceof Uint8Array)||data.length>2*1024*1024)fail();const d=await editable(),id=input.id||C.id(),old=d.records.find(r=>r.id===id);if(old&&old.kind!=='file')fail();if(old)record(d,id);const v=old?old.versions.length+1:1,privacy=old?.visibility||input.visibility||'private',key=privacy==='private'?actorKey:rootKey;
    const envelope=await C.seal(key,d.id+':'+id,v,'file',data);const next=M.apply(d,actor,{...input,id,kind:'file',type:old?'revise':'create',envelope});await protect(next,actor,actorKey);audit(next,old?'file_revised':'file_added',acting);await persist(next,rootKey,revision,e);
  }),
  visibility:(id,visibility,expectedVersion)=>exclusive(async e=>{await fresh();const acting=role(),d=await editable(),before=record(d,id),next=M.apply(d,actor,{type:'visibility',id,visibility,expectedVersion}),r=record(next,id);
    if(r.kind==='file'&&before.visibility!==visibility)for(const v of r.versions){const bytes=await C.open(before.visibility==='private'?actorKey:rootKey,v.envelope,d.id+':'+id,'file',v.number);try{v.envelope=await C.seal(visibility==='private'?actorKey:rootKey,d.id+':'+id,v.number,'file',bytes);}finally{bytes.fill(0);}}
    await protect(next,actor,actorKey);audit(next,'visibility_changed',acting);await persist(next,rootKey,revision,e);
  }),
  readFile:(id,version)=>exclusive(async e=>{await fresh();const acting=role(),d=await editable(),r=record(d,id),v=r.versions.find(v=>v.number===version);if(r.kind!=='file'||!v)fail();const bytes=await C.open(r.visibility==='private'?actorKey:rootKey,v.envelope,d.id+':'+id,'file',version);try{audit(d,'file_export',acting);await protect(d,actor,actorKey);await persist(d,rootKey,revision,e);return bytes;}catch(error){bytes.fill(0);throw error;}}),
  backup:()=>exclusive(async e=>{await fresh();owner();const d=copy(doc);audit(d,'backup_export','Owner');await persist(d,rootKey,revision,e);const envelope=C.validate(await store.read());current(e);if(envelope.revision!==revision||envelope.id!==doc.id)fail();return JSON.stringify(envelope);}),
  restore:(text,pass,replace)=>exclusive(async e=>{if(replace!==true)fail();const previous=await store.read();if(previous){owner();await fresh();}const envelope=C.parse(text),key=await C.context(pass,envelope.salt),d=await decode(envelope,key);await migrate(d,key);const own=await prove(d,d.ownerId,pass);await files(d,key,d.ownerId,own);audit(d,'backup_import','Owner');await persist(d,key,previous?.revision||0,e,d.ownerId,own);}),
  changePassphrase:(oldPass,newPass)=>exclusive(async e=>{await fresh();const acting=role();await prove(doc,actor,oldPass);const d=await editable(),nextKey=await C.context(newPass);for(const r of d.records){if(r.privateEnvelope)continue;if(r.kind==='file'&&(r.visibility==='private'||acting==='Owner'))for(const v of r.versions){const key=r.visibility==='private'?actorKey:rootKey,bytes=await C.open(key,v.envelope,d.id+':'+r.id,'file',v.number);try{v.envelope=await C.seal(nextKey,d.id+':'+r.id,v.number,'file',bytes);}finally{bytes.fill(0);}}}
    d.security.credentials=d.security.credentials.map(c=>({...c}));d.security.credentials[d.security.credentials.findIndex(c=>c.id===actor)]=await credential(nextKey,d,actor);await protect(d,actor,nextKey);audit(d,'passphrase_changed',acting);await persist(d,acting==='Owner'?nextKey:rootKey,revision,e,actor,nextKey);
  })
});
});
