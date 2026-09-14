"""Real native ciphertext persistence and UI, only on a fresh disposable runner."""
from pathlib import Path
import json
import os
from playwright.sync_api import sync_playwright
from windows_native_smoke import NativeSmoke

PASS = 'orchid river moon granite lantern'
SECRET = 'team-native-private-marker-34.2500'


def main():
    if os.name != 'nt' or os.environ.get('GITHUB_ACTIONS') != 'true' or os.environ.get('RUNNER_ENVIRONMENT') != 'github-hosted':
        raise RuntimeError('Disposable GitHub-hosted Windows runner required.')
    exe = Path(os.environ['ATLAS_SMOKE_EXE']).resolve(strict=True)
    temp = Path(os.environ['RUNNER_TEMP']).resolve(strict=True)
    if not exe.is_relative_to(temp):
        raise RuntimeError('Executable must be staged under runner temp.')
    appdata = Path(NativeSmoke.powershell('[Environment]::GetFolderPath([Environment+SpecialFolder]::LocalApplicationData)')) / 'AtlasCommand'
    if appdata.exists():
        raise RuntimeError('Existing workspace found; refusing to touch it.')
    host = NativeSmoke(exe, appdata, temp)
    headers = {'X-Atlas-Request': 'local', 'Content-Type': 'application/json'}
    errors, logs, requests = [], [], []
    try:
        host.start()
        host.expect('POST', 'api/team-device', 403)
        identity = json.loads(host.expect('POST', 'api/team-device', 200, headers=headers)[2])
        assert identity['protection'] == 'windows-current-user' and len(identity['id']) == 64
        device_path = appdata / 'TeamSecrets' / 'device.bin'
        protected_device = device_path.read_bytes()
        assert len(protected_device) > 32 and identity['id'].encode() not in protected_device
        host.expect('GET', 'TeamSecrets/device.bin', 404)
        host.expect('GET', 'api/team-vault', 403)
        assert host.expect('GET', 'api/team-vault', 200, headers=headers)[2] == b'null'
        with sync_playwright() as pw:
            browser = pw.chromium.launch(channel='msedge', headless=True)
            page = browser.new_page()
            page.route('https://**/*', lambda route: route.abort())
            page.on('pageerror', lambda e: errors.append(type(e).__name__))
            page.on('console', lambda m: logs.append(m.text))
            page.on('request', lambda r: requests.append(r.url + (r.post_data or '')))
            page.goto(host.url, wait_until='domcontentloaded')
            page.wait_for_function('!!window.AtlasWorkspace')
            catalog = page.evaluate('JSON.stringify(AtlasWorkspace.sites.list())')
            page.locator('#collaborationBtn').click()
            page.get_by_label('Workspace name', exact=True).fill('Native research')
            page.get_by_label('Passphrase', exact=True).fill(PASS)
            page.get_by_role('button', name='Create encrypted workspace', exact=True).click()
            page.get_by_label('Text', exact=True).fill(SECRET)
            page.get_by_role('button', name='Save message', exact=True).click()
            page.locator('#teamVaultDialog article').filter(has_text=SECRET).wait_for()
            page.get_by_role('button', name='Members', exact=True).click()
            page.get_by_label('Member name', exact=True).fill('Native Viewer')
            page.get_by_label('Role', exact=True).select_option('Viewer')
            page.get_by_label('Enrollment passphrase', exact=True).fill('native viewer willow lantern stone')
            page.get_by_role('button', name='Add local member', exact=True).click()
            page.get_by_text('Native Viewer · Viewer', exact=True).wait_for()
            page.get_by_role('button', name='Switch member', exact=True).click()
            page.get_by_label('Local identity', exact=True).select_option(label='Native Viewer')
            page.get_by_label('Member passphrase', exact=True).fill('native viewer willow lantern stone')
            page.get_by_role('button', name='Sign in', exact=True).click()
            page.get_by_role('button', name='Private chat', exact=True).click()
            page.get_by_text('Viewer access · read only.', exact=True).wait_for()
            assert page.locator('#teamVaultDialog article').count() == 0
            assert page.get_by_role('button', name='Save message', exact=True).count() == 0
            page.get_by_role('button', name='Backup & privacy', exact=True).click()
            assert page.get_by_role('button', name='Export encrypted backup', exact=True).count() == 0
            assert page.evaluate('JSON.stringify(AtlasWorkspace.sites.list())') == catalog
            page.get_by_role('button', name='Lock & close', exact=True).click()
            assert not page.locator('#teamVaultDialog').inner_text()
            browser.close()
        vault = appdata / 'TeamWorkspace' / 'vault.json'
        saved = json.loads(vault.read_text('utf-8'))
        assert saved['revision'] == 3
        assert (vault.parent / 'vault.json.bak').is_file()
        for file in appdata.rglob('*'):
            if file.is_file() and file.suffix in ('.json', '.log', '.tmp', '.bak'):
                assert SECRET.encode() not in file.read_bytes()
                assert PASS.encode() not in file.read_bytes()
        assert SECRET not in json.dumps(host.read_state())
        assert not errors
        assert SECRET not in ''.join(logs) and PASS not in ''.join(logs)
        assert SECRET not in ''.join(requests) and PASS not in ''.join(requests)
        body = json.dumps({'expected': 0, 'envelope': saved}).encode()
        host.expect('POST', 'api/team-vault', 403, body=body)
        host.expect('POST', 'api/team-vault', 409, body=body, headers=headers)
        host.expect('POST', 'api/team-vault', 403, body=body, headers={**headers, 'Origin': 'https://invalid.example'})
        for invalid in [SECRET.encode(), json.dumps({'expected': 2, 'envelope': {**saved, 'plaintext': SECRET}}).encode()]:
            response = host.expect('POST', 'api/team-vault', 400, body=invalid, headers=headers)
            assert SECRET.encode() not in response[2]
        assert json.loads(vault.read_text('utf-8')) == saved
        for file in appdata.rglob('*.log'):
            assert SECRET.encode() not in file.read_bytes()
        host.expect('GET', 'TeamWorkspace/vault.json', 404)
        host.stop()
        host.start()
        assert json.loads(host.expect('POST', 'api/team-device', 200, headers=headers)[2]) == identity
        with sync_playwright() as pw:
            browser = pw.chromium.launch(channel='msedge', headless=True)
            page = browser.new_page()
            page.route('https://**/*', lambda route: route.abort())
            page.goto(host.url, wait_until='domcontentloaded')
            page.locator('#collaborationBtn').click()
            page.get_by_label('Passphrase', exact=True).fill(PASS)
            page.get_by_role('button', name='Unlock workspace', exact=True).click()
            page.get_by_role('button', name='Private chat', exact=True).click()
            page.locator('#teamVaultDialog article').filter(has_text=SECRET).wait_for()
            browser.close()
        host.stop()
        host.start()
        device_path.write_bytes(b'corrupt-protected-device')
        host.expect('POST', 'api/team-device', 400, headers=headers)
        assert device_path.read_bytes() == b'corrupt-protected-device'
        host.stop()
        print('PASS: native encrypted team persistence, authenticated Viewer, DPAPI identity, guards, CAS, diagnostics isolation and restart.', flush=True)
    finally:
        host.cleanup()


if __name__ == '__main__':
    main()
