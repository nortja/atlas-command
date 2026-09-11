"""Validate Atlas power-off/power-on behavior on a disposable hosted Windows runner.
This exercises the unpackaged owner preview only; it is not Windows 11 package acceptance.
"""
from pathlib import Path
import os,time
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
            selected_id=page.evaluate("AtlasWorkspace.sites.list().find(s=>s.name!=='Göbekli Tepe').id")
            page.evaluate("id=>{AtlasTest.select(id,true);AtlasTest.globe.target=null;AtlasTest.globe.lat=34.25;AtlasTest.globe.lon=-118.45;AtlasTest.globe.zoom=1.73;}",selected_id)
            page.locator('#shutdownBtn').dispatch_event('click')
            deadline=time.monotonic()+12
            while time.monotonic()<deadline and host.process.poll() is None:time.sleep(.1)
            assert host.process.poll()==0,'Shutdown button did not stop the native host cleanly.'
            context.close()
            host.start()
            context=browser.new_context(viewport={'width':1600,'height':1000})
            page=context.new_page();page.goto(host.url,wait_until='domcontentloaded');page.wait_for_selector('#shutdownBtn')
            restored=page.evaluate("({lat:AtlasTest.globe.lat,lon:AtlasTest.globe.lon,zoom:AtlasTest.globe.zoom,selected:AtlasTest.globe.selected})")
            assert abs(restored['lat']-34.25)<.02 and abs(restored['lon']+118.45)<.02 and abs(restored['zoom']-1.73)<.02
            assert restored['selected']==selected_id
            print('PASS: Small red shutdown control stops Atlas cleanly and releases the native host.',flush=True)
            print('PASS: A normal restart restores the last globe position, zoom and selected site.',flush=True)
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
