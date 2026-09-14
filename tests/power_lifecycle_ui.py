"""Validate Atlas power-off/power-on behavior on a disposable hosted Windows runner.
This exercises the unpackaged owner preview only; it is not Windows 11 package acceptance.
"""
from pathlib import Path
import json,os,time,subprocess
from playwright.sync_api import sync_playwright
from windows_native_smoke import NativeSmoke


def main():
    if os.name!='nt' or os.environ.get('GITHUB_ACTIONS')!='true' or os.environ.get('RUNNER_ENVIRONMENT')!='github-hosted':
        raise RuntimeError('Disposable GitHub-hosted Windows runner required.')
    exe=Path(os.environ['ATLAS_SMOKE_EXE']).resolve(strict=True)
    temp=Path(os.environ['RUNNER_TEMP']).resolve(strict=True)
    appdata=Path(NativeSmoke.powershell('[Environment]::GetFolderPath([Environment+SpecialFolder]::LocalApplicationData)'))/'AtlasCommand'
    if appdata.exists():raise RuntimeError('Existing workspace found; refusing to touch it.')
    host=NativeSmoke(exe,appdata,temp)
    browser=None
    try:
        host.start()
        with sync_playwright() as pw:
            browser=pw.chromium.launch(channel='msedge',headless=True)
            context=browser.new_context(viewport={'width':1600,'height':1000})
            page=context.new_page();page.goto(host.url,wait_until='domcontentloaded');page.wait_for_selector('#shutdownBtn')
            box=page.locator('#shutdownBtn').bounding_box();assert box and box['width']<=34 and box['height']<=34
            runtime_session=appdata/'runtime-session.txt';deadline=time.monotonic()+5
            while time.monotonic()<deadline and not runtime_session.exists():time.sleep(.05)
            assert runtime_session.exists() and runtime_session.read_text('utf-8').strip()==host.url
            second=subprocess.run([str(exe)],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL,timeout=10,check=False)
            assert second.returncode==0,'Second launch did not return after asking the existing Atlas session to reopen.'
            assert host.process.poll() is None,'Second launch must not replace the existing native host.'
            print('PASS: Launching Atlas again while it is already running reopens the validated local session instead of blocking on an already-running dialog.',flush=True)
            # The second-launch check opened a real Edge profile alongside this
            # headless driver. Isolate the single writer before changing/saving
            # the globe, and prevent Edge process reuse from defeating the next
            # start() check's deliberately strict parent-process observation.
            # This closes only the exact disposable profile, not the app host.
            host.close_profile(appdata/'Browser')
            assert host.process.poll() is None
            selected_id=page.evaluate("AtlasWorkspace.sites.list().find(s=>s.name!=='Göbekli Tepe').id")
            page.evaluate("id=>{AtlasTest.select(id,true);AtlasTest.globe.spin=false;AtlasTest.globe.target=null;AtlasTest.globe.lat=34.25;AtlasTest.globe.lon=-118.45;AtlasTest.globe.zoom=1.73;}",selected_id)
            page.locator('#shutdownBtn').dispatch_event('click')
            deadline=time.monotonic()+12
            while time.monotonic()<deadline and host.process.poll() is None:time.sleep(.1)
            assert host.process.poll()==0,'Shutdown button did not stop the native host cleanly.'
            state_path=appdata/'Data'/'workspace.json'
            saved=json.loads(state_path.read_text('utf-8'))['settings']['globeView']
            assert abs(saved['lat']-34.25)<.001 and abs(saved['lon']+118.45)<.001 and abs(saved['zoom']-1.73)<.001
            assert saved['selectedId']==selected_id
            assert saved['spin'] is False
            deadline=time.monotonic()+3
            while time.monotonic()<deadline and runtime_session.exists():time.sleep(.05)
            assert not runtime_session.exists(),'Clean shutdown left a stale runtime-session file.'
            context.close()
            host.start()
            context=browser.new_context(viewport={'width':1600,'height':1000})
            page=context.new_page();page.goto(host.url,wait_until='domcontentloaded');page.wait_for_selector('#shutdownBtn')
            restored=page.evaluate("({lat:AtlasTest.globe.lat,lon:AtlasTest.globe.lon,zoom:AtlasTest.globe.zoom,selected:AtlasTest.globe.selected})")
            assert abs(restored['lat']-34.25)<.02 and abs(restored['lon']+118.45)<.02 and abs(restored['zoom']-1.73)<.02,restored
            assert restored['selected']==selected_id
            assert page.evaluate('AtlasTest.globe.spin') is False
            print('PASS: Small red shutdown control freezes the map, saves Atlas cleanly and releases the native host.',flush=True)
            print('PASS: A normal restart restores the saved globe position, zoom and selected site.',flush=True)
            host.stop();context.close();browser.close();browser=None
    finally:
        if browser:
            try:browser.close()
            except Exception:pass
        try:host.stop()
        except Exception:pass
        host.cleanup()
    return 0

if __name__=='__main__':raise SystemExit(main())
