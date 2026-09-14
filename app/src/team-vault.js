(function(root,factory){const api=typeof module==='object'?factory(require('./team-crypto.js'),require('./team-model.js')):factory(root.AtlasTeamCrypto,root.AtlasTeamModel);if(typeof module==='object')module.exports=api;else root.AtlasTeamVault=api;})(globalThis,function(C,M){
'use strict';
const fail=()=>{throw new Error('Workspace is locked, changed elsewhere, or could not be saved.');};
const session=typeof module==='object'?require('./team-session.js'):globalThis.AtlasTeamSession;
const create=store=>session(C,M,store);
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
