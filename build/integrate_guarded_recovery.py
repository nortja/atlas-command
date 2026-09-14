"""Retire legacy saves and expose read-only local conflict comparison."""
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
ASSETS=['src/workspace-comparison.js','src/workspace-comparison-ui.js']
for name in ['app/index.html','app/workspace-preview.html']:
 p=ROOT/name;s=p.read_text('utf-8');tags=''.join('<script src="'+a+'"></script>' for a in ASSETS)
 if tags not in s:
  anchor='<script src="src/recovery-inspection.js"></script>';assert s.count(anchor)==1;s=s.replace(anchor,anchor+tags)
 p.write_text(s,encoding='utf-8',newline='\n')
p=ROOT/'app/src/app.js';s=p.read_text('utf-8')
anchor='recovery:Object.freeze({status:'
if 'compare:async()=>AtlasWorkspaceComparison.compare' not in s:
 assert s.count(anchor)==1;s=s.replace(anchor,'recovery:Object.freeze({compare:async()=>AtlasWorkspaceComparison.compare(state,(await workspaceStorage.latest()).value),status:')
p.write_text(s,encoding='utf-8',newline='\n')
p=ROOT/'native/AtlasHost.cs';s=p.read_text('utf-8')
if 'Legacy workspace endpoint retired' not in s:
 start=s.index('            if (rel == "api/state") {');end=s.index('            if (rel.StartsWith("api/field-camera-credentials/',start)
 s=s[:start]+'            if (rel == "api/state") { Error(stream,410,"Legacy workspace endpoint retired; reopen updated Atlas"); return; }\n'+s[end:]
 # Only revision-checked saves may use the existing same-context close-beacon path.
 old='(rel == "api/state" || rel == "api/lifecycle")';assert s.count(old)==1;s=s.replace(old,'(rel == "api/state-v2" || rel == "api/lifecycle")')
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
print('Retired legacy workspace endpoint; integrated read-only conflict comparison.')
