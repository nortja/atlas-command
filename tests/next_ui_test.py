"""Real native-host UI checks on a disposable GitHub Windows runner. No MSIX install."""
from pathlib import Path
import json,os,sys,hashlib,time
from playwright.sync_api import sync_playwright, expect
from windows_native_smoke import NativeSmoke
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'next-test-output'
CHECKS=[]
def passed(label):CHECKS.append(label);print('PASS:',label,flush=True)
def main():
 if os.name!='nt' or os.environ.get('GITHUB_ACTIONS')!='true' or os.environ.get('RUNNER_ENVIRONMENT')!='github-hosted':raise RuntimeError('Disposable GitHub-hosted Windows runner required.')
 exe=Path(os.environ['ATLAS_SMOKE_EXE']).resolve(strict=True);temp=Path(os.environ['RUNNER_TEMP']).resolve(strict=True)
 if not exe.is_relative_to(temp):raise RuntimeError('Executable must be in runner temporary storage.')
 appdata=Path(NativeSmoke.powershell('[Environment]::GetFolderPath([Environment+SpecialFolder]::LocalApplicationData)'))/'AtlasCommand'
 if appdata.exists():raise RuntimeError('Existing workspace found; refusing to touch it.')
 OUT.mkdir(exist_ok=True);host=NativeSmoke(exe,appdata,temp);success=False;errors=[];external=[]
 try:
  host.start()
  with sync_playwright() as pw:
   browser=pw.chromium.launch(channel='msedge',headless=True)
   context=browser.new_context(viewport={'width':2560,'height':1440},has_touch=True)
   page=context.new_page();page.on('pageerror',lambda e:errors.append(str(e)))
   page.on('request',lambda r:external.append(r.url) if not (r.url.startswith(('http://127.0.0.1:','data:','blob:')) or r.url=='https://svs.gsfc.nasa.gov/vis/a000000/a002900/a002915/bluemarble-2048.png') else None)
   page.goto(host.url,wait_until='domcontentloaded');page.wait_for_selector('#workspacePresets');page.wait_for_selector('#lidarDeskBtn')
   assert page.locator('.site-item').count()==26
   assert page.evaluate('AtlasWorkspace.version')==1 and page.evaluate('AtlasWorkspace.storageMode')=='native'
   passed('Integrated modules start in the real native host through versioned API')
   record_view='JSON.stringify(AtlasWorkspace.sites.list().map(({updatedAt,...s})=>s))'
   baseline=page.evaluate(record_view)
   page.evaluate('(()=>{const s=AtlasWorkspace.sites.list();s[0].name="MUTATION TEST";})()')
   assert page.evaluate(record_view)==baseline
   passed('Module record views are copies, not mutable references to workspace data')
   page.locator('#workspacePresets').click();page.locator('[data-preset="explore"]').click();page.locator("#workspaceChooser").wait_for(state="hidden")
   page.wait_for_timeout(350);page.screenshot(path=str(OUT/'01-Next-Observatory.png'))
   page.set_viewport_size({'width':1366,'height':768});page.wait_for_timeout(250);page.screenshot(path=str(OUT/'04-Laptop-Workspace.png'))
   page.set_viewport_size({'width':2560,'height':1440});page.wait_for_timeout(250)
   page.locator('#workspacePresets').click();page.screenshot(path=str(OUT/'02-Workspace-Chooser.png'));page.locator('[data-preset="research"]').click();page.locator("#workspaceChooser").wait_for(state="hidden")
   assert page.locator('#planPanel').evaluate('(e)=>e.classList.contains("collapsed")')
   page.locator('#workspacePresets').click();page.locator('#workspaceChooser [data-save]').click();page.locator("#workspaceChooser").wait_for(state="hidden")
   research=page.evaluate('AtlasWorkspace.layouts.read("ultrawide").active')
   page.locator('#workspacePresets').click();page.locator('[data-preset="expedition"]').click();page.locator("#workspaceChooser").wait_for(state="hidden")
   assert page.locator('#dossierPanel').evaluate('(e)=>e.classList.contains("collapsed")')
   page.locator('#workspacePresets').click();page.locator('[data-restore]').click();page.locator("#workspaceChooser").wait_for(state="hidden")
   assert page.evaluate('AtlasWorkspace.layouts.read("ultrawide").active')==research
   passed('Explore, Research, Expedition and custom save/restore work via real local writes')
   page.reload(wait_until='domcontentloaded');page.wait_for_selector('#workspacePresets')
   assert page.evaluate('AtlasWorkspace.layouts.read("ultrawide").active')==research
   assert page.evaluate(record_view)==baseline
   passed('Active and custom layout survive reload from native workspace storage')
   page.locator('#workspacePresets').click();page.locator('[data-focus]').click();assert page.evaluate('AtlasWorkspace.isGlobeFocused()')
   page.locator('#workspacePresets').click();page.locator('[data-focus]').click();assert not page.evaluate('AtlasWorkspace.isGlobeFocused()')
   passed('Globe focus is reversible without losing panel data')
   page.locator('#filterTime').check();page.locator('#exactYear').fill('-9000');page.locator('#exactYear').press('Tab')
   page.locator('#lidarDeskBtn').tap();assert page.locator('.lidar-card').count()==4
   page.screenshot(path=str(OUT/'03-LiDAR-Research-Desk.png'))
   page.locator('#lidarSearch').fill('mosquitia');assert page.locator('.lidar-card').count()==1
   page.locator('#lidarSearch').fill('');page.locator('#lidarStatus').select_option('ground-verified');assert page.locator('.lidar-card').count()==0
   page.locator('#lidarStatus').select_option('all')
   passed('LiDAR desk keeps all-era records visible and separates unreviewed from ground-verified claims')
   page.locator('[data-review="lidar-1"]').click();page.locator('#lidarForm [name="status"]').select_option('ground-verified')
   page.locator('#lidarForm button[type="submit"]').click();assert 'source URL and evidence notes' in page.locator('#lidarSaveStatus').inner_text()
   assert page.evaluate('AtlasWorkspace.sites.list().find(s=>s.id==="lidar-1").research.lidar') is None
   passed('Unsubstantiated verification claim is refused without changing the record')
   page.locator('#lidarForm [name="status"]').select_option('unreviewed')
   page.locator('#lidarForm [name="evidenceNotes"]').fill('Synthetic QA note, not a real survey assessment.')
   page.locator('#lidarForm [name="sourceDate"]').fill('2024-02-29')
   page.locator('#lidarForm [name="extent"]').select_option('survey-region')
   page.locator('#lidarForm button[type="submit"]').click();page.wait_for_selector('#lidarList')
   page.locator('#lidarDesk [data-close]').click();page.reload(wait_until='domcontentloaded');page.wait_for_selector('#lidarDeskBtn')
   saved=page.evaluate('AtlasWorkspace.sites.list().find(s=>s.id==="lidar-1").research.lidar')
   assert saved['evidenceNotes'].startswith('Synthetic QA') and saved['sourceDate']=='2024-02-29' and saved['status']=='unreviewed'
   disk=json.loads((appdata/'Data'/'workspace.json').read_text('utf-8'))
   assert next(s for s in disk['sites'] if s['id']=='lidar-1')['research']['lidar']==saved
   passed('LiDAR metadata and publication dates persist to native disk and reload')
   page.locator('#ratingFilter').select_option('1')
   page.locator('#lidarDeskBtn').click();page.locator('[data-show="lidar-1"]').click();assert page.locator('.site-heading').inner_text().startswith('Alianza')
   assert page.locator('#ratingFilter').input_value()=='' and page.locator('.site-item').count()==4
   page.locator('[data-tab="research"]').click();page.locator('#alignmentBtn').click()
   for name,value in [('axis','20'),('declination','10'),('year','-1000'),('model','QA only'),('source','https://example.org/qa')]:page.locator('#alignmentForm [name="'+name+'"]').fill(value)
   page.locator('#alignmentForm button.primary').click();page.locator('#closeDialog').click();page.evaluate('AtlasTest.flush()')
   assert page.evaluate('AtlasWorkspace.sites.list().find(s=>s.id==="lidar-1").research.lidar')==saved
   passed('Saving magnetic comparison preserves another module\'s LiDAR metadata')
   before=page.evaluate('AtlasWorkspace.layouts.read("ultrawide")')
   page.route('**/api/state',lambda route:route.fulfill(status=500,body='Synthetic save failure'))
   page.locator('#workspacePresets').click();page.locator('[data-preset="expedition"]').click()
   expect(page.locator("#layoutStatus")).to_contain_text("Not saved:")
   assert page.evaluate('AtlasWorkspace.layouts.read("ultrawide")')==before
   page.unroute('**/api/state');page.locator('#workspaceChooser [data-close]').click()
   passed('Failed local save reports the error and rolls back layout state')
   for width,height in [(1366,768),(2560,1080),(820,1180)]:
    page.set_viewport_size({'width':width,'height':height});page.wait_for_timeout(220)
    fits=page.evaluate('document.documentElement.scrollWidth<=innerWidth+1')
    if not fits:
     overflow=page.evaluate('''()=>[...document.querySelectorAll('body *')].map(e=>{const r=e.getBoundingClientRect();return {tag:e.tagName,id:e.id,cls:(typeof e.className==='string'?e.className:''),left:Math.round(r.left),right:Math.round(r.right),width:Math.round(r.width),scrollWidth:e.scrollWidth,position:getComputedStyle(e).position,overflowX:getComputedStyle(e).overflowX}}).filter(x=>x.width>0&&(x.right>innerWidth+1||x.left<-1||x.scrollWidth>innerWidth+1)).slice(0,25)''')
     raise AssertionError(f'Overflow at {width}: {json.dumps(overflow,separators=(",",":"))}')
    page.locator('#workspacePresets').click()
    if width>=950:page.locator('[data-preset="explore"]').click();page.locator("#workspaceChooser").wait_for(state="hidden")
    else:assert page.locator('[data-preset="explore"]').is_disabled();page.locator('#workspaceChooser [data-close]').click()
    page.locator('#lidarDeskBtn').tap();assert page.locator('#lidarDesk').is_visible();page.locator('#lidarDesk [data-close]').click()
   assert page.evaluate('!!AtlasWorkspace.layouts.read("desktop").active.catalog')
   assert page.evaluate('!!AtlasWorkspace.layouts.read("ultrawide").saved.catalog')
   passed('Laptop, ultrawide and compact layouts work without page overflow; touch taps tested by emulation')
   assert not errors,errors
   assert not external,'Unexpected external renderer request'
   passed('No uncaught renderer errors or unapproved external renderer network requests')
   page.evaluate('AtlasTest.flush()');context.close();browser.close()
  host.stop();host.start()
  final=host.read_state();assert next(s for s in final['sites'] if s['id']=='lidar-1')['research']['lidar']==saved
  passed('New metadata survives an actual native-host restart')
  host.stop();success=True
 finally:
  report={'success':success,'checks':CHECKS,'automationInputCommit':os.environ.get('GITHUB_SHA'), 'testedSource':'Materialized development working tree; file hashes below','environment':'GitHub-hosted Windows Server 2022; real unpackaged native host and Edge; no MSIX install','files':{f:hashlib.sha256((ROOT/f).read_bytes()).hexdigest() for f in ['app/index.html','app/src/app.js','app/src/workspace-layout.js','app/src/lidar.js','app/src/next-ui.css','native/AtlasHost.cs']},'unverified':['Windows 11 packaged install','Physical touch hardware','SentinelOne clearance','Store certification of this development build']}
  (OUT/'NEXT-TEST-RESULTS.json').write_text(json.dumps(report,indent=2),encoding='utf-8')
  host.cleanup()
 return 0 if success else 1
if __name__=='__main__':raise SystemExit(main())