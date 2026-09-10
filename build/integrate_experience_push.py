"""Integrate selected-site weather desk, ocean currents, richer site briefs, realistic globe treatment, and minimized-window lifetime handling.
Development/owner-preview only. No signing, Store submission, background service, or security bypass.
"""
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]

def edit(path,fn):
 p=ROOT/path
 s=p.read_text('utf-8')
 n=fn(s)
 if n!=s:p.write_text(n,encoding='utf-8',newline='\n')

def add_before(s,anchor,text):
 if text in s:return s
 if s.count(anchor)!=1:raise RuntimeError('Experience integration anchor mismatch: '+anchor[:100])
 return s.replace(anchor,text+anchor,1)

def replace_once(s,a,b):
 if b in s:return s
 if s.count(a)!=1:raise RuntimeError('Experience integration replacement mismatch: '+a[:100])
 return s.replace(a,b,1)

# Entry points: local-only presentation modules. Ocean model endpoint is explicitly allowlisted.
for path in ['app/index.html','app/workspace-preview.html']:
 def entry(s):
  s=s.replace("connect-src 'self' https://api.open-meteo.com;","connect-src 'self' https://api.open-meteo.com https://marine-api.open-meteo.com;")
  s=add_before(s,'</head>','<link rel="stylesheet" href="src/weather-desk.css"><link rel="stylesheet" href="src/ocean-currents.css"><link rel="stylesheet" href="src/site-detail-enhance.css">')
  s=add_before(s,'<script src="src/ui-directions.js"></script>','<script src="src/ocean-currents.js"></script><script src="src/weather-desk.js"></script><script src="src/site-detail-enhance.js"></script>')
  return s
 edit(path,entry)

# Globe: support multiple trusted bundled environment renderers and more Earth-like land/ocean shading.
def globe(s):
 s=replace_once(s,'this.selected=null;this.drag=null;this.target=null;','this.selected=null;this.drag=null;this.target=null;this.environmentRenderers=new Map();')
 old="const sphere=ctx.createRadialGradient(this.cx-R*.3,this.cy-R*.3,R*.12,this.cx,this.cy,R);sphere.addColorStop(0,colors?.inner||'#143a4ce8');sphere.addColorStop(.6,colors?.middle||'#0b2534ee');sphere.addColorStop(.92,'#091f2de8');sphere.addColorStop(1,colors?.edge||'#1b4859f0');ctx.fillStyle=sphere;ctx.beginPath();ctx.arc(this.cx,this.cy,R,0,TAU);ctx.fill();"
 new="const sphere=ctx.createRadialGradient(this.cx-R*.34,this.cy-R*.38,R*.08,this.cx,this.cy,R);sphere.addColorStop(0,this.appearance==='expedition'?'#315f6fe8':'#1f6d86e8');sphere.addColorStop(.42,this.appearance==='expedition'?'#174455ee':'#0e4a64ee');sphere.addColorStop(.82,'#082b3fee');sphere.addColorStop(1,'#061b2beF');ctx.fillStyle=sphere;ctx.beginPath();ctx.arc(this.cx,this.cy,R,0,TAU);ctx.fill();const oceanGlow=ctx.createRadialGradient(this.cx-R*.42,this.cy-R*.45,0,this.cx-R*.15,this.cy-R*.18,R*.85);oceanGlow.addColorStop(0,'rgba(178,231,238,.12)');oceanGlow.addColorStop(.55,'rgba(68,145,166,.045)');oceanGlow.addColorStop(1,'rgba(0,0,0,0)');ctx.fillStyle=oceanGlow;ctx.beginPath();ctx.arc(this.cx,this.cy,R,0,TAU);ctx.fill();"
 s=replace_once(s,old,new)
 olddots="for(const v of this.dots){const p=this.project(v);if(p.z<0)continue;ctx.fillStyle=p.z>.65?'#74bac79a':p.z>.3?'#559caf80':'#356c8060';ctx.beginPath();ctx.arc(p.x,p.y,.65+Math.max(0,p.z)*.35,0,TAU);ctx.fill();}"
 newdots="for(const v of this.dots){const p=this.project(v);if(p.z<0)continue;const alat=Math.abs(Math.asin(Math.max(-1,Math.min(1,v[1])))/RAD),noise=(Math.sin(v[0]*31+v[2]*47+v[1]*19)+1)/2;let rgb=alat>67?[207,221,211]:alat>48?(noise>.55?[124,135,90]:[142,128,87]):alat<18?(noise>.48?[69,118,72]:[96,124,73]):(noise>.62?[145,126,78]:[83,119,74]);const light=.48+.48*Math.max(0,p.z);ctx.fillStyle='rgba('+Math.round(rgb[0]*light)+','+Math.round(rgb[1]*light)+','+Math.round(rgb[2]*light)+','+(.50+.42*p.z)+')';ctx.beginPath();ctx.arc(p.x,p.y,.7+Math.max(0,p.z)*.48,0,TAU);ctx.fill();}"
 s=replace_once(s,olddots,newdots)
 s=s.replace("if(this.environmentRenderer){this.ctx.save();try{this.environmentRenderer(this,t);}finally{this.ctx.restore();}}","{const rs=this.environmentRenderers&&this.environmentRenderers.size?[...this.environmentRenderers.values()]:(this.environmentRenderer?[this.environmentRenderer]:[]);for(const render of rs){this.ctx.save();try{render(this,t);}finally{this.ctx.restore();}}}")
 s=s.replace("ctx.strokeStyle=colors?.rim||'#8bdded9a';ctx.lineWidth=1.1;","const limb=ctx.createRadialGradient(this.cx,this.cy,R*.88,this.cx,this.cy,R*1.06);limb.addColorStop(0,'rgba(85,190,218,0)');limb.addColorStop(.78,'rgba(85,190,218,.025)');limb.addColorStop(1,'rgba(115,214,235,.16)');ctx.fillStyle=limb;ctx.beginPath();ctx.arc(this.cx,this.cy,R*1.055,0,TAU);ctx.fill();ctx.strokeStyle=colors?.rim||'#8bdded9a';ctx.lineWidth=1.1;")
 return s
