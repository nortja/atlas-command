"""Integrate compact weather ribbon, photographic Earth presentation, clearer currents, and curated site expansion.
Development/owner-preview only. No Store submission, signing, background service, or new telemetry.
"""
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
NASA='https://svs.gsfc.nasa.gov/vis/a000000/a002900/a002915/bluemarble-2048.png'

def edit(path,fn):
 p=ROOT/path;s=p.read_text('utf-8');n=fn(s)
 if n!=s:p.write_text(n,encoding='utf-8',newline='\n')

def before(s,anchor,text):
 if text in s:return s
 if s.count(anchor)!=1:raise RuntimeError('HD visual integration anchor mismatch: '+anchor[:100])
 return s.replace(anchor,text+anchor,1)

def repl(s,a,b):
 if b in s:return s
 if s.count(a)!=1:raise RuntimeError('HD visual replacement mismatch: '+a[:100])
 return s.replace(a,b,1)

for path in ['app/index.html','app/workspace-preview.html']:
 def entry(s):
  s=s.replace("img-src 'self' blob: data:;","img-src 'self' blob: data: https://svs.gsfc.nasa.gov;")
  s=before(s,'</head>','<link rel="stylesheet" href="src/weather-ribbon.css"><link rel="stylesheet" href="src/satellite-earth.css">')
  if '<script src="data/site-expansion.js"></script>' not in s:
   s=repl(s,'<script src="data/seed.js"></script>','<script src="data/seed.js"></script><script src="data/site-expansion.js"></script>')
  if '<script src="data/site-expansion-r5.js"></script>' not in s:
   s=repl(s,'<script src="data/site-expansion.js"></script>','<script src="data/site-expansion.js"></script><script src="data/site-expansion-r5.js"></script>')
  s=before(s,'<script src="src/ui-directions.js"></script>','<script src="src/earth-physical.js"></script><script src="src/weather-ribbon.js"></script><script src="src/satellite-earth.js"></script>')
  s=s.replace('Modern land geometry · visual atmosphere','NASA satellite mosaic · physical Earth · live atmosphere when enabled')
  return s
 edit(path,entry)

def app(s):
 base='state.settings={...defaults.settings,...state.settings};state.settings.weatherUnits=AtlasWeatherUnits.normalize(state.settings.weatherUnits);'
 rev4='state.settings={...defaults.settings,...state.settings};\nif((Number(state.settings.catalogRevision)||0)<4&&Array.isArray(window.ATLAS_SITE_EXPANSION)){const known=new Set(state.sites.map(x=>x.id));for(const raw of window.ATLAS_SITE_EXPANSION){if(known.has(raw.id))continue;try{const site=C.normalizeSite(raw,"bundled-catalog-2026");state.sites.push(site);known.add(site.id);}catch{}}state.settings.catalogRevision=4;}\nstate.settings.weatherUnits=AtlasWeatherUnits.normalize(state.settings.weatherUnits);'
 rev5='state.settings={...defaults.settings,...state.settings};\nif((Number(state.settings.catalogRevision)||0)<5){const known=new Set(state.sites.map(x=>x.id));const batches=[window.ATLAS_SITE_EXPANSION,window.ATLAS_SITE_EXPANSION_R5];for(const batch of batches){if(!Array.isArray(batch))continue;for(const raw of batch){if(known.has(raw.id))continue;try{const site=C.normalizeSite(raw,"bundled-catalog-2026-r5");state.sites.push(site);known.add(site.id);}catch{}}}state.settings.catalogRevision=5;}\nstate.settings.weatherUnits=AtlasWeatherUnits.normalize(state.settings.weatherUnits);'
 if rev5 in s:return s
 if rev4 in s:return s.replace(rev4,rev5,1)
 return repl(s,base,rev5)
edit('app/src/app.js',app)

def currents(s):
 s=s.replace("const alpha=.18+.42*Math.min(1,s.speedKmh/5)*p.z;","const alpha=.27+.62*Math.min(1,s.speedKmh/5)*p.z;")
 s=s.replace("ctx.lineWidth=.65+Math.min(2.2,s.speedKmh*.28);","ctx.lineWidth=.95+Math.min(3,s.speedKmh*.38);")
 s=s.replace("ctx.arc(x,y,1.2+Math.min(1.8,s.speedKmh*.18),0,Math.PI*2);","ctx.arc(x,y,1.6+Math.min(2.4,s.speedKmh*.24),0,Math.PI*2);")
 return s
