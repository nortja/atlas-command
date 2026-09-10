"""Real native profile persistence on a disposable Windows runner. No IP camera
is contacted. Example camera records are deliberately labelled Demo.
"""
import hashlib,json,os,shutil,time
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
from windows_native_smoke import NativeSmoke
ROOT=Path(__file__).resolve().parents[1];OUT=ROOT/'field-camera-output'
def main():
 if os.name!='nt' or os.environ.get('GITHUB_ACTIONS')!='true' or os.environ.get('RUNNER_ENVIRONMENT')!='github-hosted':raise RuntimeError('Disposable Windows runner required')
 exe=Path(os.environ['ATLAS_SMOKE_EXE']).resolve(strict=True);temp=Path(os.environ['RUNNER_TEMP']).resolve(strict=True)
 if not exe.is_relative_to(temp):raise RuntimeError('Temporary executable required')
 appdata=Path(NativeSmoke.powershell('[Environment]::GetFolderPath([Environment+SpecialFolder]::LocalApplicationData)'))/'AtlasCommand'
 if appdata.exists():raise RuntimeError('Refusing existing workspace')
 host=NativeSmoke(exe,appdata,temp);OUT.mkdir(exist_ok=True);checks=[];errors=[];external=[];success=False;failure=''
 invariant='JSON.stringify([AtlasWorkspace.sites.list(),AtlasWorkspace.layouts.read("desktop"),AtlasWorkspace.weather.getUnits(),AtlasWorkspace.cameras.read(),AtlasWorkspace.liveEarth.read()])'
 def passed(s):checks.append(s);print('PASS: '+s,flush=True)
 try:
  host.start()
  with sync_playwright() as pw:
   browser=pw.chromium.launch(executable_path=host.edge,headless=True);context=browser.new_context(viewport={'width':1920,'height':1080},accept_downloads=True);page=context.new_page()
   page.on('pageerror',lambda e:errors.append(str(e)));page.on('request',lambda r:external.append(r.url) if not r.url.startswith(('http://127.0.0.1:','blob:','data:')) else None)
   page.goto(host.url);page.locator('#fieldCameraOpen').wait_for(state='attached');page.locator('#boot').wait_for(state='detached')
   page.locator('#appearanceBtn').click();page.locator('[data-appearance=expedition]').click();expect(page.locator('#appearanceSaveStatus')).to_contain_text('Saved locally');page.locator('#appearanceClose').click()
   before=page.evaluate(invariant)
   def open_desk():page.locator('#cameraDeskBtn').click();page.locator('#fieldCameraOpen').click();expect(page.locator('#fieldCameraDesk')).to_be_visible()
   def save():
    page.locator('#fieldSave').click();expect(page.locator('#fieldForm')).to_have_count(0);expect(page.locator('#fieldEdit')).to_be_visible()
   open_desk();expect(page.locator('#fieldCount')).to_have_text('0 saved profiles');assert not external
   passed('Private metadata desk opens without activating a camera or making external requests')
   page.locator('#fieldAdd').click();page.locator('#fieldSave').click();expect(page.locator('#fieldFormError')).to_contain_text('required')
   page.locator('#fc-name').fill('Demo · River Camp North');page.locator('#fc-host').fill('rtsp://owner:secret@192.0.2.50');page.locator('#fieldSave').click();expect(page.locator('#fieldFormError')).to_contain_text('only the IP')
   assert not host.read_state().get('settings',{}).get('fieldCameras')
   passed('Invalid address with embedded credentials is rejected before saving; empty required fields are explained')
   page.locator('#fc-host').fill('192.0.2.50');page.locator('#fc-location').fill('River camp · north bank');page.locator('#fc-mode').select_option('both');page.locator('#fc-description').fill('Example profile for UI review — not an installed camera. Intended view: the river approach and nearby footpath.')
   page.locator('#fieldLocationDetails summary').click();page.locator('#fc-locality').fill('Three Rivers');page.locator('#fc-region').fill('California');page.locator('#fc-country').fill('United States');page.locator('#fc-deployment').select_option('planned');page.locator('#fc-facing').fill('0');page.locator('#fc-placement').fill('Example: elevated tripod; keep the path clear. Verify placement permission before deploying.')
   page.locator('#fieldConnectionDetails summary').click();page.locator('#fc-method').select_option('rtsp');page.locator('#fc-port').fill('554');page.locator('#fc-path').fill('/stream1');page.locator('#fc-tags').fill('river, wildlife, survey')
   save();p=host.read_state()['settings']['fieldCameras']['profiles'][0];ident=p['id'];assert p['locality']=='Three Rivers' and p['description'].startswith('Example') and p['mode']=='both' and p['facing']==0 and p['lat'] is None
   assert not any(k in p for k in ['password','username','connected','battery'])
   expect(page.get_by_text('Not connected',exact=True)).to_be_visible();page.locator('#fieldCameraDesk').evaluate('e=>e.scrollTop=0');page.screenshot(path=str(OUT/'01-IP-Camera-Profile.png'))
   passed('Name, locality, description, modes, facing, tags and setup details persist to native storage without credentials or invented GPS')
   page.locator('#fieldEdit').click();page.locator('#fieldLocationDetails summary').click();page.locator('#fc-lat').fill('0');page.locator('#fieldSave').click();expect(page.locator('#fieldFormError')).to_contain_text('both latitude');page.locator('#fc-lon').fill('0');page.locator('#fc-siteId').select_option('seed-2');save()
   updated=host.read_state()['settings']['fieldCameras']['profiles'][0];assert updated['lat']==0 and updated['lon']==0 and updated['locationSource']=='user-reference' and updated['siteId']=='seed-2' and updated['createdAt']==p['createdAt']
   assert page.evaluate(invariant)==before
   passed('Coordinate pairs validate including zero; linking a site does not copy GPS or mutate research, layouts or weather/privacy choices')
   page.locator('#fieldEdit').click();page.locator('#fieldLocationDetails summary').click();page.locator('#fc-lat').fill('');page.locator('#fc-lon').fill('');page.locator('#fc-siteId').select_option('');page.locator('#fieldLocationDetails summary').click()
   page.locator('#fieldCameraDesk').evaluate('e=>e.scrollTop=0');page.screenshot(path=str(OUT/'02-Edit-Camera-Details.png'));save()
   page.locator('#fieldSearch').fill('three rivers');expect(page.locator('.field-choice')).to_have_count(1);page.locator('#fieldModeFilter').select_option('remote');expect(page.locator('.field-choice')).to_have_count(1);page.locator('#fieldSearch').fill('no-match');expect(page.locator('.field-choice')).to_have_count(0);page.locator('#fieldSearch').fill('');page.locator('#fieldModeFilter').select_option('all')
   passed('Search covers locality and tags; Both profiles are included in Local and Remote filters')
   page.locator('#fieldEdit').click();page.locator('#fc-description').fill('UNSAVED TEST');page.once('dialog',lambda d:d.dismiss());page.locator('#fieldClose').click();expect(page.locator('#fieldForm')).to_be_visible();assert 'UNSAVED' not in host.read_state()['settings']['fieldCameras']['profiles'][0]['description']
   page.once('dialog',lambda d:d.accept());page.locator('#fieldCancel').click();expect(page.locator('#fieldEdit')).to_be_visible()
   passed('Discard confirmation protects unsaved edits and Cancel leaves the saved profile unchanged')
   page.locator('#fieldEdit').click();page.locator('#fc-description').fill('Updated after a deliberately failed write.')
   page.route('**/api/state',lambda r:r.fulfill(status=507,content_type='text/plain',body='Deliberate test: full disk'))
   page.locator('#fieldSave').click();expect(page.locator('#fieldFormError')).to_contain_text('Not saved.');expect(page.locator('#fc-description')).to_have_value('Updated after a deliberately failed write.')
   assert host.read_state()['settings']['fieldCameras']['profiles'][0]['description'].startswith('Example')
   assert page.evaluate('AtlasWorkspace.fieldCameras.list()[0].description').startswith('Example')
   page.unroute('**/api/state');save();passed('Failed native write rolls back saved state, keeps form entries, and allows a successful retry')
   page.locator('#fieldEdit').click();page.locator('#fc-name').fill('<img src=x onerror=alert(1)>');save();assert page.locator('#fieldCameraDesk img').count()==0;expect(page.locator('.field-detail-head h3')).to_have_text('<img src=x onerror=alert(1)>')
   page.locator('#fieldEdit').click();page.locator('#fc-name').fill('Demo · River Camp North');page.locator('#fc-description').fill('Example profile for UI review — not an installed camera. Intended view: the river approach and nearby footpath.');save()
   passed('Untrusted names are rendered as text, not executed or converted into images')
   for w,h in [(1366,768),(1920,1080),(3440,1440),(820,1180),(390,844)]:
    page.set_viewport_size({'width':w,'height':h});page.wait_for_timeout(150);box=page.locator('#fieldCameraDesk').bounding_box();assert box['x']>=-1 and box['x']+box['width']<=w+1
    assert page.locator('#fieldCameraDesk').evaluate('e=>e.scrollWidth<=e.clientWidth+1'),str(w)
    if w==1366:page.locator('#fieldCameraDesk').evaluate('e=>e.scrollTop=0');page.screenshot(path=str(OUT/'03-IP-Camera-Laptop.png'))
   page.set_viewport_size({'width':1920,'height':1080});page.locator('#fieldClose').click();page.reload();page.locator('#fieldCameraOpen').wait_for(state='attached');open_desk();expect(page.locator('#fieldCount')).to_have_text('1 saved profile');assert page.evaluate('AtlasWorkspace.fieldCameras.list()[0].id')==ident
   passed('Profile survives renderer reload; metadata desk fits laptop, desktop, ultrawide and compact widths')
   page.locator('#fieldClose').click();page.locator('#settingsBtn').click()
   with page.expect_download() as download:page.locator('#exportJSON').click()
   data=json.loads(Path(download.value.path()).read_text('utf-8'));assert 'fieldCameras' not in data['settings'];assert '192.0.2.50' not in json.dumps(data);assert host.read_state()['settings']['fieldCameras']['profiles']
   page.locator('#dialog').evaluate('e=>e.close()');passed('Actual workspace JSON download excludes private camera profiles while local storage retains them')
   open_desk();page.once('dialog',lambda d:d.dismiss());page.locator('#fieldDelete').click();assert len(host.read_state()['settings']['fieldCameras']['profiles'])==1
   page.once('dialog',lambda d:d.accept());page.locator('#fieldDelete').click();expect(page.locator('#fieldCount')).to_have_text('0 saved profiles');assert host.read_state()['settings']['fieldCameras']['profiles']==[]
   assert page.evaluate(invariant)==before
   passed('Confirmed removal affects only the profile; declining removal preserves it')
   page.locator('#fieldAdd').click();page.locator('#fc-name').fill('Demo restart profile');page.locator('#fc-host').fill('camera.example');save();page.locator('#fieldClose').click()
   assert not errors,errors;assert not external,external
   passed('No external requests or uncaught renderer errors during profile creation, search, edit, export or removal')
   context.close();browser.close()
  host.stop();host.start();assert host.read_state()['settings']['fieldCameras']['profiles'][0]['name']=='Demo restart profile'
  passed('Profile persists across an actual native-helper stop and restart')
  success=True
 except Exception as e:
  failure=repr(e)
  try:page.screenshot(path=str(OUT/'Failure.png'))
  except Exception:pass
  raise
 finally:
  try:host.stop()
  finally:
   if appdata.exists():shutil.rmtree(appdata,ignore_errors=True)
  (OUT/'FIELD-CAMERA-RESULTS.json').write_text(json.dumps({'success':success,'failure':failure,'checks':checks,'errors':errors,'externalRequests':len(external),'environment':'GitHub Windows Server 2022; actual unpackaged .NET helper and installed Edge. Not Windows 11 packaged acceptance or IP-camera playback testing.','exampleData':'Demo profiles for UI verification; no user camera or credentials supplied.','sourceCommit':os.environ.get('GITHUB_SHA'),'sourceHashes':{p:hashlib.sha256((ROOT/p).read_bytes()).hexdigest() for p in ['app/src/field-cameras.js','app/src/field-camera-desk.js','app/src/field-cameras.css','app/src/app.js','native/AtlasHost.cs']}},indent=2),encoding='utf-8')
 return 0 if success else 1
if __name__=='__main__':raise SystemExit(main())
