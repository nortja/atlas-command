/* Atlas Command: domain logic. Coordinates are WGS84 decimal degrees.
   Years use negative BCE / positive CE (never year zero). No probabilities inferred. */
(function(root){
'use strict';
const COLORS={1:'#52d6b3',2:'#6caeff',3:'#e9c572',4:'#f39765',5:'#f17699'};
const CATEGORIES=['archaeology','lidar','mineral','fossil','personal'];
const MODULES=[
 {id:'archaeology',name:'Ancient atlas',status:'Local',detail:'Sites, chronology, mystery ratings, evidence and field notes.'},
 {id:'lidar',name:'LiDAR intelligence',status:'Local records',detail:'Separate all-era catalog. Survey leads are not unvisited-site claims. LAS/LAZ point-cloud rendering is not included.'},
 {id:'magnetic',name:'Magnetic research',status:'Workbench',detail:'Manual, sourced axis-versus-declination comparison. No field model or prediction engine is connected.'},
 {id:'sky',name:'Celestial context',status:'Limited',detail:'Approximate present-day solar day/night and lunar phase, plus provider-calculated sunrise/sunset. Historical stars, eclipses and precise ephemerides are not connected.'},
 {id:'minerals',name:'Minerals & fossils',status:'Local records',detail:'Record locations and local evidence. Collecting access and commercial rights must be checked separately.'},
 {id:'expedition',name:'Expedition planner',status:'Manual',detail:'Mission queue, budgets and readiness checklist. No live fares, bookings or current advisories are included.'},
 {id:'weather',name:'Live Earth & updates',status:'Opt-in feed',detail:'Open-Meteo model weather, selected-area card and cached global samples after consent. Personal non-commercial use. No satellite imagery, measured lightning or official alerts.'}
];
function finiteNumber(x){return x!==null && x!==undefined && String(x).trim()!=='' && Number.isFinite(Number(x));}
function yearLabel(y){if(!finiteNumber(y))return 'Date unresolved'; y=Number(y);return y<0?Math.abs(y).toLocaleString('en-US')+' BCE':y===0?'No year zero':y.toLocaleString('en-US')+' CE';}
function safeURL(s){try {const u=new URL(String(s));return u.protocol==='https:'||u.protocol==='http:'?u.href:'';}catch{return '';}}
function slug(s){return String(s).normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,100);}
function parseAge(text){
 const t=String(text||'').replace(/,/g,'');
 // Only parse a plainly numerical BCE/CE year or simple range. Do not invent dates for millennia, BP, or geological periods.
 if(/centur|millenn|undated|unresolved|years ago|\bBP\b/i.test(t))return {yearStart:null,yearEnd:null};
 let m=t.match(/\b(\d{1,6})\s*(?:BCE|BC)\s*[–—-]\s*(\d{1,6})\s*(?:CE|AD)\b/i);
 if(m)return {yearStart:-Number(m[1]),yearEnd:Number(m[2])};
 m=t.match(/\b(\d{1,6})(?:\s*[–—-]\s*(\d{1,6}))?\s*(BCE|BC|CE|AD)\b/i);
 if(!m)return {yearStart:null,yearEnd:null};
 const sign=/BC/i.test(m[3])?-1:1; const a=sign*Number(m[1]),b=m[2]?sign*Number(m[2]):null;
 if(a===0||b===0)return {yearStart:null,yearEnd:null};
 return {yearStart:b===null?a:Math.min(a,b),yearEnd:b===null?null:Math.max(a,b)};
}
function normalizeSite(raw, origin='user'){
 if(!raw||typeof raw!=='object')throw new Error('Site must be an object.');
 const lat=raw.lat??raw.latitude,lon=raw.lon??raw.longitude;
 if(!finiteNumber(lat)||Number(lat)<-90||Number(lat)>90)throw new Error('Latitude must be between -90 and 90.');
 if(!finiteNumber(lon)||Number(lon)<-180||Number(lon)>180)throw new Error('Longitude must be between -180 and 180.');
 const name=String(raw.name||'').trim().slice(0,240);if(!name)throw new Error('A site name is required.');
 const age=String(raw.age||'Date unresolved').slice(0,700),parsed=parseAge(age);
 const yearStart=raw.yearStart===null?null:finiteNumber(raw.yearStart)?Number(raw.yearStart):parsed.yearStart;
 const yearEnd=raw.yearEnd===null?null:finiteNumber(raw.yearEnd)?Number(raw.yearEnd):parsed.yearEnd;
 if(yearStart===0||yearEnd===0)throw new Error('Use -1 for 1 BCE or 1 for 1 CE; there is no year zero.');
 if(yearStart!==null&&yearEnd!==null&&yearEnd<yearStart)throw new Error('End year must follow start year.');
 const inferred=/lidar/i.test(name+' '+(raw.evidence_tier||'')+' '+(raw.evidence||''))?'lidar':'archaeology';
 const category=CATEGORIES.includes(raw.category)?raw.category:inferred;
 const r=raw.mystery??raw.mystery_rating;const mystery=finiteNumber(r)&&Number(r)>=1&&Number(r)<=5?Math.round(Number(r)):null;
 const clean=s=>String(s||'').slice(0,20000);
 return {id:typeof raw.id==='string'&&/^[\w.-]{1,180}$/.test(raw.id)?raw.id:'site-'+slug(name)+'-'+Number(lat).toFixed(3)+'-'+Number(lon).toFixed(3),
 name,lat:Number(lat),lon:Number(lon),country:clean(raw.country).slice(0,160),continent:clean(raw.continent).slice(0,100),category,age,yearStart,yearEnd,mystery,
 summary:clean(raw.summary??raw.mainstream_summary),question:clean(raw.question??raw.alternative_or_open_question),evidence:clean(raw.evidence??raw.evidence_tier??'Unreviewed'),
 source:safeURL(raw.source??raw.source_url),photoSource:safeURL(raw.photoSource??raw.photo_url),notes:clean(raw.notes),
 precision:clean(raw.precision||'Atlas reference point; verify before field use'),origin:clean(raw.origin||origin),
 review:clean(raw.review||'Imported record; chronology, coordinates and rating need review'),
 media:Array.isArray(raw.media)?raw.media.filter(m=>m&&typeof m.key==='string'&&/^[\w.-]+$/.test(m.key)).slice(0,100).map(m=>({key:m.key,name:clean(m.name),type:clean(m.type)})):[],
 research:raw.research&&typeof raw.research==='object'?raw.research:{},
 createdAt:clean(raw.createdAt||new Date().toISOString()),updatedAt:typeof raw.updatedAt==='string'&&raw.updatedAt.length<=64&&Number.isFinite(Date.parse(raw.updatedAt))?raw.updatedAt:new Date().toISOString(),
 legacy:raw.legacy&&typeof raw.legacy==='object'?raw.legacy:{age,evidence_tier:raw.evidence_tier||'',index:raw.index??null,photo_url:raw.photo_url||''}
 };
}
function parseCSV(text){
 text=String(text).replace(/^\uFEFF/,'');let rows=[],row=[],cell='',quoted=false;
 for(let i=0;i<text.length;i++){const c=text[i];if(c==='"'){if(quoted&&text[i+1]==='"'){cell+='"';i++;}else quoted=!quoted;}
 else if(c===','&&!quoted){row.push(cell);cell='';}else if((c==='\n'||c==='\r')&&!quoted){if(c==='\r'&&text[i+1]==='\n')i++;row.push(cell);if(row.some(x=>x.trim()))rows.push(row);row=[];cell='';}else cell+=c;}
 if(quoted)throw new Error('CSV contains an unclosed quoted field.');row.push(cell);if(row.some(x=>x.trim()))rows.push(row);
 if(rows.length<2)throw new Error('CSV needs a header and at least one site.');const heads=rows.shift().map(h=>h.trim().toLowerCase());
 if(!heads.includes('name'))throw new Error('CSV must contain a name column.');
 return rows.map((r,i)=>{if(r.length!==heads.length)throw new Error('CSV row '+(i+2)+' has '+r.length+' fields; expected '+heads.length+'.');return Object.fromEntries(heads.map((h,j)=>[h,r[j]]));});
}
function importRecords(raw,existing=[]){
 if(!Array.isArray(raw)||raw.length>5000||existing.length+raw.length>10000)throw new Error('Import an array of at most 5,000 records.');
 const out=[],errors=[],duplicates=[],keys=new Set(),sources=new Set(),ids=new Set(existing.map(s=>s.id));
 const point=s=>s.lat.toFixed(3)+'|'+s.lon.toFixed(3);
 existing.forEach(s=>{keys.add(slug(s.name)+'|'+point(s));if(s.source)sources.add(s.source+'|'+point(s));});
 raw.forEach((r,i)=>{try{const s=normalizeSite(r,'import'),k=slug(s.name)+'|'+point(s),sk=s.source+'|'+point(s);if(keys.has(k)||(s.source&&sources.has(sk))){duplicates.push(s.name);return;}
 if(existing.length+out.length>=5000)throw Error('Workspace limit is 5,000 records in this prototype.');
 if(ids.has(s.id)){const base=s.id;let n=2;while(ids.has(s.id))s.id=base+'-'+n++;}ids.add(s.id);keys.add(k);if(s.source)sources.add(sk);out.push(s);
 }catch(e){errors.push({row:i+1,name:r?.name||'',message:e.message});}});
 return {sites:out,errors,duplicates};
}
function searchText(s){return String(s||'').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase();}
function visibleSites(sites,opts){const q=searchText(opts.query);return sites.filter(s=>{
 if(opts.categories&&!opts.categories.includes(s.category))return false;
 if(q&&!searchText(s.name+' '+s.country+' '+s.continent+' '+s.summary).includes(q))return false;
 if(opts.mystery&&s.mystery!==Number(opts.mystery))return false;
 if(opts.ancientOnly&&s.category==='archaeology'&&(s.yearStart===null||s.yearStart>0))return false;
 if(opts.filterTime&&s.category==='archaeology'){if(s.yearStart===null)return !!opts.includeUndated;return s.yearStart<=opts.year&&(s.yearEnd===null||s.yearEnd>=opts.year);}
 return true;
 });}
function angularDifference(a,b,axial=true){let d=((Number(a)-Number(b))%360+360)%360;d=Math.min(d,360-d);return axial?Math.min(d,Math.abs(180-d)):d;}
function haversine(a,b){const rad=Math.PI/180;const p1=a.lat*rad,p2=b.lat*rad,dp=(b.lat-a.lat)*rad,dl=(b.lon-a.lon)*rad;const x=Math.sin(dp/2)**2+Math.cos(p1)*Math.cos(p2)*Math.sin(dl/2)**2;return 6371*2*Math.atan2(Math.sqrt(Math.min(1,x)),Math.sqrt(Math.max(0,1-x)));}
function budgetTotal(b){return ['transport','lodging','guide','permits','other'].reduce((a,k)=>a+(finiteNumber(b[k])?Math.max(0,Number(b[k])):0),0);}
function moonPhase(date=new Date()){
 const d=(date.getTime()-Date.UTC(2000,0,6,18,14))/86400000;
 const phase=((d/29.530588853)%1+1)%1,illumination=(1-Math.cos(2*Math.PI*phase))/2;
 const names=['New moon','Waxing crescent','First quarter','Waxing gibbous','Full moon','Waning gibbous','Last quarter','Waning crescent'];
 return {phase,illumination,name:names[Math.round(phase*8)%8],basis:'Mean synodic approximation; present-day context only, not an ephemeris.'};
}
function escapeHTML(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
const api={COLORS,CATEGORIES,MODULES,finiteNumber,yearLabel,safeURL,slug,parseAge,normalizeSite,parseCSV,importRecords,visibleSites,angularDifference,haversine,budgetTotal,moonPhase,escapeHTML};
if(typeof module!=='undefined'&&module.exports)module.exports=api;root.AtlasCore=api;
})(typeof window!=='undefined'?window:globalThis);
