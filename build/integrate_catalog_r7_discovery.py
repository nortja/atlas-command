"""Integrate Atlas catalog revision 7 (125 bundled records).
No Store submission, signing, telemetry, wallet activity, or remote execution is added.
"""
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]

def edit(path,fn):
 p=ROOT/path;s=p.read_text('utf-8');n=fn(s)
 if n!=s:p.write_text(n,encoding='utf-8',newline='\n')

def replace_once(s,a,b,label):
 if b in s:return s
 if s.count(a)!=1:raise RuntimeError(label+' anchor mismatch')
 return s.replace(a,b,1)

edit('app/data/site-expansion-r7.js',lambda s:s.replace("id:'catalog-o halo-ii'","id:'catalog-ohalo-ii'"))

for path in ['app/index.html','app/workspace-preview.html']:
 def html(s):
  if '<script src="data/site-expansion-r7.js"></script>' not in s:
   s=replace_once(s,'<script src="data/site-expansion-r6.js"></script>','<script src="data/site-expansion-r6.js"></script><script src="data/site-expansion-r7.js"></script>','R7 html')
  return s
 edit(path,html)

def app(s):
 old='if((Number(state.settings.catalogRevision)||0)<6){const known=new Set(state.sites.map(x=>x.id));const batches=[window.ATLAS_SITE_EXPANSION,window.ATLAS_SITE_EXPANSION_R5,window.ATLAS_SITE_EXPANSION_R6];for(const batch of batches){if(!Array.isArray(batch))continue;for(const raw of batch){if(known.has(raw.id))continue;try{const site=C.normalizeSite(raw,"bundled-catalog-2026-r6");state.sites.push(site);known.add(site.id);}catch{}}}state.settings.catalogRevision=6;}'
 new='if((Number(state.settings.catalogRevision)||0)<7){const known=new Set(state.sites.map(x=>x.id));const batches=[window.ATLAS_SITE_EXPANSION,window.ATLAS_SITE_EXPANSION_R5,window.ATLAS_SITE_EXPANSION_R6,window.ATLAS_SITE_EXPANSION_R7];for(const batch of batches){if(!Array.isArray(batch))continue;for(const raw of batch){if(known.has(raw.id))continue;try{const site=C.normalizeSite(raw,"bundled-catalog-2026-r7");state.sites.push(site);known.add(site.id);}catch{}}}state.settings.catalogRevision=7;}'
 s=replace_once(s,old,new,'R7 migration')
 s=s.replace('100 bundled curated records, with your private records preserved separately.','125 bundled curated records, with your private records preserved separately.')
 return s
edit('app/src/app.js',app)

def host(s):
 old='rel == "data/site-expansion-r6.js" ||'
 new='rel == "data/site-expansion-r6.js" || rel == "data/site-expansion-r7.js" ||'
 return replace_once(s,old,new,'R7 host allowlist')
edit('native/AtlasHost.cs',host)

for path in ['build/Build-OwnerPreview.ps1','build/Build-Store.ps1']:
 def pack(s):
  if "'data/site-expansion-r7.js'" not in s:
   s=replace_once(s,"'data/site-expansion-r6.js'","'data/site-expansion-r6.js','data/site-expansion-r7.js'",'R7 package asset')
  return s
 edit(path,pack)

def counts(s):
 for n in ['75','100']:
  s=s.replace("page.locator('.site-item').count()=="+n,"page.locator('.site-item').count()==125")
  s=s.replace("assert page.locator('.site-item').count()=="+n,"assert page.locator('.site-item').count()==125")
 s=s.replace("'data/site-expansion-r6.js', 'src/remote-updates.js']","'data/site-expansion-r6.js', 'data/site-expansion-r7.js', 'src/remote-updates.js']")
 return s
for path in ['tests/next_ui_test.py','tests/visual_hd_ui.py']:
 edit(path,counts)

def smoke_assets(s):
 return s.replace("'data/seed.js', 'data/site-expansion.js', 'data/site-expansion-r5.js', 'data/site-expansion-r6.js', 'src/remote-updates.js']","'data/seed.js', 'data/site-expansion.js', 'data/site-expansion-r5.js', 'data/site-expansion-r6.js', 'data/site-expansion-r7.js', 'src/remote-updates.js']")
edit('tests/windows_native_smoke.py',smoke_assets)
print('Integrated catalog revision 7 to 125 bundled records; native transport hardening remains owned by the lifecycle integration stage.')
