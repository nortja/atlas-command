"""Bundle the user-initiated local Windows webcam UI into development/native packages.
No network discovery, microphone access, Store action, signing, or security-policy change.
"""
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]

def edit(name,fn):
 p=ROOT/name
 p.write_text(fn(p.read_text('utf-8')),encoding='utf-8',newline='\n')

def before_once(s,anchor,item):
 if item in s:return s
 if s.count(anchor)!=1:raise RuntimeError('Windows webcam integration anchor mismatch: '+anchor[:100])
 return s.replace(anchor,item+anchor,1)

for path in ['app/index.html','app/workspace-preview.html']:
 def entry(s):
  s=before_once(s,'</head>','<link rel="stylesheet" href="src/windows-webcam.css">')
  s=before_once(s,'<script src="src/ui-directions.js"></script>','<script src="src/windows-webcam.js"></script>')
  return s
 edit(path,entry)

def native(s):
 anchor='rel == "src/ui-refinement.css" ||'
 add='rel == "src/ui-refinement.css" || rel == "src/windows-webcam.js" || rel == "src/windows-webcam.css" ||'
 if 'rel == "src/windows-webcam.js"' in s and 'rel == "src/windows-webcam.css"' in s:return s
 if s.count(anchor)!=1:raise RuntimeError('Native webcam allowlist anchor mismatch')
 return s.replace(anchor,add,1)
edit('native/AtlasHost.cs',native)

def add_runtime(s):
 anchor="'src/ui-refinement.css'"
 if anchor not in s:raise RuntimeError('Runtime allowlist anchor missing')
 missing=[x for x in ['src/windows-webcam.js','src/windows-webcam.css'] if "'"+x+"'" not in s]
 if missing:s=s.replace(anchor,anchor+','+','.join("'"+x+"'" for x in missing),1)
 return s
edit('build/Build-Store.ps1',add_runtime)
edit('build/Build-OwnerPreview.ps1',add_runtime)
print('Integrated local Windows webcam live preview, snapshots and explicit local recording. Camera access remains user-initiated with audio disabled.')