edit('app/src/ocean-currents.js',currents)

def globe(s):
 if 'if(this.options.photoEarth&&W>=950)' not in s:
  anchor="if(this.appearance&&W>=950){const focus=document.body.classList.contains('globe-focus');this.cy=H*(focus?.54:.66);this.radius=Math.min(H*(focus?.40:H<650?.265:H<1000?.29:.33),W*.248)*this.zoom;}"
  add=anchor+"\n  if(this.options.photoEarth&&W>=950){const focus=document.body.classList.contains('globe-focus');this.cy=H*(focus?.53:.65);this.radius=Math.min(H*(focus?.445:H<650?.315:H<1000?.37:.405),W*.30)*this.zoom;}"
  s=repl(s,anchor,add)
 marker='const sphere=ctx.createRadialGradient'
 if 'ctx.save();ctx.globalAlpha=this.options.photoEarth?.12:1;const sphere=ctx.createRadialGradient' not in s:
  if s.count(marker)!=1:raise RuntimeError('Could not locate globe basemap start.')
  s=s.replace(marker,'ctx.save();ctx.globalAlpha=this.options.photoEarth?.12:1;'+marker,1)
  atmosphere='  if(this.options.atmosphere)'
  if s.count(atmosphere)!=1:raise RuntimeError('Could not locate globe atmosphere boundary.')
  s=s.replace(atmosphere,'  ctx.restore();\n'+atmosphere,1)
 return s
edit('app/src/globe.js',globe)

def native(s):
 s=s.replace("img-src 'self' blob: data:;","img-src 'self' blob: data: https://svs.gsfc.nasa.gov;")
 allow='rel == "src/ui-refinement.css" ||'
 addition='rel == "src/ui-refinement.css" || rel == "src/weather-ribbon.js" || rel == "src/weather-ribbon.css" || rel == "src/earth-physical.js" || rel == "src/satellite-earth.js" || rel == "src/satellite-earth.css" || rel == "data/site-expansion.js" || rel == "data/site-expansion-r5.js" ||'
 if addition not in s:
  old='rel == "src/ui-refinement.css" || rel == "src/weather-ribbon.js" || rel == "src/weather-ribbon.css" || rel == "src/earth-physical.js" || rel == "src/satellite-earth.js" || rel == "src/satellite-earth.css" || rel == "data/site-expansion.js" ||'
  if old in s:s=s.replace(old,addition,1)
  else:s=repl(s,allow,addition)
 return s
edit('native/AtlasHost.cs',native)

def owner(s):
 anchor="'src/weather-desk.js','src/weather-desk.css','src/ocean-currents.js','src/ocean-currents.css','src/site-detail-enhance.js','src/site-detail-enhance.css',"
 if "'data/site-expansion-r5.js'" in s:return s
 existing="'src/weather-ribbon.js','src/weather-ribbon.css','src/earth-physical.js','src/satellite-earth.js','src/satellite-earth.css','data/site-expansion.js',"
 if existing in s:return s.replace(existing,existing[:-1]+",'data/site-expansion-r5.js',",1)
 addition=anchor+"\n 'src/weather-ribbon.js','src/weather-ribbon.css','src/earth-physical.js','src/satellite-earth.js','src/satellite-earth.css','data/site-expansion.js','data/site-expansion-r5.js',"
 return repl(s,anchor,addition)
edit('build/Build-OwnerPreview.ps1',owner)

def store(s):
 anchor="'src/ui-refinement.css'"
 assets=['src/weather-ribbon.js','src/weather-ribbon.css','src/earth-physical.js','src/satellite-earth.js','src/satellite-earth.css','data/site-expansion.js','data/site-expansion-r5.js']
 missing=[x for x in assets if ("'"+x+"'") not in s]
 if missing:
  if anchor not in s:raise RuntimeError('Store runtime anchor missing')
  s=s.replace(anchor,anchor+','+','.join("'"+x+"'" for x in missing),1)
 return s
