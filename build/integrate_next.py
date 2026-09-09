"""Deterministic, developer-only integration; modifies source on the development branch.
Never an installation script. No network, certificates, policy changes or Store actions.
"""
from pathlib import Path
import hashlib,json
ROOT=Path(__file__).resolve().parents[1]
EXPECTED={
 'app/index.html':'57faf77acc6f2b40a0ae34577ac96edf4262857b',
 'app/src/app.js':'dacf7f31ad3f97d407103d5fc0081e063568608b',
 'native/AtlasHost.cs':'62bb041d78564714795b3df4cebbea6d2305778d',
 'build/Build-Store.ps1':'9941ffa32ded857940884e27f1a1f9b6d1531620',
 'packaging/store-config.json':'621ea4a6fb135df90493f1de6c33b5901868dbd9'
}
API=r'''
// Versioned, narrow integration surface for bundled modules. No arbitrary plug-in execution.
const cloneForModule=value=>structuredClone(value);
function checkedScope(scope){if(!['desktop','ultrawide'].includes(scope))throw Error('Unknown layout scope.');return scope;}
window.AtlasWorkspace=Object.freeze({
 version:1,storageMode:native?'native':'browser-preview',notify:toast,
 resizeGlobe:()=>globe.resize(),isGlobeFocused:()=>document.body.classList.contains('globe-focus'),
 setGlobeFocus:value=>{if(Boolean(value)!==document.body.classList.contains('globe-focus'))$('#focusBtn').click();},
 subscribe:callback=>{if(typeof callback!=='function')throw Error('Listener must be a function.');window.addEventListener('atlas:changed',callback);return()=>window.removeEventListener('atlas:changed',callback);},
 layouts:Object.freeze({
  read:scope=>{checkedScope(scope);return cloneForModule({active:state.layout[scope]||{},saved:state.settings.savedWorkspaceLayouts?.[scope]||null});},
  commit:async(scope,patch)=>{
   checkedScope(scope);const w=$('#workspace').clientWidth,h=$('#workspace').clientHeight;
   if(!patch||typeof patch!=='object')throw Error('Layout data is required.');
   const active=patch.active?AtlasLayouts.fit(patch.active,w,h):null,saved=patch.saved?AtlasLayouts.fit(patch.saved,w,h):null;
   if(!active&&!saved)throw Error('No layout to save.');
   const before={active:state.layout[scope],saved:state.settings.savedWorkspaceLayouts};
   if(active)state.layout[scope]=active;
   if(saved)state.settings.savedWorkspaceLayouts={...(state.settings.savedWorkspaceLayouts||{}),[scope]:saved};
   try{await flush();}catch(error){if(before.active===undefined)delete state.layout[scope];else state.layout[scope]=before.active;state.settings.savedWorkspaceLayouts=before.saved;throw error;}
  }
 }),
 sites:Object.freeze({
  list:()=>cloneForModule(state.sites),
  showLidar:id=>{if(!state.sites.some(s=>s.id===id&&s.category==='lidar'))throw Error('LiDAR record not found.');category='lidar';query='';$('#search').value='';renderCategories();updateVisible();select(id,true);},
  saveLidar:async(id,raw)=>{
   const site=state.sites.find(s=>s.id===id&&s.category==='lidar');if(!site)throw Error('LiDAR record not found.');
   const next=AtlasLidar.normalize(raw,true),before={research:site.research,updatedAt:site.updatedAt};
   next.reviewedAt=new Date().toISOString();site.research={...site.research,lidar:next};site.updatedAt=next.reviewedAt;
   try{await flush();}catch(error){site.research=before.research;site.updatedAt=before.updatedAt;throw error;}
   renderDossier();window.dispatchEvent(new Event('atlas:changed'));
  }
 })
});
window.dispatchEvent(new Event('atlas:ready'));
'''
def git_hash(b):return hashlib.sha1(b'blob '+str(len(b)).encode()+b'\0'+b).hexdigest()
def main():
 if 'window.AtlasWorkspace=Object.freeze' in (ROOT/'app/src/app.js').read_text('utf-8'):
  print('Integration already applied; leaving source unchanged.');return
 texts={}
 for rel,sha in EXPECTED.items():
  data=(ROOT/rel).read_bytes().replace(b'\r\n',b'\n')
  if git_hash(data)!=sha:raise RuntimeError('Unexpected source baseline: '+rel)
  texts[rel]=data.decode('utf-8')
 html=texts['app/index.html']
 html=html.replace('<link rel="stylesheet" href="src/styles.css">','<link rel="stylesheet" href="src/styles.css"><link rel="stylesheet" href="src/next-ui.css">')
 html=html.replace('EARTH DISCOVERY WORKSPACE','NEXT VERSION · DEVELOPMENT PREVIEW')
 html=html.replace('<script src="src/app.js"></script>','<script src="src/workspace-layout.js"></script><script src="src/lidar.js"></script><script src="src/app.js"></script>')
 texts['app/index.html']=html;texts['app/workspace-preview.html']=html
 app=texts['app/src/app.js']
 # Prevent hover and search shortcuts from changing context behind any module dialog.
 app=app.replace("!$('#dialog').open","!document.querySelector('dialog[open]')")
 # A magnetic comparison must not erase metadata belonging to another research module.
 app=app.replace('s.research={...d,difference:', 's.research={...r,...d,difference:')
 app=app.replace('renderDossier();renderPlan();}\nfunction renderMode',"renderDossier();renderPlan();window.dispatchEvent(new Event('atlas:changed'));}\nfunction renderMode")
 # Never turn corrupt layout values into NaN positions; keep site data intact.
 app=app.replace("if(!s)continue;const pw=", "if(!s||!['x','y','w','h'].every(k=>Number.isFinite(s[k])))continue;const pw=")
 app=app.replace("top+ev.clientY-y,work.height-70", "top+ev.clientY-y,work.height-base.height-32")
 app=app.replace('Atlas Command · Store preview 1 · 26 starter records','Atlas Command · Development 1.1 · 26 starter records')
 marker='window.AtlasTest={state,globe,setYear,importFile,parseKML,exportKML,unzipKML,flush,select,updateVisible,getVisible:()=>visible};'
 if app.count(marker)!=1:raise RuntimeError('Cannot locate tested integration point.')
 app=app.replace(marker,marker+'\n'+API)
 texts['app/src/app.js']=app
 host=texts['native/AtlasHost.cs']
 host=host.replace('rel == "src/styles.css" ||','rel == "src/styles.css" || rel == "src/next-ui.css" || rel == "src/workspace-layout.js" || rel == "src/lidar.js" ||')
 host=host.replace('Started local host; Store preview 1.','Started local host; Development 1.1.')
 texts['native/AtlasHost.cs']=host
 recipe=texts['build/Build-Store.ps1'].replace("'index.html','src/app.js','src/core.js','src/globe.js','src/styles.css',","'index.html','src/app.js','src/core.js','src/globe.js','src/styles.css','src/workspace-layout.js','src/lidar.js','src/next-ui.css',")
 texts['build/Build-Store.ps1']=recipe
 config=json.loads(texts['packaging/store-config.json']);config['version']='1.1.0.0';config['developmentStatus']='NOT_SUBMITTED_NOT_APPROVED';texts['packaging/store-config.json']=json.dumps(config,indent=2)+'\n'
 # Only source and metadata in the developer worktree are written.
 for rel,text in texts.items():
  (ROOT/rel).write_text(text,encoding='utf-8',newline='\n')
 print('Integrated next-version source; no installed application or Store submission changed.')
if __name__=='__main__':main()
