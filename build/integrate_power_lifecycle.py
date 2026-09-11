"""Integrate explicit native shutdown, minimize-safe lifecycle handling, and last-globe-view restore.
Development/owner-preview only. No installer, signing, Store submission, background service, or security bypass.
"""
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]

def edit(path,fn):
 p=ROOT/path;s=p.read_text('utf-8');n=fn(s)
 if n!=s:p.write_text(n,encoding='utf-8',newline='\n')

def once(s,a,b):
 if b in s:return s
 if s.count(a)!=1:raise RuntimeError('Power lifecycle integration anchor mismatch: '+a[:120])
 return s.replace(a,b,1)

for path in ['app/index.html','app/workspace-preview.html']:
 def entry(s):
  if 'src/power-controls.css' not in s:
   s=once(s,'</head>','<link rel="stylesheet" href="src/power-controls.css"></head>')
  return s
 edit(path,entry)

def app(s):
 old="let mode='observatory',selected=state.sites.find(s=>s.name==='Göbekli Tepe')||state.sites[0],tab='overview',category='all',query='',rating='',year=currentYear,filterTime=false,visible=[],hoverTimer,hoverId;"
 new="const savedGlobeView=(state.settings.globeView&&typeof state.settings.globeView==='object')?state.settings.globeView:null;\nlet mode=savedGlobeView?.mode==='mission'?'mission':'observatory',selected=(savedGlobeView?.selectedId?state.sites.find(s=>s.id===savedGlobeView.selectedId):null)||state.sites.find(s=>s.name==='Göbekli Tepe')||state.sites[0],tab='overview',category='all',query='',rating='',year=currentYear,filterTime=false,visible=[],hoverTimer,hoverId;"
 s=once(s,old,new)
 old="globe.reduced=state.settings.reducedMotion;globe.spin=!globe.reduced;Object.assign(globe.options,state.settings.layers||{});document.body.classList.toggle('reduced-motion',globe.reduced);"
 new="""globe.reduced=state.settings.reducedMotion;globe.spin=!globe.reduced;Object.assign(globe.options,state.settings.layers||{});document.body.classList.toggle('reduced-motion',globe.reduced);
if(savedGlobeView){const lat=Number(savedGlobeView.lat),lon=Number(savedGlobeView.lon),zoom=Number(savedGlobeView.zoom);if(Number.isFinite(lat)&&lat>=-85&&lat<=85)globe.lat=lat;if(Number.isFinite(lon))globe.lon=lon;if(Number.isFinite(zoom)&&zoom>=.6&&zoom<=2.5)globe.zoom=zoom;if(selected)globe.selected=selected.id;}
function rememberGlobe(){if(!globe)return;const lon=((Number(globe.lon)+180)%360+360)%360-180;state.settings.globeView={lat:Math.max(-85,Math.min(85,Number(globe.lat)||0)),lon,zoom:Math.max(.6,Math.min(2.5,Number(globe.zoom)||1)),selectedId:selected?.id||null,mode:mode==='mission'?'mission':'observatory'};}"""
 s=once(s,old,new)
 old="window.addEventListener('beforeunload',()=>{if(!native){try{localStorage.setItem('atlas-command-state',JSON.stringify(state));}catch{}}else{navigator.sendBeacon('api/state',new Blob([JSON.stringify(state)],{type:'application/json'}));}});"
 new="""function sendLifecycle(value){if(!native)return;try{navigator.sendBeacon('api/lifecycle',new Blob([JSON.stringify({state:value})],{type:'application/json'}));}catch{}}
if(native){document.addEventListener('visibilitychange',()=>sendLifecycle(document.hidden?'hidden':'visible'));window.addEventListener('pagehide',()=>sendLifecycle('closing'));}
window.addEventListener('beforeunload',()=>{rememberGlobe();if(!native){try{localStorage.setItem('atlas-command-state',JSON.stringify(state));}catch{}}else{navigator.sendBeacon('api/state',new Blob([JSON.stringify(state)],{type:'application/json'}));sendLifecycle('closing');}});"""
 s=once(s,old,new)
 anchor='window.AtlasTest={state,globe,setYear,importFile,parseKML,exportKML,unzipKML,flush,select,updateVisible,getVisible:()=>visible};'
 power="""if(native&&!document.getElementById('shutdownBtn')){const shutdown=document.createElement('button');shutdown.id='shutdownBtn';shutdown.type='button';shutdown.title='Save and shut down Atlas Command';shutdown.setAttribute('aria-label','Save and shut down Atlas Command');shutdown.textContent='⏻';document.querySelector('.top-actions')?.append(shutdown);shutdown.onclick=async()=>{if(shutdown.disabled)return;shutdown.disabled=true;shutdown.setAttribute('aria-busy','true');document.body.classList.add('atlas-powering-off');try{rememberGlobe();await flush();await api('exit',{method:'POST',headers:{'X-Atlas-Request':'local'}});document.body.innerHTML='<div class="atlas-power-off-screen"><div><span class="power-symbol">⏻</span><h1>Atlas Command is off.</h1><p>Your workspace and globe position were saved. Close this window if it remains visible, then start Atlas Command normally when you are ready.</p></div></div>';setTimeout(()=>{try{window.close();}catch{}},80);}catch(error){document.body.classList.remove('atlas-powering-off');shutdown.disabled=false;shutdown.removeAttribute('aria-busy');toast('Shutdown needs attention: '+error.message);}};requestAnimationFrame(()=>globe.resize());}
"""+anchor
 s=once(s,anchor,power)
 return s
