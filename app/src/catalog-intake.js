/* Local catalog intake. No networking, telemetry, or access to team vaults. */
(function(root,factory){'use strict';const api=factory(typeof module==='object'&&module.exports?require('./core.js'):root.AtlasCore);if(typeof module==='object'&&module.exports)module.exports=api;else root.AtlasCatalogIntake=api;})(typeof window==='object'?window:globalThis,function(C){
'use strict';
const copy=value=>JSON.parse(JSON.stringify(value));
const text=value=>String(value??'').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
const point=s=>s.lat.toFixed(3)+'|'+s.lon.toFixed(3);
const key=s=>C.slug(s.name)+'|'+point(s);
const fields=['name','country','continent','category','lat','lon','age','yearStart','yearEnd','mystery','source','summary','question','evidence','notes'];
function flags(s){const out=[];if(!C.safeURL(s.source))out.push('source');if(s.yearStart===null)out.push('date');if(s.mystery===null)out.push('rating');if(/import/i.test(s.origin||''))out.push('imported');return out;}
function compare(existing,incoming){return fields.filter(k=>JSON.stringify(existing[k])!==JSON.stringify(incoming[k])).map(k=>({field:k,before:existing[k]??'',after:incoming[k]??''}));}
function prepare(raw,existing){
 if(!Array.isArray(raw)||raw.length>5000)throw Error('Review at most 5,000 incoming records at once.');
 const names=new Map(),sources=new Map(),ids=new Map();
 function index(s,row){const entry={site:s,row};names.set(key(s),entry);if(s.source)sources.set(s.source+'|'+point(s),entry);ids.set(s.id,entry);}
 existing.forEach(s=>index(s,null));
 const rows=raw.map((raw,i)=>{try{
  const site=copy(C.normalizeSite(raw,'import'));
  const same=names.get(key(site))||(site.source?sources.get(site.source+'|'+point(site)):null),collision=ids.get(site.id),match=same||collision;
  if(match)return {row:i+1,status:same?'duplicate':'conflict',site,match:copy(match.site),matchRow:match.row,differences:compare(match.site,site)};
  index(site,i+1);return {row:i+1,status:'new',site,flags:flags(site)};
 }catch(error){return {row:i+1,status:'invalid',name:typeof raw?.name==='string'?raw.name.slice(0,240):'Unnamed row',message:error.message};}});
 return {rows,counts:Object.fromEntries(['new','duplicate','conflict','invalid'].map(status=>[status,rows.filter(r=>r.status===status).length]))};
}
function filtered(rows,{query='',status='all'}={}){const q=text(query);return rows.filter(r=>(status==='all'||r.status===status)&&(!q||text([r.site?.name||r.name,r.site?.country,r.site?.continent,r.row].join(' ')).includes(q)));}
function evidence(sites,{query='',issue='all',category='all'}={}){const q=text(query);return sites.filter(s=>(category==='all'||s.category===category)&&(issue==='all'||flags(s).includes(issue))&&(!q||text([s.name,s.country,s.continent,s.summary,s.evidence].join(' ')).includes(q))).map(s=>({site:copy(s),flags:flags(s)}));}
function create({read,write,guard=()=>JSON.stringify(read())}){
 let review=null,undo=null,busy=false;
 const idle=()=>{if(busy)throw Error('Wait for the current catalog save to finish.');};
 return Object.freeze({
  review(raw){idle();const baseline=guard(),report=prepare(raw,read());review={baseline,report};return copy(report);},
  cancel(){idle();review=null;},
  undoAvailable(){return !!undo&&guard()===undo.after;},
  async commit(selected){idle();if(!review)throw Error('Review a file before importing.');if(guard()!==review.baseline){review=null;throw Error('The catalog changed. Review the file again before importing.');}
   if(!Array.isArray(selected)||new Set(selected).size!==selected.length||selected.some(n=>!Number.isInteger(n)))throw Error('Choose valid rows from the current review.');
   const rows=selected.map(n=>review.report.rows.find(r=>r.row===n));if(!rows.length||rows.some(r=>r?.status!=='new'))throw Error('Only new, valid records can be imported.');
   const before=copy(read()),additions=rows.map(r=>copy(r.site));if(before.length+additions.length>5000)throw Error('The catalog supports up to 5,000 records. Select fewer rows.');
   busy=true;try{await write([...before,...additions],review.baseline);undo={before,after:guard(),count:additions.length};review=null;return {count:additions.length};}finally{busy=false;}
  },
  async undo(){idle();if(!undo||guard()!==undo.after){undo=null;throw Error('The catalog or mission queue changed. Undo is no longer available.');}busy=true;try{await write(copy(undo.before),undo.after);const count=undo.count;undo=null;review=null;return {count};}finally{busy=false;}},
 });
}
return Object.freeze({prepare,compare,flags,filtered,evidence,create});
});
