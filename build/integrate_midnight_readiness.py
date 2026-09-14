"""Bundle offline-only Midnight readiness, without native actions or SDKs."""
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
ASSETS=['src/midnight-readiness.js','src/midnight-desk.js','src/midnight-desk.css']
for name in ['app/index.html','app/workspace-preview.html']:
 p=ROOT/name;s=p.read_text('utf-8')
 scripts=''.join('<script src="'+a+'"></script>' for a in ASSETS[:2])
 if scripts not in s:
  anchor='<script src="src/privacy-center.js"></script>';assert s.count(anchor)==1;s=s.replace(anchor,scripts+anchor)
 css='<link rel="stylesheet" href="src/midnight-desk.css">'
 if css not in s:s=s.replace('</head>',css+'</head>')
 p.write_text(s,encoding='utf-8',newline='\n')
p=ROOT/'native/AtlasHost.cs';s=p.read_text('utf-8')
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
print('Integrated offline Midnight disclosure and sponsorship rehearsal.')
