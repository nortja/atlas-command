"""Integrate bundled metadata editor and guided camera setup UI, not camera transport. Does not install or publish."""
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
def edit(name,fn):
 p=ROOT/name;p.write_text(fn(p.read_text('utf-8')),encoding='utf-8',newline='\n')
def once(s,a,b):
 if b in s:return s
 if s.count(a)!=1:raise RuntimeError('Camera profile integration anchor mismatch: '+a[:80])
 return s.replace(a,b,1)
for p in ['app/index.html','app/workspace-preview.html']:
 def entry(s):
  s=once(s,'<link rel="stylesheet" href="src/ui-refinement.css">','<link rel="stylesheet" href="src/ui-refinement.css"><link rel="stylesheet" href="src/field-cameras.css"><link rel="stylesheet" href="src/field-camera-ux.css">')
  return once(s,'<script src="src/ui-directions.js"></script>','<script src="src/field-cameras.js"></script><script src="src/field-camera-desk.js"></script><script src="src/field-camera-ux.js"></script><script src="src/ui-directions.js"></script>')
 edit(p,entry)
def app(s):
 s=once(s,'const appearancePreferences=','const fieldCameraProfiles=AtlasFieldCameras.store(()=>state.settings.fieldCameras,v=>{if(v===undefined)delete state.settings.fieldCameras;else state.settings.fieldCameras=v;},flush,()=>window.dispatchEvent(new Event("atlas:field-cameras-changed")));\nconst appearancePreferences=')
 s=once(s,' version:1,storageMode:', ' fieldCameras:fieldCameraProfiles,\n version:1,storageMode:')
 s=once(s,"JSON.stringify(state,null,2),'application/json'","JSON.stringify(AtlasFieldCameras.shareableWorkspace(state),null,2),'application/json'")
 s=s.replace('JSON exchange exports site records, notes, plans and layouts. Media files are separate; copy the entire native Data folder for a complete backup.','JSON exchange exports site records, notes, plans and layouts, but excludes private IP-camera profiles. Media files are separate. Copy the entire native Data folder for a complete backup; it includes private camera locations and setup notes.')
 s=s.replace('Local records refreshed. No online feeds are connected.','Local records refreshed. Live data connections are controlled separately.')
 return s
edit('app/src/app.js',app)
edit('native/AtlasHost.cs',lambda s:once(s,'rel == "src/ui-refinement.css" ||','rel == "src/ui-refinement.css" || rel == "src/field-cameras.js" || rel == "src/field-camera-desk.js" || rel == "src/field-cameras.css" || rel == "src/field-camera-ux.js" || rel == "src/field-camera-ux.css" ||'))
edit('build/Build-Store.ps1',lambda s:once(s,"'src/ui-refinement.css'","'src/ui-refinement.css','src/field-cameras.js','src/field-camera-desk.js','src/field-cameras.css','src/field-camera-ux.js','src/field-camera-ux.css'"))
print('Integrated private camera metadata editor and guided four-step setup journey. No camera transport, credentials, or new remote endpoint.')
