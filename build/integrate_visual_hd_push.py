"""Integrate always-open weather ribbon, physical Earth detail, clearer currents, and curated site expansion.
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
  s=before(s,'</head>','<link rel="stylesheet" href="src/weather-ribbon.css">')
  s=repl(s,'<script src="data/seed.js"></script>','<script src="data/seed.js"></script><script src="data/site-expansion.js"></script>')
  s=before(s,'<script src="src/ui-directions.js"></script>','<script src="src/earth-physical.js"></script><script src="src/weather-ribbon.js"></script>')
  s=s.replace('Modern land geometry · visual atmosphere','Physical Earth · relief, rivers & lakes · live atmosphere when enabled')
  return s
 edit(path,entry)

def app(s):
 anchor='state.settings={...defaults.settings,...state.settings};state.settings.weatherUnits=AtlasWeatherUnits.normalize(state.settings.weatherUnits);'
 block='state.settings={...defaults.settings,...state.settings};\nif((Number(state.settings.catalogRevision)||0)<3&&Array.isArray(window.ATLAS_SITE_EXPANSION)){const known=new Set(state.sites.map(x=>x.id));for(const raw of window.ATLAS_SITE_EXPANSION){if(known.has(raw.id))continue;try{const site=C.normalizeSite(raw,"bundled-catalog-2026");state.sites.push(site);known.add(site.id);}catch{}}state.settings.catalogRevision=3;}\nstate.settings.weatherUnits=AtlasWeatherUnits.normalize(state.settings.weatherUnits);'
 s=repl(s,anchor,block)
 return s
edit('app/src/app.js',app)

def currents(s):
 s=s.replace("const alpha=.18+.42*Math.min(1,s.speedKmh/5)*p.z;","const alpha=.24+.58*Math.min(1,s.speedKmh/5)*p.z;")
 s=s.replace("ctx.lineWidth=.65+Math.min(2.2,s.speedKmh*.28);","ctx.lineWidth=.85+Math.min(2.7,s.speedKmh*.34);")
 s=s.replace("ctx.arc(x,y,1.2+Math.min(1.8,s.speedKmh*.18),0,Math.PI*2);","ctx.arc(x,y,1.5+Math.min(2.2,s.speedKmh*.22),0,Math.PI*2);")
 return s
edit('app/src/ocean-currents.js',currents)

def native(s):
 allow='rel == "src/ui-refinement.css" ||'
 addition='rel == "src/ui-refinement.css" || rel == "src/weather-ribbon.js" || rel == "src/weather-ribbon.css" || rel == "src/earth-physical.js" || rel == "data/site-expansion.js" ||'
 if addition not in s:s=repl(s,allow,addition)
 return s
edit('native/AtlasHost.cs',native)

def owner(s):
 anchor="'src/weather-desk.js','src/weather-desk.css','src/ocean-currents.js','src/ocean-currents.css','src/site-detail-enhance.js','src/site-detail-enhance.css',"
 addition=anchor+"\n 'src/weather-ribbon.js','src/weather-ribbon.css','src/earth-physical.js','data/site-expansion.js',"
 return repl(s,anchor,addition)
edit('build/Build-OwnerPreview.ps1',owner)

def store(s):
 anchor="'src/ui-refinement.css'"
 assets=['src/weather-ribbon.js','src/weather-ribbon.css','src/earth-physical.js','data/site-expansion.js']
 missing=[x for x in assets if ("'"+x+"'") not in s]
 if missing:
  if anchor not in s:raise RuntimeError('Store runtime anchor missing')
  s=s.replace(anchor,anchor+','+','.join("'"+x+"'" for x in missing),1)
 return s
edit('build/Build-Store.ps1',store)
print('Integrated always-open seven-day weather ribbon, physical Earth reference detail, stronger current flow, and catalog revision 3 expansion.')
