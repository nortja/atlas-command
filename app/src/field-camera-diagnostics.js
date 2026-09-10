/* Private camera diagnostic state model. Pure data only: no network, scanning, credentials or playback. */
(function(root,factory){'use strict';const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.AtlasFieldCameraDiagnostics=api;})(typeof window==='object'?window:globalThis,function(){
'use strict';
const STAGES=Object.freeze(['route','service','auth','media-profile','decode']);
const STATES=Object.freeze(['pending','checking','ready','needs-auth','unsupported','failed']);
function cleanText(v,max=240){if(v==null)return '';if(typeof v!=='string')throw Error('Diagnostic text must be text.');let s=v.trim();if(s.length>max)s=s.slice(0,max);return s.replace(/(?:password|passwd|token|secret|authorization)\s*[:=]\s*[^\s,;]+/ig,'[redacted]');}
function profileKey(profile){if(!profile||typeof profile!=='object'||Array.isArray(profile))throw Error('Camera profile is required.');const id=cleanText(profile.id,100),host=cleanText(profile.host,253);if(!/^cam-[A-Za-z0-9-]{1,90}$/.test(id)||!host)throw Error('Saved camera profile is required.');return Object.freeze({profileId:id,host});}
function blank(profile){const p=profileKey(profile);return Object.freeze({schemaVersion:1,profileId:p.profileId,host:p.host,startedAt:'',finishedAt:'',stages:Object.freeze(STAGES.map(id=>Object.freeze({id,state:'pending',detail:''}))),canOpenLiveView:false,summary:'Not tested'});}
function setStage(session,stage,state,detail=''){
 if(!session||session.schemaVersion!==1)throw Error('Diagnostic session is required.');if(!STAGES.includes(stage))throw Error('Unknown diagnostic stage.');if(!STATES.includes(state))throw Error('Unknown diagnostic state.');
 const current=session.stages.find(s=>s.id===stage);if(!current)throw Error('Diagnostic stage is missing.');
 const index=STAGES.indexOf(stage),stages=session.stages.map((s,i)=>i===index?Object.freeze({id:stage,state,detail:cleanText(detail)}):s);
 // A later stage may only advance after all earlier stages are ready. Auth can be skipped only when a device does not require it and caller marks it ready.
 if((state==='checking'||state==='ready'||state==='needs-auth')&&index>0){for(let i=0;i<index;i++)if(stages[i].state!=='ready')throw Error('Complete earlier diagnostic stages first.');}
 const decode=stages[4],canOpenLiveView=decode.state==='ready';
 const failed=stages.find(s=>s.state==='failed'||s.state==='unsupported'||s.state==='needs-auth');
 const summary=canOpenLiveView?'Media verified · ready to open live view':failed?(failed.id==='auth'&&failed.state==='needs-auth'?'Sign-in required':cleanText(failed.detail)||'Camera test stopped'):(stages.some(s=>s.state==='checking')?'Testing camera…':'Test incomplete');
 return Object.freeze({...session,stages:Object.freeze(stages),canOpenLiveView,summary});
}
function start(profile,when){let s=blank(profile);const t=new Date(when||Date.now());if(!Number.isFinite(t.getTime()))throw Error('Invalid diagnostic start time.');return Object.freeze({...s,startedAt:t.toISOString(),summary:'Test ready'});}
function finish(session,when){if(!session||session.schemaVersion!==1)throw Error('Diagnostic session is required.');const t=new Date(when||Date.now());if(!Number.isFinite(t.getTime()))throw Error('Invalid diagnostic finish time.');if(session.startedAt&&t.getTime()<Date.parse(session.startedAt))throw Error('Diagnostic finish cannot precede start.');return Object.freeze({...session,finishedAt:t.toISOString()});}
function stage(session,id){const s=session?.stages?.find(x=>x.id===id);return s?Object.freeze({...s}):null;}
return Object.freeze({STAGES,STATES,blank,start,setStage,finish,stage,profileKey});
});
