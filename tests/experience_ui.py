"""Native owner-preview checks for weather desk, site briefing, currents desk, globe layers, and minimized-window lifecycle hint. No external feeds are enabled."""
from pathlib import Path
import os
from playwright.sync_api import sync_playwright
from windows_native_smoke import NativeSmoke

def main():
 if os.name!='nt' or os.environ.get('GITHUB_ACTIONS')!='true' or os.environ.get('RUNNER_ENVIRONMENT')!='github-hosted':raise RuntimeError('Disposable GitHub-hosted Windows runner required.')
 exe=Path(os.environ['ATLAS_SMOKE_EXE']).resolve(strict=True);temp=Path(os.environ['RUNNER_TEMP']).resolve(strict=True)
 if not exe.is_relative_to(temp):raise RuntimeError('Executable must be in runner temporary storage.')
 appdata=Path(NativeSmoke.powershell('[Environment]::GetFolderPath([Environment+SpecialFolder]::LocalApplicationData)'))/'AtlasCommand'
 if appdata.exists():raise RuntimeError('Existing workspace found; refusing to touch it.')
 host=NativeSmoke(exe,appdata,temp);external=[];errors=[]
 try:
  host.start()
  with sync_playwright() as pw:
   browser=pw.chromium.launch(channel='msedge',headless=True)
   context=browser.new_context(viewport={'width':1920,'height':1080})
   page=context.new_page();page.on('pageerror',lambda e:errors.append(str(e)));page.on('request',lambda r:external.append(r.url) if not r.url.startswith(('http://127.0.0.1:','data:','blob:')) else None)
   page.goto(host.url,wait_until='domcontentloaded')
   page.wait_for_selector('#weatherDeskBtn');page.wait_for_selector('#currentsBtn');page.wait_for_selector('#siteDeepDive')
   assert page.locator('#siteDeepDive').is_visible();text=page.locator('#siteDeepDive').inner_text();assert 'Why this site matters' in text and 'What to compare closely' in text
   assert page.evaluate('AtlasWorkspace.sites.selected().id')
   page.locator('#weatherDeskBtn').click();page.wait_for_selector('#weatherDesk:not([hidden])');assert page.locator('#weatherDesk #weatherCard').count()==1
   title=page.locator('#weatherDeskTitle').inner_text();page.locator('.site-item').nth(1).click();page.wait_for_timeout(150);assert page.locator('#weatherDeskTitle').inner_text()!=title or page.locator('#weatherDeskTitle').inner_text()==page.locator('.site-heading').inner_text()
   page.locator('#weatherDeskClose').click();assert page.locator('#weatherDesk').is_hidden()
   page.locator('#currentsBtn').click();page.wait_for_selector('#currentsDesk:not([hidden])');assert '1940' in page.locator('#currentsDesk').inner_text();assert not page.locator('#currentsEnabled').is_checked()
   assert page.evaluate('AtlasTest.globe.environmentRenderers.size')>=2
   ok=page.evaluate("fetch('api/window-state',{method:'POST',headers:{'Content-Type':'application/json','X-Atlas-Request':'local'},body:JSON.stringify({hidden:true})}).then(r=>r.ok)")
   assert ok;ok=page.evaluate("fetch('api/window-state',{method:'POST',headers:{'Content-Type':'application/json','X-Atlas-Request':'local'},body:JSON.stringify({hidden:false})}).then(r=>r.ok)");assert ok
   assert not errors,errors;assert not external,external
   context.close();browser.close()
  host.stop();print('PASS: richer site detail, separate weather, currents layer, multi-renderer globe and minimize lifecycle mount locally',flush=True);return 0
 finally:host.cleanup()
if __name__=='__main__':raise SystemExit(main())
