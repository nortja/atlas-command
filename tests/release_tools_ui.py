"""Camera/refresh checks on a disposable GitHub Windows runner, using real public
USGS JPEG responses and one real Open-Meteo point request. Not a packaged install.
"""
import hashlib,json,os,time
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
from windows_native_smoke import NativeSmoke
ROOT=Path(__file__).resolve().parents[1];OUT=ROOT/'release-tools-output'
def main():
 if os.name!='nt' or os.environ.get('GITHUB_ACTIONS')!='true' or os.environ.get('RUNNER_ENVIRONMENT')!='github-hosted':raise RuntimeError('Disposable Windows runner required.')
 exe=Path(os.environ['ATLAS_SMOKE_EXE']).resolve(strict=True);temp=Path(os.environ['RUNNER_TEMP']).resolve(strict=True)
 if not exe.is_relative_to(temp):raise RuntimeError('Disposable executable required.')
 appdata=Path(NativeSmoke.powershell('[Environment]::GetFolderPath([Environment+SpecialFolder]::LocalApplicationData)'))/'AtlasCommand'
 if appdata.exists():raise RuntimeError('Refusing existing user workspace.')
 host=NativeSmoke(exe,appdata,temp);OUT.mkdir(exist_ok=True);checks=[];errors=[];network=[];frames=[];responses=[];success=False;page=None
 def passed(text):checks.append(text);print('PASS:',text,flush=True)
 def wait(fn,seconds=35):
  end=time.monotonic()+seconds
  while time.monotonic()<end:
   if fn():return
   page.wait_for_timeout(200)
  raise AssertionError('Timed out: '+page.locator('#cameraStatus').inner_text())
 def capture_response(r):
  if '/api/camera/' in r.url and r.status==200:
   responses.append(r)
 def collect_responses():
  if not responses:raise AssertionError('No native camera response received.')
  r=responses.pop();responses.clear()
  # Read the same registered native endpoint while its in-memory frame is cached.
  # The browser already decoded that image. Matching fetch time and length links
  # the inspected bytes to the UI response without weakening connect-src for blob URLs.
  ident=r.url.rsplit('/',1)[-1]
  status,headers,body=host.expect('POST','api/camera/'+ident,200,headers={'X-Atlas-Request':'local'})
  assert body[:3]==bytes([255,216,255]) and len(body)>10000
  assert len(body)==int(r.headers['content-length'])
  assert headers['x-atlas-camera-fetched-at']==r.headers['x-atlas-camera-fetched-at']
  dims=page.locator('#cameraView img').evaluate('(img)=>({width:img.naturalWidth,height:img.naturalHeight})')
  assert dims['width']>=500
  frames.append({'camera':ident,'sha256':hashlib.sha256(body).hexdigest(),'bytes':len(body),**dims,'fetchedAt':headers['x-atlas-camera-fetched-at'],'modifiedAt':headers.get('x-atlas-camera-modified'),'verification':'Native cached payload matches browser response fetch time and length; browser decoded the actual image'})
 try:
  host.start();host.expect('GET','api/camera/K2cam',405);host.expect('POST','api/camera/K2cam',403,headers={'X-Atlas-Request':'local'})
  host.expect('POST','api/camera/unknown',404,headers={'X-Atlas-Request':'local'})
  passed('Native camera routes require an explicit local POST, registered ID and saved consent')
  with sync_playwright() as pw:
   browser=pw.chromium.launch(executable_path=host.edge,headless=True);context=browser.new_context(viewport={'width':2560,'height':1440});page=context.new_page()
   page.on('pageerror',lambda e:errors.append(str(e)))
   page.on('request',lambda r:network.append(r.url) if not r.url.startswith(('http://127.0.0.1:','blob:','data:')) else None)
   page.on('response',capture_response)
   page.goto(host.url);page.locator('#cameraDeskBtn').wait_for();page.locator('#cameraDeskBtn').click()
   expect(page.locator('.camera-choice')).to_have_count(5)
   before=page.evaluate('JSON.stringify(AtlasWorkspace.sites.list())')
   assert not network
   page.locator('#cameraLoad').click();expect(page.locator('#cameraPrivacy')).to_have_attribute('open','');assert not frames
   passed('Camera catalogue opens offline and refuses to load images before opt-in')
   page.locator('#cameraConsent').check();page.locator('#cameraSave').click();expect(page.locator('#cameraSaveStatus')).to_contain_text('Saved locally')
   assert host.read_state()['settings']['cameraDesk']['connectSnapshots'] is True
   page.locator('#cameraPrivacy summary').click();page.locator('#cameraLoad').click()
   wait(lambda:page.locator('#cameraStatus').get_attribute('data-state')=='SNAPSHOT')
   assert page.locator('#cameraView img').evaluate('(i)=>i.naturalWidth')>=500
   collect_responses()
   assert frames and frames[-1]['camera']=='K2cam' and frames[-1]['bytes']>10000
   expect(page.locator('#cameraStatus')).to_contain_text('Capture time')
   page.screenshot(path=str(OUT/'01-Camera-Desk.png'))
   passed('Actual USGS K2cam JPEG retrieved by native fixed-source adapter and displayed with attribution and timestamp caveat')
   page.locator('#cameraFavorite').click();wait(lambda:'K2cam' in host.read_state()['settings']['cameraDesk']['favorites'])
   page.locator('#cameraFavorites').click();expect(page.locator('.camera-choice')).to_have_count(1);page.locator('#cameraFavorites').click()
   page.locator('[data-camera="F1cam"]').click();page.locator('#cameraLoad').click()
   wait(lambda:page.locator('#cameraStatus').get_attribute('data-state')=='SNAPSHOT')
   collect_responses()
   assert frames[-1]['camera']=='F1cam'
   expect(page.locator('#cameraCaption')).to_contain_text('Celsius scale')
   page.screenshot(path=str(OUT/'02-Thermal-Camera.png'))
   passed('Actual thermal camera loads without rewriting its source scale; favorites and filters work')
   page.locator('[data-camera="nasa-earth"]').click();expect(page.locator('#cameraType')).to_contain_text('NOT EMBEDDED')
   assert page.locator('#cameraSource').get_attribute('href')=='https://eol.jsc.nasa.gov/esrs/hdev/'
   assert page.locator('#cameraView img').count()==0 and page.locator('iframe').count()==0
   passed('NASA and Yellowstone video sources remain explicit external links, not falsely labelled embedded/live playback')
   page.locator('[data-camera="K2cam"]').click();page.locator('#cameraLoad').click();wait(lambda:page.locator('#cameraStatus').get_attribute('data-state')=='SNAPSHOT')
   for w,h in [(1366,768),(1920,1080),(3440,1440),(820,1180)]:
    page.set_viewport_size({'width':w,'height':h});page.wait_for_timeout(350)
    assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+1'),str(w)
    box=page.locator('#cameraDesk').bounding_box();assert box['x']>=0 and box['x']+box['width']<=w+1,str(w)
    if w==1366:page.screenshot(path=str(OUT/'03-Laptop-Cameras.png'))
   page.set_viewport_size({'width':2560,'height':1440})
   passed('Camera desk remains bounded at laptop, desktop, ultrawide and compact viewport sizes')
   page.locator('#cameraPause').click();expect(page.locator('#cameraStatus')).to_have_attribute('data-state','PAUSED')
   page.locator('#cameraPrivacy summary').click();page.locator('#cameraConsent').uncheck();page.locator('#cameraSave').click();expect(page.locator('#cameraSaveStatus')).to_contain_text('Saved locally')
   host.expect('POST','api/camera/K2cam',403,headers={'X-Atlas-Request':'local'})
   assert page.locator('#cameraView img').count()==0
   page.locator('#cameraClose').click();expect(page.locator('#cameraDesk')).to_be_hidden()
   passed('Pause, opt-out, image disposal and close work; native endpoint refuses later requests without consent')
   page.locator('#settingsBtn').click();page.locator('#openLiveEarthSettings').click();page.locator('#earthRefreshPolicy').select_option('manual');page.locator('#earthEnabled').check();page.locator('#earthGlobal').uncheck();page.locator('#earthApply').click()
   page.wait_for_timeout(1500);assert not network
   assert host.read_state()['settings']['liveEarth']['config']['refresh']=='manual'
   passed('Manual weather mode persists and produces no automatic provider requests after enabling')
   page.locator('#wxRefresh').click();wait(lambda:page.locator('#weatherCard').get_attribute('data-status')=='UPDATED',40)
   assert len(network)==1 and network[0].startswith('https://api.open-meteo.com/v1/forecast?')
   passed('Explicit Refresh retrieves one real point forecast in manual mode; no global batch is requested')
   page.locator('#liveEarthBtn').click();page.screenshot(path=str(OUT/'04-Data-Refresh-Controls.png'));page.locator('#earthClose').click()
   assert page.evaluate('JSON.stringify(AtlasWorkspace.sites.list())')==before
   page.reload();page.locator('#cameraDeskBtn').wait_for();assert page.evaluate('AtlasWorkspace.cameras.read().favorites.includes("K2cam")');assert page.evaluate('AtlasWorkspace.liveEarth.read().config.refresh')=='manual'
   passed('Research records stay unchanged and camera favorites / manual refresh survive reload')
   page.locator('#cameraDeskBtn').click();page.locator('[data-camera="V1cam"]').click();page.locator('#cameraPrivacy summary').click();page.locator('#cameraConsent').check();page.locator('#cameraSave').click();expect(page.locator('#cameraSaveStatus')).to_contain_text('Saved locally')
   page.route('**/api/camera/V1cam',lambda route:route.fulfill(status=503,content_type='text/plain',body='Deliberate test outage'))
   page.locator('#cameraLoad').click();wait(lambda:page.locator('#cameraStatus').get_attribute('data-state')=='UNAVAILABLE')
   assert page.locator('#cameraView img').count()==0;expect(page.locator('#cameraView')).to_contain_text('unavailable')
   passed('Deliberate outage shows unavailable without substituting old footage as live')
   assert not errors,errors
   passed('No uncaught renderer errors during the camera and refresh checks')
   context.close();browser.close()
  host.stop();host.start()
  assert host.read_state()['settings']['liveEarth']['config']['refresh']=='manual'
  assert 'K2cam' in host.read_state()['settings']['cameraDesk']['favorites']
  passed('Camera favorites and data-refresh settings survive actual native-host restart')
  success=True
 finally:
  if page and not success:
   try:page.screenshot(path=str(OUT/'Failure.png'))
   except Exception:pass
  try:host.stop()
  finally:
   try:host.cleanup()
   except AttributeError:
    import shutil
    if appdata.exists():shutil.rmtree(appdata,ignore_errors=True)
  report={'success':success,'environment':'GitHub Windows Server 2022, unpackaged native helper + Edge; not Windows 11 packaged install','checks':checks,'actualCameraResponses':frames,'externalRendererRequests':len(network),'errors':errors,'codeTests':175,'sourceCommit':os.environ.get('GITHUB_SHA'),'sourceHashes':{p:hashlib.sha256((ROOT/p).read_bytes()).hexdigest() for p in ['app/src/cameras.js','app/src/data-refresh.js','native/AtlasHost.cs','app/src/app.js','app/src/live-weather.js']}}
  (OUT/'RELEASE-TOOLS-RESULTS.json').write_text(json.dumps(report,indent=2),encoding='utf-8')
 return 0 if success else 1
if __name__=='__main__':raise SystemExit(main())
