"""Integrate Atlas catalog revision 8 and validate catalog cardinality from the actual bundled arrays.
Remote code execution, telemetry, wallet operations and Store submission are intentionally not added.
"""
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]

def edit(path,fn):
 p=ROOT/path;s=p.read_text('utf-8');n=fn(s)
 if n!=s:p.write_text(n,encoding='utf-8',newline='\n')

def once(s,a,b,label):
 if b in s:return s
 if s.count(a)!=1:raise RuntimeError(label+' anchor mismatch')
 return s.replace(a,b,1)

for path in ['app/index.html','app/workspace-preview.html']:
 def html(s):
  if '<script src="data/site-expansion-r8.js"></script>' not in s:
   s=once(s,'<script src="data/site-expansion-r7.js"></script>','<script src="data/site-expansion-r7.js"></script><script src="data/site-expansion-r8.js"></script>','R8 html')
  return s
 edit(path,html)

def app(s):
 old='if((Number(state.settings.catalogRevision)||0)<7){const known=new Set(state.sites.map(x=>x.id));const batches=[window.ATLAS_SITE_EXPANSION,window.ATLAS_SITE_EXPANSION_R5,window.ATLAS_SITE_EXPANSION_R6,window.ATLAS_SITE_EXPANSION_R7];for(const batch of batches){if(!Array.isArray(batch))continue;for(const raw of batch){if(known.has(raw.id))continue;try{const site=C.normalizeSite(raw,"bundled-catalog-2026-r7");state.sites.push(site);known.add(site.id);}catch{}}}state.settings.catalogRevision=7;}'
 new='if((Number(state.settings.catalogRevision)||0)<8){const known=new Set(state.sites.map(x=>x.id));const batches=[window.ATLAS_SITE_EXPANSION,window.ATLAS_SITE_EXPANSION_R5,window.ATLAS_SITE_EXPANSION_R6,window.ATLAS_SITE_EXPANSION_R7,window.ATLAS_SITE_EXPANSION_R8];for(const batch of batches){if(!Array.isArray(batch))continue;for(const raw of batch){if(known.has(raw.id))continue;try{const site=C.normalizeSite(raw,"bundled-catalog-2026-r8");state.sites.push(site);known.add(site.id);}catch{}}}state.settings.catalogRevision=8;}'
 s=once(s,old,new,'R8 migration')
 s=s.replace('125 bundled curated records, with your private records preserved separately.','150+ bundled curated records, with your private records preserved separately.')
 return s
edit('app/src/app.js',app)

def host(s):
 return once(s,'rel == "data/site-expansion-r7.js" ||','rel == "data/site-expansion-r7.js" || rel == "data/site-expansion-r8.js" ||','R8 host allowlist')
edit('native/AtlasHost.cs',host)
for path in ['build/Build-OwnerPreview.ps1','build/Build-Store.ps1']:
 def pack(s):
  if "'data/site-expansion-r8.js'" not in s:s=once(s,"'data/site-expansion-r7.js'","'data/site-expansion-r7.js','data/site-expansion-r8.js'",'R8 package')
  return s
 edit(path,pack)

def test_dynamic(s):
 for n in ['26','75','100','125','150']:
  s=s.replace("assert page.locator('.site-item').count()=="+n,"expected=page.evaluate(\"new Set([...(window.ATLAS_SEED||[]),...(window.ATLAS_SITE_EXPANSION||[]),...(window.ATLAS_SITE_EXPANSION_R5||[]),...(window.ATLAS_SITE_EXPANSION_R6||[]),...(window.ATLAS_SITE_EXPANSION_R7||[]),...(window.ATLAS_SITE_EXPANSION_R8||[])].map(x=>x.id)).size\");print('Bundled catalog unique IDs:',expected,flush=True);assert expected>=150;assert page.locator('.site-item').count()==expected")
 return s
for path in ['tests/next_ui_test.py','tests/visual_hd_ui.py']:
 edit(path,test_dynamic)

def smoke_assets(s):
 old="'data/site-expansion-r6.js', 'data/site-expansion-r7.js', 'src/remote-updates.js']"
 new="'data/site-expansion-r6.js', 'data/site-expansion-r7.js', 'data/site-expansion-r8.js', 'src/remote-updates.js']"
 if old in s:s=s.replace(old,new)
 return s
edit('tests/windows_native_smoke.py',smoke_assets)
print('Integrated catalog revision 8, 25 additional source-first ancient sites, and catalog-cardinality QC derived from the actual bundled data arrays.')
