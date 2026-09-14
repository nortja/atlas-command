"""Verify the HD planet/ribbon/catalog layer in the real native owner preview without enabling network feeds."""
from pathlib import Path
import os
from playwright.sync_api import sync_playwright
from windows_native_smoke import NativeSmoke

ROOT=Path(__file__).resolve().parents[1]
NASA='https://svs.gsfc.nasa.gov/vis/a000000/a002900/a002915/bluemarble-2048.png'

def main():
 if os.name!='nt' or os.environ.get('GITHUB_ACTIONS')!='true' or os.environ.get('RUNNER_ENVIRONMENT')!='github-hosted':raise RuntimeError('Disposable GitHub-hosted Windows runner required.')
 exe=Path(os.environ['ATLAS_SMOKE_EXE']).resolve(strict=True);temp=Path(os.environ['RUNNER_TEMP']).resolve(strict=True)
 if not exe.is_relative_to(temp):raise RuntimeError('Executable must be staged under runner temp.')
 appdata=Path(NativeSmoke.powershell('[Environment]::GetFolderPath([Environment+SpecialFolder]::LocalApplicationData)'))/'AtlasCommand'
 if appdata.exists():raise RuntimeError('Existing workspace found; refusing to touch it.')
 host=NativeSmoke(exe,appdata,temp);external=[];errors=[]
 try:
  host.start()
  with sync_playwright() as pw:
   browser=pw.chromium.launch(channel='msedge',headless=True)
   context=browser.new_context(viewport={'width':1920,'height':1080})
   page=context.new_page();page.route(NASA,lambda route:route.abort())
   page.on('pageerror',lambda e:errors.append(str(e)));page.on('request',lambda r:external.append(r.url) if not r.url.startswith(('http://127.0.0.1:','data:','blob:')) and r.url!=NASA else None)
   page.goto(host.url,wait_until='domcontentloaded');page.wait_for_selector('#weatherRibbon')
   assert page.locator('.site-item').count()==75
   assert page.evaluate('AtlasTest.globe.environmentRenderers.has("physical-earth")')
   assert page.evaluate('AtlasTest.globe.environmentRenderers.has("satellite-earth")')
   assert page.locator('#satelliteEarth').count()==1
   assert page.locator('#atlasMoonContext').count()==1
   page.wait_for_selector('#touchModeBtn')
   image=host.expect('GET','assets/earth-blue-marble-2048.png',200)[2]
   assert image[:8]==b'\x89PNG\r\n\x1a\n'
   assert int.from_bytes(image[16:20],'big')==2048
   page.locator('#overviewBtn').click()
   assert page.locator('#overviewDialog #atlasInstruments').is_visible()
   page.locator('#overviewDialog .dialog-close').click()
   page.locator('#touchModeBtn').click()
   assert page.locator('#touchModeBtn').get_attribute('aria-pressed')=='true'
   assert page.locator('#zoomIn').bounding_box()['height']>=48
   page.locator('#touchModeBtn').click()

   assert page.locator('#weatherRibbon').is_visible()
   box=page.locator('#weatherRibbon').bounding_box();assert box and box['height']<72 and box['width']<900
   assert 'Live weather is off' in page.locator('#weatherRibbon').inner_text()
   page.locator('[data-site="catalog-jericho-tell-es-sultan"]').click();page.wait_for_timeout(150)
   assert 'Ancient Jericho' in page.locator('#weatherRibbon').inner_text()
   page.locator('[data-site="catalog-liangzhu"]').click();page.wait_for_timeout(100)
   assert 'Liangzhu' in page.locator('.site-heading').inner_text()
   assert page.locator('#siteDeepDive').is_visible()
   assert 'Why this site matters' in page.locator('#siteDeepDive').inner_text()
   assert page.locator('#currentsBtn').is_visible()
   assert not errors,errors
   assert not external,external
   context.close();browser.close()
  host.stop();print('PASS: photographic Earth layer, compact weather ribbon, 75-site curated catalog and current controls mount in native preview',flush=True);return 0
 finally:host.cleanup()

if __name__=='__main__':raise SystemExit(main())
