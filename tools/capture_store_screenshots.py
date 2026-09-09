"""Capture the existing, unmodified Atlas Command MSIX payload on a disposable Windows runner.
No mock UI, DOM rewriting, generated images, signatures, Store submissions or endpoint exclusions.
Only PNG screenshots and a provenance report are retained. All data is starter/demo data.
"""
from __future__ import annotations
import hashlib
import http.client
import io
import json
import os
from pathlib import Path
import re
import shutil
import struct
import subprocess
import sys
import time
from urllib.parse import urlsplit
from urllib.request import urlopen
import uuid
import zipfile
from playwright.sync_api import sync_playwright

REPO = 'nortja/atlas-command'
ARTIFACT_ID = 10088636799
ARTIFACT_SHA256 = '93aafb621467822e79f297c85eaa7b4d5e1d6d66b0cc266855864579f91affe0'
MSIX_SHA256 = '5154c573d351e89f98164299ee5b2291af2806ae431e3bf4c57142312334e2f9'
WIDTH, HEIGHT = 2560, 1440


def powershell(code):
    r = subprocess.run(['pwsh', '-NoLogo', '-NoProfile', '-NonInteractive', '-Command',
        '$ErrorActionPreference="Stop"; ' + code], check=True, capture_output=True, timeout=25)
    return r.stdout.decode('utf-8-sig').strip()


def extract_safe(archive, destination):
    destination = destination.resolve()
    for info in archive.infolist():
        p = (destination / info.filename).resolve()
        if not p.is_relative_to(destination):
            raise RuntimeError('Unsafe archive path')
    archive.extractall(destination)


def download_package(stage):
    token = os.environ.pop('GH_TOKEN')
    c = http.client.HTTPSConnection('api.github.com', timeout=30)
    try:
        c.request('GET', f'/repos/{REPO}/actions/artifacts/{ARTIFACT_ID}/zip', headers={
            'Authorization': 'Bearer ' + token, 'Accept': 'application/vnd.github+json',
            'User-Agent': 'AtlasCommand-Screenshot-Capture'})
        r = c.getresponse()
        if r.status != 302:
            raise RuntimeError('Artifact download did not return the expected redirect: ' + str(r.status))
        location = r.getheader('Location')
        r.read()
    finally:
        c.close()
    # Never forward the GitHub token to the artifact-storage host.
    if urlsplit(location).scheme != 'https':
        raise RuntimeError('Artifact redirect is not HTTPS')
    with urlopen(location, timeout=45) as response:
        data = response.read(10 * 1024 * 1024)
    if hashlib.sha256(data).hexdigest() != ARTIFACT_SHA256:
        raise RuntimeError('Artifact hash mismatch')
    with zipfile.ZipFile(io.BytesIO(data)) as outer:
        candidates = [n for n in outer.namelist() if n.lower().endswith('.msix')]
        if len(candidates) != 1:
            raise RuntimeError('Expected exactly one MSIX')
        package = outer.read(candidates[0])
    if hashlib.sha256(package).hexdigest() != MSIX_SHA256:
        raise RuntimeError('MSIX hash mismatch')
    with zipfile.ZipFile(io.BytesIO(package)) as inner:
        extract_safe(inner, stage)
    return stage / 'AtlasCommand.exe'


def close_native_browser(profile):
    quoted = str(profile).replace("'", "''")
    powershell("$needle = '--user-data-dir=\"" + quoted + "\"'; "
        "Get-CimInstance Win32_Process -Filter \"Name='msedge.exe'\" | "
        "Where-Object { $_.CommandLine -and $_.CommandLine.Contains($needle) } | "
        "ForEach-Object { & \"$env:SystemRoot\\System32\\taskkill.exe\" /PID $_.ProcessId /T /F | Out-Null }")


