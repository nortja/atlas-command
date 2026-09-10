"""Verify the local Windows webcam controls mount in the real native host without activating hardware."""
from pathlib import Path
import os
from playwright.sync_api import sync_playwright
from windows_native_smoke import NativeSmoke

ROOT=Path(__file__).resolve().parents[1]

def main():
 if os.name!='nt' or os.environ.get('GITHUB_ACTIONS')!='true' or os.environ.get('RUNNER_ENVIRONMENT')!='github-hosted':
  raise RuntimeError('Disposable GitHub-hosted Windows runner required.')
 exe=Path(os.environ['ATLAS_SMOKE_EXE']).resolve(strict=True);temp=Path(os.environ['RUNNER_TEMP']).resolve(strict=True)
 if not exe.is_relative_to(temp):raise RuntimeError('Executable must be in runner temporary storage.')
 appdata=Path(NativeSmoke.powershell('[Environment]::GetFolderPath([Environment+SpecialFolder]::LocalApplicationData)'))/'AtlasCommand'
 if appdata.exists():raise RuntimeError('Existing workspace found; refusing to touch it.')
 host=NativeSmoke(exe,appdata,temp);external=[];errors=[]
 try:
  host.start()
  with sync_playwright() as pw:
   browser=pw.chromium.launch(channel='msedge',headless=True)
   context=browser.new_context(viewport={'width':1600,'height':1000})
   page=context.new_page();page.on('pageerror',lambda e:errors.append(str(e)));page.on('request',lambda r:external.append(r.url) if not r.url.startswith(('http://127.0.0.1:','data:','blob:')) else None)
   page.goto(host.url,wait_until='domcontentloaded');page.wait_for_selector('#windowsWebcamBtn')
   assert page.locator('#windowsWebcamDesk').is_hidden()
   page.locator('#windowsWebcamBtn').click();page.wait_for_selector('#windowsWebcamDesk:not([hidden])')
   assert page.locator('#windowsWebcamStart').is_visible()
   assert page.locator('#windowsWebcamStop').is_disabled()
   assert page.locator('#windowsWebcamSnapshot').is_disabled()
   assert 'No camera' in page.locator('#windowsWebcamStatus').inner_text() or 'Press Start' in page.locator('#windowsWebcamStatus').inner_text() or 'UNAVAILABLE' in page.locator('#windowsWebcamStatus').inner_text()
   assert 'Microphone access is off' in page.locator('#windowsWebcamDesk').inner_text()
   assert not errors,errors
   assert not external,external
   page.locator('#windowsWebcamClose').click();assert page.locator('#windowsWebcamDesk').is_hidden()
   context.close();browser.close()
  host.stop();print('PASS: local Windows webcam controls mount without activating camera hardware',flush=True);return 0
 finally:host.cleanup()

if __name__=='__main__':raise SystemExit(main())
