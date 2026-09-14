"""Test saved weather display units in real native storage; no weather feed is simulated."""
import json
import os
from pathlib import Path
import re
import sys
from playwright.sync_api import sync_playwright, expect
from windows_native_smoke import NativeSmoke


def main():
    if os.name!='nt' or os.environ.get('GITHUB_ACTIONS')!='true' or os.environ.get('RUNNER_ENVIRONMENT')!='github-hosted':
        raise RuntimeError('Disposable GitHub-hosted Windows runner required.')
    exe=Path(os.environ['ATLAS_SMOKE_EXE']).resolve(strict=True)
    temp=Path(os.environ['RUNNER_TEMP']).resolve(strict=True)
    if not exe.is_relative_to(temp):raise RuntimeError('Executable must be in runner temp storage.')
    appdata=Path(NativeSmoke.powershell('[Environment]::GetFolderPath([Environment+SpecialFolder]::LocalApplicationData)'))/'AtlasCommand'
    if appdata.exists():raise RuntimeError('Refusing an existing app profile.')
    host=NativeSmoke(exe,appdata,temp)
    out=Path('weather-units-output');out.mkdir(exist_ok=True)
    checks=[];errors=[];requests=[];success=False
    def passed(text):checks.append(text);print('PASS: '+text,flush=True)
    try:
        host.start()
        with sync_playwright() as pw:
            browser=pw.chromium.launch(executable_path=host.edge,headless=True)
            context=browser.new_context(viewport={'width':1920,'height':1080})
            page=context.new_page();page.on('pageerror',lambda e:errors.append(str(e)))
            page.on('request',lambda r:requests.append(r.url) if not r.url.startswith('http://127.0.0.1:') else None)
            page.goto(host.url);page.locator('#boot').wait_for(state='detached')
            page.locator('#settingsBtn').click()
            us=page.locator('[data-weather-unit="us"]');metric=page.locator('[data-weather-unit="metric"]')
            expect(us).to_have_attribute('aria-pressed','true')
            assert page.evaluate('AtlasWorkspace.storageMode')=='native'
            passed('New workspace defaults to Fahrenheit and mph in the actual Settings UI')
            page.locator('#weatherUnitsControl').scroll_into_view_if_needed()
            page.screenshot(path=str(out/'Weather-Units-Settings.png'))
            # Do not assume a debounced initial workspace write has already occurred.
            us.click();expect(page.locator('[data-weather-unit-status]')).to_have_text('Saved locally: °F + mph')
            before=host.read_state()['sites']
            metric.click();expect(page.locator('[data-weather-unit-status]')).to_have_text('Saved locally: °C + km/h')
            assert host.read_state()['settings']['weatherUnits']=='metric'
            assert host.read_state()['sites']==before
            passed('Metric toggle saves to native disk without changing site records')
            page.reload();page.locator('#boot').wait_for(state='detached');page.locator('#settingsBtn').click()
            expect(metric).to_have_attribute('aria-pressed','true')
            passed('Unit preference survives renderer reload')
            # Failure fixture blocks only this test's local preference POST. No security policy is changed.
            def fail_write(route):
                if route.request.method=='POST':route.fulfill(status=503,body='Synthetic persistence failure')
                else:route.continue_()
            page.route('**/api/state-v2',fail_write)
            us.click();expect(page.locator('[data-weather-unit-status]')).to_contain_text('Could not confirm save.')
            expect(metric).to_have_attribute('aria-pressed','true')
            assert host.read_state()['settings']['weatherUnits']=='metric'
            page.unroute('**/api/state-v2',fail_write)
            passed('Failed local write is reported and previous in-memory units are restored')
            us.click();expect(page.locator('[data-weather-unit-status]')).to_have_text('Saved locally: °F + mph')
            assert host.read_state()['settings']['weatherUnits']=='us'
            page.locator('#dialog').press('Escape')
            page.locator('.site-item').last.click()
            page.locator('#settingsBtn').click();expect(us).to_have_attribute('aria-pressed','true')
            page.locator('#dialog').press('Escape')
            passed('Retry works; changing the selected location does not reset units')
            context.close();browser.close()
            host.stop();host.start()
            assert host.read_state()['settings']['weatherUnits']=='us'
            passed('Preference survives actual native-host stop and restart')
            assert not errors,errors
            assert not requests,'Unexpected external renderer request'
            passed('No uncaught page errors or external renderer requests during these tests')
        success=True
        return 0
    finally:
        report={'passed':success,'checks':checks,'sourceCommit':os.environ.get('GITHUB_SHA'),
                'environment':'Unpackaged native host and Edge on GitHub-hosted Windows Server 2022',
                'scope':'Settings units only; no live weather connected; not Windows 11 installation acceptance'}
        (out/'WEATHER-UNITS-RESULTS.json').write_text(json.dumps(report,indent=2),encoding='utf-8')
        try:host.stop()
        finally:host.cleanup()

if __name__=='__main__':raise SystemExit(main())
