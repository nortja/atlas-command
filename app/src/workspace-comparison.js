/* Read-only local comparison. Never emits field values, media keys or camera data. */
(function(root,factory){const api=factory(typeof module==='object'&&module.exports?require('./recovery-inspection.js'):root.AtlasRecoveryInspection);if(typeof module==='object'&&module.exports)module.exports=api;else root.AtlasWorkspaceComparison=api;})(typeof window==='object'?window:globalThis,function(I){'use strict';
const GROUPS={Description:['name','country','continent','category','summary','question','origin'],Location:['lat','lon','precision'],Chronology:['age','yearStart','yearEnd'],Notes:['notes'],Research:['research','source','photoSource','evidence','review','legacy','mystery'],Attachments:['media']};
function compare(current,saved){try{
 if(!I.assess(current).usable||!I.assess(saved).usable)throw Error();let nodes=0;
 function canonical(v,depth=0){if(++nodes>500000||depth>64)throw Error();if(v===null||typeof v!=='object')return JSON.stringify(v);if(Array.isArray(v))return '['+v.map(x=>canonical(x,depth+1)).join(',')+']';return '{'+Object.keys(v).sort().map(k=>JSON.stringify(k)+':'+canonical(v[k],depth+1)).join(',')+'}';}
 const equal=(a,b)=>canonical(a)===canonical(b),a=new Map(current.sites.map(s=>[s.id,s])),b=new Map(saved.sites.map(s=>[s.id,s])),rows=[];
 const known=new Set(['id','createdAt','updatedAt',...Object.values(GROUPS).flat()]);
 for(const site of saved.sites){const old=a.get(site.id);if(!old){rows.push({name:site.name,change:'added',fields:[]});continue;}const fields=Object.entries(GROUPS).filter(([,keys])=>keys.some(k=>!equal(old[k],site[k]))).map(([name])=>name);const extra=x=>Object.fromEntries(Object.entries(x).filter(([k])=>!known.has(k)));if(!equal(extra(old),extra(site)))fields.push('Other metadata');if(fields.length)rows.push({name:old.name,change:'changed',fields});}
 for(const site of current.sites)if(!b.has(site.id))rows.push({name:site.name,change:'removed',fields:[]});
 const settings=x=>Object.fromEntries(Object.entries(x.settings||{}).filter(([k])=>k!=='fieldCameras'));
 const sections=[['Queue',current.queue||[],saved.queue||[]],['Plans',current.plan||{},saved.plan||{}],['Layout',current.layout||{},saved.layout||{}],['Settings',settings(current),settings(saved)],['Private camera settings',current.settings?.fieldCameras||null,saved.settings?.fieldCameras||null]].map(([name,x,y])=>({name,changed:!equal(x,y)}));
 return {currentCount:a.size,savedCount:b.size,added:rows.filter(r=>r.change==='added').length,removed:rows.filter(r=>r.change==='removed').length,changed:rows.filter(r=>r.change==='changed').length,rows,sections};
 }catch{throw Error('Saved-copy comparison is unavailable. No workspace was changed.');}}
function page(summary,{query='',kind='all',index=0}={}){const q=String(query).toLowerCase(),rows=summary.rows.filter(r=>(kind==='all'||r.change===kind)&&r.name.toLowerCase().includes(q)),pages=Math.max(1,Math.ceil(rows.length/12)),p=Math.max(0,Math.min(Number.isInteger(index)?index:0,pages-1));return {rows:rows.slice(p*12,p*12+12),pages,index:p,total:rows.length};}
return Object.freeze({compare,page});});
