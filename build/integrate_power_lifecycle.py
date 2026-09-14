"""Integrate explicit native shutdown, minimize-safe lifecycle handling, last-globe-view restore, and safe reopen.
Runs after the existing minimize integration so both lifecycle layers remain compatible.
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
 edit(path,lambda s:s if 'src/power-controls.css' in s else once(s,'</head>','<link rel="stylesheet" href="src/power-controls.css"></head>'))

def app(s):
 s=once(s,"let mode='observatory',selected=state.sites.find(s=>s.name==='Göbekli Tepe')||state.sites[0],tab='overview',category='all',query='',rating='',year=currentYear,filterTime=false,visible=[],hoverTimer,hoverId;","const savedGlobeView=(state.settings.globeView&&typeof state.settings.globeView==='object')?state.settings.globeView:null;\nlet mode=savedGlobeView?.mode==='mission'?'mission':'observatory',selected=(savedGlobeView?.selectedId?state.sites.find(s=>s.id===savedGlobeView.selectedId):null)||state.sites.find(s=>s.name==='Göbekli Tepe')||state.sites[0],tab='overview',category='all',query='',rating='',year=currentYear,filterTime=false,visible=[],hoverTimer,hoverId;")
 s=once(s,"globe.reduced=state.settings.reducedMotion;globe.spin=!globe.reduced;Object.assign(globe.options,state.settings.layers||{});document.body.classList.toggle('reduced-motion',globe.reduced);","""globe.reduced=state.settings.reducedMotion;globe.spin=!globe.reduced;Object.assign(globe.options,state.settings.layers||{});document.body.classList.toggle('reduced-motion',globe.reduced);
if(savedGlobeView){globe.spin=savedGlobeView.spin===true&&!globe.reduced;const lat=Number(savedGlobeView.lat),lon=Number(savedGlobeView.lon),zoom=Number(savedGlobeView.zoom);if(Number.isFinite(lat)&&lat>=-85&&lat<=85)globe.lat=lat;if(Number.isFinite(lon))globe.lon=lon;if(Number.isFinite(zoom)&&zoom>=.6&&zoom<=2.5)globe.zoom=zoom;if(selected)globe.selected=selected.id;}
function rememberGlobe(){const lon=((Number(globe.lon)+180)%360+360)%360-180;state.settings.globeView={spin:globe.spin===true,lat:Math.max(-85,Math.min(85,Number(globe.lat)||0)),lon,zoom:Math.max(.6,Math.min(2.5,Number(globe.zoom)||1)),selectedId:selected?.id||null,mode:mode==='mission'?'mission':'observatory'};}""")
 s=once(s,"window.addEventListener('beforeunload',()=>{if(!native){try{localStorage.setItem('atlas-command-state',JSON.stringify(state));}catch{}}else{navigator.sendBeacon('api/state',new Blob([JSON.stringify(state)],{type:'application/json'}));}});","""function sendLifecycle(value){if(!native)return;try{navigator.sendBeacon('api/lifecycle',new Blob([JSON.stringify({state:value})],{type:'application/json'}));}catch{}}