edit('app/src/app.js',app)

def native(s):
 s=once(s,'static long LastHeartbeat = DateTime.UtcNow.Ticks;','static long LastHeartbeat = DateTime.UtcNow.Ticks;\n    static volatile bool WindowHidden;\n    static long HiddenSinceTicks;\n    static long CloseAfterTicks;')
 old='''            while (!Stopping) {
                if (new TimeSpan(DateTime.UtcNow.Ticks - Interlocked.Read(ref LastHeartbeat)).TotalMinutes > 5) break;'''
 new='''            while (!Stopping) {
                long nowTicks = DateTime.UtcNow.Ticks, closeAfter = Interlocked.Read(ref CloseAfterTicks), hiddenSince = Interlocked.Read(ref HiddenSinceTicks);
                if (closeAfter > 0 && nowTicks >= closeAfter) break;
                if (closeAfter == 0 && WindowHidden && hiddenSince > 0 && new TimeSpan(nowTicks-hiddenSince).TotalHours > 12) break;
                if (closeAfter == 0 && !WindowHidden && new TimeSpan(nowTicks - Interlocked.Read(ref LastHeartbeat)).TotalMinutes > 5) break;'''
 s=once(s,old,new)
 old='if (!localHeader && !(rel == "api/state" && (origin == Origin || samePage))) { Error(stream,403,"Local action header required"); return; }'
 new='if (!localHeader && !((rel == "api/state" || rel == "api/lifecycle") && (origin == Origin || samePage))) { Error(stream,403,"Local action header required"); return; }'
 s=once(s,old,new)
 anchor='''            if (rel == "api/heartbeat" && method == "GET") { SendJson(stream,"{\\"ok\\":true}"); return; }'''
 lifecycle='''            if (rel == "api/lifecycle" && method == "POST") {
                RequireType(headers,"application/json");
                Dictionary<string,object> lifecycle = Json().DeserializeObject(Utf8.GetString(body)) as Dictionary<string,object>; object rawState;
                if (lifecycle == null || !lifecycle.TryGetValue("state",out rawState) || !(rawState is string)) throw new InvalidDataException("Invalid lifecycle state.");
                string lifecycleState=(string)rawState;
                if (lifecycleState=="visible") { WindowHidden=false; Interlocked.Exchange(ref HiddenSinceTicks,0); Interlocked.Exchange(ref LastHeartbeat,DateTime.UtcNow.Ticks); }
                else if (lifecycleState=="hidden") { WindowHidden=true; Interlocked.Exchange(ref HiddenSinceTicks,DateTime.UtcNow.Ticks); }
                else if (lifecycleState=="closing") { Interlocked.Exchange(ref CloseAfterTicks,DateTime.UtcNow.AddSeconds(2).Ticks); }
                else throw new InvalidDataException("Unknown lifecycle state.");
                SendJson(stream,"{\\"ok\\":true}"); return;
            }
'''+anchor
 s=once(s,anchor,lifecycle)
 allow='rel == "src/ui-refinement.css" ||'
 if 'rel == "src/power-controls.css"' not in s:s=once(s,allow,'rel == "src/ui-refinement.css" || rel == "src/power-controls.css" ||')
 return s
edit('native/AtlasHost.cs',native)

def owner(s):
 if "'src/power-controls.css'" not in s:s=once(s,"'src/cameras.js','src/cameras.css','src/ui-directions.js','src/ui-directions.css','src/ui-refinement.css',","'src/cameras.js','src/cameras.css','src/ui-directions.js','src/ui-directions.css','src/ui-refinement.css','src/power-controls.css',")
 return s
edit('build/Build-OwnerPreview.ps1',owner)

def store(s):
 if "'src/power-controls.css'" not in s:s=once(s,"'src/ui-directions.js','src/ui-directions.css','src/ui-refinement.css',","'src/ui-directions.js','src/ui-directions.css','src/ui-refinement.css','src/power-controls.css',")
 return s
edit('build/Build-Store.ps1',store)

def next_ui(s):
 old="page.on('request',lambda r:external.append(r.url) if not r.url.startswith(('http://127.0.0.1:','data:','blob:')) else None)"
 new="page.on('request',lambda r:external.append(r.url) if not (r.url.startswith(('http://127.0.0.1:','data:','blob:')) or r.url=='https://svs.gsfc.nasa.gov/vis/a000000/a002900/a002915/bluemarble-2048.png') else None)"
 return once(s,old,new)
edit('tests/next_ui_test.py',next_ui)

print('Integrated explicit red shutdown control, graceful close/minimize lifecycle, globe-view persistence, and exact NASA-basemap CI allowance.')
