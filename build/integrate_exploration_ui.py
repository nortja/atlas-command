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
# Keep the static MIME allowlist as narrow as the asset path allowlist.
s=s.replace('ext == ".svg" ? "image/svg+xml" : "";', 'ext == ".svg" ? "image/svg+xml" : ext == ".png" ? "image/png" : "";')
helper=(ROOT/'build/local-request-rejection.cs.txt').read_text('utf-8')
if helper not in s:
 assert s.count('    static JavaScriptSerializer Json()')==1
 s=s.replace('    static JavaScriptSerializer Json()',helper+'    static JavaScriptSerializer Json()',1)
lines=s.splitlines(True)
for i,line in enumerate(lines):
 if 'if (!localHeader &&' in line:
  lines[i]=line.replace('Error(stream,403,"Local action header required");','RejectUnmarkedRequest(client,stream,headers);')
s=''.join(lines)
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