if(native){document.addEventListener('visibilitychange',()=>sendLifecycle(document.hidden?'hidden':'visible'));window.addEventListener('pagehide',()=>sendLifecycle('closing'));}
window.addEventListener('beforeunload',()=>{rememberGlobe();if(!native){try{localStorage.setItem('atlas-command-state',JSON.stringify(state));}catch{}}else{navigator.sendBeacon('api/state',new Blob([JSON.stringify(state)],{type:'application/json'}));sendLifecycle('closing');}});""")
 anchor='window.AtlasTest={state,globe,setYear,importFile,parseKML,exportKML,unzipKML,flush,select,updateVisible,getVisible:()=>visible};'
 power="""if(native&&!document.getElementById('shutdownBtn')){const shutdown=document.createElement('button');shutdown.id='shutdownBtn';shutdown.type='button';shutdown.title='Save and shut down Atlas Command';shutdown.setAttribute('aria-label','Save and shut down Atlas Command');shutdown.textContent='⏻';document.querySelector('.top-actions')?.append(shutdown);shutdown.onclick=async()=>{if(shutdown.disabled)return;shutdown.disabled=true;shutdown.setAttribute('aria-busy','true');document.body.classList.add('atlas-powering-off');try{globe.spin=false;globe.target=null;rememberGlobe();await flush();await api('exit',{method:'POST',headers:{'X-Atlas-Request':'local'}});document.body.innerHTML='<div class=\"atlas-power-off-screen\"><div><span class=\"power-symbol\">⏻</span><h1>Atlas Command is off.</h1><p>Your workspace and globe position were saved. Close this window if it remains visible, then start Atlas Command normally when you are ready.</p></div></div>';setTimeout(()=>{try{window.close();}catch{}},80);}catch(error){document.body.classList.remove('atlas-powering-off');shutdown.disabled=false;shutdown.removeAttribute('aria-busy');toast('Shutdown needs attention: '+error.message);}};requestAnimationFrame(()=>globe.resize());}\n"""+anchor
 return once(s,anchor,power)
edit('app/src/app.js',app)

def native(s):
 if 'static long HiddenSinceTicks;' not in s:s=once(s,'static long LastHeartbeat = DateTime.UtcNow.Ticks;','static long LastHeartbeat = DateTime.UtcNow.Ticks;\n    static long HiddenSinceTicks;\n    static long CloseAfterTicks;')
 if 'RuntimeSessionPath' not in s:s=once(s,'static string LogPath;','static string LogPath, RuntimeSessionPath;')
 s=once(s,'Directory.CreateDirectory(AppData);\n            LogPath = Path.Combine(AppData, "host.log");','Directory.CreateDirectory(AppData);\n            LogPath = Path.Combine(AppData, "host.log");\n            RuntimeSessionPath = Path.Combine(AppData, "runtime-session.txt");')
 s=once(s,'if (!owned) {\n                MessageBox.Show("Atlas Command is already running. Return to its window. After closing the window, its local helper stops within five minutes. Use Settings > Stop local app to stop it immediately.", "Atlas Command", MessageBoxButtons.OK, MessageBoxIcon.Information);\n                return;\n            }','if (!owned) {\n                if (!TryReopenRunningWindow()) MessageBox.Show("Atlas Command is already running, but its window could not be restored automatically. Use Task Manager only if the app will not reopen.", "Atlas Command", MessageBoxButtons.OK, MessageBoxIcon.Information);\n                return;\n            }')
 s=once(s,'string url = Origin + Prefix + "index.html";\n            string profile = Path.Combine(AppData, "Browser");','string url = Origin + Prefix + "index.html";\n            WriteRuntimeSession(url);\n            string profile = Path.Combine(AppData, "Browser");')
 s=once(s,'if (owned && mutex != null) mutex.ReleaseMutex();','if (owned && !String.IsNullOrEmpty(RuntimeSessionPath)) try { File.Delete(RuntimeSessionPath); } catch { }\n            if (owned && mutex != null) mutex.ReleaseMutex();')
 helper_anchor='''    // Fixed USGS JPEG adapter. Never accepts a URL, credentials, or a LAN camera address.'''
 if 'static bool TryReopenRunningWindow()' not in s:
  helpers='''    static void WriteRuntimeSession(string url)
    {
        if (String.IsNullOrEmpty(RuntimeSessionPath)) return;
        string temp=RuntimeSessionPath+"."+Guid.NewGuid().ToString("N")+".tmp";
        File.WriteAllText(temp,url,Utf8);
        if(File.Exists(RuntimeSessionPath)){try{File.Replace(temp,RuntimeSessionPath,null);}catch{File.Delete(RuntimeSessionPath);File.Move(temp,RuntimeSessionPath);}}
        else File.Move(temp,RuntimeSessionPath);
    }

    static bool TryReopenRunningWindow()
    {
        try {
            if(String.IsNullOrEmpty(RuntimeSessionPath)||!File.Exists(RuntimeSessionPath)||new FileInfo(RuntimeSessionPath).Length>1024)return false;
            string raw=File.ReadAllText(RuntimeSessionPath,Utf8).Trim(); Uri uri;
            if(!Uri.TryCreate(raw,UriKind.Absolute,out uri))return false;
            if(!String.Equals(uri.Scheme,"http",StringComparison.Ordinal)||!String.Equals(uri.Host,"127.0.0.1",StringComparison.Ordinal)||uri.Port<1||uri.Port>65535)return false;
            if(!String.IsNullOrEmpty(uri.UserInfo)||!String.IsNullOrEmpty(uri.Query)||!String.IsNullOrEmpty(uri.Fragment)||!Regex.IsMatch(uri.AbsolutePath,@"^/[a-f0-9]{32}/index\.html$",RegexOptions.CultureInvariant))return false;
            string edge=FindEdge(); if(edge==null)return false;
            string profile=Path.Combine(AppData,"Browser");
            ProcessStartInfo start=new ProcessStartInfo(edge,"--app=\\\""+uri.AbsoluteUri+"\\\" --user-data-dir=\\\""+profile+"\\\" --no-first-run --no-default-browser-check --window-size=1600,1000");
            start.UseShellExecute=false; return Process.Start(start)!=null;
        } catch(Exception ex) { Log("Existing-window restore failed: "+ex.GetType().Name); return false; }
    }

'''
  s=once(s,helper_anchor,helpers+helper_anchor)
 s=once(s,"""            while (!Stopping) {
                double idleMinutes=new TimeSpan(DateTime.UtcNow.Ticks - Interlocked.Read(ref LastHeartbeat)).TotalMinutes;
                if ((!WindowHidden && idleMinutes > 5) || (WindowHidden && idleMinutes > 480)) break;""","""            while (!Stopping) {
                long nowTicks=DateTime.UtcNow.Ticks,closeAfter=Interlocked.Read(ref CloseAfterTicks),hiddenSince=Interlocked.Read(ref HiddenSinceTicks);
                if(closeAfter>0&&nowTicks>=closeAfter)break;
                if(closeAfter==0&&WindowHidden&&hiddenSince>0&&new TimeSpan(nowTicks-hiddenSince).TotalHours>12)break;
                if(closeAfter==0&&!WindowHidden&&new TimeSpan(nowTicks-Interlocked.Read(ref LastHeartbeat)).TotalMinutes>5)break;""")
 s=once(s,'if (!localHeader && !(rel == "api/state" && (origin == Origin || samePage))) { Error(stream,403,"Local action header required"); return; }','if (!localHeader && !((rel == "api/state" || rel == "api/lifecycle") && (origin == Origin || samePage))) { Error(stream,403,"Local action header required"); return; }')
 hb='            if (rel == "api/heartbeat" && method == "GET") { SendJson(stream,"{\\"ok\\":true}"); return; }'
 if 'rel == "api/lifecycle"' not in s:
  block='''            if (rel == "api/lifecycle" && method == "POST") { RequireType(headers,"application/json"); Dictionary<string,object> lifecycle=Json().DeserializeObject(Utf8.GetString(body)) as Dictionary<string,object>; object rawState; if(lifecycle==null||!lifecycle.TryGetValue("state",out rawState)||!(rawState is string))throw new InvalidDataException("Invalid lifecycle state."); string lifecycleState=(string)rawState; if(lifecycleState=="visible"){WindowHidden=false;Interlocked.Exchange(ref HiddenSinceTicks,0);Interlocked.Exchange(ref LastHeartbeat,DateTime.UtcNow.Ticks);} else if(lifecycleState=="hidden"){WindowHidden=true;Interlocked.Exchange(ref HiddenSinceTicks,DateTime.UtcNow.Ticks);} else if(lifecycleState=="closing"){Interlocked.Exchange(ref CloseAfterTicks,DateTime.UtcNow.AddSeconds(2).Ticks);} else throw new InvalidDataException("Unknown lifecycle state."); SendJson(stream,"{\\"ok\\":true}"); return; }
'''
  s=once(s,hb,block+hb)
 if 'rel == "src/power-controls.css"' not in s:s=once(s,'rel == "src/ui-refinement.css" ||','rel == "src/ui-refinement.css" || rel == "src/power-controls.css" ||')
 return s
edit('native/AtlasHost.cs',native)

edit('build/Build-OwnerPreview.ps1',lambda s:s if "'src/power-controls.css'" in s else once(s,"'src/cameras.js','src/cameras.css','src/ui-directions.js','src/ui-directions.css','src/ui-refinement.css',","'src/cameras.js','src/cameras.css','src/ui-directions.js','src/ui-directions.css','src/ui-refinement.css','src/power-controls.css',"))
edit('build/Build-Store.ps1',lambda s:s if "'src/power-controls.css'" in s else once(s,"'src/ui-directions.js','src/ui-directions.css','src/ui-refinement.css',","'src/ui-directions.js','src/ui-directions.css','src/ui-refinement.css','src/power-controls.css',"))

def next_ui(s):
 if 'https://svs.gsfc.nasa.gov/vis/a000000/a002900/a002915/bluemarble-2048.png' in s:return s
 return once(s,"page.on('request',lambda r:external.append(r.url) if not r.url.startswith(('http://127.0.0.1:','data:','blob:')) else None)","page.on('request',lambda r:external.append(r.url) if not (r.url.startswith(('http://127.0.0.1:','data:','blob:')) or r.url=='https://svs.gsfc.nasa.gov/vis/a000000/a002900/a002915/bluemarble-2048.png') else None)")
edit('tests/next_ui_test.py',next_ui)
print('Integrated red shutdown, minimize-safe lifecycle, safe second-launch reopen, frozen shutdown map persistence, and exact NASA-basemap CI allowance.')
