/* Platform-only cryptography. See docs/private-team-threat-model.md. */
(function(root,factory){const api=factory();if(typeof module==='object')module.exports=api;else root.AtlasTeamCrypto=api;})(globalThis,function(){
'use strict';
const enc=new TextEncoder(),dec=new TextDecoder('utf-8',{fatal:true});
const MAX=12*1024*1024,ITERATIONS=600000;
const fail=()=>{throw new Error('Encrypted workspace could not be opened or saved.');};
function platform(){if(!globalThis.crypto?.subtle)fail();return globalThis.crypto;}
function bytes(n){return platform().getRandomValues(new Uint8Array(n));}
function b64(a){let s='';for(let i=0;i<a.length;i+=8192)s+=String.fromCharCode(...a.subarray(i,i+8192));return btoa(s);}
function un64(s,n){if(typeof s!=='string'||s.length>MAX||!s.length||s.length%4||!/^[A-Za-z0-9+/]*={0,2}$/.test(s))fail();const a=Uint8Array.from(atob(s),c=>c.charCodeAt(0));if(b64(a)!==s||(n!==undefined&&a.length!==n))fail();return a;}
function validate(e){
  if(!e||Object.getPrototypeOf(e)!==Object.prototype||Object.keys(e).sort().join(',')!=='ciphertext,id,iterations,iv,purpose,revision,salt,version')fail();
  if(e.version!==1||e.iterations!==ITERATIONS||typeof e.id!=='string'||!/^[-a-zA-Z0-9:]{1,160}$/.test(e.id)||!['workspace','file','credential','private'].includes(e.purpose)||!Number.isSafeInteger(e.revision)||e.revision<1)fail();
  un64(e.salt,16);un64(e.iv,12);if(un64(e.ciphertext).length<16)fail();return e;
}
function aad(e){return enc.encode(JSON.stringify(['AtlasTeam',e.version,e.id,e.revision,e.purpose,e.iterations,e.salt]));}
async function derive(passphrase,salt){
  if(typeof passphrase!=='string'||passphrase.length<16||passphrase.length>1024)fail();
  const material=enc.encode(passphrase);
  try{const base=await platform().subtle.importKey('raw',material,'PBKDF2',false,['deriveKey']);return await platform().subtle.deriveKey({name:'PBKDF2',salt:un64(salt,16),iterations:ITERATIONS,hash:'SHA-256'},base,{name:'AES-GCM',length:256},false,['encrypt','decrypt']);}finally{material.fill(0);}
}
async function context(passphrase,salt=b64(bytes(16))){try{return {key:await derive(passphrase,salt),salt};}catch{fail();}}
async function seal(ctx,id,revision,purpose,plaintext){
  try{
    if(!(plaintext instanceof Uint8Array)||plaintext.length>8*1024*1024)fail();
    const e={version:1,id,revision,purpose,iterations:ITERATIONS,salt:ctx.salt,iv:b64(bytes(12)),ciphertext:b64(new Uint8Array(16))};validate(e);
    e.ciphertext=b64(new Uint8Array(await platform().subtle.encrypt({name:'AES-GCM',iv:un64(e.iv,12),additionalData:aad(e),tagLength:128},ctx.key,plaintext)));validate(e);return e;
  }catch{fail();}
}
async function open(ctx,e,id,purpose,revision=e?.revision){try{validate(e);if(e.id!==id||e.purpose!==purpose||e.revision!==revision||e.salt!==ctx.salt)fail();return new Uint8Array(await platform().subtle.decrypt({name:'AES-GCM',iv:un64(e.iv,12),additionalData:aad(e),tagLength:128},ctx.key,un64(e.ciphertext)));}catch{fail();}}
function parse(text){try{if(typeof text!=='string'||text.length>MAX)fail();return validate(JSON.parse(text));}catch{fail();}}
return Object.freeze({context,seal,open,validate,parse,encode:x=>enc.encode(JSON.stringify(x)),decode:x=>JSON.parse(dec.decode(x)),id:()=>platform().randomUUID(),MAX});
});
