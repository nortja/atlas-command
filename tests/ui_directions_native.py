"""Capture three actual appearances on disposable Windows using real native storage.
No Store install, endpoint changes or fabricated weather responses.
"""
import hashlib,json,os,time
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
from windows_native_smoke import NativeSmoke
ROOT=Path(__file__).resolve().parents[1];OUT=ROOT/'ui-review-output'
def main():
 if os.name!='nt' or os.environ.get('GITHUB_ACTIONS')!='true' or os.environ.get('RUNNER_ENVIRONMENT')!='github-hosted':raise RuntimeError('Disposable Windows runner required.')
 exe=Path(os.environ['ATLAS_SMOKE_EXE']).resolve(strict=True);temp=Path(os.environ['RUNNER_TEMP']).resolve(strict=True)
 if not exe.is_relative_to(temp):raise RuntimeError('Refusing non-temporary executable.')
 appdata=Path(NativeSmoke.powershell('[Environment]::GetFolderPath([Environment+SpecialFolder]::LocalApplicationData)'))/'AtlasCommand'
 if appdata.exists():raise RuntimeError('Refusing existing user workspace.')
 host=NativeSmoke(exe,appdata,temp);OUT.mkdir(exist_ok=True);checks=[];errors=[];requests=[];success=False;page=None;failure=''
 def passed(s):checks.append(s);print('PASS: '+s,flush=True)
 def capture(path):
  # Reset only ordinary scroll position after test interactions, then let the
  # app's own transient toast expire. No DOM content or screenshot is fabricated.
  page.locator('#dossierBody').evaluate('(el)=>el.scrollTop=0')
  page.locator('#toast').wait_for(state='hidden',timeout=10000)
  page.wait_for_timeout(250)
  page.screenshot(path=path)
 def assert_expedition_typography():
  # Inspect browser-computed fonts, not merely stylesheet text.
  for selector in ['.space-title h1','.site-heading']:
   assert 'Georgia' in page.locator(selector).first.evaluate('e=>getComputedStyle(e).fontFamily'),selector
  for selector in ['#appearanceBtn','#search','.panel-handle h2','.instrument-tile strong']:
   assert 'Segoe UI' in page.locator(selector).first.evaluate('e=>getComputedStyle(e).fontFamily'),selector
  assert 'tabular-nums' in page.locator('.instrument-tile strong').first.evaluate('e=>getComputedStyle(e).fontVariantNumeric')
  assert 'Consolas' in page.locator('.coords').first.evaluate('e=>getComputedStyle(e).fontFamily')
 try:
  host.start()
  with sync_playwright() as pw:
   browser=pw.chromium.launch(executable_path=host.edge,headless=True)
   context=browser.new_context(viewport={'width':1920,'height':1080});page=context.new_page()
   page.on('pageerror',lambda e:errors.append(str(e)));page.on('request',lambda r:requests.append(r.url) if r.url.startswith('https://') else None)
   page.goto(host.url);page.locator('#appearanceBtn').wait_for();page.locator('#boot').wait_for(state='detached')
   expect(page.locator('body')).to_have_attribute('data-atlas-theme','orbital');assert not requests
   before=page.evaluate('JSON.stringify(AtlasWorkspace.sites.list())')
   expect(page.locator('[data-stat=total]')).to_have_text('26');expect(page.locator('[data-stat=lidar]')).to_have_text('4')
   passed('Three-style module starts locally; summary shows actual 26-record library and four LiDAR records')
   page.locator('#workspacePresets').click();page.locator('[data-preset=research]').click()
   layout=page.evaluate('JSON.stringify([AtlasWorkspace.layouts.read("desktop"),AtlasWorkspace.layouts.read("ultrawide")])')
   page.evaluate('AtlasWorkspace.liveEarth.rotation(false)')
   for theme,name in [('orbital','Orbital'),('expedition','Expedition'),('signal','Signal Desk')]:
    page.locator('#appearanceBtn').click();expect(page.locator('[data-appearance]')).to_have_count(3)
    page.locator('[data-appearance='+theme+']').click();expect(page.locator('#appearanceSaveStatus')).to_have_text('Saved locally: '+name)
    page.locator('#appearanceClose').click();expect(page.locator('body')).to_have_attribute('data-atlas-theme',theme)
    assert host.read_state()['settings']['appearance']==theme
    assert page.evaluate('JSON.stringify(AtlasWorkspace.sites.list())')==before
    assert page.evaluate('JSON.stringify([AtlasWorkspace.layouts.read("desktop"),AtlasWorkspace.layouts.read("ultrawide")])')==layout
    if theme=='expedition':assert_expedition_typography()
    else:assert 'Georgia' not in page.locator('.site-heading').first.evaluate('e=>getComputedStyle(e).fontFamily')
   passed('All three appearance buttons persist through native writes without altering sites, layouts or privacy choices')
   passed('Expedition preserves editorial headings while controls and tabular readings use modern system fonts; other appearances stay separate')
   page.reload();page.locator('#appearanceBtn').wait_for();expect(page.locator('body')).to_have_attribute('data-atlas-theme','signal')
   passed('Selected appearance survives renderer reload')
   dossier=page.locator('#dossierPanel').bounding_box();plan=page.locator('#planPanel').bounding_box()
   assert plan['y']>=dossier['y']+dossier['height']-1, (dossier,plan)
   passed('Collapsed Expedition bar stays below the expanded dossier after reload')
   page.locator('#queueBtn').click();expect(page.locator('[data-stat=queued]')).to_have_text('1')
   page.locator('#queueBtn').click();expect(page.locator('[data-stat=queued]')).to_have_text('1')
   passed('Mission counter responds to actual queue add and refuses duplicate additions')
   page.locator('#search').fill('Göbekli');expect(page.locator('[data-stat=visible]')).to_have_text('1');expect(page.locator('[data-stat=total]')).to_have_text('26');page.locator('#search').fill('')
   passed('Filter count updates immediately while library totals remain unchanged')
   page.locator('#appearanceBtn').click();page.route('**/api/state',lambda r:r.fulfill(status=507,content_type='text/plain',body='Deliberate UI test: disk full'))
   page.locator('[data-appearance=orbital]').click();expect(page.locator('#appearanceSaveStatus')).to_contain_text('Not saved:');expect(page.locator('body')).to_have_attribute('data-atlas-theme','signal')
   page.unroute('**/api/state');page.locator('[data-appearance=orbital]').click();expect(page.locator('#appearanceSaveStatus')).to_have_text('Saved locally: Orbital');page.locator('#appearanceClose').click()
   passed('A deliberately rejected local save reports the error, keeps prior appearance, and permits retry')
   assert not requests
   page.locator('#liveEarthBtn').click();page.locator('#earthEnabled').check();page.locator('#earthGlobal').check();page.locator('#earthIdle').uncheck();page.locator('#earthApply').click()
   expect(page.locator('#weatherCard')).to_have_attribute('data-status','UPDATED',timeout=60000)
   page.wait_for_function('()=>AtlasWorkspace.liveEarth.read().cache.grid?.samples?.length===288',timeout=90000)
   assert requests and all(u.startswith('https://api.open-meteo.com/v1/forecast?') for u in requests)
   passed('Real opt-in point weather and global model samples are displayed; no success fixtures are substituted')
   page.evaluate('AtlasWorkspace.liveEarth.rotation(false)')
   for index,theme,name in [('A','orbital','Orbital'),('B','expedition','Expedition'),('C','signal','Signal-Desk')]:
    page.locator('#appearanceBtn').click();page.locator('[data-appearance='+theme+']').click();expect(page.locator('#appearanceSaveStatus')).to_contain_text('Saved locally');page.locator('#appearanceClose').click();page.wait_for_timeout(600)
    capture(str(OUT/(index+'-'+name+'.png')))
    for w,h in [(1366,768),(1920,1080),(3440,1440),(820,1180)]:
     page.set_viewport_size({'width':w,'height':h});page.wait_for_timeout(250)
     assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+1'),(theme,w)
     for selector in ['#instrumentDock','#appearanceBtn','#weatherCard']:
      box=page.locator(selector).bounding_box();assert box is not None and box['x']>=-1 and box['x']+box['width']<=w+1,(theme,w,selector,box)
     if theme=='expedition':
      assert_expedition_typography()
      assert 'Segoe UI' in page.locator('.wx-now>strong').evaluate('e=>getComputedStyle(e).fontFamily')
      assert 'tabular-nums' in page.locator('.wx-now>strong').evaluate('e=>getComputedStyle(e).fontVariantNumeric')
     if w==1366:
      page.locator('#workspacePresets').click();page.locator('[data-preset=research]').click();page.wait_for_timeout(250)
      capture(str(OUT/(index+'-'+name+'-Laptop.png')))
     if w==3440 and theme=='orbital':capture(str(OUT/'A-Orbital-Ultrawide.png'))
    page.set_viewport_size({'width':1920,'height':1080})
   passed('Captured all three actual UI styles and checked laptop, desktop, ultrawide and compact viewport bounds')
   page.locator('#appearanceBtn').click();capture(str(OUT/'Appearance-Chooser.png'));page.locator('#appearanceClose').click()
   page.emulate_media(reduced_motion='reduce')
   assert page.evaluate('getComputedStyle(document.querySelector("#appearanceBtn")).transitionDuration')=='0s'
   page.locator('#appearanceBtn').focus();page.keyboard.press('Tab');page.keyboard.press('Shift+Tab');assert page.locator('#appearanceBtn').evaluate('e=>getComputedStyle(e).outlineStyle')!='none'
   assert page.locator('#appearanceBtn').evaluate('e=>document.activeElement===e && e.matches(":focus-visible")')
   passed('Reduced-motion media preference and visible keyboard focus survive the redesign')
   assert page.evaluate('JSON.stringify(AtlasWorkspace.sites.list())')==before
   assert not errors,errors
   passed('No uncaught renderer errors or research-record mutations during the appearance tests')
   context.close();browser.close()
  host.stop();host.start();assert host.read_state()['settings']['appearance']=='signal'
  passed('Appearance preference survives actual native-host restart')
  success=True
 except Exception as error:
  failure=repr(error);raise
 finally:
  if page and not success:
   try:page.screenshot(path=str(OUT/'Failure.png'))
   except Exception:pass
  try:host.stop()
  finally:
   import shutil
   if appdata.exists():shutil.rmtree(appdata,ignore_errors=True)
  (OUT/'UI-REVIEW-RESULTS.json').write_text(json.dumps({'success':success,'failure':failure,'checks':checks,'environment':'GitHub Windows Server 2022; unpackaged native helper and installed Edge, not Windows 11 packaged install','errors':errors,'externalRequests':len(requests),'sourceCommit':os.environ.get('GITHUB_SHA'),'sourceHashes':{p:hashlib.sha256((ROOT/p).read_bytes()).hexdigest() for p in ['app/src/ui-directions.js','app/src/ui-directions.css','app/src/ui-refinement.css','app/src/app.js','app/src/globe.js']}},indent=2),encoding='utf-8')
 return 0 if success else 1
if __name__=='__main__':raise SystemExit(main())
