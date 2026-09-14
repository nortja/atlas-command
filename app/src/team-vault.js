(function(root,factory){const api=typeof module==='object'?factory(require('./team-crypto.js'),require('./team-model.js')):factory(root.AtlasTeamCrypto,root.AtlasTeamModel);if(typeof module==='object')module.exports=api;else root.AtlasTeamVault=api;})(globalThis,function(C,M){
'use strict';
const fail=()=>{throw new Error('Workspace is locked, changed elsewhere, or could not be saved.');};
function create(store){
  let ctx=null,doc=null,revision=0,epoch=0,busy=false;
  function lock(){epoch++;ctx=null;doc=null;revision=0;}
  function current(e){if(e!==epoch)fail();}
  async function exclusive(fn){if(busy)fail();busy=true;const e=epoch;try{return await fn(e);}catch{fail();}finally{busy=false;}}
  async function checkFiles(d,key){for(const r of d.records.filter(r=>r.kind==='file'))for(const v of r.versions){C.validate(v.envelope);if(v.envelope.id!==d.id+':'+r.id||v.envelope.revision!==v.number||v.envelope.purpose!=='file')fail();const bytes=await C.open(key,v.envelope,d.id+':'+r.id,'file',v.number);try{if(bytes.length>2*1024*1024)fail();}finally{bytes.fill(0);}}}
  async function decode(envelope,key){const plain=await C.open(key,envelope,envelope.id,'workspace');try{const d=M.validate(C.decode(plain));if(d.id!==envelope.id)fail();await checkFiles(d,key);return d;}finally{plain.fill(0);}}
  async function persist(d,key,expected,e){const plain=C.encode(d);let envelope;try{envelope=await C.seal(key,d.id,expected+1,'workspace',plain);}finally{plain.fill(0);}current(e);await store.write(envelope,expected);current(e);ctx=key;doc=d;revision=envelope.revision;}
  return Object.freeze({
    lock,get locked(){return !doc;},
    exists:async()=>!!(await store.read()),
    create:(pass,name)=>exclusive(async e=>{if(await store.read())fail();const key=await C.context(pass);const d=M.create(C.id(),C.id(),name);await persist(d,key,0,e);}),
    unlock:pass=>exclusive(async e=>{const envelope=C.validate(await store.read());const key=await C.context(pass,envelope.salt);const d=await decode(envelope,key);current(e);ctx=key;doc=d;revision=envelope.revision;}),
    view:()=>{if(!doc)fail();return M.view(doc,doc.ownerId);},
    disclosure:()=>{if(!doc)fail();return M.disclosure(doc,doc.ownerId);},
    mutate:op=>exclusive(async e=>{if(!doc)fail();if(op.kind==='file'||doc.records.find(r=>r.id===op.id)?.kind==='file')fail();await persist(M.apply(doc,doc.ownerId,op),ctx,revision,e);}),
    file:(input,data)=>exclusive(async e=>{if(!doc||!(data instanceof Uint8Array)||data.length>2*1024*1024)fail();const op={...input},id=op.id||C.id(),r=doc.records.find(r=>r.id===id);if(r&&r.kind!=='file')fail();const version=r?r.versions.length+1:1;const envelope=await C.seal(ctx,doc.id+':'+id,version,'file',data);current(e);await persist(M.apply(doc,doc.ownerId,{...op,id,kind:'file',type:r?'revise':'create',envelope}),ctx,revision,e);}),
    readFile:async(id,version)=>{if(!doc)fail();const e=epoch,r=doc.records.find(r=>r.id===id&&r.kind==='file'),v=r?.versions.find(v=>v.number===version);if(!v)fail();const bytes=await C.open(ctx,v.envelope,doc.id+':'+id,'file',version);if(e!==epoch){bytes.fill(0);fail();}return bytes;},
    backup:()=>exclusive(async e=>{if(!doc)fail();const envelope=C.validate(await store.read());current(e);if(envelope.revision!==revision||envelope.id!==doc.id)fail();await decode(envelope,ctx);current(e);return JSON.stringify(envelope);}),
    restore:(text,pass,replace)=>exclusive(async e=>{if(replace!==true)fail();const previous=await store.read(),envelope=C.parse(text);const key=await C.context(pass,envelope.salt);const d=await decode(envelope,key);current(e);await persist(d,key,previous?.revision||0,e);})
  });
}
function storage(){
  if(/^\/[a-f0-9]{32}\//.test(location.pathname)){
    const url=new URL('api/team-vault',location.href);
    async function request(method,body){const r=await fetch(url,{method,cache:'no-store',credentials:'same-origin',headers:{'X-Atlas-Request':'local','Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});if(!r.ok)fail();const text=await r.text();if(text.length>C.MAX)fail();return JSON.parse(text);}
    return {read:()=>request('GET'),write:(envelope,expected)=>request('POST',{envelope,expected})};
  }
  let db;
  async function database(){if(db)return db;db=await new Promise((resolve,reject)=>{const r=indexedDB.open('atlas-private-team-v1',1);r.onupgradeneeded=()=>r.result.createObjectStore('ciphertext');r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(new Error('Private storage unavailable.'));});return db;}
  return {
    async read(){const d=await database();return new Promise((resolve,reject)=>{const t=d.transaction('ciphertext','readonly'),r=t.objectStore('ciphertext').get('workspace');r.onsuccess=()=>resolve(r.result||null);r.onerror=()=>reject(new Error('Private storage unavailable.'));});},
    async write(envelope,expected){C.validate(envelope);if(envelope.revision!==expected+1)fail();const d=await database();return new Promise((resolve,reject)=>{const t=d.transaction('ciphertext','readwrite'),s=t.objectStore('ciphertext'),r=s.get('workspace');r.onsuccess=()=>{if((r.result?.revision||0)!==expected){t.abort();return;}s.put(envelope,'workspace');};t.oncomplete=()=>resolve();t.onabort=t.onerror=()=>reject(new Error('Private storage conflict.'));});}
  };
}
return Object.freeze({create,storage});
});