edit('app/src/globe.js',globe)

# Workspace API: lifecycle hint, selected-site access, multiple environment layers, ocean-current persistence.
def app(s):
 old="if(native)setInterval(()=>api('heartbeat').catch(()=>{}),15000);"
 new="if(native){setInterval(()=>api('heartbeat').catch(()=>{}),15000);const windowState=()=>api('window-state',{method:'POST',headers:{'Content-Type':'application/json','X-Atlas-Request':'local'},body:JSON.stringify({hidden:document.hidden})}).catch(()=>{});document.addEventListener('visibilitychange',windowState);windowState();}"
 s=replace_once(s,old,new)
 s=s.replace("context:()=>({historical:year!==currentYear,reduced:state.settings.reducedMotion,spin:globe.spin,mode}),","context:()=>({historical:year!==currentYear,year,reduced:state.settings.reducedMotion,spin:globe.spin,mode}),")
 s=s.replace("renderer:fn=>{if(typeof fn!=='function')throw Error('Bundled renderer required.');globe.environmentRenderer=fn;},","renderer:(fn,id='weather')=>{if(typeof fn!=='function'||typeof id!=='string'||!/^[a-z0-9-]{1,32}$/.test(id))throw Error('Bundled renderer required.');globe.environmentRenderers.set(id,fn);},")
 anchor=" fieldCameras:fieldCameraProfiles,\n version:1,storageMode:"
 insert=" currents:Object.freeze({selection:()=>selected?cloneForModule({id:selected.id,name:selected.name,lat:selected.lat,lon:selected.lon}):null,read:()=>cloneForModule(state.settings.oceanCurrents||{config:{enabled:false},cache:{live:null,historical:null}}),commit:async value=>{const next=AtlasOceanCurrents.snapshot(value),before=state.settings.oceanCurrents;state.settings.oceanCurrents=next;try{await flush();}catch(error){state.settings.oceanCurrents=before;throw error;}}}),\n fieldCameras:fieldCameraProfiles,\n version:1,storageMode:"
 s=replace_once(s,anchor,insert)
 s=s.replace("sites:Object.freeze({\n  list:()=>cloneForModule(state.sites),","sites:Object.freeze({\n  list:()=>cloneForModule(state.sites),\n  selected:()=>selected?cloneForModule(selected):null,")
 return s
