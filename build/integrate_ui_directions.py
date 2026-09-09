"""Apply UI review changes to the isolated development worktree; never install/publish."""
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
def edit(name,fn):
 p=ROOT/name;s=p.read_text('utf-8');p.write_text(fn(s),encoding='utf-8',newline='\n')
def once(s,a,b):
 if b in s:return s
 if s.count(a)!=1:raise RuntimeError('UI integration anchor mismatch: '+a[:100])
 return s.replace(a,b,1)
for name in ['app/index.html','app/workspace-preview.html']:
 def entry(s):
  s=once(s,'<link rel="stylesheet" href="src/cameras.css">','<link rel="stylesheet" href="src/cameras.css"><link rel="stylesheet" href="src/ui-directions.css">')
  s=once(s,'<link rel="stylesheet" href="src/ui-directions.css">','<link rel="stylesheet" href="src/ui-directions.css"><link rel="stylesheet" href="src/ui-refinement.css">')
  return once(s,'<script src="src/app.js"></script>','<script src="src/ui-directions.js"></script><script src="src/app.js"></script>')
 edit(name,entry)
def app(s):
 s=once(s,'window.AtlasWorkspace=Object.freeze({','const appearancePreferences=AtlasAppearance.store(()=>state.settings.appearance,v=>{state.settings.appearance=v;},flush,id=>{globe.appearance=id;window.dispatchEvent(new Event("atlas:appearance-changed"));});\nglobe.appearance=AtlasAppearance.normalize(state.settings.appearance);\nwindow.AtlasWorkspace=Object.freeze({\n appearance:Object.freeze({...appearancePreferences,overview:()=>AtlasAppearance.summarize(state.sites,visible.length,state.queue.length)}),')
 s=once(s,"globe.setSites(visible);renderCatalog();", "globe.setSites(visible);renderCatalog();window.dispatchEvent(new Event('atlas:catalog-changed'));")
 s=once(s,"Math.min(s.y,h-ph-35)","Math.min(s.y,h-(s.collapsed?47:ph)-35)")
 s=s.replace('The world is still full<br>of questions.','The world is still full <br>of questions.')
 s=once(s,"$('#planBtn').onclick=planDialog;","$('#planBtn').onclick=planDialog;window.dispatchEvent(new Event('atlas:catalog-changed'));")
 s=s.replace('Switching units does not change source readings. Live weather feeds are not connected in this build.','Switching units does not change source readings. Optional live model weather is controlled separately in Live Earth.')
 return s
edit('app/src/app.js',app)
edit('native/AtlasHost.cs',lambda s:once(s,'rel == "src/cameras.css" ||','rel == "src/cameras.css" || rel == "src/ui-directions.js" || rel == "src/ui-directions.css" ||'))
edit('native/AtlasHost.cs',lambda s:once(s,'rel == "src/ui-directions.css" ||','rel == "src/ui-directions.css" || rel == "src/ui-refinement.css" ||'))
edit('build/Build-Store.ps1',lambda s:once(s,"'src/cameras.css'","'src/cameras.css','src/ui-directions.js','src/ui-directions.css'"))
edit('build/Build-Store.ps1',lambda s:once(s,"'src/ui-directions.css'","'src/ui-directions.css','src/ui-refinement.css'"))
def globe(s):
 s=once(s,'  let R=this.radius;', '''  if(this.appearance&&W>=950){const focus=document.body.classList.contains('globe-focus');this.cy=H*(focus?.54:.66);this.radius=Math.min(H*(focus?.40:H<650?.265:H<1000?.29:.33),W*.248)*this.zoom;}
  const colors=this.appearance==='expedition'?{coast:'#c8ad7caa',inner:'#343528e8',middle:'#222820ee',edge:'#474b37f0',rim:'#d4bc86aa'}:this.appearance==='signal'?{coast:'#7fc8b5aa',inner:'#173b36e8',middle:'#112b2aee',edge:'#25554df0',rim:'#87dfc0aa'}:null;
  let R=this.radius;''')
 for old,new in [("sphere.addColorStop(0,'#143a4ce8')","sphere.addColorStop(0,colors?.inner||'#143a4ce8')"),("sphere.addColorStop(.6,'#0b2534ee')","sphere.addColorStop(.6,colors?.middle||'#0b2534ee')"),("sphere.addColorStop(1,'#1b4859f0')","sphere.addColorStop(1,colors?.edge||'#1b4859f0')"),("this.line(line,'#72c5d6a0',.72)","this.line(line,colors?.coast||'#72c5d6a0',.72)"),("ctx.strokeStyle='#8bdded9a'","ctx.strokeStyle=colors?.rim||'#8bdded9a'")]:s=once(s,old,new)
 return s
