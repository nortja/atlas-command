/* Atlas Command Camera Desk. Fixed public sources only; no camera discovery,
   credentials, downloaded scripts, arbitrary embeds, or background recording.
   In-app sources are explicitly labelled periodic JPEG snapshots, not video. */
(function(root,factory){'use strict';const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else{root.AtlasCameras=api;root.addEventListener('atlas:ready',()=>api.mount(root),{once:true});}})(typeof window==='object'?window:globalThis,function(){
'use strict';
const SOURCES=Object.freeze([
 Object.freeze({id:'K2cam',name:'Kīlauea · summit panorama',provider:'USGS Hawaiian Volcano Observatory',region:'Hawaiʻi, United States',kind:'snapshot',category:'Volcanoes',url:'https://www.usgs.gov/volcanoes/kilauea/k2cam-kaluapele-kilauea-caldera-uekahuna-bluff',credit:'Image courtesy of the U.S. Geological Survey · Public domain',note:'Periodic camera image, not continuous video. The view can move. Refer to the timestamp within the image for capture time.'}),
 Object.freeze({id:'F1cam',name:'Kīlauea · thermal view',provider:'USGS Hawaiian Volcano Observatory',region:'Hawaiʻi, United States',kind:'snapshot',category:'Volcanoes',url:'https://www.usgs.gov/volcanoes/kilauea/f1cam-halemaumau-thermal-image-west-rim-summit-caldera-looking-southeast',credit:'Image courtesy of the U.S. Geological Survey · Public domain',note:'Thermal camera image. Its embedded Celsius scale is provider imagery, not an air-temperature forecast; the app does not rewrite it.'}),
 Object.freeze({id:'V1cam',name:'Kīlauea · west crater',provider:'USGS Hawaiian Volcano Observatory',region:'Hawaiʻi, United States',kind:'snapshot',category:'Volcanoes',url:'https://www.usgs.gov/volcanoes/kilauea/v1cam-kilauea-volcano-hawaii-west-halemaumau-crater',credit:'Image courtesy of the U.S. Geological Survey · Public domain',note:'Periodic snapshot. The official source page also provides the provider’s continuous livestream.'}),
 Object.freeze({id:'nasa-earth',name:'Earth from the space station',provider:'NASA',region:'Orbit · moving viewpoint',kind:'provider-video',category:'Space',url:'https://eol.jsc.nasa.gov/esrs/hdev/',credit:'Official NASA source · external player',note:'Open NASA’s official live-view page. Signal gaps and nighttime views occur. This is not a camera at the selected archaeological site.'}),
 Object.freeze({id:'old-faithful',name:'Old Faithful & Upper Geyser Basin',provider:'National Park Service / Yellowstone Forever',region:'Yellowstone, United States',kind:'provider-video',category:'Nature',url:'https://www.nps.gov/yell/learn/photosmultimedia/webcams.htm',credit:'Official National Park Service source · external player',note:'The official page offers continuous video and other periodically refreshed webcams. No third-party stream is copied or relayed by Atlas.'})
]);
const IDS=new Set(SOURCES.map(s=>s.id));
function preferences(raw){return {connectSnapshots:raw?.connectSnapshots===true,autoRefresh:raw?.autoRefresh===true,favorites:Array.isArray(raw?.favorites)?[...new Set(raw.favorites.filter(id=>IDS.has(id)))]:[],selected:IDS.has(raw?.selected)?raw.selected:'K2cam'};}
function source(id){return SOURCES.find(s=>s.id===id)||null;}
function requestPath(id){const s=source(id);if(!s||s.kind!=='snapshot')throw Error('Not an approved snapshot source.');return 'api/camera/'+s.id;}
function filtered(query='',category='all',favorites=null){const q=String(query).normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase();return SOURCES.filter(s=>(category==='all'||s.category===category)&&(!favorites||favorites.includes(s.id))&&[s.name,s.region,s.provider].join(' ').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().includes(q));}
function mount(win){
 const app=win.AtlasWorkspace,doc=win.document;if(!app?.cameras||doc.getElementById('cameraDeskBtn'))return;
 const esc=s=>win.AtlasCore.escapeHTML(String(s??''));let pref=preferences(app.cameras.read()),active=source(pref.selected),running=false,busy=false,generation=0,abort=null,imageURL=null,loadedAt=null,serverTime=null,refreshAt=0,write=Promise.resolve();
 const trigger=doc.createElement('button');trigger.id='cameraDeskBtn';trigger.textContent='▣ Cameras';trigger.setAttribute('aria-controls','cameraDesk');trigger.setAttribute('aria-expanded','false');doc.querySelector('.top-actions').prepend(trigger);
 const desk=doc.createElement('section');desk.id='cameraDesk';desk.className='camera-desk';desk.hidden=true;desk.setAttribute('aria-label','Camera desk');
 desk.innerHTML='<header class="camera-head"><div><span class="eyebrow">OBSERVATORY / CAMERA DESK</span><h2>Windows onto the world</h2></div><button id="cameraClose" aria-label="Close camera desk">×</button></header>'+
 '<p class="camera-context" id="cameraContext"></p><div class="camera-controls"><input id="cameraSearch" aria-label="Search camera sources" placeholder="Search cameras or regions"><select id="cameraCategory" aria-label="Camera category"><option value="all">All views</option><option>Volcanoes</option><option>Nature</option><option>Space</option></select><button id="cameraFavorites" aria-pressed="false">☆ Favorites</button></div>'+
 '<div class="camera-body"><div class="camera-list" id="cameraList" aria-label="Available camera sources"></div><div class="camera-feature"><div class="camera-title"><h3 id="cameraName"></h3><button id="cameraFavorite" aria-label="Favorite this camera">☆</button></div><p id="cameraType" class="camera-type"></p><div class="camera-view" id="cameraView"><p>Select a camera source.</p></div><p id="cameraStatus" role="status" data-state="OFF"></p><p id="cameraCaption" class="camera-caption"></p><div class="camera-actions"><button id="cameraLoad" class="primary">Load snapshot</button><button id="cameraPause">Pause</button><a id="cameraSource" target="_blank" rel="noopener noreferrer">Official source ↗</a></div><p id="cameraCredit" class="camera-credit"></p></div></div>'+
 '<details class="camera-privacy" id="cameraPrivacy"><summary>Connection & refresh controls</summary><p>Snapshot requests go to USGS through the local helper. USGS receives your internet IP and the fixed camera path—not your selected site, notes, or documents. Pictures are held in memory, not recorded to your research library. External video pages use their own player, cookies and privacy practices.</p><label><input type="checkbox" id="cameraConsent"> Allow connections to the three listed USGS snapshot cameras</label><label><input type="checkbox" id="cameraAuto"> Refresh the selected snapshot every 5 minutes while this panel is visible</label><p>No sound or automatic video playback. Closing this panel stops refreshes. Snapshot retrieval time does not prove capture time; check the timestamp in the image.</p><button id="cameraSave" class="primary">Save camera preferences</button><span id="cameraSaveStatus" role="status"></span></details>'+
 '<footer>Public sources only · No recording · Viewing does not establish safe conditions or permission to enter.</footer>';
 doc.getElementById('workspace').append(desk);const $=s=>desk.querySelector(s);let favOnly=false;
 function context(){const s=app.liveEarth.selection();$('#cameraContext').textContent=(s?'Selected site: '+s.name+'. ':'')+'Camera locations are listed separately; these are not automatically views of the selected site.';}
 function status(label,text){$('#cameraStatus').dataset.state=label;$('#cameraStatus').textContent=text;}
 function stop(reason='PAUSED'){running=false;generation++;abort?.abort();abort=null;busy=false;$('#cameraLoad').disabled=false;status(reason,reason==='OFF'?'Camera connections are off.':reason==='UNAVAILABLE'?'Source unavailable. Try again later or open the official page.':'Paused. Any displayed image is an earlier snapshot, not a live video.');}
 function discard(){if(imageURL){win.URL.revokeObjectURL(imageURL);imageURL=null;}$('#cameraView').replaceChildren();loadedAt=null;serverTime=null;}
 function persist(next){const clean=preferences(next);const task=write.then(()=>app.cameras.commit(clean)).then(()=>{pref=clean;return clean;});write=task.catch(()=>{});return task;}
 function list(){const data=filtered($('#cameraSearch').value,$('#cameraCategory').value,favOnly?pref.favorites:null);$('#cameraList').innerHTML=data.length?data.map(s=>'<button class="camera-choice '+(s.id===active.id?'selected':'')+'" data-camera="'+s.id+'" aria-pressed="'+(s.id===active.id)+'"><b>'+esc(s.name)+'</b><span>'+esc(s.region)+'</span><small>'+esc(s.kind==='snapshot'?'IN-APP SNAPSHOT':'OFFICIAL LIVESTREAM PAGE')+'</small></button>').join(''):'<p class="camera-empty">No matching sources. This does not establish that no cameras exist in the area.</p>';desk.querySelectorAll('[data-camera]').forEach(b=>b.onclick=()=>choose(b.dataset.camera));}
 function describe(){
  $('#cameraName').textContent=active.name;$('#cameraType').textContent=active.kind==='snapshot'?'PERIODIC SNAPSHOT · NO AUDIO':'CONTINUOUS VIDEO AT PROVIDER · NOT EMBEDDED';
  $('#cameraCaption').textContent=active.note;$('#cameraCredit').textContent=active.credit;
  $('#cameraSource').href=active.url;$('#cameraLoad').hidden=active.kind!=='snapshot';$('#cameraPause').hidden=active.kind!=='snapshot';
  $('#cameraFavorite').textContent=pref.favorites.includes(active.id)?'★':'☆';$('#cameraFavorite').setAttribute('aria-pressed',String(pref.favorites.includes(active.id)));
  if(active.kind==='provider-video'){$('#cameraView').innerHTML='<div class="camera-link-view"><span>↗</span><h4>Watch with '+esc(active.provider)+'</h4><p>Use “Official source” below. Continuous playback remains on the provider’s website.</p><small>Availability has not been checked in this session.</small></div>';status('EXTERNAL','Official livestream page · not an in-app live-status check.');}
  else if(!imageURL){$('#cameraView').innerHTML='<div class="camera-link-view"><span>▣</span><h4>Ready when you are</h4><p>Load the latest published camera image without leaving your globe.</p></div>';status(pref.connectSnapshots?'READY':'OFF',pref.connectSnapshots?'Ready. Press Load snapshot to connect.':'Off. Review connection controls before loading a camera.');}
 }
 async function choose(id){const s=source(id);if(!s)return;stop();discard();refreshAt=0;active=s;describe();list();try{await persist({...pref,selected:id});}catch{app.notify('Camera selection could not be saved.');}}
 async function load(){
  if(desk.hidden||doc.hidden||busy||active.kind!=='snapshot')return;
  if(!pref.connectSnapshots){$('#cameraPrivacy').open=true;$('#cameraConsent').focus();status('OFF','Allow USGS connections below, save, then load the snapshot.');return;}
  if(app.storageMode!=='native'){status('UNAVAILABLE','In-app snapshots require the Windows helper. Official source links still work.');return;}
  if(Date.now()<refreshAt){status('PAUSED','Please wait a few seconds before another refresh. Any displayed picture is the earlier snapshot.');return;}
  running=true;busy=true;$('#cameraLoad').disabled=true;const serial=++generation,id=active.id;abort=new AbortController();const controller=abort,timer=win.setTimeout(()=>controller.abort(),18000);refreshAt=Date.now()+20000;
  status('LOADING','Retrieving a published USGS camera image…');
  try{
   const response=await win.fetch(requestPath(id),{method:'POST',headers:{'X-Atlas-Request':'local'},credentials:'omit',referrerPolicy:'no-referrer',cache:'no-store',redirect:'error',signal:controller.signal});
   if(!response.ok)throw Error('Camera request failed ('+response.status+').');
   if(response.headers.get('content-type')?.split(';')[0]!=='image/jpeg')throw Error('Source did not return a JPEG image.');
   const blob=await response.blob();if(blob.size>5*1024*1024||blob.size<4)throw Error('Invalid camera image size.');
   if(serial!==generation||id!==active.id||desk.hidden||doc.hidden)return;
   const nextURL=win.URL.createObjectURL(blob),img=new Image();img.alt=active.name+' — provider snapshot; capture timestamp remains in the image.';
   try{img.src=nextURL;await img.decode();}catch(e){win.URL.revokeObjectURL(nextURL);throw e;}
   if(serial!==generation||desk.hidden||doc.hidden){win.URL.revokeObjectURL(nextURL);return;}
   discard();imageURL=nextURL;$('#cameraView').replaceChildren(img);loadedAt=response.headers.get('X-Atlas-Camera-Fetched-At');serverTime=response.headers.get('X-Atlas-Camera-Modified');
   status('SNAPSHOT','Snapshot received '+new Date(loadedAt||Date.now()).toLocaleTimeString()+'. Capture time: see the provider timestamp in the image.');
   if(serverTime)$('#cameraCaption').textContent=active.note+' Server file timestamp: '+new Date(serverTime).toLocaleString()+'.';
  }catch(e){if(serial===generation){running=false;discard();$('#cameraView').innerHTML='<div class="camera-link-view"><span>◌</span><h4>Camera unavailable</h4><p>Your globe and research remain available. Retry or open the official source.</p></div>';status('UNAVAILABLE',e.name==='AbortError'?'Camera request timed out or was paused.':e.message);}}
  finally{win.clearTimeout(timer);if(serial===generation){busy=false;$('#cameraLoad').disabled=false;}}
 }
 function open(){desk.hidden=false;trigger.setAttribute('aria-expanded','true');context();list();describe();$('#cameraConsent').checked=pref.connectSnapshots;$('#cameraAuto').checked=pref.autoRefresh;$('#cameraClose').focus();}
 function close(){stop();discard();desk.hidden=true;trigger.setAttribute('aria-expanded','false');trigger.focus();}
 trigger.onclick=()=>desk.hidden?open():close();$('#cameraClose').onclick=close;
 $('#cameraLoad').onclick=load;$('#cameraPause').onclick=()=>stop();
 $('#cameraSearch').oninput=list;$('#cameraCategory').onchange=list;
 $('#cameraFavorites').onclick=()=>{favOnly=!favOnly;$('#cameraFavorites').setAttribute('aria-pressed',String(favOnly));list();};
 $('#cameraFavorite').onclick=async()=>{const id=active.id,next=pref.favorites.includes(id)?pref.favorites.filter(x=>x!==id):[...pref.favorites,id];try{await persist({...pref,favorites:next});describe();list();}catch{app.notify('Favorite could not be saved.');}};
 $('#cameraSave').onclick=async()=>{const button=$('#cameraSave');button.disabled=true;const next={...pref,connectSnapshots:$('#cameraConsent').checked,autoRefresh:$('#cameraAuto').checked};if(!next.connectSnapshots){stop('OFF');discard();}try{await persist(next);$('#cameraSaveStatus').textContent='Saved locally. Use Load snapshot to start.';describe();}catch{$('#cameraConsent').checked=pref.connectSnapshots;$('#cameraAuto').checked=pref.autoRefresh;$('#cameraSaveStatus').textContent='Save failed. Previous preferences retained; no new connection started.';}finally{button.disabled=false;}};
 desk.addEventListener('keydown',e=>{if(e.key==='Escape'){e.stopPropagation();close();}});
 win.addEventListener('atlas:selection',context);
 doc.addEventListener('visibilitychange',()=>{if(doc.hidden&&!desk.hidden)stop();});
 win.setInterval(()=>{if(running&&pref.connectSnapshots&&pref.autoRefresh&&!desk.hidden&&!doc.hidden&&!busy&&Date.now()>=refreshAt+280000)load();},10000);
}
return Object.freeze({SOURCES,preferences,source,requestPath,filtered,mount});
});
