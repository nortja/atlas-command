/* Atlas remote update channel.
   - Software/features remain updated by the trusted Windows distribution channel (Store/App Installer).
   - This module is for signed/verified CONTENT manifests only.
   - It is fail-closed until an official HTTPS content endpoint and public signing key are provisioned at build time.
   - No arbitrary script, HTML, executable, URL redirect, or credential payload is accepted.
*/
(function(root){'use strict';
const cfg=Object.freeze({
  enabled:false,
  manifestUrl:'',
  channel:'stable',
  maxBytes:2*1024*1024,
  schema:1,
  publicKeySpkiBase64:''
});
const te=new TextEncoder();
function canonical(obj){
  if(obj===null||typeof obj!=='object')return JSON.stringify(obj);
  if(Array.isArray(obj))return '['+obj.map(canonical).join(',')+']';
  return '{'+Object.keys(obj).sort().map(k=>JSON.stringify(k)+':'+canonical(obj[k])).join(',')+'}';
}
function b64(s){const bin=atob(s),a=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)a[i]=bin.charCodeAt(i);return a;}
async function verifyEnvelope(envelope){
  if(!envelope||typeof envelope!=='object'||envelope.schema!==cfg.schema||typeof envelope.signature!=='string'||!envelope.payload)throw Error('Update manifest is malformed.');
  if(!cfg.publicKeySpkiBase64)throw Error('Official Atlas content signing key is not provisioned in this build.');
  const key=await crypto.subtle.importKey('spki',b64(cfg.publicKeySpkiBase64),{name:'ECDSA',namedCurve:'P-256'},false,['verify']);
  const ok=await crypto.subtle.verify({name:'ECDSA',hash:'SHA-256'},key,b64(envelope.signature),te.encode(canonical(envelope.payload)));
  if(!ok)throw Error('Atlas content signature did not verify.');
  return envelope.payload;
}
function validateSite(s){
  if(!s||typeof s!=='object')throw Error('Invalid site record.');
  if(!/^remote-[a-z0-9-]{3,100}$/.test(String(s.id||'')))throw Error('Remote site identifier is invalid.');
  for(const k of ['name','country','continent','age','summary','question','source','evidence','review'])if(typeof s[k]!=='string'||!s[k].trim())throw Error('Remote site is missing '+k+'.');
  if(!['archaeology','lidar','mineral','fossil'].includes(s.category))throw Error('Remote site category is not allowed.');
  if(!Number.isFinite(s.lat)||s.lat<-90||s.lat>90||!Number.isFinite(s.lon)||s.lon<-180||s.lon>180)throw Error('Remote site coordinates are invalid.');
  if(!Number.isInteger(s.mystery)||s.mystery<1||s.mystery>5)throw Error('Remote mystery rating is invalid.');
  if(!/^https:\/\//i.test(s.source))throw Error('Remote evidence source must use HTTPS.');
  return Object.freeze({...s});
}
function validatePayload(p){
  if(!p||typeof p!=='object'||p.schema!==1||p.channel!==cfg.channel||!Number.isInteger(p.revision)||p.revision<1||!Array.isArray(p.sites))throw Error('Atlas content payload is incompatible.');
  if(p.sites.length>500)throw Error('Atlas content payload is larger than allowed.');
  return Object.freeze({revision:p.revision,publishedAt:String(p.publishedAt||''),notes:String(p.notes||''),sites:Object.freeze(p.sites.map(validateSite))});
}
async function check(){
  if(!cfg.enabled||!cfg.manifestUrl)return {enabled:false,reason:'Official remote content channel is not provisioned in this build.'};
  const u=new URL(cfg.manifestUrl);if(u.protocol!=='https:')throw Error('Atlas content endpoint must use HTTPS.');
  const c=new AbortController(),timer=setTimeout(()=>c.abort(),12000);
  try{
    const r=await fetch(u.href,{cache:'no-store',credentials:'omit',redirect:'error',referrerPolicy:'no-referrer',signal:c.signal,headers:{'Accept':'application/json'}});
    if(!r.ok)throw Error('Atlas content service returned '+r.status+'.');
    const len=Number(r.headers.get('content-length')||0);if(len>cfg.maxBytes)throw Error('Atlas content manifest is too large.');
    const text=await r.text();if(te.encode(text).byteLength>cfg.maxBytes)throw Error('Atlas content manifest is too large.');
    return {enabled:true,payload:validatePayload(await verifyEnvelope(JSON.parse(text)))};
  }finally{clearTimeout(timer);}
}
root.AtlasRemoteUpdates=Object.freeze({config:cfg,check,validatePayload,canonical});
})(window);
