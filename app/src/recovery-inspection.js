/* Read-only recovery summaries. No mutation, storage writes, or network access. */
(function(root,factory){const api=factory(typeof module==='object'&&module.exports?require('./core.js'):root.AtlasCore);if(typeof module==='object'&&module.exports)module.exports=api;else root.AtlasRecoveryInspection=api;})(typeof window==='object'?window:globalThis,function(C){'use strict';
function assess(value){
 if(!value||typeof value!=='object'||Array.isArray(value))return {usable:false,reason:'invalid'};
 if(value.schemaVersion!==1)return {usable:false,reason:'unsupported'};
 try{
  if(!Array.isArray(value.sites)||value.sites.length>5000)throw Error();
  for(const k of ['settings','plan','layout'])if(value[k]!=null&&(typeof value[k]!=='object'||Array.isArray(value[k])))throw Error();
  if(value.queue!=null&&!Array.isArray(value.queue))throw Error();
  const ids=new Set();let media=0;
  for(const s of value.sites){const n=C.normalizeSite(s,s.origin);if(n.id!==s.id||ids.has(n.id))throw Error();ids.add(n.id);media+=n.media.length;}
  return {usable:true,reason:'ready',sites:ids.size,queued:value.queue?.length||0,media};
 }catch{return {usable:false,reason:'invalid'};}
}
function page(entries,{query='',kind='all',page=0}={}){const q=String(query).toLowerCase();const rows=entries.filter(e=>(kind==='all'||(kind==='preserved'?e.id.startsWith('recovery-original-'):kind==='daily'?e.id.startsWith('backup-'):e.id==='previous'))&&(!q||(e.id+' '+e.savedUtc).toLowerCase().includes(q)));const pages=Math.max(1,Math.ceil(rows.length/12)),index=Math.max(0,Math.min(Number.isInteger(page)?page:0,pages-1));return {rows:rows.slice(index*12,index*12+12),total:rows.length,page:index,pages};}
function label(id){return id==='previous'?'Immediately previous save':id.startsWith('recovery-original-')?'Preserved before restoration':id.replace(/^backup-/,'Daily backup · ').replace(/\.json$/,'');}
return Object.freeze({assess,page,label});
});