def observe_native_url(proc):
    deadline = time.monotonic() + 40
    while time.monotonic() < deadline:
        if proc.poll() is not None:
            raise RuntimeError('Native host exited before screenshot capture')
        raw = powershell(f"@(Get-CimInstance Win32_Process -Filter \"ParentProcessId={proc.pid} AND Name='msedge.exe'\" | "
            "Select-Object CommandLine) | ConvertTo-Json -Compress")
        rows = json.loads(raw) if raw else []
        if isinstance(rows, dict):
            rows = [rows]
        for row in rows:
            m = re.search(r'--app="(http://127\.0\.0\.1:\d+/[a-f0-9]{32}/index\.html)"', row.get('CommandLine') or '')
            if m:
                return m.group(1)
        time.sleep(0.3)
    raise RuntimeError('Could not observe the native Edge launch')


def stop_native(url, proc):
    if not url or proc.poll() is not None:
        return
    u = urlsplit(url)
    c = http.client.HTTPConnection(u.hostname, u.port, timeout=10)
    try:
        c.request('POST', u.path.rsplit('/', 1)[0] + '/api/exit', body=b'', headers={'X-Atlas-Request': 'local'})
        c.getresponse().read()
    finally:
        c.close()
    proc.wait(timeout=10)


def settle(page):
    page.mouse.move(5, 5)
    page.wait_for_timeout(1800)
    page.locator('#toast').wait_for(state='hidden', timeout=10000)


def move_panel(page, selector, dx, dy):
    b = page.locator(selector + ' .panel-handle').bounding_box()
    x, y = b['x'] + 90, b['y'] + 23
    page.mouse.move(x, y)
    page.mouse.down()
    page.mouse.move(x + dx, y + dy, steps=12)
    page.mouse.up()


def resize_panel(page, selector, width, height):
    b = page.locator(selector).bounding_box()
    r = page.locator(selector + ' .resize-handle').bounding_box()
    x, y = r['x'] + r['width']/2, r['y'] + r['height']/2
    page.mouse.move(x, y)
    page.mouse.down()
    page.mouse.move(x + width - b['width'], y + height - b['height'], steps=12)
    page.mouse.up()


def capture_pages(page, out):
    page.locator('#boot').wait_for(state='detached', timeout=30000)
    page.wait_for_timeout(1200)
    if page.locator('.site-item').count() != 26:
        raise RuntimeError('Expected the 26 unmodified starter records')
    if 'SAVED ON THIS PC' not in page.locator('#storageBadge').inner_text():
        raise RuntimeError('Screenshot renderer is not using the real native host')
    # All interactions are ordinary UI actions; never change the DOM, CSS or app code.
    if 'Pause' in page.locator('#spinBtn').inner_text():
        page.locator('#spinBtn').click()
    page.locator('#layer-atmosphere').check()
    settle(page)
    page.screenshot(path=str(out / '01-Atlas-Command-Observatory.png'))
    print('Captured: Observatory', flush=True)

    page.locator('.site-item').filter(has_text='Göbekli Tepe').click()
    settle(page)
    page.screenshot(path=str(out / '02-Atlas-Command-Site-Intelligence.png'))
    print('Captured: Site intelligence', flush=True)

    page.locator('#planPanel .collapse').click()
    move_panel(page, '#planPanel', 0, 350)
    resize_panel(page, '#dossierPanel', 365, 1080)
    page.locator('[data-tab="research"]').click()
    page.locator('#exactYear').fill('-9000')
    page.locator('#exactYear').press('Tab')
    page.locator('#filterTime').check()
    settle(page)
    page.screenshot(path=str(out / '03-Atlas-Command-Timeline-Research.png'))
    print('Captured: Timeline and research', flush=True)

    page.locator('#filterTime').uncheck()
    page.locator('#presentBtn').click()
    page.locator('#resetLayout').click()
    page.locator('.site-item').filter(has_text='Caral-Supe').click()
    page.locator('[data-tab="overview"]').click()
    page.locator('#queueBtn').click()
    page.locator('#planBtn').click()
    page.locator('#planForm [name="origin"]').fill('Fresno · FAT — illustrative budget')
    for key, value in {'budgetCap':'2500','transport':'1100','lodging':'350','guide':'200','permits':'50','other':'300'}.items():
        page.locator('#planForm [name="' + key + '"]').fill(value)
    page.locator('#dialogContent .dialog-head h2').click()
    settle(page)
    page.screenshot(path=str(out / '04-Atlas-Command-Expedition-Planner.png'))
    print('Captured: Expedition planner', flush=True)


