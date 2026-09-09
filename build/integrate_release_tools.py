"""Materialize reviewed camera/refresh code changes on the development worktree only.
Never downloads code at application runtime; never changes Store or endpoint policy.
"""
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
def edit(name,fn):
 p=ROOT/name;s=p.read_text('utf-8');out=fn(s);p.write_text(out,encoding='utf-8',newline='\n')
def once(s,a,b):
 if b in s:return s
 if s.count(a)!=1:raise RuntimeError('Integration anchor mismatch: '+a[:85])
 return s.replace(a,b,1)
for name in ['app/index.html','app/workspace-preview.html']:
 def entry(s):
  s=once(s,'<script src="src/live-weather.js"></script>','<script src="src/data-refresh.js"></script><script src="src/live-weather.js"></script><script src="src/cameras.js"></script>')
  return once(s,'<link rel="stylesheet" href="src/live-weather.css">','<link rel="stylesheet" href="src/live-weather.css"><link rel="stylesheet" href="src/cameras.css">')
 edit(name,entry)
def native(s):
 s=once(s,'            if (rel == "api/heartbeat"', '            if (rel.StartsWith("api/camera/",StringComparison.Ordinal)) { if (method != "POST") { Error(stream,405,"Camera viewing requires an explicit local action"); return; } SendCamera(stream,rel.Substring("api/camera/".Length)); return; }\n            if (rel == "api/heartbeat"')
 s=once(s,'rel == "src/live-weather.css" ||','rel == "src/live-weather.css" || rel == "src/data-refresh.js" || rel == "src/cameras.js" || rel == "src/cameras.css" ||')
 if 'static void SendCamera(' not in s:s=once(s,'    static string FindEdge()', (ROOT/'build/camera-native.fragment.cs').read_text('utf-8')+'\n    static string FindEdge()')
 return s
edit('native/AtlasHost.cs',native)
def application(s):
 s=once(s,' weather:weatherPreferences,',' weather:weatherPreferences,\n cameras:Object.freeze({read:()=>cloneForModule(state.settings.cameraDesk||{}),commit:async value=>{const next=AtlasCameras.preferences(value),before=state.settings.cameraDesk;state.settings.cameraDesk=next;try{await flush();}catch(error){state.settings.cameraDesk=before;throw error;}}}),')
 old='<label class="form-field">Future data-refresh preference<select id="updateCadence">${[[\'manual\',\'Manual\'],[\'daily\',\'Daily / evening\'],[\'hourly\',\'Hourly\']].map(([v,n])=>`<option value="${v}" ${state.settings.updateCadence===v?\'selected\':\'\'}>${n}</option>`).join(\'\')}</select><span class="hint">Preference only. This preference does not schedule research feeds. Live Earth has separate refresh controls; no scheduled task is installed.</span></label>'
 new='<label class="form-field">Data refresh controls<button id="openLiveEarthSettings" type="button">Weather connection & refresh</button><span class="hint">Data can refresh while the app is open. Software updates remain separate Microsoft Store releases.</span></label>'
 s=once(s,old,new)
 old="$('#updateCadence').onchange=e=>{state.settings.updateCadence=e.target.value;save();toast('Preference saved. Automatic online updates are not connected yet.');};"
 new="$('#openLiveEarthSettings').onclick=()=>{$('#dialog').close();$('#liveEarthBtn').click();};"
 return once(s,old,new)
edit('app/src/app.js',application)
def registry(s):
 return once(s,"const MODULES=[", "const MODULES=[\n {id:'cameras',name:'Camera desk',status:'Snapshots & links',detail:'Opt-in USGS periodic snapshots in the app and official NASA/NPS livestream links. No embedded continuous video, arbitrary camera search or recording.'},")
