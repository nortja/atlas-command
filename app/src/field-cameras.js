/* Private, manual IP camera profile data. No discovery, transport, credentials,
   connection tests or recording. Camera coordinates are user references only. */
(function(root,factory){'use strict';const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.AtlasFieldCameras=api;})(typeof window==='object'?window:globalThis,function(){
'use strict';
const MAX_PROFILES=200;
const MODES=Object.freeze({local:'On site / local network',remote:'Remote / private route',both:'Both'});
const METHODS=Object.freeze({undecided:'Automatic · try ONVIF first',onvif:'ONVIF service',rtsp:'RTSP stream',rtsps:'RTSPS stream','https-jpeg':'HTTPS snapshot','http-jpeg':'HTTP snapshot',mjpeg:'MJPEG stream'});
const STATES=Object.freeze({planned:'Planned placement',deployed:'Placed in the field',stored:'Stored / not deployed'});
const copy=v=>structuredClone(v);
function text(value,label,max=200,required=false){
 if(value==null)value='';if(typeof value!=='string')throw Error(label+' must be text.');
 const v=value.trim();if(required&&!v)throw Error(label+' is required.');if(v.length>max)throw Error(label+' is too long (maximum '+max+' characters).');
 if(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(v))throw Error(label+' contains unsupported characters.');return v;
}
function choice(value,options,label,fallback){const v=value==null||value===''?fallback:value;if(!Object.hasOwn(options,v))throw Error('Choose a valid '+label+'.');return v;}
function address(value){
 const v=text(value,'IP address or hostname',253,true);
 if(/[\s/@?#\\]/.test(v))throw Error('Enter only the IP address or hostname. Keep ports and paths in Connection details; do not paste credentials.');
 if(v.includes(':')){if(v.startsWith('[')&&!/^\[[0-9a-fA-F:.]+\]$/.test(v))throw Error('Enter an IPv6 address without a port.');let h=v;if(!h.startsWith('['))h='['+h+']';try{const u=new URL('http://'+h);if(u.hostname!==h.toLowerCase()&&!u.hostname.startsWith('['))throw Error();return u.hostname.slice(1,-1);}catch{throw Error('Enter a valid IPv6 address without a port or zone suffix.');}}
 if(/^\d+(\.\d+){3}$/.test(v)){if(v.split('.').some(n=>!/^0$|^[1-9]\d{0,2}$/.test(n)||Number(n)>255))throw Error('Enter four decimal IPv4 numbers from 0 to 255.');return v;}
 if(/^[\d.]+$/.test(v)||!v.split('.').every(l=>/^[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?$/.test(l)))throw Error('Enter a valid IP address or hostname.');return v.toLowerCase();
}
function optionalNumber(v,label,min,max,integer=false){
 if(v==null||v==='')return null;
 if(typeof v==='string'){if(!/^-?\d+(?:\.\d+)?$/.test(v.trim()))throw Error(label+' must be a number.');v=Number(v);}
 if(typeof v!=='number'||!Number.isFinite(v)||v<min||v>max||(integer&&!Number.isInteger(v)))throw Error(label+' must be '+(integer?'a whole number ':'')+'between '+min+' and '+max+'.');return v;
}
function endpointPath(raw){const v=text(raw,'Stream or service path',400);if(v&&(!v.startsWith('/')||v.startsWith('//')||/[?#@\\\s]/.test(v)||/%(?:00|0a|0d|40|3f|23|5c)/i.test(v)))throw Error('Use a path such as /stream1, without a full URL, credentials or query tokens.');return v;}
function isoDate(raw){const v=text(raw,'Placement date',10);if(!v)return '';if(!/^\d{4}-\d{2}-\d{2}$/.test(v)||!Number.isFinite(Date.parse(v))||new Date(v).toISOString().slice(0,10)!==v)throw Error('Choose a valid placement date.');return v;}
function normalize(raw){
 if(!raw||typeof raw!=='object'||Array.isArray(raw))throw Error('A camera profile is required.');
 const lat=optionalNumber(raw.lat,'Latitude',-90,90),lon=optionalNumber(raw.lon,'Longitude',-180,180);
 if((lat===null)!==(lon===null))throw Error('Enter both latitude and longitude, or leave both blank.');
 const tags=(typeof raw.tags==='string'?raw.tags.split(','):raw.tags??[]);if(!Array.isArray(tags)||tags.length>12)throw Error('Use up to 12 comma-separated tags.');
 const id=text(raw.id,'Profile identifier',100);if(id&&!/^cam-[a-zA-Z0-9-]{1,90}$/.test(id))throw Error('Invalid profile identifier.');
 const siteId=text(raw.siteId,'Linked site identifier',200);
 return {id,name:text(raw.name,'Camera name',100,true),host:address(raw.host),mode:choice(raw.mode,MODES,'connection mode','local'),method:choice(raw.method,METHODS,'connection method','undecided'),port:optionalNumber(raw.port,'Port',1,65535,true),path:endpointPath(raw.path),location:text(raw.location,'Location label',160),locality:text(raw.locality,'Town / locality',100),region:text(raw.region,'State / region',100),country:text(raw.country,'Country',100),lat,lon,locationSource:lat===null?'not-specified':'user-reference',siteId,description:text(raw.description,'Description',2000),placement:text(raw.placement,'Mounting / access notes',1500),facing:optionalNumber(raw.facing,'Facing direction',0,359.9),makeModel:text(raw.makeModel,'Make / model',160),deployment:choice(raw.deployment,STATES,'placement status','planned'),installedOn:isoDate(raw.installedOn),tags:[...new Set(tags.map(t=>text(t,'Tag',32)).filter(Boolean))]};
}
function connectionPlan(raw){
 const p=normalize(raw),remote=p.mode==='remote'||p.mode==='both',steps=[];
 const add=(id,label,detail,state='planned')=>steps.push(Object.freeze({id,label,detail,state}));
 if(p.method==='undecided'){
  add('onvif','Try ONVIF on this camera only','Check the exact saved host for an ONVIF service. Start with the saved port when present; otherwise use only normal HTTP/HTTPS service endpoints before asking for a device-specific port.');
  add('onvif-capabilities','Read advertised camera capabilities','If ONVIF responds, request supported media profiles and snapshot/stream URIs. Do not guess unsupported features.');
  add('rtsp-fallback','Offer RTSP/manual fallback','If ONVIF is unavailable or incomplete, ask for the camera stream port/path or let the user choose RTSP, RTSPS, MJPEG, or snapshot setup manually.');
 } else if(p.method==='onvif'){
  add('onvif','Use ONVIF setup','Contact only the saved camera endpoint and request supported capabilities.');
  add('rtsp-fallback','Offer manual stream fallback','If ONVIF does not expose playable media, offer a user-entered RTSP/RTSPS/MJPEG/snapshot configuration.');
 } else {
  add('manual','Use the saved manual method',METHODS[p.method]+(p.port!==null?' on port '+p.port:'; a device-specific port is still needed')+(p.path?' with the saved path':'')+'.');
 }
 add('auth','Authenticate only when required','Use only credentials entered by the owner and stored in the future secure credential store. Never guess credentials or place them in camera profile notes.','blocked');
 add('decode','Verify actual media','A connection is successful only after Atlas decodes a real video frame or snapshot from this camera. Reachability alone is not playback.','blocked');
 if(remote)add('route','Verify the private remote route','Remote Watch requires the saved camera to be reachable through an authorized VPN/private route or supported secure provider connection.','needs-test');
 return Object.freeze({mode:p.method==='undecided'?'auto-onvif-first':'manual-or-explicit',host:p.host,steps:Object.freeze(steps),scansNetwork:false,guessesCredentials:false});
}
function readiness(raw){
 const p=normalize(raw),remote=p.mode==='remote'||p.mode==='both',hasLocation=Boolean(p.location||p.locality||p.region||p.country),hasPurpose=Boolean(p.description||p.siteId),auto=p.method==='undecided',methodChosen=true,hasPort=p.port!==null;
 const checks=[
  {id:'identity',label:'Camera identity',state:'ready',detail:p.name+' · '+p.host},
  {id:'location',label:'Location context',state:hasLocation?'ready':'optional',detail:hasLocation?'Location details saved':'Optional: add a location label, locality, region, or country'},
  {id:'purpose',label:'Research context',state:hasPurpose?'ready':'optional',detail:hasPurpose?'Description or linked site saved':'Optional: describe what the camera overlooks or link a research site'},
  {id:'method',label:'Connection setup',state:'ready',detail:auto?'Automatic: ONVIF first, then RTSP/manual fallback':METHODS[p.method]},
  {id:'port',label:'Service / stream port',state:hasPort?'ready':auto?'optional':'needs-input',detail:hasPort?String(p.port):auto?'Optional for automatic setup; Atlas will try normal HTTP/HTTPS ONVIF endpoints on this host before asking for a device-specific port':'Add the camera service or stream port before a route test'},
  {id:'route',label:remote?'Remote private route':'Local network route',state:'needs-test',detail:remote?'Needs an authorized private route/VPN or supported secure provider test':'Needs a real reachability test from this computer'},
  {id:'credentials',label:'Camera credentials',state:'blocked',detail:'Secure credential storage and authenticated transport are not implemented yet'},
  {id:'playback',label:'Decoded camera media',state:'blocked',detail:'A reachable port will not count as working playback until video/snapshot decoding succeeds'}
 ];
 const required=checks.filter(c=>c.state!=='optional'),ready=required.filter(c=>c.state==='ready').length;
 return Object.freeze({ready,required:required.length,checks:Object.freeze(checks.map(c=>Object.freeze(c))),canRouteTest:auto||hasPort,canPlayback:false,plan:connectionPlan(p)});
}
function library(raw){
 if(raw==null)return {schemaVersion:1,profiles:[]};
 if(raw.schemaVersion!==1||!Array.isArray(raw.profiles)||raw.profiles.length>MAX_PROFILES)throw Error('Camera profiles need recovery. Existing data has not been replaced.');
 const seen=new Set();return {schemaVersion:1,profiles:raw.profiles.map(r=>{
  const p=normalize(r);if(!p.id||seen.has(p.id)||!Number.isInteger(r.revision)||r.revision<1||![r.createdAt,r.updatedAt].every(t=>typeof t==='string'&&Number.isFinite(Date.parse(t))))throw Error('Camera profile metadata needs recovery.');
  seen.add(p.id);return {...p,revision:r.revision,createdAt:r.createdAt,updatedAt:r.updatedAt};
 })};
}
function store(read,write,persist,notify=()=>{},clock=()=>new Date().toISOString(),makeId=()=> 'cam-'+globalThis.crypto.randomUUID()){
 let queue=Promise.resolve();
 function transact(operation){const task=queue.then(async()=>{
  const before=read(),next=library(before),result=operation(next);write(copy(next));
  try{await persist();}catch(error){write(before);throw error;}
  try{notify();}catch{}return copy(result);
 });queue=task.catch(()=>{});return task;}
 return Object.freeze({list:()=>copy(library(read()).profiles),
  save:(raw)=>{const input=copy(raw);return transact(next=>{
   const p=normalize(input),index=p.id?next.profiles.findIndex(v=>v.id===p.id):-1;
   if(p.id&&index<0)throw Error('This camera profile no longer exists.');
   if(index>=0&&input.revision!==next.profiles[index].revision)throw Error('This profile changed. Reopen it before saving.');
   if(index<0&&next.profiles.length>=MAX_PROFILES)throw Error('Camera profile limit reached.');
   const old=index>=0?next.profiles[index]:null,now=clock();
   if(!Number.isFinite(Date.parse(now)))throw Error('Invalid system time.');
   const id=old?.id||makeId();if(!/^cam-[a-zA-Z0-9-]{1,90}$/.test(id)||(!old&&next.profiles.some(v=>v.id===id)))throw Error('Could not create a unique camera identifier. Retry.');
   const saved={...p,id,createdAt:old?.createdAt||now,updatedAt:now,revision:(old?.revision||0)+1};
   if(index<0)next.profiles.push(saved);else next.profiles[index]=saved;return saved;
  });},
  remove:(id,revision)=>transact(next=>{const i=next.profiles.findIndex(v=>v.id===id);if(i<0)throw Error('This profile no longer exists.');if(next.profiles[i].revision!==revision)throw Error('This profile changed. Reopen it before removing.');return next.profiles.splice(i,1)[0];})
 });
}
function search(profiles,query='',mode='all'){
 const fold=v=>String(v).normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase();const q=fold(query.trim());
 return profiles.filter(p=>(mode==='all'||p.mode===mode||p.mode==='both')&&fold([p.name,p.location,p.locality,p.region,p.country,p.host,p.description,p.makeModel,...p.tags].join(' ')).includes(q));
}
function shareableWorkspace(state){const value=copy(state);if(value.settings)delete value.settings.fieldCameras;return value;}
return Object.freeze({MAX_PROFILES,MODES,METHODS,STATES,address,normalize,connectionPlan,readiness,library,store,search,shareableWorkspace});
});
