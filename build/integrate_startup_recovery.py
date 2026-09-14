"""Recovery before renderer initialization; no reset, upload or automatic restore."""
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
ASSETS=['src/recovery-inspection.js','src/backup-browser.js','src/startup-recovery.js']
for name in ['app/index.html','app/workspace-preview.html']:
 p=ROOT/name;s=p.read_text('utf-8');tags=''.join('<script src="'+a+'"></script>' for a in ASSETS)
 if tags not in s:
  anchor='<script src="src/core.js"></script>';assert s.count(anchor)==1;s=s.replace(anchor,anchor+tags)
 p.write_text(s,encoding='utf-8',newline='\n')
p=ROOT/'app/src/app.js';s=p.read_text('utf-8')
if 'AtlasStartupRecovery.start' not in s:
 start=s.index('if(loadError){');end=s.index('\n',start)
 s=s[:start]+"if(loadError){AtlasStartupRecovery.start({native});return;}\nif(state!==null&&!AtlasRecoveryInspection.assess(state).usable){AtlasStartupRecovery.start({native});return;}"+s[end:]
 start=s.index('try{state.sites=state.sites.map');end=s.index('\n',start)
 s=s[:start]+"try{state.sites=state.sites.map(s=>C.normalizeSite(s,s.origin));}catch{AtlasStartupRecovery.start({native});return;}"+s[end:]
 p.write_text(s,encoding='utf-8',newline='\n')
p=ROOT/'native/AtlasHost.cs';s=p.read_text('utf-8')
anchor='            if (rel == "api/state-v2")'
route='            if (rel == "api/state-health") { if(method!="GET"){Error(stream,405,"Read-only recovery status");return;} try { WorkspaceHealth(stream); } catch { Error(stream,400,"Recovery status unavailable"); } return; }\n'
if route not in s:assert s.count(anchor)==1;s=s.replace(anchor,route+anchor)
for asset in ASSETS:
 token='rel == "'+asset+'" || '
 if token not in s:s=s.replace('bool allowed = ','bool allowed = '+token,1)
p.write_text(s,encoding='utf-8',newline='\n')
for name in ['build/Build-OwnerPreview.ps1','build/Build-Store.ps1']:
 p=ROOT/name;s=p.read_text('utf-8')
 for asset in ASSETS:
  token="'"+asset+"',"
  if token not in s:assert s.count("'src/app.js'")==1;s=s.replace("'src/app.js'",token+"'src/app.js'",1)
 p.write_text(s,encoding='utf-8',newline='\n')
print('Integrated fail-closed startup recovery and backup inspection.')
