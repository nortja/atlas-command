"""Bundle local catalog review; keep source parsers and strict asset allowlists."""
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
ASSETS=['src/catalog-intake.js','src/catalog-intake-ui.js','src/catalog-intake.css']
for name in ['app/index.html','app/workspace-preview.html']:
 p=ROOT/name;s=p.read_text('utf-8')
 model='<script src="src/catalog-intake.js"></script>'
 if model not in s:
  anchor='<script src="src/core.js"></script>';assert s.count(anchor)==1;s=s.replace(anchor,anchor+model)
 for anchor,addition in [('</head>','<link rel="stylesheet" href="src/catalog-intake.css">'),('</body>','<script src="src/catalog-intake-ui.js"></script>')]:
  if addition not in s:assert s.count(anchor)==1;s=s.replace(anchor,addition+anchor)
 p.write_text(s,encoding='utf-8',newline='\n')
for name in ['native/AtlasHost.cs','build/Build-OwnerPreview.ps1','build/Build-Store.ps1']:
 p=ROOT/name;s=p.read_text('utf-8')
 for asset in ASSETS:
  token=('rel == "'+asset+'" || ') if name.endswith('.cs') else "'"+asset+"',"
  anchor='bool allowed = ' if name.endswith('.cs') else "'src/app.js'"
  if token not in s:
   assert s.count(anchor)==1;s=s.replace(anchor,anchor+token if name.endswith('.cs') else token+anchor,1)
 p.write_text(s,encoding='utf-8',newline='\n')
print('Integrated local catalog intake and evidence review.')
