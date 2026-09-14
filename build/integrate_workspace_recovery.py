"""Guard local workspace saves and expose reviewed record recovery. No relay."""
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
ASSETS=['src/workspace-storage.js','src/workspace-recovery-ui.js','src/workspace-recovery.css']
for name in ['app/index.html','app/workspace-preview.html']:
 p=ROOT/name;s=p.read_text('utf-8')
 for anchor,addition,before in [('<script src="src/core.js"></script>','<script src="src/workspace-storage.js"></script>',True),('</body>','<script src="src/workspace-recovery-ui.js"></script>',True),('</head>','<link rel="stylesheet" href="src/workspace-recovery.css">',True)]:
  if addition not in s:assert s.count(anchor)==1;s=s.replace(anchor,addition+anchor)
 p.write_text(s,encoding='utf-8',newline='\n')
p=ROOT/'app/src/app.js';s=p.read_text('utf-8')
if 'const workspaceStorage=' not in s:
 anchor="let state,loadError='';"
 assert s.count(anchor)==1
 s=s.replace(anchor,"const workspaceStorage=AtlasWorkspaceStorage.create(native?AtlasWorkspaceStorage.native((...args)=>fetch(...args),(...args)=>navigator.sendBeacon(...args)):AtlasWorkspaceStorage.browser(localStorage,navigator.locks),()=>reportStorage());\n"+anchor)
 s=s.replace("state=native?await api('state'):JSON.parse(localStorage.getItem('atlas-command-state')||'null');","state=await workspaceStorage.load();")
 start=s.index('function save(){');end=s.index('\n',s.index('async function flush(){',start))
 s=s[:start]+(ROOT/'build/workspace-save-bridge.js.txt').read_text('utf-8')+s[end:]
 anchor=' weather:weatherPreferences,';assert s.count(anchor)==1
 s=s.replace(anchor,anchor+'''\n recovery:Object.freeze({status:()=>workspaceStorage.status(),latest:()=>workspaceStorage.latest(),backups:()=>workspaceStorage.backups(),inspect:id=>workspaceStorage.inspect(id),restore:async review=>{clearTimeout(saveTimer);await workspaceStorage.restore(review);location.reload();},retry:flush,exportDraft:()=>download('Atlas-unsaved-research.json',JSON.stringify(AtlasFieldCameras.shareableWorkspace(state),null,2),'application/json'),current:()=>({sites:state.sites.length,queued:state.queue.length}),reload:()=>{clearTimeout(saveTimer);workspaceStorage.abandon();location.reload();}}),''')
 old="window.addEventListener('beforeunload',()=>{rememberGlobe();if(!native){try{localStorage.setItem('atlas-command-state',JSON.stringify(state));}catch{}}else{navigator.sendBeacon('api/state',new Blob([JSON.stringify(state)],{type:'application/json'}));sendLifecycle('closing');}});"
 assert s.count(old)==1
 s=s.replace(old,"window.addEventListener('beforeunload',()=>{rememberGlobe();workspaceStorage.closing(state);if(native)sendLifecycle('closing');});\ndocument.addEventListener('visibilitychange',()=>{if(document.hidden)flush().catch(()=>{});});")
 p.write_text(s,encoding='utf-8',newline='\n')
p=ROOT/'native/AtlasHost.cs';s=p.read_text('utf-8')
if 'static void HandleGuardedWorkspace(' not in s:
 anchor='    static JavaScriptSerializer Json()';assert s.count(anchor)==1;s=s.replace(anchor,(ROOT/'build/workspace-recovery-host.cs.txt').read_text('utf-8')+anchor)
 anchor='            if (rel == "api/state") {';assert s.count(anchor)==1
 s=s.replace(anchor,'            if (rel == "api/state-v2") { try { HandleGuardedWorkspace(stream,method,headers,body); } catch { Error(stream,400,"Workspace action unavailable or invalid"); } return; }\n            if (rel == "api/state-backups") { try { HandleRecordBackups(stream,method,headers,body,requestPath); } catch { Error(stream,400,"Record backup unavailable or invalid"); } return; }\n'+anchor)
 s=s.replace('rel == "api/state" && (origin == Origin || samePage)','(rel == "api/state" || rel == "api/state-v2") && (origin == Origin || samePage)')
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
print('Integrated serialized workspace saves and guarded record recovery.')
