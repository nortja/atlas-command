"""Bundle the offline Earth and touch-friendly exploration shell. No remote code."""
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
ASSETS=['src/exploration-ui.js','src/exploration-ui.css','assets/earth-blue-marble-2048.png']
outputs={}
for name in ['app/index.html','app/workspace-preview.html']:
 s=(ROOT/name).read_text('utf-8').replace('<script src="src/exploration-ui.js"></script>','')
 for anchor,addition in [('</head>','<link rel="stylesheet" href="src/exploration-ui.css">'),('</body>','<script src="src/exploration-ui.js"></script>')]:
  if addition not in s:
   assert s.count(anchor)==1
   s=s.replace(anchor,addition+anchor)
 outputs[name]=s
name='native/AtlasHost.cs';s=(ROOT/name).read_text('utf-8')
for asset in ASSETS:
 token='rel == "'+asset+'" || '
 if token not in s:
  assert s.count('bool allowed = ')==1
  s=s.replace('bool allowed = ','bool allowed = '+token,1)
outputs[name]=s
for name in ['build/Build-OwnerPreview.ps1','build/Build-Store.ps1']:
 s=(ROOT/name).read_text('utf-8')
 for asset in ASSETS:
  token="'"+asset+"',"
  if token not in s:
   assert s.count("'src/app.js'")==1
   s=s.replace("'src/app.js'",token+"'src/app.js'",1)
 outputs[name]=s
for name,s in outputs.items():
 p=ROOT/name
 if s!=p.read_text('utf-8'):p.write_text(s,encoding='utf-8',newline='\n')
print('Integrated offline photographic Earth and quiet touch-friendly exploration controls.')