edit('app/src/app.js',app)

# Make global weather easier to read while preserving sampled-model labeling and opt-in behavior.
def weather(s):
 s=s.replace("const opacity=local?.38:.105","const opacity=local?.42:.18")
 s=s.replace("local?.65:.18","local?.68:.30")
 return s
edit('app/src/live-weather.js',weather)

# Native lifetime: minimized/hidden renderer no longer loses the local helper because browser timers are throttled.
def native(s):
 s=s.replace("connect-src 'self' https://api.open-meteo.com;","connect-src 'self' https://api.open-meteo.com https://marine-api.open-meteo.com;")
 s=replace_once(s,'static volatile bool Stopping;','static volatile bool Stopping;\n    static volatile bool WindowHidden;')
 s=replace_once(s,'if (new TimeSpan(DateTime.UtcNow.Ticks - Interlocked.Read(ref LastHeartbeat)).TotalMinutes > 5) break;','double idleMinutes=new TimeSpan(DateTime.UtcNow.Ticks - Interlocked.Read(ref LastHeartbeat)).TotalMinutes;\n                if ((!WindowHidden && idleMinutes > 5) || (WindowHidden && idleMinutes > 480)) break;')
 old='if (rel == "api/heartbeat" && method == "GET") { SendJson(stream,"{\\"ok\\":true}"); return; }'
 new='if (rel == "api/heartbeat" && method == "GET") { SendJson(stream,"{\\"ok\\":true}"); return; }\n            if (rel == "api/window-state" && method == "POST") { RequireType(headers,"application/json"); Dictionary<string,object> w=Json().DeserializeObject(Utf8.GetString(body)) as Dictionary<string,object>; object hidden; if(w==null||!w.TryGetValue("hidden",out hidden)||!(hidden is bool)) throw new InvalidDataException("Invalid window state."); WindowHidden=(bool)hidden; SendJson(stream,"{\\"ok\\":true}"); return; }'
 s=replace_once(s,old,new)
 allow='rel == "src/ui-refinement.css" ||'
 addition='rel == "src/ui-refinement.css" || rel == "src/weather-desk.js" || rel == "src/weather-desk.css" || rel == "src/ocean-currents.js" || rel == "src/ocean-currents.css" || rel == "src/site-detail-enhance.js" || rel == "src/site-detail-enhance.css" ||'
 if addition not in s:s=replace_once(s,allow,addition)
 return s
edit('native/AtlasHost.cs',native)

# Build recipes include the new bundled assets.
def owner(s):
 anchor="'src/cameras.js','src/cameras.css','src/ui-directions.js','src/ui-directions.css','src/ui-refinement.css',"
 repl=anchor+"\n 'src/weather-desk.js','src/weather-desk.css','src/ocean-currents.js','src/ocean-currents.css','src/site-detail-enhance.js','src/site-detail-enhance.css',"
 return replace_once(s,anchor,repl)
edit('build/Build-OwnerPreview.ps1',owner)

def store(s):
 anchor="'src/ui-refinement.css'"
 assets=['src/weather-desk.js','src/weather-desk.css','src/ocean-currents.js','src/ocean-currents.css','src/site-detail-enhance.js','src/site-detail-enhance.css']
 if anchor not in s:raise RuntimeError('Store build runtime anchor missing')
 missing=[x for x in assets if ("'"+x+"'") not in s]
 if missing:s=s.replace(anchor,anchor+','+','.join("'"+x+"'" for x in missing),1)
 return s
edit('build/Build-Store.ps1',store)
print('Integrated richer site intelligence, separate location weather, live/reanalysis ocean currents, realistic globe shading, and minimized-window lifecycle protection.')
