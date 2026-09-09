"""Real public weather retrieval and native persistence on a disposable Windows runner.
No personal library data is used. Fault tests explicitly block requests in this test
context, not the app's CSP or any endpoint security policy. No installer produced.
"""
import hashlib,json,os,time,math
from pathlib import Path
from urllib.parse import urlparse,parse_qs
from playwright.sync_api import sync_playwright,expect
from windows_native_smoke import NativeSmoke
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'live-weather-output'
def main():
 if os.name!='nt' or os.environ.get('GITHUB_ACTIONS')!='true' or os.environ.get('RUNNER_ENVIRONMENT')!='github-hosted':raise RuntimeError('Disposable Windows runner required.')
 exe=Path(os.environ['ATLAS_SMOKE_EXE']).resolve(strict=True);temp=Path(os.environ['RUNNER_TEMP']).resolve(strict=True)
 if not exe.is_relative_to(temp):raise RuntimeError('Expected disposable executable.')
 appdata=Path(NativeSmoke.powershell('[Environment]::GetFolderPath([Environment+SpecialFolder]::LocalApplicationData)'))/'AtlasCommand'
 if appdata.exists():raise RuntimeError('Refusing an existing user profile.')
 host=NativeSmoke(exe,appdata,temp);OUT.mkdir(exist_ok=True);checks=[];errors=[];external=[];responses=[];live=False;success=False;page=None
 def passed(s):checks.append(s);print('PASS:',s,flush=True)
 def wait(fn,seconds=40):
  end=time.monotonic()+seconds
  while time.monotonic()<end:
   if fn():return
   page.wait_for_timeout(300)
  raise AssertionError('Timed out waiting for live-weather state: '+page.locator('#weatherCard').inner_text()[:1200])
 try:
  host.start()
  with sync_playwright() as pw:
   browser=pw.chromium.launch(executable_path=host.edge,headless=True)
   context=browser.new_context(viewport={'width':2560,'height':1440})
   page=context.new_page();page.on('pageerror',lambda e:errors.append(str(e)))
   page.on('request',lambda r:external.append(r.url) if not r.url.startswith(('http://127.0.0.1:','data:','blob:')) else None)
   page.on('response',lambda r:responses.append({'status':r.status,'provider':'Open-Meteo'}) if r.url.startswith('https://api.open-meteo.com/') else None)
   page.goto(host.url);page.locator('#weatherCard').wait_for();page.wait_for_timeout(750)
   assert not external,external
   assert page.locator('#weatherCard').get_attribute('data-status')=='OFF'
   assert page.evaluate('AtlasWorkspace.weather.getUnits()')=='us'
   before=page.evaluate('JSON.stringify(AtlasWorkspace.sites.list())')
   passed('No provider connection before consent; Fahrenheit/mph and today label are visible')
   page.locator('#liveEarthBtn').click();expect(page.locator('#liveEarthSettings')).to_contain_text('IP address')
   page.locator('#earthEnabled').check();page.locator('#earthApply').click();page.locator('#liveEarthSettings').wait_for(state='hidden')
   wait(lambda:page.locator('#weatherCard').get_attribute('data-status')=='UPDATED',60)
   wait(lambda:page.evaluate('AtlasWorkspace.liveEarth.read().cache.grid?.samples?.length||0')==288,100)
   snap=page.evaluate('AtlasWorkspace.liveEarth.read()');assert snap['config']['enabled']
   assert len(snap['cache']['points'])==1
   pt=next(iter(snap['cache']['points'].values()));assert pt['temperatureC'] is not None
   assert all(urlparse(u).netloc=='api.open-meteo.com' for u in external),external
   assert all('name' not in parse_qs(urlparse(u).query) and 'notes' not in parse_qs(urlparse(u).query) for u in external)
   assert all(r['status']==200 for r in responses),responses
   live=True;passed('Real Open-Meteo point response and all 288 global model samples retrieved through the browser security boundary')
   passed('Only fixed weather parameters and rounded coordinates sent; no site names, notes, files or credentials')
   assert host.read_state()['settings']['liveEarth']['cache']['grid']['samples']==snap['cache']['grid']['samples']
   assert page.evaluate('JSON.stringify(AtlasWorkspace.sites.list())')==before
   passed('Full model cache saved to native disk without modifying research records')
   page.locator('#workspacePresets').click();page.locator('[data-preset="research"]').click();page.locator('#workspaceChooser').wait_for(state='hidden')
   page.locator('#toast').wait_for(state='hidden');page.wait_for_timeout(500);page.screenshot(path=str(OUT/'01-Live-Earth-Observatory.png'))
   page.locator('#weatherCard').screenshot(path=str(OUT/'02-Selected-Area-Weather.png'))
   calls=len(external);page.locator('#wxUnits').click();expect(page.locator('#wxUnits')).to_contain_text('°C')
   assert page.evaluate('AtlasWorkspace.weather.getUnits()')=='metric'
   assert page.locator('.wx-now>strong').inner_text()==str(math.floor(pt['temperatureC']+0.5))+' °C'
   assert len(external)==calls
   passed('Weather-card unit toggle reformats cached values without another provider request')
   for width,height in [(1366,768),(1920,1080),(3440,1440),(820,1180)]:
    page.set_viewport_size({'width':width,'height':height});page.wait_for_timeout(350)
    assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+1'),'Horizontal overflow '+str(width)
    if width==1366:page.screenshot(path=str(OUT/'03-Laptop-Live-Weather.png'))
   page.set_viewport_size({'width':2560,'height':1440})
   passed('Weather card and controls remain within laptop, desktop, ultrawide and compact page bounds')
   page.mouse.move(0,0)
   wait(lambda:page.locator('body').evaluate('(n)=>n.classList.contains("earth-idle")'),100)
   assert page.evaluate('AtlasWorkspace.isGlobeFocused() && AtlasWorkspace.liveEarth.context().spin')
   page.screenshot(path=str(OUT/'05-Idle-Living-Globe.png'))
   page.mouse.move(25,25)
   wait(lambda:not page.locator('body').evaluate('(n)=>n.classList.contains("earth-idle")'))
   assert not page.evaluate('AtlasWorkspace.isGlobeFocused()')
   passed('Real idle timeout enters rotating globe focus and pointer activity restores the prior workspace')
   page.locator('#exactYear').fill('-9000');page.locator('#exactYear').press('Tab');expect(page.locator('#earthStatus')).to_contain_text('HISTORICAL VIEW')
   expect(page.locator('#weatherCard .wx-heading')).to_contain_text('TODAY')
   page.locator('#presentBtn').click();expect(page.locator('#earthStatus')).not_to_contain_text('HISTORICAL VIEW')
   passed('Historical timeline suppresses today’s globe overlays while the card remains explicitly today')
   selected=page.evaluate('AtlasWorkspace.liveEarth.selection().id')
   page.locator('.site-item').last.click()
   wait(lambda:page.evaluate('AtlasWorkspace.liveEarth.selection().id')!=selected)
   wait(lambda:page.locator('#weatherCard').get_attribute('data-status')=='UPDATED',60)
   newpt=page.evaluate('(()=>{const s=AtlasWorkspace.liveEarth.selection(),k=AtlasLiveWeather.key(s);return AtlasWorkspace.liveEarth.read().cache.points[k]})()')
   assert newpt and newpt['lat']!=pt['lat']
   passed('Highlighted-site change replaces the card with that area’s actual model sample')
   page.route('https://api.open-meteo.com/**',lambda route:route.abort('internetdisconnected'))
   page.wait_for_timeout(3000);page.locator('#wxRefresh').click();wait(lambda:page.locator('#weatherCard').get_attribute('data-status')=='CACHED')
   expect(page.locator('#weatherCard')).to_contain_text('saved sample')
   page.screenshot(path=str(OUT/'04-Offline-Cached-Weather.png'))
   passed('Provider interruption retains cached weather and labels it CACHED, not updated or clear')
   page.evaluate('async()=>{const v=AtlasWorkspace.liveEarth.read();for(const s of Object.values(v.cache.points)){s.time=Date.now()-7200000;s.fetchedAt=s.time;}await AtlasWorkspace.liveEarth.commit(v)}')
   page.reload();page.locator('#weatherCard').wait_for();wait(lambda:page.locator('#weatherCard').get_attribute('data-status')=='STALE')
   expect(page.locator('#weatherCard')).to_contain_text('Outdated weather')
   passed('Old cached model timestamps produce a visible STALE warning after reload')
   page.locator('#liveEarthBtn').click();page.locator('#earthEnabled').uncheck();page.locator('#earthApply').click();page.locator('#liveEarthSettings').wait_for(state='hidden')
   assert host.read_state()['settings']['liveEarth']['config']['enabled'] is False
   page.locator('#liveEarthBtn').click();page.locator('#earthClear').click();expect(page.locator('#earthSaveStatus')).to_contain_text('cache cleared');page.locator('#earthClose').click()
   assert host.read_state()['settings']['liveEarth']['cache']=={'points':{},'grid':None}
   assert page.evaluate('JSON.stringify(AtlasWorkspace.sites.list())')==before
   passed('Opt-out persists and clearing weather cache leaves research records unchanged')
   assert not errors,errors
   passed('No uncaught renderer errors during real-feed, offline and responsive interaction checks')
   context.close();browser.close()
  host.stop();host.start();disk=host.read_state();assert disk['settings']['liveEarth']['config']['enabled'] is False;assert disk['settings']['weatherUnits']=='metric'
  passed('Native-host restart retains network opt-out and selected display units')
  success=True
 finally:
  if not success and page:
   try:page.screenshot(path=str(OUT/'FAILED-INSPECTION.png'))
   except Exception:pass
  report={'success':success,'liveProviderVerified':live,'checks':checks,'providerResponses':responses,'pageErrors':errors,'sourceCommit':os.environ.get('GITHUB_SHA'),'environment':'Actual unpackaged .NET helper and Edge on GitHub-hosted Windows Server 2022','files':{str(p.relative_to(ROOT)):hashlib.sha256(p.read_bytes()).hexdigest() for p in [ROOT/'app/src/live-weather.js',ROOT/'app/src/live-weather.css',ROOT/'app/src/app.js',ROOT/'app/src/globe.js',ROOT/'native/AtlasHost.cs']},'limits':['Not a Windows 11 packaged installation test','No measured lightning or official alerts','Global clouds/precipitation are 15-degree model samples, not satellite or radar','Solar geometry and mean lunar cycle are approximate, present-day only','No employer endpoint or Store publication changes']}
  (OUT/'LIVE-WEATHER-RESULTS.json').write_text(json.dumps(report,indent=2),encoding='utf-8')
  host.cleanup()
 return 0 if success else 1
if __name__=='__main__':raise SystemExit(main())
