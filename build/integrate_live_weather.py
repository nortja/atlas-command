"""Integrate Live Earth only in the separately versioned development worktree."""
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
def edit(name,old,new):
 p=ROOT/name;s=p.read_text('utf-8')
 if new in s:return
 if old not in s:raise RuntimeError('Unexpected source shape: '+name)
 p.write_text(s.replace(old,new,1),encoding='utf-8',newline='\n')
for name in ['app/index.html','app/workspace-preview.html','native/AtlasHost.cs']:
 edit(name,"connect-src 'self';","connect-src 'self' https://api.open-meteo.com;")
for name in ['app/index.html','app/workspace-preview.html']:
 edit(name,'<link rel="stylesheet" href="src/next-ui.css">','<link rel="stylesheet" href="src/next-ui.css"><link rel="stylesheet" href="src/live-weather.css">')
 edit(name,'<script src="src/app.js"></script>','<script src="src/live-weather.js"></script><script src="src/app.js"></script>')
edit('native/AtlasHost.cs','rel == "src/weather-units.js"','rel == "src/weather-units.js" || rel == "src/live-weather.js" || rel == "src/live-weather.css"')
edit('build/Build-Store.ps1',"'src/weather-units.js',","'src/weather-units.js','src/live-weather.js','src/live-weather.css',")
edit('build/Build-Store.ps1',"'tests/weather-units.test.cjs'\n","'tests/weather-units.test.cjs' 'tests/live-weather.test.cjs'\n")
edit('app/src/globe.js',"  ctx.strokeStyle='#8bdded9a';", "  if(this.environmentRenderer){this.ctx.save();try{this.environmentRenderer(this,t);}finally{this.ctx.restore();}}\n  ctx.strokeStyle='#8bdded9a';")
edit('app/src/app.js',"renderCatalog();renderDossier();renderPlan();window.dispatchEvent(new Event('atlas:changed'));}","renderCatalog();renderDossier();renderPlan();window.dispatchEvent(new Event('atlas:changed'));window.dispatchEvent(new Event('atlas:selection'));}")
edit('app/src/app.js',"if(mode==='mission')globe.options.atmosphere=false;renderLayers();}","if(mode==='mission')globe.options.atmosphere=false;renderLayers();window.dispatchEvent(new Event('atlas:mode'));}")
edit('app/src/app.js',"year=Math.round(v);updateVisible();}","year=Math.round(v);updateVisible();window.dispatchEvent(new Event('atlas:era'));}")
edit('app/src/app.js'," weather:weatherPreferences,",''' weather:weatherPreferences,
 liveEarth:Object.freeze({
  selection:()=>selected?cloneForModule({id:selected.id,name:selected.name,lat:selected.lat,lon:selected.lon}):null,
  context:()=>({historical:year!==currentYear,reduced:state.settings.reducedMotion,spin:globe.spin,mode}),
  rotation:value=>{globe.spin=value===true&&!state.settings.reducedMotion;if(globe.spin){globe.hover=null;globe.target=null;}},
  renderer:fn=>{if(typeof fn!=='function')throw Error('Bundled renderer required.');globe.environmentRenderer=fn;},
  read:()=>cloneForModule(state.settings.liveEarth||{config:{enabled:false},cache:{points:{},grid:null}}),
  commit:async value=>{
   const next=AtlasLiveWeather.snapshot(value);
   const before=state.settings.liveEarth;state.settings.liveEarth=next;
   try{await flush();}catch(error){state.settings.liveEarth=before;throw error;}
  }
 }),''')
edit('app/src/app.js','Weather, travel, scientific field models, raw LiDAR viewing and booking are not connected.','Live Earth provides optional Open-Meteo model weather for personal non-commercial use. It sends requested coordinates and IP address to that provider only after opt-in. Travel, historical scientific field models, raw LiDAR viewing and booking are not connected.')
edit('app/src/app.js','No feed service or scheduled task is installed.','This preference does not schedule research feeds. Live Earth has separate refresh controls; no scheduled task is installed.')
print('Live Earth integrated in development only. No installer, publication, or endpoint policy changes.')
