"""Guarded ordinary workspace recovery on a disposable Windows runner only."""
from pathlib import Path
import copy
import json
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
    headers={'X-Atlas-Request':'local','Content-Type':'application/json'}
    def get(path):return json.loads(host.expect('GET',path,200)[2])
    def post(path,payload,status=200):return host.expect('POST',path,status,body=json.dumps(payload).encode(),headers=headers)
    try:
        host.start()
        with sync_playwright() as pw:
            browser=pw.chromium.launch(executable_path=host.edge,headless=True)
            try:
                page=browser.new_page(viewport={'width':1440,'height':1000})
                page.goto(host.url);page.locator('#recoveryBtn').wait_for(state='attached');page.evaluate('AtlasTest.flush()')
                media_fixture=appdata/'Data'/'media'/'recovery-fixture.jpg'
                media_fixture.write_bytes(b'opaque-media-preservation-fixture')
                vault_fixture=appdata/'TeamWorkspace'/'vault.json'
                vault_fixture.parent.mkdir(exist_ok=True)
                vault_fixture.write_bytes(b'opaque-vault-preservation-fixture')
                start=get('api/state-v2');first=copy.deepcopy(start['value']);first['sites'][0]['notes']='first-guarded-save'
                post('api/state-v2',{'revision':start['revision'],'value':first})
                post('api/state-v2',{'revision':start['revision'],'value':start['value']},409)
                post('api/state-v2',{'value':first},400)
                assert get('api/state-v2')['value']['sites'][0]['notes']=='first-guarded-save'
                host.passed('Native stale and missing revisions cannot overwrite a newer workspace')
                old_backup=get('api/state-backups?review=previous');current=get('api/state-v2');second=copy.deepcopy(first);second['sites'][0]['notes']='second-guarded-save'
                post('api/state-v2',{'revision':current['revision'],'value':second});current=get('api/state-v2')
                post('api/state-backups',{'revision':current['revision'],'id':'previous','backupRevision':old_backup['revision']},409)
                assert get('api/state-v2')['value']['sites'][0]['notes']=='second-guarded-save'
                reviewed=get('api/state-backups?review=previous')
                post('api/state-backups',{'revision':current['revision'],'id':'previous','backupRevision':reviewed['revision']})
                assert get('api/state-v2')['value']['sites'][0]['notes']=='first-guarded-save'
                host.expect('GET','api/state-backups?review=unknown.json',400)
                host.expect('GET','api/state-backups?review=..%2Fworkspace.json',400)
                backup_path=appdata/'Data'/'workspace.json.bak';backup_path.write_text('{broken',encoding='utf-8')
                host.expect('GET','api/state-backups?review=previous',400)
                host.passed('Changed, invalid and unknown record backups are refused; reviewed restoration succeeds')
                # A known historical record snapshot makes UI restoration observable.
                historical=copy.deepcopy(first);historical['sites'][0]['notes']='restored-through-ui'
                (appdata/'Data'/'backup-2001-01-01.json').write_text(json.dumps(historical),encoding='utf-8')
                page.reload();page.locator('#recoveryBtn').wait_for(state='attached');page.evaluate('AtlasTest.flush()')
                page.locator('#overviewBtn').click();page.locator('#recoveryBtn').click();page.locator('[data-inspect="backup-2001-01-01.json"]').click()
                page.locator('#restoreRecords').click();page.locator('#recoveryDialog').wait_for(state='hidden')
                page.locator('#recoveryBtn').wait_for(state='attached')
                assert get('api/state-v2')['value']['sites'][0]['notes']=='restored-through-ui'
                assert page.evaluate('AtlasWorkspace.sites.list()[0].notes')=='restored-through-ui'
                assert media_fixture.read_bytes()==b'opaque-media-preservation-fixture'
                assert vault_fixture.read_bytes()==b'opaque-vault-preservation-fixture'
                host.passed('Native recovery UI restores reviewed records without close-beacon overwrite')
            finally:browser.close()
        host.stop()
    finally:host.cleanup()

if __name__=='__main__':main()
