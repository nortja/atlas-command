"""Integrate compact weather ribbon, photographic Earth presentation, clearer currents, and curated site expansion.
Development/owner-preview only. No Store submission, signing, background service, or new telemetry.
"""
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]

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
  s=repl(s,'<script src="data/seed.js"></script>','<script src="data/seed.js"></script><script src="data/site-expansion.js"></script>')
  s=before(s,'<script src="src/ui-directions.js"></script>','<script src="src/earth-physical.js"></script><script src="src/weather-ribbon.js"></script><script src="src/satellite-earth.js"></script>')
  s=s.replace('Modern land geometry · visual atmosphere','NASA satellite mosaic · physical Earth · live atmosphere when enabled')
  return s
 edit(path,entry)

def app(s):
 anchor='state.settings={...defaults.settings,...state.settings};state.settings.weatherUnits=AtlasWeatherUnits.normalize(state.settings.weatherUnits);'
 block='state.settings={...defaults.settings,...state.settings};\nif((Number(state.settings.catalogRevision)||0)<4&&Array.isArray(window.ATLAS_SITE_EXPANSION)){const known=new Set(state.sites.map(x=>x.id));for(const raw of window.ATLAS_SITE_EXPANSION){if(known.has(raw.id))continue;try{const site=C.normalizeSite(raw,"bundled-catalog-2026");state.sites.push(site);known.add(site.id);}catch{}}state.settings.catalogRevision=4;}\nstate.settings.weatherUnits=AtlasWeatherUnits.normalize(state.settings.weatherUnits);'
 s=repl(s,anchor,block)
 return s
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
 addition='rel == "src/ui-refinement.css" || rel == "src/weather-ribbon.js" || rel == "src/weather-ribbon.css" || rel == "src/earth-physical.js" || rel == "src/satellite-earth.js" || rel == "src/satellite-earth.css" || rel == "data/site-expansion.js" ||'
 if addition not in s:s=repl(s,allow,addition)
 return s
edit('native/AtlasHost.cs',native)

def owner(s):
 anchor="'src/weather-desk.js','src/weather-desk.css','src/ocean-currents.js','src/ocean-currents.css','src/site-detail-enhance.js','src/site-detail-enhance.css',"
 addition=anchor+"\n 'src/weather-ribbon.js','src/weather-ribbon.css','src/earth-physical.js','src/satellite-earth.js','src/satellite-earth.css','data/site-expansion.js',"
 return repl(s,anchor,addition)
edit('build/Build-OwnerPreview.ps1',owner)

def store(s):
 anchor="'src/ui-refinement.css'"
 assets=['src/weather-ribbon.js','src/weather-ribbon.css','src/earth-physical.js','src/satellite-earth.js','src/satellite-earth.css','data/site-expansion.js']
 missing=[x for x in assets if ("'"+x+"'") not in s]
 if missing:
  if anchor not in s:raise RuntimeError('Store runtime anchor missing')
  s=s.replace(anchor,anchor+','+','.join("'"+x+"'" for x in missing),1)
 return s
edit('build/Build-Store.ps1',store)

# Fresh native UI baseline grows from 26 to 50 bundled records after catalog revision 4.
def ui_test(s):
 return repl(s,"assert page.locator('.site-item').count()==26","assert page.locator('.site-item').count()==50")
edit('tests/next_ui_test.py',ui_test)

# Keep the real-host smoke test aligned with the curated catalog and tolerate one just-closed Edge socket reset.
def native_smoke(s):
 s=s.replace("document.count('class=\"site-item ') != 40","document.count('class=\"site-item ') != 50")
 s=s.replace('did not display its 40 bundled catalog records','did not display its 50 bundled catalog records')
 s=s.replace('renders 40 bundled catalog records','renders 50 bundled catalog records')
 old="""        connection = http.client.HTTPConnection(parsed.hostname, parsed.port, timeout=12)\n        try:\n            connection.request(method, path, body=body if method == 'POST' else None, headers=headers or {})\n            response = connection.getresponse()\n            return response.status, dict((k.lower(), v) for k, v in response.getheaders()), response.read()\n        finally:\n            connection.close()\n"""
 new="""        for attempt in range(2):\n            connection = http.client.HTTPConnection(parsed.hostname, parsed.port, timeout=12)\n            try:\n                connection.request(method, path, body=body if method == 'POST' else None, headers=headers or {})\n                response = connection.getresponse()\n                return response.status, dict((k.lower(), v) for k, v in response.getheaders()), response.read()\n            except ConnectionResetError:\n                if attempt or self.process is None or self.process.poll() is not None:\n                    raise\n                time.sleep(0.15)\n            finally:\n                connection.close()\n        raise AssertionError('Loopback request did not complete after one reset retry.')\n"""
 if new not in s:s=repl(s,old,new)
 return s
edit('tests/windows_native_smoke.py',native_smoke)

print('Integrated compact weather ribbon, deferred photographic NASA Earth presentation with offline fallback, larger globe, stronger current flow, catalog revision 4 expansion to 50 bundled records, and aligned native preview validation.')
