"""Small reviewed follow-up to next-version source integration; source worktree only."""
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
p=ROOT/'app/src/app.js';s=p.read_text('utf-8')
if 'window.AtlasWorkspace=Object.freeze' not in s:raise RuntimeError('Run the reviewed integration first.')
s=s.replace("category='lidar';query='';$('#search').value='';", "category='lidar';query='';rating='';$('#ratingFilter').value='';$('#search').value='';")
p.write_text(s,encoding='utf-8',newline='\n')
p=ROOT/'build/Build-Store.ps1';s=p.read_text('utf-8').replace("'tests/store-identity.test.cjs'\n", "'tests/store-identity.test.cjs' 'tests/workspace-layout.test.cjs' 'tests/lidar.test.cjs'\n");p.write_text(s,encoding='utf-8',newline='\n')
# Repair malformed inherited option tags so all five mystery choices are real options.
for rel in ('app/index.html','app/workspace-preview.html'):
 p=ROOT/rel;markup=p.read_text('utf-8')
 for rating in range(1,6):markup=markup.replace(f'</option value="{rating}">',f'</option><option value="{rating}">')
 p.write_text(markup,encoding='utf-8',newline='\n')
p=ROOT/'tests/next_ui_test.py';s=p.read_text('utf-8')
if '04-Laptop-Workspace.png' not in s:
 s=s.replace("page.wait_for_timeout(350);page.screenshot(path=str(OUT/'01-Next-Observatory.png'))", "page.wait_for_timeout(350);page.screenshot(path=str(OUT/'01-Next-Observatory.png'))\n   page.set_viewport_size({'width':1366,'height':768});page.wait_for_timeout(250);page.screenshot(path=str(OUT/'04-Laptop-Workspace.png'))\n   page.set_viewport_size({'width':2560,'height':1440});page.wait_for_timeout(250)")
 s=s.replace("page.locator('#lidarDeskBtn').click();page.locator('[data-show=\"lidar-1\"]').click();assert", "page.locator('#ratingFilter').select_option('1')\n   page.locator('#lidarDeskBtn').click();page.locator('[data-show=\"lidar-1\"]').click();assert")
 s=s.replace("page.locator('[data-tab=\"research\"]').click();page.locator('#alignmentBtn').click()", "assert page.locator('#ratingFilter').input_value()=='' and page.locator('.site-item').count()==4\n   page.locator('[data-tab=\"research\"]').click();page.locator('#alignmentBtn').click()")
# Use locator conditions rather than a string-evaluated polling function. The app's CSP remains unchanged.
s=s.replace('from playwright.sync_api import sync_playwright\n', 'from playwright.sync_api import sync_playwright, expect\n')
s=s.replace('page.wait_for_function(\'!document.querySelector("#workspaceChooser").open\')', 'page.locator("#workspaceChooser").wait_for(state="hidden")')
s=s.replace('page.wait_for_function(\'document.querySelector("#layoutStatus").textContent.startsWith("Not saved:")\')', 'expect(page.locator("#layoutStatus")).to_contain_text("Not saved:")')
p.write_text(s,encoding='utf-8',newline='\n')
print('Applied reviewed filter navigation, test coverage and screenshot refinements.')