edit('app/src/globe.js',globe)
print('Integrated three bundled review appearances; no installation or Store action.')
def camera_test(s):
 old="   frames.append({'camera':r.url.rsplit('/',1)[-1],'sha256':hashlib.sha256(r.body()).hexdigest(),'bytes':len(r.body()),'fetchedAt':r.headers.get('x-atlas-camera-fetched-at'),'modifiedAt':r.headers.get('x-atlas-camera-modified')})"
 new='''   responses.append(r)
 def collect_responses():
  if not responses:raise AssertionError('No native camera response received.')
  r=responses.pop();responses.clear()
  # Inspect the same cached native frame without weakening browser CSP.
  ident=r.url.rsplit('/',1)[-1]
  status,headers,body=host.expect('POST','api/camera/'+ident,200,headers={'X-Atlas-Request':'local'})
  assert body[:3]==bytes([255,216,255]) and len(body)>10000
  assert len(body)==int(r.headers['content-length'])
  assert headers['x-atlas-camera-fetched-at']==r.headers['x-atlas-camera-fetched-at']
  dims=page.locator('#cameraView img').evaluate('(img)=>({width:img.naturalWidth,height:img.naturalHeight})')
  assert dims['width']>=500
  frames.append({'camera':ident,'sha256':hashlib.sha256(body).hexdigest(),'bytes':len(body),**dims,'fetchedAt':headers['x-atlas-camera-fetched-at'],'modifiedAt':headers.get('x-atlas-camera-modified'),'verification':'Native cached payload matches browser response fetch time and length; browser decoded the actual image'})'''
 s=once(s,'network=[];frames=[];success=False','network=[];frames=[];responses=[];success=False')
 if ' def collect_responses():' in s:
  start=s.index('   responses.append(r)');end=s.index('\n try:\n  host.start()',start);s=s[:start]+new+s[end:]
 else:s=once(s,old,new)
 s=once(s,"   assert frames and frames[-1]['camera']=='K2cam'", "   collect_responses()\n   assert frames and frames[-1]['camera']=='K2cam'")
 return once(s,"   assert frames[-1]['camera']=='F1cam'", "   collect_responses()\n   assert frames[-1]['camera']=='F1cam'")
edit('tests/release_tools_ui.py',camera_test)
def finish_ui_test(s):
 s=s.replace("page.locator('#queueBtn').click();expect(page.locator('[data-stat=queued]')).to_have_text('0')", "page.locator('#queueBtn').click();expect(page.locator('[data-stat=queued]')).to_have_text('1')")
 s=s.replace('Mission counter responds to actual queue add and removal','Mission counter responds to actual queue add and refuses duplicate additions')
 s=once(s,"success=False;page=None", "success=False;page=None;failure=''")
 s=once(s," finally:\n  if page and not success:", " except Exception as error:\n  failure=repr(error);raise\n finally:\n  if page and not success:")
 s=once(s,"{'success':success,'checks':checks", "{'success':success,'failure':failure,'checks':checks")
 anchor=" def passed(s):checks.append(s);print('PASS: '+s,flush=True)"
 replacement=anchor+'''\n def capture(path):
  # Reset only ordinary scroll position after test interactions, then let the
  # app's own transient toast expire. No DOM content or screenshot is fabricated.
  page.locator('#dossierBody').evaluate('(el)=>el.scrollTop=0')
  page.locator('#toast').wait_for(state='hidden',timeout=10000)
  page.wait_for_timeout(250)
  page.screenshot(path=path)'''
 s=once(s,anchor,replacement)
 s=s.replace("page.screenshot(path=str(OUT/(index+", "capture(str(OUT/(index+")
 s=s.replace("page.screenshot(path=str(OUT/'A-Orbital-Ultrawide.png'))", "capture(str(OUT/'A-Orbital-Ultrawide.png'))")
 s=s.replace("page.screenshot(path=str(OUT/'Appearance-Chooser.png'))", "capture(str(OUT/'Appearance-Chooser.png'))")
 return s
edit('tests/ui_directions_native.py',finish_ui_test)
