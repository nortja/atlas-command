/* Development contracts only. Session drafts are not encrypted or persisted.
 * Role checks describe local policy, not authenticated multi-device authorization.
 * No record from this module belongs in the existing plaintext workspace/export. */
(function(root){
'use strict';
const SCHEMA=1;
const ROLES=Object.freeze(['owner','researcher','contributor','viewer']);
const VISIBILITIES=Object.freeze(['private','team','public']);
const KINDS=Object.freeze(['message','note','proposal','file']);
const permissions=Object.freeze({
  owner:Object.freeze(['read','draft','review','manage']),
  researcher:Object.freeze(['read','draft','review']),
  contributor:Object.freeze(['read','draft']),
  viewer:Object.freeze(['read'])
});
function fail(code){const e=new Error(code);e.code=code;throw e;}
function object(value,keys){
  if(!value||Object.getPrototypeOf(value)!==Object.prototype)fail('INVALID_OBJECT');
  if(Object.keys(value).some(k=>!keys.includes(k)))fail('UNKNOWN_FIELD');
}
function text(value,max,empty=false){
  if(typeof value!=='string'||value.length>max||(!empty&&!value.trim()))fail('INVALID_TEXT');
  return value;
}
function id(value){if(typeof value!=='string'||!/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,95}$/.test(value))fail('INVALID_ID');return value;}
function choice(value,values){if(!values.includes(value))fail('INVALID_CHOICE');return value;}
function copy(value){return JSON.parse(JSON.stringify(value));}
function space(value){
  object(value,['schema','id','name','members']);
  if(value.schema!==SCHEMA)fail('UNSUPPORTED_SCHEMA');
  id(value.id);text(value.name,80);
  if(!Array.isArray(value.members)||!value.members.length||value.members.length>100)fail('INVALID_MEMBERS');
  const ids=new Set();let owners=0;
  for(const member of value.members){
    object(member,['id','role']);id(member.id);choice(member.role,ROLES);
    if(ids.has(member.id))fail('DUPLICATE_MEMBER');ids.add(member.id);
    if(member.role==='owner')owners++;
  }
  if(owners!==1)fail('ONE_OWNER_REQUIRED');
  return copy(value);
}
function can(value,actor,action,record){
  try{
    const s=space(value);id(actor);
    const member=s.members.find(m=>m.id===actor);
    if(!member||!permissions[member.role].includes(action))return false;
    if(record){
      if(record.spaceId!==s.id||!VISIBILITIES.includes(record.visibility))return false;
      // Ownership of a team never grants access to somebody else's personal drafts.
      if(record.visibility==='private'&&record.authorId!==actor)return false;
      if(action==='draft'&&record.authorId!==actor)return false;
    }
    return true;
  }catch{return false;}
}
function site(value){
  object(value,['id','sensitive','coordinates']);id(value.id);
  if(typeof value.sensitive!=='boolean')fail('SENSITIVITY_REQUIRED');
  let coordinates=null;
  if(value.coordinates!==null&&value.coordinates!==undefined){
    object(value.coordinates,['lat','lon']);const {lat,lon}=value.coordinates;
    if(!Number.isFinite(lat)||!Number.isFinite(lon)||Math.abs(lat)>90||Math.abs(lon)>180)fail('INVALID_COORDINATES');
    coordinates={lat,lon};
  }
  return {id:value.id,sensitive:value.sensitive,coordinates};
}
function payload(kind,value){
  if(kind==='message'){
    object(value,['channel','recipientId','body']);choice(value.channel,['team','direct']);
    const recipientId=value.channel==='direct'?id(value.recipientId):null;
    if(value.channel==='team'&&value.recipientId!=null)fail('INVALID_RECIPIENT');
    return {channel:value.channel,recipientId,body:text(value.body,8000)};
  }
  if(kind==='note'){object(value,['body']);return {body:text(value.body,16000)};}
  if(kind==='proposal'){
    object(value,['baseRevision','field','before','after','reason']);
    return {baseRevision:id(value.baseRevision),field:choice(value.field,['name','summary','period','sources']),
      before:text(value.before,8000,true),after:text(value.after,8000),reason:text(value.reason,2000)};
  }
  object(value,['name','mediaType','size']);
  if(!Number.isSafeInteger(value.size)||value.size<0||value.size>1024*1024*1024)fail('INVALID_FILE_SIZE');
  return {name:text(value.name,160),mediaType:choice(value.mediaType,['image/jpeg','image/png','image/webp','application/pdf','video/mp4','video/webm']),size:value.size};
}
function draft(value,s,actor){
  object(value,['id','kind','visibility','site','payload']);
  const kind=choice(value.kind,KINDS),visibility=choice(value.visibility===undefined?'private':value.visibility,VISIBILITIES);
  if(!can(s,actor,'draft'))fail('PERMISSION_DENIED');
  const siteRef=value.site==null?null:site(value.site);
  if(['note','proposal'].includes(kind)&&!siteRef)fail('SITE_REQUIRED');
  const content=payload(kind,value.payload);
  if(kind==='message'&&content.channel==='direct'){
    if(visibility!=='private')fail('DIRECT_MESSAGE_MUST_BE_PRIVATE');
    if(content.recipientId===actor||!s.members.some(m=>m.id===content.recipientId))fail('INVALID_RECIPIENT');
  }
  return {schema:SCHEMA,id:id(value.id),spaceId:s.id,authorId:actor,kind,visibility,
    site:siteRef,payload:content,revision:1,status:'draft',delivery:'session-only'};
}
// This is a metadata preview, never an export or outbound payload. Free text,
// filenames, IDs and proposal values may themselves reveal a sensitive location.
function disclosurePreview(record){
  choice(record.kind,KINDS);choice(record.visibility,VISIBILITIES);
  return {kind:record.kind,intendedVisibility:record.visibility,delivery:'not-shared',
    coordinates:'redacted',content:'omitted',publication:'unavailable'};
}
function unavailable(){return Promise.reject(Object.assign(new Error('SECURE_PROVIDER_UNAVAILABLE'),{code:'SECURE_PROVIDER_UNAVAILABLE'}));}
// Future vaults accept only authenticated, versioned encrypted envelopes. A provider
// must enforce key ownership, membership epochs and associated-data binding before
// opening them. There is deliberately no injectable passthrough provider here.
const vault=Object.freeze({state:'unavailable',seal:unavailable,open:unavailable,put:unavailable,get:unavailable});
const sync=Object.freeze({state:'disabled',enqueue:unavailable,reconcile:unavailable});
function createSession(actor){
  id(actor);const spaces=new Map(),records=new Map();let locked=false;
  function active(){if(locked)fail('SESSION_LOCKED');}
  function getSpace(spaceId){active();const s=spaces.get(spaceId);if(!s)fail('SPACE_NOT_FOUND');return s;}
  return Object.freeze({
    createSpace(input){
      active();object(input,['id','name']);if(spaces.size>=20)fail('SESSION_LIMIT');
      if(spaces.has(input.id))fail('DUPLICATE_ID');
      const s=space({schema:SCHEMA,id:input.id,name:input.name,members:[{id:actor,role:'owner'}]});
      spaces.set(s.id,s);return copy(s);
    },
    listSpaces(){active();return [...spaces.values()].map(copy);},
    addDraft(spaceId,input){
      const s=getSpace(spaceId);if(records.size>=200)fail('SESSION_LIMIT');
      if(records.has(input.id))fail('DUPLICATE_ID');
      const r=draft(input,s,actor);records.set(r.id,r);return copy(r);
    },
    listDrafts(spaceId){const s=getSpace(spaceId);return [...records.values()].filter(r=>can(s,actor,'read',r)).map(copy);},
    reviewProposal(recordId,expectedRevision,decision,currentBaseRevision){
      active();const r=records.get(recordId);if(!r||r.kind!=='proposal')fail('PROPOSAL_NOT_FOUND');
      if(!can(getSpace(r.spaceId),actor,'review',r))fail('PERMISSION_DENIED');
      choice(decision,['accepted','rejected']);
      if(r.revision!==expectedRevision||r.payload.baseRevision!==currentBaseRevision)fail('REVISION_CONFLICT');
      if(r.status!=='draft')fail('ALREADY_REVIEWED');
      // Review records a decision only. Applying edits to any catalog is a separate future operation.
      r.status=decision;r.revision++;return copy(r);
    },
    discard(recordId){active();const r=records.get(recordId);if(!r||!can(getSpace(r.spaceId),actor,'draft',r))fail('PERMISSION_DENIED');records.delete(recordId);},
    lock(){records.clear();spaces.clear();locked=true;},
    get locked(){return locked;}
  });
}
const api=Object.freeze({SCHEMA,ROLES,VISIBILITIES,KINDS,space,can,site,disclosurePreview,createSession,vault,sync});
if(typeof module==='object'&&module.exports)module.exports=api;else root.AtlasCollaborationModel=api;
})(typeof globalThis==='object'?globalThis:this);
