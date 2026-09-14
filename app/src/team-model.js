(function(root,factory){const api=factory();if(typeof module==='object')module.exports=api;else root.AtlasTeamModel=api;})(globalThis,function(){
'use strict';
const roles=['Owner','Admin','Researcher','Viewer'],visibility=['private','team','public'];
const deny=()=>{throw new Error('Team operation denied or version conflict.');};
const copy=x=>JSON.parse(JSON.stringify(x));
function text(x,max=8000){if(typeof x!=='string'||!x.trim()||x.length>max)deny();return x;}
function id(x){if(typeof x!=='string'||!/^[-a-zA-Z0-9:]{1,160}$/.test(x))deny();return x;}
function create(workspaceId,ownerId,name){return {schema:2,id:id(workspaceId),ownerId:id(ownerId),name:text(name,80),members:[{id:ownerId,name:'You',role:'Owner'}],records:[],working:[]};}
function validate(d){
  if(!d||d.schema!==2||!Array.isArray(d.members)||!Array.isArray(d.records)||!Array.isArray(d.working)||d.members.length>100||d.records.length>200||d.working.length>200)deny();
  id(d.id);id(d.ownerId);text(d.name,80);
  const members=new Set();for(const m of d.members){id(m.id);text(m.name,80);if(members.has(m.id)||!roles.includes(m.role)||(m.role==='Owner'&&m.id!==d.ownerId))deny();members.add(m.id);}
  if(d.members.filter(m=>m.role==='Owner'&&m.id===d.ownerId).length!==1)deny();
  const records=new Set();for(const r of d.records){id(r.id);id(r.authorId);if(records.has(r.id)||!['chat','note','file','proposal'].includes(r.kind)||!visibility.includes(r.visibility)||typeof r.sensitive!=='boolean'||!Array.isArray(r.versions)||r.versions.length<1||r.versions.length>20)deny();records.add(r.id);text(r.site,200);
    for(let i=0;i<r.versions.length;i++){const v=r.versions[i];if(v.number!==i+1)deny();text(v.body);}
    if(r.kind==='proposal'){if(!['pending','approved','rejected'].includes(r.status)||!Number.isSafeInteger(r.baseVersion)||r.baseVersion<0)deny();if(typeof r.before!=='string'||r.before.length>8000)deny();}
  }
  const sites=new Set();for(const w of d.working){text(w.site,200);text(w.body);if(sites.has(w.site)||!Number.isSafeInteger(w.version)||w.version<1)deny();sites.add(w.site);}
  return d;
}
function member(d,actor){const m=d.members.find(m=>m.id===actor);if(!m)deny();return m;}
function readable(r,actor){return r.visibility!=='private'||r.authorId===actor;}
function view(d,actor){validate(d);member(d,actor);const v=copy(d);v.records=v.records.filter(r=>readable(r,actor));return v;}
function apply(document,actor,op){
  const d=copy(validate(document)),m=member(d,actor),manage=['Owner','Admin'].includes(m.role);if(m.role==='Viewer')deny();
  if(op.type==='member'){
    if(!manage)deny();id(op.id);if(op.id===d.ownerId||!roles.includes(op.role)||op.role==='Owner')deny();const old=d.members.find(x=>x.id===op.id);
    if(m.role!=='Owner'&&(op.role==='Admin'||old?.role==='Admin'))deny();
    if(op.remove){if(!old)deny();d.members=d.members.filter(x=>x.id!==op.id);}else{const entry={id:op.id,name:text(op.name,80),role:op.role};if(old)Object.assign(old,entry);else d.members.push(entry);}
  }else if(op.type==='create'){
    id(op.id);if(d.records.some(r=>r.id===op.id)||!['chat','note','file','proposal'].includes(op.kind)||!visibility.includes(op.visibility??'private'))deny();
    const r={id:op.id,kind:op.kind,authorId:actor,site:text(op.site||'General research',200),visibility:op.visibility??'private',sensitive:op.sensitive!==false,versions:[{number:1,body:text(op.body),...(op.kind==='file'?{envelope:copy(op.envelope)}:{})}]};
    if(op.kind==='proposal'){const w=d.working.find(w=>w.site===r.site);Object.assign(r,{before:w?.body||'',baseVersion:w?.version||0,status:'pending'});}
    d.records.push(r);
  }else{
    const r=d.records.find(r=>r.id===op.id);if(!r||!readable(r,actor)||op.expectedVersion!==r.versions.length)deny();
    if(op.type==='visibility'){
      if(r.authorId!==actor||!visibility.includes(op.visibility)||(r.kind==='proposal'&&r.status!=='pending'))deny();r.visibility=op.visibility;
    }else if(op.type==='revise'){
      if(r.kind==='proposal'||(!manage&&r.authorId!==actor))deny();r.versions.push({number:r.versions.length+1,body:text(op.body),...(r.kind==='file'?{envelope:copy(op.envelope)}:{})});
    }else if(op.type==='decide'){
      if(!manage||r.kind!=='proposal'||r.status!=='pending'||!['approved','rejected'].includes(op.decision))deny();
      if(op.decision==='approved'){if(r.visibility==='private')deny();const w=d.working.find(w=>w.site===r.site);if((w?.version||0)!==r.baseVersion||(w?.body||'')!==r.before)deny();const next={site:r.site,body:r.versions.at(-1).body,version:r.baseVersion+1};if(w)Object.assign(w,next);else d.working.push(next);}
      r.status=op.decision;r.reviewedBy=actor;
    }else deny();
  }
  return validate(d);
}
// No text or identifiers: even a name or citation can disclose a location.
function disclosure(d,actor){return view(d,actor).records.map(r=>({kind:r.kind,visibility:r.visibility,coordinates:'Redacted',content:'Withheld',versions:r.versions.length}));}
return Object.freeze({create,validate,view,apply,disclosure,roles:Object.freeze(roles),visibility:Object.freeze(visibility)});
});
