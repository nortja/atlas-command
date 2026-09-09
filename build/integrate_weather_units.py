"""Reviewed source-worktree integration only. Does not run/install the app or change security policy."""
from pathlib import Path
import hashlib
ROOT=Path(__file__).resolve().parents[1]
def blob(data):
    return hashlib.sha1(b'blob '+str(len(data)).encode()+b'\0'+data).hexdigest()
def once(text,old,new):
    if text.count(old)!=1:raise RuntimeError('Unexpected source anchor: '+old[:100])
    return text.replace(old,new,1)
p=ROOT/'app/src/app.js';data=p.read_bytes()
if blob(data)!='95707ec4208e940ed9d9f0ba27379cdce9a05e9e':
    raise RuntimeError('Development source changed. Review integration rather than overwrite newer work.')
changes={}
s=data.decode('utf-8')
s=once(s,"settings:{origin:'Fresno · FAT',","settings:{weatherUnits:'us',origin:'Fresno · FAT',")
s=once(s,'state.settings={...defaults.settings,...state.settings};','state.settings={...defaults.settings,...state.settings};state.settings.weatherUnits=AtlasWeatherUnits.normalize(state.settings.weatherUnits);')
card='''<div class="info-card" id="weatherUnitsControl"><strong>Weather units</strong><div role="group" aria-label="Temperature and wind units" style="display:flex;flex-wrap:wrap;gap:10px;margin:14px 0"><button type="button" data-weather-unit="us" aria-pressed="false" style="min-height:44px">°F + mph</button><button type="button" data-weather-unit="metric" aria-pressed="false" style="min-height:44px">°C + km/h</button></div><p class="hint">One saved preference for temperature, feels-like, wind and gust displays. Switching units does not change source readings. Live weather feeds are not connected in this build.</p><p data-weather-unit-status role="status" aria-live="polite"></p></div>'''
s=once(s,'<div class="form-grid"><label class="form-field">Animation',card+'<div class="form-grid"><label class="form-field">Animation')
s=once(s," $('#reducedMotion').onchange=", " AtlasWeatherUnits.mountSettings($('#weatherUnitsControl'),window.AtlasWorkspace.weather);\n $('#reducedMotion').onchange=")
s=once(s,'window.AtlasWorkspace=Object.freeze({',"const weatherPreferences=AtlasWeatherUnits.preferenceStore(()=>state.settings.weatherUnits,value=>{state.settings.weatherUnits=value;},flush,()=>window.dispatchEvent(new Event('atlas:weather-units-changed')));\nwindow.AtlasWorkspace=Object.freeze({\n weather:weatherPreferences,")
changes[p]=s
for name in ['app/index.html','app/workspace-preview.html']:
    p=ROOT/name;s=p.read_text('utf-8')
    changes[p]=once(s,'<script src="src/app.js"></script>','<script src="src/weather-units.js"></script><script src="src/app.js"></script>')
p=ROOT/'native/AtlasHost.cs';s=p.read_text('utf-8');changes[p]=once(s,'rel == "src/lidar.js"','rel == "src/weather-units.js" || rel == "src/lidar.js"')
p=ROOT/'build/Build-Store.ps1';s=p.read_text('utf-8');s=once(s,"'src/lidar.js'","'src/weather-units.js','src/lidar.js'")
s=once(s,"'tests/lidar.test.cjs'","'tests/lidar.test.cjs' 'tests/weather-units.test.cjs'");changes[p]=s
for p,text in changes.items():p.write_text(text,encoding='utf-8',newline='\n')
print('Integrated saved weather display units in development source only; no live feeds, install or Store changes.')
