"""Integrate catalog revision 6 and the fail-closed signed remote-content update framework.
Executable/features remain distributed by trusted Windows channels; remote content accepts data only.
"""
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]

def edit(path,fn):
 p=ROOT/path;s=p.read_text('utf-8');n=fn(s)
 if n!=s:p.write_text(n,encoding='utf-8',newline='\n')

def insert_after(s,anchor,text):
 if text in s:return s
 if s.count(anchor)!=1:raise RuntimeError('Anchor mismatch: '+anchor[:90])
 return s.replace(anchor,anchor+text,1)

for path in ['app/index.html','app/workspace-preview.html']:
 def html(s):
  s=insert_after(s,'<script src="data/site-expansion-r5.js"></script>','<script src="data/site-expansion-r6.js"></script>')
  s=insert_after(s,'<script src="src/data-refresh.js"></script>','<script src="src/remote-updates.js"></script>')
  return s
 edit(path,html)

def app(s):
 old='if((Number(state.settings.catalogRevision)||0)<5){const known=new Set(state.sites.map(x=>x.id));const batches=[window.ATLAS_SITE_EXPANSION,window.ATLAS_SITE_EXPANSION_R5];for(const batch of batches){if(!Array.isArray(batch))continue;for(const raw of batch){if(known.has(raw.id))continue;try{const site=C.normalizeSite(raw,"bundled-catalog-2026-r5");state.sites.push(site);known.add(site.id);}catch{}}}state.settings.catalogRevision=5;}'
 new='if((Number(state.settings.catalogRevision)||0)<6){const known=new Set(state.sites.map(x=>x.id));const batches=[window.ATLAS_SITE_EXPANSION,window.ATLAS_SITE_EXPANSION_R5,window.ATLAS_SITE_EXPANSION_R6];for(const batch of batches){if(!Array.isArray(batch))continue;for(const raw of batch){if(known.has(raw.id))continue;try{const site=C.normalizeSite(raw,"bundled-catalog-2026-r6");state.sites.push(site);known.add(site.id);}catch{}}}state.settings.catalogRevision=6;}'
 if new not in s:
  if old not in s:raise RuntimeError('Catalog revision 5 migration not found.')
  s=s.replace(old,new,1)
 s=s.replace('26 starter records, not the full v3.1 atlas.','100 bundled curated records, with your private records preserved separately.')
 s=s.replace('Store software updates require a published, certified release and are separate from data feeds. Nothing is being silently downloaded or published.','Software/features update through the trusted Windows distribution channel. Atlas also contains a signed content-update framework for future curated site refreshes; it is fail-closed until the official HTTPS feed and signing key are provisioned. Nothing is silently executed or published.')
 return s
edit('app/src/app.js',app)

def host(s):
 old='rel == "data/site-expansion-r5.js" ||'
 new='rel == "data/site-expansion-r5.js" || rel == "data/site-expansion-r6.js" || rel == "src/remote-updates.js" ||'
 if new not in s:
  if old not in s:raise RuntimeError('Native host catalog allowlist anchor missing.')
  s=s.replace(old,new,1)
 return s
edit('native/AtlasHost.cs',host)

def owner(s):
 for asset in ['data/site-expansion-r6.js','src/remote-updates.js']:
  if "'"+asset+"'" in s:continue
  anchor="'data/site-expansion-r5.js'"
  if anchor not in s:raise RuntimeError('Owner preview asset anchor missing.')
  s=s.replace(anchor,anchor+",'"+asset+"'",1)
 return s
edit('build/Build-OwnerPreview.ps1',owner)

def store(s):
 for asset in ['data/site-expansion-r6.js','src/remote-updates.js']:
  if "'"+asset+"'" in s:continue
  anchor="'data/site-expansion-r5.js'"
  if anchor not in s:raise RuntimeError('Store asset anchor missing.')
  s=s.replace(anchor,anchor+",'"+asset+"'",1)
 return s
edit('build/Build-Store.ps1',store)

def counts(s):
 for n in ['26','40','50','75']:
  s=s.replace("page.locator('.site-item').count()=="+n,"page.locator('.site-item').count()==100")
  s=s.replace("document.count('class=\"site-item ') != "+n,"document.count('class=\"site-item ') != 100")
  s=s.replace('did not display its '+n+' bundled catalog records','did not display its 100 bundled catalog records')
  s=s.replace('renders '+n+' bundled catalog records','renders 100 bundled catalog records')
 s=s.replace("'data/seed.js', 'data/site-expansion.js']","'data/seed.js', 'data/site-expansion.js', 'data/site-expansion-r5.js', 'data/site-expansion-r6.js', 'src/remote-updates.js']")
 return s
for path in ['tests/next_ui_test.py','tests/visual_hd_ui.py','tests/windows_native_smoke.py']:
 edit(path,counts)

# Privacy integration runs after catalog cardinality edits so it can keep the native smoke test focused on host/render health;
# exact 100-site cardinality remains enforced by the dedicated Playwright UI tests.
privacy=ROOT/'build/integrate_privacy_center.py'
if not privacy.exists():raise RuntimeError('Privacy Center integration recipe missing.')
exec(compile(privacy.read_text('utf-8'),str(privacy),'exec'),{'__name__':'__main__','__file__':str(privacy)})

print('Integrated catalog revision 6 (100 bundled records), fail-closed signed remote-content updates, and the local-first Privacy Center foundation.')