edit('build/Build-Store.ps1',store)

# Fresh native UI baseline grows from 26 to 75 bundled records after catalog revision 5.
def ui_test(s):
 s=s.replace("assert page.locator('.site-item').count()==26","assert page.locator('.site-item').count()==75")
 s=s.replace("assert page.locator('.site-item').count()==50","assert page.locator('.site-item').count()==75")
 return s
edit('tests/next_ui_test.py',ui_test)

# Keep the real-host smoke test aligned with the curated catalog and tolerate one just-closed Edge socket reset.
def native_smoke(s):
 for n in ['40','50']:
  s=s.replace("document.count('class=\"site-item ') != "+n,"document.count('class=\"site-item ') != 75")
  s=s.replace('did not display its '+n+' bundled catalog records','did not display its 75 bundled catalog records')
  s=s.replace('renders '+n+' bundled catalog records','renders 75 bundled catalog records')
 old="""        connection = http.client.HTTPConnection(parsed.hostname, parsed.port, timeout=12)\n        try:\n            connection.request(method, path, body=body if method == 'POST' else None, headers=headers or {})\n            response = connection.getresponse()\n            return response.status, dict((k.lower(), v) for k, v in response.getheaders()), response.read()\n        finally:\n            connection.close()\n"""
 new="""        for attempt in range(2):\n            connection = http.client.HTTPConnection(parsed.hostname, parsed.port, timeout=12)\n            try:\n                connection.request(method, path, body=body if method == 'POST' else None, headers=headers or {})\n                response = connection.getresponse()\n                return response.status, dict((k.lower(), v) for k, v in response.getheaders()), response.read()\n            except (ConnectionResetError, TimeoutError):\n                if attempt or self.process is None or self.process.poll() is not None:\n                    raise\n                time.sleep(0.2)\n            finally:\n                connection.close()\n        raise AssertionError('Loopback request did not complete after one bounded retry.')\n"""
 old_retry="""        for attempt in range(2):\n            connection = http.client.HTTPConnection(parsed.hostname, parsed.port, timeout=12)\n            try:\n                connection.request(method, path, body=body if method == 'POST' else None, headers=headers or {})\n                response = connection.getresponse()\n                return response.status, dict((k.lower(), v) for k, v in response.getheaders()), response.read()\n            except ConnectionResetError:\n                if attempt or self.process is None or self.process.poll() is not None:\n                    raise\n                time.sleep(0.15)\n            finally:\n                connection.close()\n        raise AssertionError('Loopback request did not complete after one reset retry.')\n"""
 if old_retry in s:s=s.replace(old_retry,new,1)
 elif new not in s:s=repl(s,old,new)
 return s
edit('tests/windows_native_smoke.py',native_smoke)

# The fixed NASA Blue Marble image is the one intentional renderer visual request in ordinary UI tests.
def allow_nasa_in_ui_test(s):
 s=s.replace("not r.url.startswith('http://127.0.0.1:')","not (r.url.startswith('http://127.0.0.1:') or r.url=='"+NASA+"')")
 s=s.replace("not r.url.startswith(('http://127.0.0.1:','blob:','data:'))","not (r.url.startswith(('http://127.0.0.1:','blob:','data:')) or r.url=='"+NASA+"')")
 s=s.replace("not r.url.startswith(('http://127.0.0.1:','data:','blob:'))","not (r.url.startswith(('http://127.0.0.1:','data:','blob:')) or r.url=='"+NASA+"')")
 return s
for test_path in ['tests/weather_units_ui.py','tests/field_cameras_ui.py','tests/windows_webcam_ui.py','tests/experience_ui.py']:
 edit(test_path,allow_nasa_in_ui_test)

def visual_ui(s):
 s=s.replace("assert page.locator('.site-item').count()==40","assert page.locator('.site-item').count()==75")
 s=s.replace("assert page.locator('.site-item').count()==50","assert page.locator('.site-item').count()==75")
 return s
edit('tests/visual_hd_ui.py',visual_ui)

print('Integrated compact weather ribbon, deferred photographic NASA Earth presentation with offline fallback, larger globe, stronger current flow, catalog revision 5 expansion to 75 bundled records, and aligned native/UI preview validation.')
