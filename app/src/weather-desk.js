/* Atlas Command selected-site Weather desk. Presentation only; Live Earth owns weather data and consent. */
(function(win){'use strict';if(!win.document)return;
win.addEventListener('atlas:ready',()=>{
 const doc=win.document,app=win.AtlasWorkspace;if(!app?.liveEarth||doc.getElementById('weatherDeskBtn'))return;
 const esc=s=>win.AtlasCore.escapeHTML(String(s??''));
 const trigger=doc.createElement('button');trigger.id='weatherDeskBtn';trigger.textContent='☁ Weather';trigger.setAttribute('aria-controls','weatherDesk');trigger.setAttribute('aria-expanded','false');
 const earth=doc.getElementById('liveEarthBtn');if(earth){earth.textContent='◉ Planet';earth.title='Global weather and planet display settings';earth.after(trigger);}else doc.querySelector('.top-actions')?.prepend(trigger);
 const desk=doc.createElement('section');desk.id='weatherDesk';desk.className='weather-desk';desk.hidden=true;desk.setAttribute('aria-label','Selected location weather');
 desk.innerHTML='<header class="weather-desk-head"><div><span class="eyebrow">WEATHER / SELECTED LOCATION</span><h2 id="weatherDeskTitle">Weather</h2><p id="weatherDeskContext">Choose a site on the globe.</p></div><button id="weatherDeskClose" aria-label="Close weather">×</button></header><div id="weatherDeskBody"><div class="weather-desk-empty">Weather follows the site you select.</div></div><footer>Model weather · timestamps stay visible · not an emergency warning service</footer>';
 doc.getElementById('workspace')?.append(desk);
 const body=desk.querySelector('#weatherDeskBody'),title=desk.querySelector('#weatherDeskTitle'),context=desk.querySelector('#weatherDeskContext');
 function attach(){const site=app.liveEarth.selection();title.textContent=site?site.name:'Weather';context.textContent=site?'Live model conditions near '+site.name+' · '+site.lat.toFixed(2)+'°, '+site.lon.toFixed(2)+'°':'Choose a site on the globe.';const card=doc.getElementById('weatherCard');if(card&&card.parentElement!==body){body.replaceChildren(card);card.classList.add('weather-plugin-card');}else if(!card&&!body.querySelector('.weather-desk-empty'))body.innerHTML='<div class="weather-desk-empty">Weather is preparing for the selected location.</div>';}
 function open(){desk.hidden=false;trigger.setAttribute('aria-expanded','true');attach();desk.querySelector('#weatherDeskClose').focus();}
 function close(){desk.hidden=true;trigger.setAttribute('aria-expanded','false');trigger.focus();}
 trigger.onclick=()=>desk.hidden?open():close();desk.querySelector('#weatherDeskClose').onclick=close;
 win.addEventListener('atlas:selection',()=>win.setTimeout(attach,0));win.addEventListener('atlas:weather-units-changed',()=>win.setTimeout(attach,0));
 const observer=new MutationObserver(()=>win.setTimeout(attach,0));observer.observe(doc.getElementById('dossierBody'),{childList:true,subtree:false});
 win.setTimeout(attach,0);
},{once:true});
})(typeof window==='object'?window:globalThis);
