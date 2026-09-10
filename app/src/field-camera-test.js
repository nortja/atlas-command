/* Deliberate private-camera route-test UI. Contacts only the local Atlas native API after a user click. */
(function(win){'use strict';if(!win.document)return;
const doc=win.document,native=/^\/[a-f0-9]{32}\//.test(win.location.pathname);
win.addEventListener('atlas:ready',()=>{
 const app=win.AtlasWorkspace,O=win.AtlasFieldCameraOnvif,T=win.AtlasFieldCameraTransport,D=win.AtlasFieldCameraDiagnostics,desk=doc.getElementById('fieldCameraDesk');
 if(!desk||!app?.fieldCameras||!O||!T||!D)return;
 let busy=false,lastKey='',session=null;
 const selected=()=>{const id=desk.querySelector('.field-choice[aria-pressed="true"]')?.dataset.fieldId;return id?app.fieldCameras.list().find(p=>p.id===id):null;};
 async function localRoute(plan){const r=await fetch('api/field-camera-test/route',{method:'POST',headers:{'Content-Type':'application/json','X-Atlas-Request':'local'},body:JSON.stringify({profileId:plan.profileId,host:plan.host,port:plan.port,timeoutMs:plan.timeoutMs})});if(!r.ok)throw Error((await r.text()).slice(0,240)||'Camera route test failed');return r.json();}
 function stages(s){return s.stages.map(x=>`<li data-state="${x.state}"><b>${x.id==='media-profile'?'Media profile':x.id[0].toUpperCase()+x.id.slice(1)}</b><span>${x.detail||x.state}</span></li>`).join('');}
 function render(){
  if(!desk.open)return;const content=desk.querySelector('#fieldContent'),p=selected();if(!content||!p||content.querySelector('#fieldForm'))return;
  const key=p.id+'|'+p.host; if(lastKey!==key){lastKey=key;session=D.start(p);}
  let card=content.querySelector('.field-test-card');if(!card){card=doc.createElement('section');card.className='field-test-card field-auth-card';const anchor=content.querySelector('.field-auth-card')||content.querySelector('.field-readiness');if(anchor)anchor.after(card);else content.append(card);}
  const route=D.stage(session,'route'),remote=p.mode==='remote'||p.mode==='both';
  card.innerHTML=`<span class="eyebrow">TEST CAMERA</span><h4>${route?.state==='ready'?'Endpoint reachable':route?.state==='checking'?'Testing saved endpoint…':route?.state==='failed'?'Camera endpoint not reached':'Ready for a deliberate test'}</h4><p>${route?.detail||'Atlas will test only this saved camera address. It will not scan your network, guess credentials, or start video.'}</p>${remote?'<p class="field-muted">Remote cameras must already be reachable through your authorized private route or VPN.</p>':''}<ol class="field-test-stages">${stages(session)}</ol><div class="field-actions"><button id="fieldRouteTest" class="primary" type="button" ${busy||!native?'disabled':''}>${busy?'Testing…':'Test camera'}</button></div>${native?'':'<p class="field-muted">Camera testing is available only in the Windows desktop app.</p>'}`;
  const b=card.querySelector('#fieldRouteTest');if(b&&!b.disabled)b.onclick=()=>run(p);
 }
 async function run(p){if(busy||!native)return;busy=true;session=D.start(p);session=D.setStage(session,'route','checking','Testing only the saved endpoint.');render();
  try{
   const candidates=O.automaticCandidates(p),plans=T.routeCandidates(p,candidates);let best=null;
   for(const plan of plans){const result=await localRoute(plan);if(result?.reachable){best=result;break;}best=result;}
   if(best?.reachable)session=D.setStage(session,'route','ready',`TCP endpoint reachable on port ${best.port}. ONVIF service verification is next.`);
   else session=D.setStage(session,'route','failed',best?.reason==='refused'?'Endpoint answered but refused the connection.':best?.reason==='timeout'?'Camera endpoint did not answer before the timeout.':'Camera endpoint could not be reached.');
  }catch{session=D.setStage(session,'route','failed','Camera route test could not be completed. The saved profile was not changed.');}
  finally{busy=false;render();}
 }
 function schedule(){win.setTimeout(render,0);}desk.addEventListener('click',schedule);win.addEventListener('atlas:field-cameras-changed',schedule);desk.addEventListener('close',()=>{busy=false;lastKey='';session=null;});schedule();
},{once:true});
})(typeof window==='object'?window:globalThis);
