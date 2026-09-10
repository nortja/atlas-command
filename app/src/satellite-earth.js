/* Atlas Command photographic Earth presentation. Uses NASA Blue Marble as a visual basemap only. */
(function(win){'use strict';if(!win.document)return;
const BLUE_MARBLE='https://svs.gsfc.nasa.gov/vis/a000000/a002900/a002915/bluemarble-2048.png';
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
function moonIcon(phase){return ['🌑','🌒','🌓','🌔','🌕','🌖','🌗','🌘'][Math.round((((phase%1)+1)%1)*8)%8];}
win.addEventListener('atlas:ready',()=>{
 const app=win.AtlasWorkspace,doc=win.document;if(!app?.liveEarth||doc.getElementById('satelliteEarth'))return;
 const canvas=doc.getElementById('globe'),workspace=doc.getElementById('workspace');if(!canvas||!workspace)return;
 const earth=doc.createElement('div');earth.id='satelliteEarth';earth.className='satellite-earth fallback';earth.setAttribute('aria-hidden','true');
 earth.innerHTML='<div class="satellite-earth-texture"></div><div class="satellite-earth-light"></div><div class="satellite-earth-atmosphere"></div><div class="satellite-earth-credit">NASA BLUE MARBLE · SATELLITE MOSAIC</div>';
 workspace.insertBefore(earth,canvas);
 const texture=earth.querySelector('.satellite-earth-texture'),light=earth.querySelector('.satellite-earth-light');
 const moon=doc.createElement('div');moon.id='atlasMoonContext';moon.className='atlas-moon-context';moon.setAttribute('aria-hidden','true');workspace.append(moon);
 let ready=false,started=false;
 function beginImage(){if(started)return;started=true;const probe=new Image();probe.decoding='async';probe.onload=()=>{texture.style.backgroundImage='url("'+BLUE_MARBLE+'")';ready=true;earth.classList.remove('fallback');earth.classList.add('loaded');};probe.onerror=()=>{ready=false;earth.classList.add('fallback');};probe.src=BLUE_MARBLE;}
 // Let the local workspace become fully interactive before an optional visual image is requested.
 // If the image is unavailable, Atlas keeps its bundled offline globe instead of showing a blank planet.
 win.setTimeout(beginImage,3000);
 function paint(g){
  g.options.photoEarth=ready;const R=g.radius,x=g.cx-R,y=g.cy-R,size=R*2;
  earth.style.left=x+'px';earth.style.top=y+'px';earth.style.width=size+'px';earth.style.height=size+'px';
  if(ready){texture.style.backgroundSize=(size*2)+'px '+size+'px';const lon=((g.lon%360)+360)%360,imgX=((lon+180)%360)/360*(size*2);texture.style.backgroundPositionX=(R-imgX)+'px';texture.style.backgroundPositionY=clamp(-g.lat/90*R*.18,-R*.18,R*.18)+'px';}
  const solar=win.AtlasLiveWeather?.solar?.(Date.now());if(solar){const p=g.project(g.vec(solar.lat,solar.lon));const sx=clamp((p.x-x)/size*100,-15,115),sy=clamp((p.y-y)/size*100,-15,115),behind=p.z<0;light.style.background='radial-gradient(circle at '+sx.toFixed(1)+'% '+sy.toFixed(1)+'%,rgba(255,248,214,'+(behind?'.02':'.16')+') 0%,rgba(255,231,172,'+(behind?'.01':'.05')+') 26%,rgba(3,11,19,.16) 55%,rgba(1,6,12,'+(behind?'.72':'.56')+') 100%)';}
  const m=win.AtlasCore.moonPhase(new Date()),a=m.phase*Math.PI*2-Math.PI/2,orbit=R*1.20;moon.textContent=moonIcon(m.phase);moon.title=m.name+' · approximate lunar phase context';moon.style.left=(g.cx+Math.cos(a)*orbit-14)+'px';moon.style.top=(g.cy+Math.sin(a)*orbit-14)+'px';moon.style.opacity=R>170?'1':'0';
 }
 app.liveEarth.renderer(paint,'satellite-earth');
},{once:true});
win.AtlasSatelliteEarth=Object.freeze({BLUE_MARBLE,moonIcon});
})(typeof window==='object'?window:globalThis);