def main():
    if os.name != 'nt' or os.environ.get('GITHUB_ACTIONS') != 'true' or os.environ.get('RUNNER_ENVIRONMENT') != 'github-hosted':
        raise RuntimeError('For a disposable GitHub-hosted Windows runner only')
    temp = Path(os.environ['RUNNER_TEMP']).resolve()
    stage = temp / ('atlas-capture-' + uuid.uuid4().hex)
    stage.mkdir()
    appdata = Path(powershell('[Environment]::GetFolderPath([Environment+SpecialFolder]::LocalApplicationData)')) / 'AtlasCommand'
    if appdata.exists():
        raise RuntimeError('Refusing to touch an existing Atlas Command profile')
    out = Path('screenshots-output')
    out.mkdir(exist_ok=True)
    proc = None
    url = ''
    try:
        exe = download_package(stage)
        proc = subprocess.Popen([str(exe)], cwd=stage)
        url = observe_native_url(proc)
        close_native_browser(appdata / 'Browser')
        time.sleep(1)
        with sync_playwright() as p:
            browser = p.chromium.launch(channel='msedge', headless=True)
            try:
                page = browser.new_page(viewport={'width':WIDTH, 'height':HEIGHT}, device_scale_factor=1)
                errors = []
                page.on('pageerror', lambda error: errors.append(str(error)))
                page.goto(url, wait_until='load')
                try:
                    capture_pages(page, out)
                except Exception:
                    page.screenshot(path=str(out / 'DIAGNOSTIC-NOT-FOR-STORE.png'))
                    raise
                if errors:
                    raise RuntimeError('Renderer errors occurred: ' + '; '.join(errors))
                version = browser.version
            finally:
                browser.close()
        stop_native(url, proc)
        captures = []
        for f in sorted(out.glob('0*.png')):
            raw = f.read_bytes()
            if raw[:8] != b'\x89PNG\r\n\x1a\n' or struct.unpack('>II', raw[16:24]) != (WIDTH, HEIGHT):
                raise RuntimeError('Screenshot dimensions or format are wrong')
            captures.append({'file':f.name,'width':WIDTH,'height':HEIGHT,'bytes':len(raw),'sha256':hashlib.sha256(raw).hexdigest()})
        if len(captures) != 4:
            raise RuntimeError('Expected exactly four screenshots')
        report = {
            'kind':'Direct screenshots of the real native-hosted app interface',
            'captureCommit':os.environ.get('GITHUB_SHA'),
            'appPackageSourceCommit':'480595180a5889b692604dda2fed09e4f89fc056',
            'artifactId':ARTIFACT_ID,'artifactSha256':ARTIFACT_SHA256,'msixSha256':MSIX_SHA256,
            'captureOS':str(sys.getwindowsversion()),'browser':'Microsoft Edge '+version,
            'renderer':'Unmodified files extracted from the existing MSIX; unmodified AtlasCommand.exe, real native storage',
            'method':'Playwright drives ordinary UI controls and directly saves PNGs; no mock adapter, DOM rewriting or image generation',
            'data':'26 shipped starter records; the fourth shot contains an explicitly illustrative manually entered budget',
            'scope':'Unpackaged execution of the existing package payload on Windows Server 2022. Not proof of Windows 11 packaged-install compatibility or Store certification.',
            'files':captures}
        (out/'CAPTURE-PROVENANCE.json').write_text(json.dumps(report,indent=2),encoding='utf-8')
        with open(os.environ['GITHUB_STEP_SUMMARY'],'a',encoding='utf-8') as f:
            f.write('## Four actual Atlas Command screenshots captured\n\n2560 x 1440 PNG; unmodified native Windows payload with Edge. No Store upload or installation on the owner PC.\n')
        return 0
    finally:
        if proc is not None and proc.poll() is None:
            try: stop_native(url,proc)
            except Exception: proc.terminate(); proc.wait(timeout=10)
        if appdata.exists():
            close_native_browser(appdata / 'Browser')
            shutil.rmtree(appdata,ignore_errors=True)
        shutil.rmtree(stage,ignore_errors=True)


if __name__ == '__main__':
    raise SystemExit(main())
