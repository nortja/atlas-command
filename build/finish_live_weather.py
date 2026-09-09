"""Follow-up fixes from real-weather QA. No endpoint/OS security changes."""
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
def edit(name,old,new):
 p=ROOT/name;s=p.read_text('utf-8')
 if new in s:return
 if old not in s:raise RuntimeError('Unexpected source shape: '+name)
 p.write_text(s.replace(old,new,1),encoding='utf-8',newline='\n')
edit('app/src/core.js',"updatedAt:new Date().toISOString(),", "updatedAt:typeof raw.updatedAt==='string'&&raw.updatedAt.length<=64&&Number.isFinite(Date.parse(raw.updatedAt))?raw.updatedAt:new Date().toISOString(),")
edit('app/src/app.js',"C.normalizeSite({...s,...raw,origin:s?.origin", "C.normalizeSite({...s,...raw,updatedAt:new Date().toISOString(),origin:s?.origin")
edit('app/src/core.js',"{id:'weather',name:'Live Earth & updates',status:'Not connected',detail:'Provider contracts, source timestamps and safe sync are future work. The atmosphere is a visual effect, not a weather feed.'}","{id:'weather',name:'Live Earth & updates',status:'Opt-in feed',detail:'Open-Meteo model weather, selected-area card and cached global samples after consent. Personal non-commercial use. No satellite imagery, measured lightning or official alerts.'}")
edit('app/src/core.js',"Approximate present-day lunar phase. Historical stars, eclipses and precise ephemerides require a validated engine.","Approximate present-day solar day/night and lunar phase, plus provider-calculated sunrise/sunset. Historical stars, eclipses and precise ephemerides are not connected.")
edit('tests/core.test.cjs',"C.MODULES.find(m=>m.id==='weather').status,'Not connected'", "C.MODULES.find(m=>m.id==='weather').status,'Opt-in feed'")
edit('native/AtlasHost.cs','// No external dependencies. All app traffic stays on an ephemeral loopback port.','// The native helper uses loopback IPC. Optional renderer weather requests use a fixed HTTPS provider after consent.')
edit('native/AtlasHost.cs','Started local host; Development 1.1. No online feed or updater is installed.','Started local host; development 1.1. Optional renderer weather is user-controlled. No executable updater or scheduled task is installed.')
edit('app/src/live-weather.js',"if(now-lastPointAttempt<2500){card();return;}","if(now-lastPointAttempt<2500){win.clearTimeout(selectionTimer);selectionTimer=win.setTimeout(()=>loadPoint(force),2500-(now-lastPointAttempt)+25);card();return;}")
edit('app/src/live-weather.js',"!cfg.enabled?'LIVE EARTH OFF · calculated day / night':gridBusy?", "!cfg.enabled?'LIVE EARTH OFF · calculated day / night':!cfg.global?'GLOBAL WEATHER OFF · selected-area weather enabled':gridBusy?")
edit('app/src/live-weather.js',"Weather cache cleared. Saved research is unchanged.","Weather cache cleared. Saved research is unchanged. Earlier backups and exports are not deleted.")
edit('tests/live_weather_ui.py',"import hashlib,json,os,time", "import hashlib,json,os,time,math")
edit('tests/live_weather_ui.py',"str(round(pt['temperatureC']))+' °C'", "str(math.floor(pt['temperatureC']+0.5))+' °C'")
edit('tests/live_weather_ui.py',"   page.wait_for_timeout(500);page.screenshot(path=str(OUT/'01-Live-Earth-Observatory.png'))", "   page.locator('#toast').wait_for(state='hidden');page.wait_for_timeout(500);page.screenshot(path=str(OUT/'01-Live-Earth-Observatory.png'))")
edit('tests/live_weather_ui.py',"   page.locator('#exactYear').fill('-9000');", "   page.mouse.move(0,0)\n   wait(lambda:page.locator('body').evaluate('(n)=>n.classList.contains(\"earth-idle\")'),100)\n   assert page.evaluate('AtlasWorkspace.isGlobeFocused() && AtlasWorkspace.liveEarth.context().spin')\n   page.screenshot(path=str(OUT/'05-Idle-Living-Globe.png'))\n   page.mouse.move(25,25)\n   wait(lambda:not page.locator('body').evaluate('(n)=>n.classList.contains(\"earth-idle\")'))\n   assert not page.evaluate('AtlasWorkspace.isGlobeFocused()')\n   passed('Real idle timeout enters rotating globe focus and pointer activity restores the prior workspace')\n   page.locator('#exactYear').fill('-9000');")
p=ROOT/'tests/core.test.cjs';s=p.read_text('utf-8')
if 'normalization preserves saved edit timestamps' not in s:
 s+="\ntest('normalization preserves saved edit timestamps across repeated reloads',()=>{const s=C.normalizeSite({...base,createdAt:'2025-06-01T12:00:00.000Z',updatedAt:'2025-06-10T09:30:00.000Z'});assert.equal(s.updatedAt,'2025-06-10T09:30:00.000Z');assert.deepEqual(C.normalizeSite(C.normalizeSite(s)),s);});\n"
 s+="test('malformed edit timestamp cannot persist as a claimed valid date',()=>{for(const updatedAt of [null,{},'not a date','x'.repeat(65)]){const s=C.normalizeSite({...base,updatedAt});assert(Number.isFinite(Date.parse(s.updatedAt)));}});\n"
 s+="test('actual site edits explicitly advance their timestamp',()=>{const text=require('node:fs').readFileSync(require('node:path').join(__dirname,'../app/src/app.js'),'utf8');assert(text.includes('C.normalizeSite({...s,...raw,updatedAt:new Date().toISOString()'));});\n"
 p.write_text(s,encoding='utf-8',newline='\n')
print('Fixed reload timestamp mutation, module disclosure, and refresh pacing; kept strict data-preservation test.')
