/* Serialized local workspace writes. Revisions detect change; they are not keys. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.AtlasWorkspaceStorage=api;})(typeof window==='object'?window:globalThis,function(){'use strict';
function fault(code){const e=Error(code==='conflict'?'A newer workspace was saved in another window. Open Recovery before saving again.':'Local storage could not complete this action. Your unsaved work is still in this window.');e.code=code;return e;}
function create(adapter,notify=()=>{}){
 let revision,loaded=false,tail=Promise.resolve(),pending=0,conflict=false,error=false,lastSaved=null,stopped=false,generation=0,savedGeneration=0,issued=0,failedThrough=0;
 const status=()=>({pending,conflict,error,lastSaved,dirty:generation!==savedGeneration});const emit=()=>notify(status());
 function queue(action){const ticket=++issued;pending++;emit();const task=tail.then(async()=>{if(!loaded||stopped||ticket<=failedThrough)throw fault('unavailable');if(conflict)throw fault('conflict');try{const r=await action(revision);revision=r.revision;error=false;lastSaved=new Date().toISOString();return r;}catch(e){error=true;failedThrough=issued;if(e.code==='conflict')conflict=true;throw e;}});tail=task.catch(()=>{});return task.finally(()=>{pending--;emit();});}
 return Object.freeze({
  async load(){if(loaded||pending)throw fault('unavailable');const r=await adapter.read();revision=r.revision;loaded=true;return r.value;},
  markDirty(){generation++;emit();},
  save(value){const snapshot=JSON.stringify(value),version=++generation;return queue(async r=>{const result=await adapter.write(snapshot,r);savedGeneration=version;return result;});},
  status,latest:()=>adapter.read(),backups:()=>adapter.backups?adapter.backups():Promise.resolve([]),
  inspect:id=>adapter.inspect(id),restore:review=>queue(async r=>{const result=await adapter.restore(review,r);stopped=true;return result;}),
  abandon(){stopped=true;},
  closing(value){if(!loaded||pending||conflict||stopped)return false;if(adapter.closing)return adapter.closing(JSON.stringify(value),revision);return false;},
 });
}
function browser(storage,locks){const key='atlas-command-state';
 const read=()=>{const raw=storage.getItem(key);return {revision:raw,value:raw===null?null:JSON.parse(raw)};};
 return {read:async()=>read(),write:async(snapshot,expected)=>{
  if(!locks?.request)throw fault('unavailable');
  return locks.request('atlas-command-workspace-write',{mode:'exclusive'},()=>{try{if(storage.getItem(key)!==expected)throw fault('conflict');storage.setItem(key,snapshot);return {revision:snapshot};}catch(e){throw e.code==='conflict'?e:fault('unavailable');}});
 }};
}
function native(fetcher,beacon){
 async function request(path,body){let r;try{r=await fetcher('api/'+path,body===undefined?{}:{method:'POST',headers:{'Content-Type':'application/json','X-Atlas-Request':'local'},body:JSON.stringify(body)});}catch{throw fault('unavailable');}if(!r.ok)throw fault(r.status===409?'conflict':'unavailable');return r.json();}
 return {read:()=>request('state-v2'),write:(snapshot,revision)=>request('state-v2',{revision,value:JSON.parse(snapshot)}),
  backups:()=>request('state-backups'),inspect:id=>request('state-backups?review='+encodeURIComponent(id)),
  restore:(review,revision)=>request('state-backups',{revision,id:review.id,backupRevision:review.revision}),
  closing:(snapshot,revision)=>beacon('api/state-v2',new Blob([JSON.stringify({revision,value:JSON.parse(snapshot)})],{type:'application/json'}))};
}
return Object.freeze({create,browser,native,fault});
});
