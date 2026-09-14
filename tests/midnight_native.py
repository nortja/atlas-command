"""Offline Midnight desk in the real host, disposable Windows runner only."""
from pathlib import Path
import os
from playwright.sync_api import sync_playwright
from windows_native_smoke import NativeSmoke

def main():
    if os.name!='nt' or os.environ.get('GITHUB_ACTIONS')!='true' or os.environ.get('RUNNER_ENVIRONMENT')!='github-hosted':
        raise RuntimeError('Disposable GitHub-hosted Windows runner required.')
    exe=Path(os.environ['ATLAS_SMOKE_EXE']).resolve(strict=True)
    temp=Path(os.environ['RUNNER_TEMP']).resolve(strict=True)
    if not exe.is_relative_to(temp):raise RuntimeError('Executable must be in runner temp.')
    appdata=Path(NativeSmoke.powershell('[Environment]::GetFolderPath([Environment+SpecialFolder]::LocalApplicationData)'))/'AtlasCommand'
    if appdata.exists():raise RuntimeError('Existing workspace found; refusing to touch it.')
    host=NativeSmoke(exe,appdata,temp)
    try:
        host.start()
        with sync_playwright() as pw:
            browser=pw.chromium.launch(executable_path=host.edge,headless=True)
            try:
                page=browser.new_page();errors=[];external=[]
                page.on('pageerror',lambda error:errors.append(type(error).__name__))
                page.on('request',lambda request:external.append('unexpected') if not request.url.startswith(host.url.rsplit('/',1)[0]+'/') else None)
                page.goto(host.url);page.locator('#privacyBtn').wait_for(state='attached');page.evaluate('AtlasTest.flush()')
                original=(appdata/'Data'/'workspace.json').read_bytes()
                page.locator('#privacyBtn').click();page.locator('#midnightReadinessBtn').click()
                page.locator('[data-midnight-tab="capacity"]').click()
                page.locator('#midnightPaused').select_option('false')
                page.locator('#midnightAcknowledged').check();page.locator('#midnightReview').click();page.locator('#midnightRun').click()
                assert 'Nothing was sent' in page.locator('#midnightResult').inner_text()
                assert page.locator('#midnightRun').is_disabled()
                page.locator('#midnightClose').click();page.locator('#midnightDesk').wait_for(state='hidden')
                assert (appdata/'Data'/'workspace.json').read_bytes()==original
                assert not errors and not external
                host.passed('Native Midnight rehearsal is usable, single-use and leaves workspace bytes unchanged without external requests')
            finally:browser.close()
        host.stop()
    finally:host.cleanup()

if __name__=='__main__':main()
