"""Exercise the real, unmodified native host on a disposable GitHub Windows runner.

Uses only Python's standard library and the runner's existing Edge installation.
No certificates, elevation, endpoint exclusions, external test data, or fixtures in
user folders are installed. This is NOT a Windows 10/11 installation acceptance test.
"""
from __future__ import annotations

import base64
import copy
import hashlib
import http.client
import json
import os
from pathlib import Path
import re
import shutil
import subprocess
import sys
import time
from urllib.parse import urlsplit
import uuid


class NativeSmoke:
    def __init__(self, exe: Path, appdata: Path, temp: Path):
        self.exe = exe
        self.appdata = appdata
        self.temp = temp
        self.process: subprocess.Popen | None = None
        self.url = ''
        self.edge = ''
        self.profiles: list[Path] = []
        self.checks: list[str] = []

    @staticmethod
    def powershell(code: str) -> str:
        result = subprocess.run(
            ['pwsh', '-NoLogo', '-NoProfile', '-NonInteractive', '-Command',
             '$ErrorActionPreference="Stop"; ' + code],
            capture_output=True, timeout=20, check=True)
        return result.stdout.decode('utf-8-sig').strip()

    def passed(self, name: str) -> None:
        self.checks.append(name)
        print('PASS:', name, flush=True)

    def close_profile(self, profile: Path) -> None:
        # Close only Edge processes with this test's exact isolated profile.
        quoted = str(profile).replace("'", "''")
        self.powershell(
            "$needle = '--user-data-dir=\"" + quoted + "\"'; "
            "Get-CimInstance Win32_Process -Filter \"Name='msedge.exe'\" | "
            "Where-Object { $_.CommandLine -and $_.CommandLine.Contains($needle) } | "
            "ForEach-Object { & \"$env:SystemRoot\\System32\\taskkill.exe\" /PID $_.ProcessId /T /F | Out-Null }")

    def start(self) -> None:
        self.process = subprocess.Popen([str(self.exe)], cwd=self.exe.parent)
        deadline = time.monotonic() + 35
        while time.monotonic() < deadline:
            if self.process.poll() is not None:
                raise RuntimeError('Native host exited during startup.')
            # Read the URL from this host's child only. Never print the per-run URL.
            raw = self.powershell(
                f"@(Get-CimInstance Win32_Process -Filter \"ParentProcessId={self.process.pid} AND Name='msedge.exe'\" | "
                "Select-Object ProcessId, CommandLine, ExecutablePath) | ConvertTo-Json -Compress")
            rows = json.loads(raw) if raw else []
            if isinstance(rows, dict):
                rows = [rows]
            for row in rows:
                match = re.search(r'--app="(http://127\.0\.0\.1:\d+/[a-f0-9]{32}/index\.html)"', row.get('CommandLine') or '')
                if match:
                    self.url = match.group(1)
                    self.edge = row['ExecutablePath']
                    self.expect('GET', 'api/heartbeat', 200)
                    # Avoid a second renderer overwriting API test data in the background.
                    self.close_profile(self.appdata / 'Browser')
                    time.sleep(0.7)
                    return
            time.sleep(0.25)
        raise RuntimeError('Could not observe the native host launching Edge within 35 seconds.')

    def request(self, method: str, relative: str, body: bytes = b'',
                headers: dict[str, str] | None = None,
                absolute_path: str | None = None) -> tuple[int, dict[str, str], bytes]:
        parsed = urlsplit(self.url)
        path = absolute_path or parsed.path.rsplit('/', 1)[0] + '/' + relative
        connection = http.client.HTTPConnection(parsed.hostname, parsed.port, timeout=12)
        try:
            connection.request(method, path, body=body if method == 'POST' else None, headers=headers or {})
            response = connection.getresponse()
            return response.status, dict((k.lower(), v) for k, v in response.getheaders()), response.read()
        finally:
            connection.close()

    def expect(self, method: str, relative: str, status: int, **kwargs):
        result = self.request(method, relative, **kwargs)
        if result[0] != status:
            raise AssertionError(f'{method} {relative}: expected HTTP {status}; received {result[0]}.')
        return result

    def save(self, state: dict, expected: int = 200):
        return self.expect('POST', 'api/state', expected,
            body=json.dumps(state, ensure_ascii=False).encode('utf-8'),
            headers={'Content-Type': 'application/json', 'X-Atlas-Request': 'local'})

    def read_state(self):
        return json.loads(self.expect('GET', 'api/state', 200)[2])

    def render(self) -> None:
        profile = self.temp / ('atlas-edge-test-' + uuid.uuid4().hex)
        self.profiles.append(profile)
        args = [self.edge, '--headless', '--disable-gpu', '--no-first-run',
                '--no-default-browser-check', '--disable-background-networking',
                '--disable-component-update', '--dump-dom', '--timeout=10000',
                '--virtual-time-budget=2500', '--user-data-dir=' + str(profile), self.url]
        proc = subprocess.Popen(args, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        try:
            stdout, _ = proc.communicate(timeout=45)
            if proc.returncode != 0:
                raise RuntimeError('Edge headless rendering returned an error.')
            document = stdout.decode('utf-8', errors='replace')
            if 'id="boot"' in document:
                raise AssertionError('The native-served renderer did not clear its startup screen.')
            if document.count('class="site-item ') != 26:
                raise AssertionError('The native-served renderer did not display its 26 starter records.')
            if 'SAVED ON THIS PC' not in document:
                raise AssertionError('Renderer did not select native storage mode.')
        finally:
            if proc.poll() is None:
                subprocess.run([str(Path(os.environ['SystemRoot']) / 'System32' / 'taskkill.exe'),
                                '/PID', str(proc.pid), '/T', '/F'], capture_output=True, timeout=15)
                proc.communicate(timeout=10)
        time.sleep(0.7)

    def stop(self) -> None:
        if self.process is None or self.process.poll() is not None:
            return
        self.expect('POST', 'api/exit', 200, headers={'X-Atlas-Request': 'local'})
        if self.process.wait(timeout=10) != 0:
            raise AssertionError('Host exit was not clean.')

    def run(self) -> None:
        self.start()
        self.passed('Unmodified host starts and launches its isolated Edge profile')
        _, headers, _ = self.expect('GET', 'index.html', 200)
        assert headers.get('x-content-type-options') == 'nosniff'
        assert "frame-ancestors 'none'" in headers.get('content-security-policy', '')
        assert headers.get('cache-control') == 'no-store'
        self.passed('Native HTTP responses provide expected security headers')
        for path in ['src/app.js', 'src/core.js', 'src/globe.js', 'src/styles.css',
                     'assets/world.js', 'assets/icon.svg', 'data/seed.js']:
            self.expect('GET', path, 200)
        self.passed('All renderer assets are available through the real local host')
        self.render()
        self.passed('Existing Edge renders 26 starter records using the native host, without a mock storage adapter')
        self.expect('GET', 'index.html', 403, headers={'Host': 'untrusted.invalid'})
        self.expect('GET', 'api/state', 403, headers={'Origin': 'https://untrusted.invalid'})
        self.expect('GET', 'api/state', 403, headers={'Sec-Fetch-Site': 'cross-site'})
        self.expect('GET', '', 404, absolute_path='/wrong-session/index.html')
        self.passed('Wrong host, origin, initiating site and session path are refused')
        self.expect('GET', '%2e%2e/AtlasCommand.exe', 403)
        self.expect('GET', 'AtlasCommand.exe', 404)
        self.expect('GET', 'workspace.json', 404)
        self.passed('Path traversal, executable serving and direct workspace serving are refused')
        self.expect('POST', 'api/state', 403, body=b'{}', headers={'Content-Type': 'application/json'})
        self.passed('An unmarked cross-context write is refused')
        initial = {'schemaVersion': 1, 'sites': [
            {'id': 'native-qa', 'name': 'Synthetic QA site', 'lat': 0, 'lon': 0,
             'category': 'personal', 'notes': 'Test-only note with Unicode: Göbekli'}],
            'settings': {}, 'queue': [], 'layout': {}, 'plan': {}}
        self.save(initial)
        assert self.read_state() == initial
        statefile = self.appdata / 'Data' / 'workspace.json'
        assert json.loads(statefile.read_text(encoding='utf-8')) == initial
        self.passed('A synthetic zero-coordinate record is saved to disk and read back exactly')
        updated = copy.deepcopy(initial)
        updated['sites'][0]['notes'] = 'Revised synthetic test note'
        self.save(updated)
        assert self.read_state() == updated
        assert json.loads(statefile.with_suffix('.json.bak').read_text(encoding='utf-8')) == initial
        assert list((self.appdata / 'Data').glob('backup-*.json'))
        self.passed('Atomic replacement retains the previous workspace and a daily backup')
        for bad in [dict(updated, schemaVersion=999), dict(updated, sites=updated['sites'] * 2)]:
            self.save(bad, expected=400)
            assert self.read_state() == updated
        bad = copy.deepcopy(updated)
        bad['sites'][0]['lat'] = 91
        self.save(bad, expected=400)
        self.expect('POST', 'api/state', 400, body=b'{not json',
                    headers={'Content-Type': 'application/json', 'X-Atlas-Request': 'local'})
        assert self.read_state() == updated
        self.passed('Invalid schema, duplicate identifiers, coordinates and malformed JSON preserve saved data')
        image = base64.b64decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aXioAAAAASUVORK5CYII=')
        key = str(uuid.uuid4()) + '.png'
        upload = {'body': image, 'headers': {'Content-Type': 'image/png', 'X-Atlas-Request': 'local'}}
        self.expect('POST', 'api/media/' + key, 200, **upload)
        assert self.expect('GET', 'api/media/' + key, 200)[2] == image
        self.expect('POST', 'api/media/' + key, 400, **upload)
        assert self.expect('GET', 'api/media/' + key, 200)[2] == image
        self.passed('A synthetic attachment is saved intact; duplicate upload cannot overwrite it')
        assert self.expect('GET', 'api/media/' + key, 206, headers={'Range': 'bytes=0-7'})[2] == image[:8]
        self.expect('GET', 'api/media/' + key, 416, headers={'Range': 'bytes=999999-'})
        self.expect('POST', 'api/media/' + str(uuid.uuid4()) + '.exe', 400, **upload)
        self.passed('Attachment byte ranges work and unsupported file extensions are refused')
        old_url = self.url
        self.stop()
        self.passed('Native exit request stops the host cleanly')
        self.start()
        assert self.url != old_url
        # Startup normalization may add optional fields; user-entered values must survive.
        restarted = self.read_state()['sites'][0]
        assert restarted['id'] == 'native-qa'
        assert restarted['notes'] == updated['sites'][0]['notes']
        assert restarted['lat'] == 0 and restarted['lon'] == 0
        assert self.expect('GET', 'api/media/' + key, 200)[2] == image
        self.stop()
        self.passed('Saved notes, coordinates and attachment bytes survive an actual host restart')

    def cleanup(self) -> None:
        # This method is reached only after the caller verifies a fresh disposable runner.
        if self.process is not None and self.process.poll() is None:
            try:
                self.close_profile(self.appdata / 'Browser')
            finally:
                self.process.terminate()
                self.process.wait(timeout=10)
        for path in self.profiles:
            shutil.rmtree(path, ignore_errors=True)
        shutil.rmtree(self.appdata, ignore_errors=True)


def main() -> int:
    if os.name != 'nt' or os.environ.get('GITHUB_ACTIONS') != 'true' or os.environ.get('RUNNER_ENVIRONMENT') != 'github-hosted':
        print('Refusing: this test is for a disposable GitHub-hosted Windows runner only.')
        return 2
    exe = Path(os.environ['ATLAS_SMOKE_EXE']).resolve(strict=True)
    temp = Path(os.environ['RUNNER_TEMP']).resolve(strict=True)
    if not exe.is_relative_to(temp):
        raise RuntimeError('Refusing to execute a file outside this runner temporary directory.')
    local = NativeSmoke.powershell("[Environment]::GetFolderPath([Environment+SpecialFolder]::LocalApplicationData)")
    appdata = Path(local) / 'AtlasCommand'
    if appdata.exists():
        raise RuntimeError('Refusing to touch an existing Atlas Command profile.')
    test = NativeSmoke(exe, appdata, temp)
    success = False
    try:
        test.run()
        success = True
        return 0
    except Exception as error:
        print('FAIL:', type(error).__name__, str(error), flush=True)
        # Do not dump local workspaces, browser profiles, or session URLs into logs.
        return 1
    finally:
        status = 'PASSED' if success else 'FAILED'
        summary = ['## Windows native app smoke test: ' + status, '',
                   'Source commit: ' + os.environ.get('GITHUB_SHA', ''),
                   'Build OS: ' + str(sys.getwindowsversion()),
                   'Executable SHA-256: ' + hashlib.sha256(exe.read_bytes()).hexdigest(),
                   '', *['- PASS: ' + name for name in test.checks], '',
                   '**Scope:** Unpackaged native host on Windows Server 2022 plus Edge headless rendering.',
                   '**Not established:** Windows 10/11 installation, interactive touch/ultrawide acceptance, MSIX isolation, SentinelOne clearance, or Store certification.',
                   'No app binaries, private records, certificates, or Store submissions are uploaded.']
        with open(os.environ['GITHUB_STEP_SUMMARY'], 'a', encoding='utf-8') as out:
            out.write('\n'.join(summary) + '\n')
        test.cleanup()


if __name__ == '__main__':
    raise SystemExit(main())