edit('app/src/core.js',registry)
def weather(s):
 s=once(s,"'use strict';\nconst ENDPOINT", "'use strict';\nconst Refresh=typeof module==='object'&&module.exports?require('./data-refresh.js'):window.AtlasDataRefresh;\nconst ENDPOINT")
 s=once(s,"autoIdle:raw?.autoIdle!==false};}","autoIdle:raw?.autoIdle!==false,refresh:Refresh.choice(raw?.refresh)};}")
 s=once(s,"if(!cfg.enabled||!chosen||doc.hidden)return;","if(!cfg.enabled||!chosen||doc.hidden||(!force&&cfg.refresh==='manual'))return;")
 s=once(s,"now-saved.fetchedAt<POINT_TTL","now-saved.fetchedAt<Refresh.interval(cfg.refresh,'point')")
 s=once(s,"async function loadGlobal(){","async function loadGlobal(force=false){")
 s=once(s,"if(!cfg.enabled||!cfg.global||doc.hidden||gridBusy||", "if(!cfg.enabled||!cfg.global||doc.hidden||gridBusy||(!force&&cfg.refresh==='manual')||")
 s=once(s,"now-cache.grid.fetchedAt<GRID_TTL", "now-cache.grid.fetchedAt<(force?GRID_TTL:Refresh.interval(cfg.refresh,'global'))")
 old="'<p>Local conditions refresh every 20 minutes. The 288-point global model grid refreshes every 3 hours while visible. The globe is a stylized view of sampled model data—not satellite imagery, radar, measured storm boundaries or lightning strikes.</p>"
 new="'<label class=\"form-field\">Weather data refresh<select id=\"earthRefreshPolicy\">'+Object.entries(Refresh.PROFILES).map(([id,p])=>'<option value=\"'+id+'\" '+(cfg.refresh===id?'selected':'')+'>'+p.label+'</option>').join('')+'</select></label><p id=\"earthRefreshDetail\">'+Refresh.profile(cfg.refresh).detail+'</p><p>Refreshes run only while Atlas is open, visible and weather is enabled. Nothing installs a background service or downloads new application code. Daily mode can leave weather stale; timestamps remain visible.</p><p>The globe is a stylized view of sampled model data—not satellite imagery, radar, measured storm boundaries or lightning strikes.</p>"
 s=once(s,old,new)
 s=once(s,'<button id="earthClear">Clear cached weather</button>','<button id="earthRefreshNow">Refresh weather now</button><button id="earthClear">Clear cached weather</button>')
 s=once(s,"autoIdle:$('#earthIdle').checked};controlsBusy", "autoIdle:$('#earthIdle').checked,refresh:Refresh.choice($('#earthRefreshPolicy').value)};controlsBusy")
 s=once(s,"if(!cfg.enabled){pointAbort?.abort();gridAbort?.abort();wake();}else if(!cfg.global)gridAbort?.abort();", "if(!cfg.enabled||cfg.refresh==='manual'){pointAbort?.abort();gridAbort?.abort();wake();}else if(!cfg.global)gridAbort?.abort();")
 anchor="  $('#earthClear').onclick=async()=>"
 insert="  $('#earthRefreshPolicy').onchange=()=>{$('#earthRefreshDetail').textContent=Refresh.profile($('#earthRefreshPolicy').value).detail;};\n  $('#earthRefreshNow').onclick=()=>{if(!cfg.enabled){$('#earthSaveStatus').textContent='Save an enabled weather connection first.';return;}loadPoint(true);loadGlobal(true);$('#earthSaveStatus').textContent='Refresh requested. Global coverage stays rate-limited to one successful retrieval per 3 hours.';};\n"+anchor
 return once(s,anchor,insert)
edit('app/src/live-weather.js',weather)
def recipe(s):
 s=once(s,"'src/live-weather.css'", "'src/live-weather.css','src/data-refresh.js','src/cameras.js','src/cameras.css'")
 s=once(s,"'tests/live-weather.test.cjs'", "'tests/live-weather.test.cjs' 'tests/release-tools.test.cjs'")
 return s
edit('build/Build-Store.ps1',recipe)
print('Integrated camera desk and real refresh controls in development source only.')
