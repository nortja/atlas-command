/* Atlas Command Live Earth. Open-Meteo model data; no satellite or lightning claims.
   Personal non-commercial API use only. Network access starts after explicit consent.
   Solar approximation follows NOAA fractional-year equations; not historical ephemerides. */
(function(root,factory){'use strict';const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else{root.AtlasLiveWeather=api;root.addEventListener('atlas:ready',()=>api.mount(root),{once:true});}})(typeof window==='object'?window:globalThis,function(){
'use strict';
const ENDPOINT='https://api.open-meteo.com/v1/forecast',POINT_TTL=20*60000,GRID_TTL=3*3600000,STALE=90*60000;
const valid=n=>typeof n==='number'&&Number.isFinite(n),clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const number=(n,a,b)=>valid(n)&&n>=a&&n<=b?n:null;
const RAD=Math.PI/180,TAU=2*Math.PI;
function coordinates(lat,lon){if(!valid(lat)||!valid(lon)||Math.abs(lat)>90||Math.abs(lon)>180)throw Error('Invalid weather coordinates.');return {lat:Math.round(lat*100)/100,lon:Math.round(lon*100)/100};}
function key(p){const c=coordinates(p.lat,p.lon);return c.lat.toFixed(2)+','+c.lon.toFixed(2);}
function grid(){const out=[];for(let lat=-82.5;lat<90;lat+=15)for(let lon=-172.5;lon<180;lon+=15)out.push({lat,lon});return out;}
function url(points,global=false){if(!Array.isArray(points)||!points.length||points.length>48)throw Error('Weather batch must contain 1–48 positions.');const c=points.map(p=>coordinates(p.lat,p.lon)),q=new URLSearchParams({latitude:c.map(p=>p.lat).join(','),longitude:c.map(p=>p.lon).join(','),current:global?'cloud_cover,precipitation':'temperature_2m,apparent_temperature,relative_humidity_2m,weather_code,cloud_cover,precipitation,wind_speed_10m,wind_gusts_10m,wind_direction_10m',temperature_unit:'celsius',wind_speed_unit:'kmh',precipitation_unit:'mm',timeformat:'unixtime',timezone:global?'GMT':'auto',forecast_days:global?'1':'2',cell_selection:'nearest'});if(!global){q.set('hourly','temperature_2m,precipitation_probability');q.set('daily','sunrise,sunset');}return ENDPOINT+'?'+q;}
function normalize(raw,point,now=Date.now(),global=false){
 if(!raw||raw.error||!raw.current||!raw.current_units)throw Error('Weather response has no current model data.');
 const c=raw.current,u=raw.current_units;if(u.time!=='unixtime'||u.cloud_cover!=='%'||u.precipitation!=='mm')throw Error('Unexpected weather units.');
 if(!global&&(u.temperature_2m!=='°C'||u.wind_speed_10m!=='km/h'))throw Error('Unexpected temperature or wind units.');
 if(!valid(c.time)||Math.abs(c.time*1000-now)>48*3600000)throw Error('Weather model time is outside the accepted window.');
 const requested=coordinates(point.lat,point.lon);
 if(!valid(raw.latitude)||!valid(raw.longitude)||Math.abs(raw.latitude-requested.lat)>2||Math.abs((((raw.longitude-requested.lon)+540)%360)-180)>2)throw Error('Weather response does not match the requested area.');
 const out={...requested,modelLat:raw.latitude,modelLon:raw.longitude,time:c.time*1000,fetchedAt:now,interval:number(c.interval,1,86400),cloud:number(c.cloud_cover,0,100),precipitation:number(c.precipitation,0,1000),temperatureC:number(c.temperature_2m,-120,80),feelsLikeC:number(c.apparent_temperature,-150,100),humidity:number(c.relative_humidity_2m,0,100),windKmh:number(c.wind_speed_10m,0,500),gustKmh:number(c.wind_gusts_10m,0,700),direction:number(c.wind_direction_10m,0,360),code:number(c.weather_code,0,99),timezone:typeof raw.timezone==='string'?raw.timezone:'UTC',hours:[],sunrise:null,sunset:null};
 try{new Intl.DateTimeFormat('en-US',{timeZone:out.timezone});}catch{out.timezone='UTC';}
 if(!global){const h=raw.hourly||{},hu=raw.hourly_units||{};if(Array.isArray(h.time)&&h.time.length<=100&&hu.time==='unixtime'&&hu.precipitation_probability==='%'&&hu.temperature_2m==='°C')out.hours=h.time.map((t,i)=>({time:valid(t)?t*1000:null,temperatureC:number(h.temperature_2m?.[i],-120,80),chance:number(h.precipitation_probability?.[i],0,100)})).filter(h=>valid(h.time));
 const d=raw.daily||{};if(raw.daily_units?.sunrise==='unixtime'&&raw.daily_units?.sunset==='unixtime'&&Array.isArray(d.time)){let i=d.time.findIndex((t,i)=>valid(t)&&now>=t*1000&&now<(d.time[i+1]||t+86400)*1000);if(i<0)i=0;out.sunrise=valid(d.sunrise?.[i])?d.sunrise[i]*1000:null;out.sunset=valid(d.sunset?.[i])?d.sunset[i]*1000:null;}}
 return out;
}
function freshness(s,now=Date.now(),global=false){if(!s||!valid(s.time)||!valid(s.fetchedAt))return 'missing';if(s.fetchedAt>now+300000||s.time>now+300000)return 'clock mismatch';return now-s.time>(global?6*3600000:STALE)?'stale':'current';}
function nextHours(s,now=Date.now()){return (s?.hours||[]).filter(h=>valid(h.time)&&h.time>=Math.floor(now/3600000)*3600000).slice(0,6);}
function description(code){if(code===0)return 'Clear sky';if(code===1)return 'Mainly clear';if(code===2)return 'Partly cloudy';if(code===3)return 'Overcast';if([45,48].includes(code))return 'Fog';if([51,53,55,56,57].includes(code))return 'Drizzle';if([61,63,65,66,67,80,81,82].includes(code))return 'Rain / showers';if([71,73,75,77,85,86].includes(code))return 'Snow';if([95,96,99].includes(code))return 'Thunderstorm model';return 'Conditions unavailable';}
function solar(now=Date.now()){
 const d=new Date(now),y=d.getUTCFullYear();if(!valid(now)||y<1900||y>2100)return null;
 const doy=(now-Date.UTC(y,0,1))/86400000,days=(Date.UTC(y+1,0,1)-Date.UTC(y,0,1))/86400000,g=TAU/days*(doy-.5);
 const eq=229.18*(.000075+.001868*Math.cos(g)-.032077*Math.sin(g)-.014615*Math.cos(2*g)-.040849*Math.sin(2*g));
 const decl=.006918-.399912*Math.cos(g)+.070257*Math.sin(g)-.006758*Math.cos(2*g)+.000907*Math.sin(2*g)-.002697*Math.cos(3*g)+.00148*Math.sin(3*g);
 const minutes=d.getUTCHours()*60+d.getUTCMinutes()+d.getUTCSeconds()/60,lon=((180-(minutes+eq)/4+540)%360)-180;
 return {lat:decl/RAD,lon,vector:[Math.cos(decl)*Math.cos(lon*RAD),Math.sin(decl),Math.cos(decl)*Math.sin(lon*RAD)]};
}
function config(raw){return {enabled:raw?.enabled===true,global:raw?.global!==false,cinematic:raw?.cinematic!==false,autoIdle:raw?.autoIdle!==false};}
function snapshot(value){
 if(!value||typeof value!=='object'||JSON.stringify(value).length>400000)throw Error('Invalid Live Earth storage.');
 const c=value.cache||{},out={config:config(value.config),cache:{points:{},grid:null}};
 const clean=s=>{
  if(!s||!valid(s.time)||!valid(s.fetchedAt))return null;let p;try{p=coordinates(s.lat,s.lon);}catch{return null;}
  const result={...p,time:s.time,fetchedAt:s.fetchedAt,modelLat:number(s.modelLat,-90,90),modelLon:number(s.modelLon,-180,180),interval:number(s.interval,1,86400),cloud:number(s.cloud,0,100),precipitation:number(s.precipitation,0,1000),temperatureC:number(s.temperatureC,-120,80),feelsLikeC:number(s.feelsLikeC,-150,100),humidity:number(s.humidity,0,100),windKmh:number(s.windKmh,0,500),gustKmh:number(s.gustKmh,0,700),direction:number(s.direction,0,360),code:number(s.code,0,99),timezone:typeof s.timezone==='string'&&s.timezone.length<80?s.timezone:'UTC',sunrise:valid(s.sunrise)?s.sunrise:null,sunset:valid(s.sunset)?s.sunset:null,hours:[]};
  try{new Intl.DateTimeFormat('en-US',{timeZone:result.timezone});}catch{result.timezone='UTC';}
  if(Array.isArray(s.hours))result.hours=s.hours.slice(0,100).filter(x=>x&&valid(x.time)).map(x=>({time:x.time,temperatureC:number(x.temperatureC,-120,80),chance:number(x.chance,0,100)}));return result;
 };
 if(c.points&&typeof c.points==='object'&&!Array.isArray(c.points))for(const [k,s] of Object.entries(c.points).slice(0,32)){const n=clean(s);if(n&&key(n)===k)out.cache.points[k]=n;}
 if(c.grid&&Array.isArray(c.grid.samples)&&c.grid.samples.length===288&&valid(c.grid.time)&&valid(c.grid.fetchedAt)){const positions=grid(),samples=c.grid.samples.map(clean);if(samples.every((s,i)=>s&&key(s)===key(positions[i])))out.cache.grid={samples,time:Math.min(...samples.map(s=>s.time)),fetchedAt:c.grid.fetchedAt};}
 return out;
}
async function fetchJSON(target,signal,fetcher=fetch){
 if(!target.startsWith(ENDPOINT+'?'))throw Error('Unapproved weather endpoint.');
 const r=await fetcher(target,{signal,credentials:'omit',referrerPolicy:'no-referrer',cache:'no-store',redirect:'error'});
 if(!r.ok)throw Error(r.status===429?'Weather provider rate limit. Try later.':'Weather provider unavailable ('+r.status+').');
 if(!r.headers.get('content-type')?.includes('application/json'))throw Error('Unexpected weather response type.');
 const reader=r.body.getReader();let chunks=[],len=0;
 try{for(;;){const {done,value}=await reader.read();if(done)break;len+=value.length;if(len>2*1024*1024)throw Error('Weather response too large.');chunks.push(value);}}finally{await reader.cancel().catch(()=>{});}
 const all=new Uint8Array(len);let offset=0;for(const b of chunks){all.set(b,offset);offset+=b.length;}return JSON.parse(new TextDecoder().decode(all));
}
function mount(win){
 const app=win.AtlasWorkspace;if(!app?.liveEarth||win.document.getElementById('liveEarthBtn'))return;
 const doc=win.document,$=s=>doc.querySelector(s),escape=s=>win.AtlasCore.escapeHTML(String(s??''));
 let stored;try{stored=snapshot(app.liveEarth.read());}catch{stored=snapshot({});}let cfg=stored.config,cache=stored.cache;
 if(!cache.points||typeof cache.points!=='object'||Array.isArray(cache.points))cache.points={};
 let chosen=null,sample=null,pointSource='saved',pointError='',pointBusy=false,gridBusy=false,gridError='',lastPointAttempt=0,lastGridAttempt=0,selectionTimer,pointAbort,gridAbort,writeQueue=Promise.resolve(),lastActivity=Date.now(),idle=false,oldFocus=false,oldSpin=false;
 let controlsBusy=false,pointRequests=[];
 const persist=()=>{const snapshot={config:{...cfg},cache:structuredClone(cache)};const task=writeQueue.then(()=>app.liveEarth.commit(snapshot));writeQueue=task.catch(()=>{});return task;};
 const time=(ms,tz='UTC')=>valid(ms)?new Intl.DateTimeFormat('en-US',{timeZone:tz,hour:'numeric',minute:'2-digit'}).format(ms):'—';
 const pct=n=>valid(n)?Math.round(n)+'%':'—';
 const link='<a href="https://open-meteo.com/" target="_blank" rel="noopener noreferrer">Open-Meteo</a> · <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noopener noreferrer">CC BY 4.0</a>';
 const trigger=doc.createElement('button');trigger.id='liveEarthBtn';trigger.textContent='◌ Live Earth';trigger.setAttribute('aria-haspopup','dialog');$('.top-actions').prepend(trigger);
 const ribbon=doc.createElement('div');ribbon.id='earthStatus';ribbon.setAttribute('aria-live','off');$('#workspace').append(ribbon);
 const sheet=doc.createElement('dialog');sheet.id='liveEarthSettings';sheet.className='next-dialog';sheet.setAttribute('aria-labelledby','earthTitle');doc.body.append(sheet);
 function currentSite(){const s=app.liveEarth.selection();return s?{id:s.id,name:s.name,...coordinates(s.lat,s.lon)}:null;}
 function historical(){return app.liveEarth.context().historical;}
 function updateRibbon(){const now=Date.now(),gs=cache.grid,st=gs?freshness({time:gs.time,fetchedAt:gs.fetchedAt},now,true):'missing';ribbon.textContent=historical()?'HISTORICAL VIEW · today’s atmosphere hidden':!cfg.enabled?'LIVE EARTH OFF · calculated day / night':!cfg.global?'GLOBAL WEATHER OFF · selected-area weather enabled':gridBusy?'UPDATING GLOBAL MODEL · quiet atmosphere':gs?'CLOUD / PRECIPITATION · 15° MODEL SAMPLES · '+(st==='current'?'as of '+time(gs.time,'UTC')+' UTC':st.toUpperCase()):'GLOBAL MODEL '+(gridError?'UNAVAILABLE':'NOT LOADED');}
 function card(){
  if(!chosen)return;const body=$('#dossierBody');if(!body)return;let node=$('#weatherCard');if(!node){node=doc.createElement('section');node.id='weatherCard';node.setAttribute('aria-label','Today’s weather for selected area');const title=body.querySelector('.coords');if(title)title.after(node);else body.prepend(node);}
  const age=freshness(sample),show=!!sample,u=win.AtlasWeatherUnits.quickGlance(sample,app.weather.getUnits()),h=nextHours(sample),moon=win.AtlasCore.moonPhase(),todayDate=new Intl.DateTimeFormat('en-US',{timeZone:sample?.timezone||'UTC',month:'short',day:'numeric'}).format(new Date());
  const state=!cfg.enabled?'OFF':pointBusy?'UPDATING':!sample?'UNAVAILABLE':age!=='current'?age.toUpperCase():pointSource==='network'?'UPDATED':'CACHED';
  node.dataset.status=state;
  node.innerHTML='<div class="wx-heading"><span>TODAY · '+escape(todayDate)+'</span><span class="wx-state '+(age==='stale'?'wx-old':'')+'">'+state+'</span><button id="wxUnits" aria-label="Change temperature and wind units">'+escape(app.weather.getUnits()==='us'?'°F / mph':'°C / km/h')+'</button></div>'+
   (!cfg.enabled?'<p class="wx-intro">Weather for <b>'+escape(chosen.name)+'</b>, with clouds and rain on the globe.</p><button class="primary" id="wxEnable">Enable live weather</button>':
   '<div class="wx-now"><strong>'+escape(u.temperature)+'</strong><div><b>'+escape(show?description(sample.code):'Weather not available')+'</b><small>Feels like '+escape(u.feelsLike)+'</small></div></div><div class="wx-metrics"><div><span>Wind / gust</span><b>'+escape(u.wind)+' / '+escape(u.gust)+'</b></div><div><span>This hour rain chance</span><b>'+pct(h[0]?.chance)+'</b></div><div><span>Cloud cover</span><b>'+pct(sample?.cloud)+'</b></div><div><span>Precipitation / '+(sample?.interval?Math.round(sample.interval/60)+' min':'interval')+'</span><b>'+(valid(sample?.precipitation)?sample.precipitation.toFixed(2)+' mm':'—')+'</b></div></div>'+ 
   (h.length?'<div class="wx-hourly" aria-label="Six-hour model forecast">'+h.map(x=>'<div><small>'+time(x.time,sample.timezone)+'</small><b>'+escape(win.AtlasWeatherUnits.quickGlance(x,app.weather.getUnits()).temperature)+'</b><i>'+pct(x.chance)+'</i></div>').join('')+'</div>':'')+
   '<div class="wx-sky"><span>↑ Sunrise <b>'+time(sample?.sunrise,sample?.timezone)+'</b></span><span>↓ Sunset <b>'+time(sample?.sunset,sample?.timezone)+'</b></span></div><small class="wx-source">'+(sample?'Model valid '+time(sample.time,sample.timezone)+' · fetched '+time(sample.fetchedAt,sample.timezone)+' · '+escape(sample.timezone):'No model sample available. Missing data is not clear weather.')+'</small>'+
   (pointError?'<p class="wx-warning">'+escape(pointError)+(sample?' Showing the saved sample.':'')+'</p>':'')+
   (age==='stale'?'<p class="wx-warning">Outdated weather. Do not use for departure decisions.</p>':'')+
   '<div class="wx-actions"><small>'+link+'<br>Weather-model estimate, not a local sensor.</small><button id="wxRefresh" '+(pointBusy?'disabled':'')+'>Refresh</button></div>')+
   '<div class="wx-moon">◐ '+escape(moon.name)+' · '+Math.round(moon.illumination*100)+'% lit <small>Approximate mean lunar cycle · today, not timeline</small></div>';
  $('#wxUnits').onclick=async()=>{try{await app.weather.setUnits(app.weather.getUnits()==='us'?'metric':'us');card();}catch{app.notify('Unit change could not be saved.');}};
  if($('#wxEnable'))$('#wxEnable').onclick=()=>settings();if($('#wxRefresh'))$('#wxRefresh').onclick=()=>loadPoint(true);
 }
 async function loadPoint(force=false){
  if(!cfg.enabled||!chosen||doc.hidden)return;
  const now=Date.now(),p={...chosen},k=key(p),saved=cache.points[k];
  sample=saved||null;if(saved&&!force&&now-saved.fetchedAt<POINT_TTL){card();return;}
  if(now-lastPointAttempt<2500){win.clearTimeout(selectionTimer);selectionTimer=win.setTimeout(()=>loadPoint(force),2500-(now-lastPointAttempt)+25);card();return;}lastPointAttempt=now;pointRequests=pointRequests.filter(t=>now-t<3600000);if(pointRequests.length>=60){pointError='Hourly refresh limit reached. Cached weather remains available.';card();return;}pointRequests.push(now);
  pointAbort?.abort();const abort=new AbortController();pointAbort=abort;pointBusy=true;pointError='';card();
  const timeout=win.setTimeout(()=>abort.abort(),15000);
  try{const raw=await fetchJSON(url([p]),abort.signal);const s=normalize(raw,p);if(!cfg.enabled||!chosen||key(chosen)!==k||abort.signal.aborted)return;
   cache.points[k]=s;const keys=Object.keys(cache.points).sort((a,b)=>cache.points[b].fetchedAt-cache.points[a].fetchedAt);keys.slice(32).forEach(k=>delete cache.points[k]);sample=s;pointSource='network';
   try{await persist();}catch{pointError='Weather loaded, but offline cache could not be saved.';}
  }catch(e){if(chosen&&key(chosen)===k&&cfg.enabled){pointSource='saved';pointError=e.name==='AbortError'?'Weather request timed out or was cancelled.':e.message;}}
  finally{win.clearTimeout(timeout);if(pointAbort===abort){pointBusy=false;card();updateRibbon();}}
 }
 async function loadGlobal(){
  const now=Date.now();if(!cfg.enabled||!cfg.global||doc.hidden||gridBusy||now-lastGridAttempt<15*60000||(cache.grid&&now-cache.grid.fetchedAt<GRID_TTL))return;
  lastGridAttempt=now;gridBusy=true;gridError='';const abort=new AbortController();gridAbort=abort;const timeout=win.setTimeout(()=>abort.abort(),90000);updateRibbon();
  try{const points=grid(),samples=[];for(let i=0;i<points.length;i+=48){if(!cfg.enabled||!cfg.global||abort.signal.aborted)throw Error('Global refresh stopped.');const batch=points.slice(i,i+48),raw=await fetchJSON(url(batch,true),abort.signal);if(!Array.isArray(raw)||raw.length!==batch.length)throw Error('Global response is incomplete.');raw.forEach((r,j)=>samples.push(normalize(r,batch[j],Date.now(),true)));await new Promise(r=>win.setTimeout(r,300));}
   if(!cfg.enabled||!cfg.global||abort.signal.aborted)return;cache.grid={samples,time:Math.min(...samples.map(s=>s.time)),fetchedAt:Date.now()};await persist();
  }catch(e){gridError='Global weather unavailable; last saved coverage retained.';}
  finally{win.clearTimeout(timeout);gridBusy=false;updateRibbon();}
 }
 function selectChanged(){pointAbort?.abort();pointBusy=false;win.clearTimeout(selectionTimer);chosen=currentSite();sample=chosen?cache.points[key(chosen)]||null:null;pointError='';pointSource='saved';card();selectionTimer=win.setTimeout(()=>loadPoint(),1200);}
 function settings(open=true){
  sheet.innerHTML='<button class="dialog-close" id="earthClose">Close</button><span class="eyebrow">LIVE EARTH / OBSERVATORY</span><h2 id="earthTitle">Quiet planet. Local detail.</h2><p>Soft weather globally, stronger around the selected site. The card follows your saved °F / mph or °C / km/h preference.</p>'+
   '<div class="earth-consent"><b>Before connecting</b><p>Open-Meteo receives your IP address and requested coordinates, rounded to 0.01°. Site names, notes, photos and documents are not sent. Global coverage requests use a fixed public grid. This free endpoint is for personal, non-commercial use, with provider limits.</p><p>'+link+' · <a href="https://open-meteo.com/en/terms" target="_blank" rel="noopener noreferrer">Provider terms & privacy</a></p></div>'+
   '<div class="earth-settings-grid"><label><input id="earthEnabled" type="checkbox" '+(cfg.enabled?'checked':'')+'> Connect weather feed</label><label><input id="earthGlobal" type="checkbox" '+(cfg.global?'checked':'')+'> Subtle global clouds & precipitation</label><label><input id="earthCinema" type="checkbox" '+(cfg.cinematic?'checked':'')+'> Gentle cinematic motion</label><label><input id="earthIdle" type="checkbox" '+(cfg.autoIdle?'checked':'')+'> Observatory after 60 seconds idle</label></div>'+
   '<p>Local conditions refresh every 20 minutes. The 288-point global model grid refreshes every 3 hours while visible. The globe is a stylized view of sampled model data—not satellite imagery, radar, measured storm boundaries or lightning strikes.</p><p>Day/night is calculated for the current UTC time. Lunar illumination uses an approximate mean cycle. Today’s overlays hide when the history slider is moved into the past. Reduced-motion preferences are respected; there is no flashing lightning or thunder audio.</p>'+
   '<p>Weather is not an emergency warning service. Official alerts, a measured lightning feed, solar activity and moonrise/moonset are not connected.</p><p id="earthSaveStatus" role="status">'+(gridError?escape(gridError):'Settings and last retrieved weather are stored on this computer.')+'</p><div class="next-actions"><button id="earthClear">Clear cached weather</button><button class="primary" id="earthApply" '+(controlsBusy?'disabled':'')+'>'+(cfg.enabled?'Save settings':'Enable selected features')+'</button></div>';
  $('#earthClose').onclick=()=>sheet.close();$('#earthApply').onclick=async()=>{if(controlsBusy)return;const previous=cfg;cfg={enabled:$('#earthEnabled').checked,global:$('#earthGlobal').checked,cinematic:$('#earthCinema').checked,autoIdle:$('#earthIdle').checked};controlsBusy=true;$('#earthApply').disabled=true;
   if(!cfg.enabled){pointAbort?.abort();gridAbort?.abort();wake();}else if(!cfg.global)gridAbort?.abort();
   try{await persist();$('#earthSaveStatus').textContent='Saved locally.';sheet.close();if(cfg.enabled){loadPoint();loadGlobal();}card();updateRibbon();}catch{cfg=previous;$('#earthSaveStatus').textContent='Could not save settings. Previous choice retained.';}finally{controlsBusy=false;if($('#earthApply'))$('#earthApply').disabled=false;}};
  $('#earthClear').onclick=async()=>{if(controlsBusy)return;pointAbort?.abort();gridAbort?.abort();const before=cache;cache={points:{},grid:null};sample=null;try{await persist();$('#earthSaveStatus').textContent='Weather cache cleared. Saved research is unchanged. Earlier backups and exports are not deleted.';card();updateRibbon();}catch{cache=before;sample=chosen?cache.points[key(chosen)]||null:null;$('#earthSaveStatus').textContent='Cache could not be cleared.';}};
  if(open&&!sheet.open)sheet.showModal();
 }
 trigger.onclick=()=>settings();
 function wake(){lastActivity=Date.now();if(!idle)return;idle=false;doc.body.classList.remove('earth-idle');app.setGlobeFocus(oldFocus);app.liveEarth.rotation(oldSpin);}
 ['pointerdown','pointermove','keydown','wheel'].forEach(ev=>doc.addEventListener(ev,wake,{passive:true}));
 win.addEventListener('atlas:selection',selectChanged);win.addEventListener('atlas:weather-units-changed',()=>card());
 win.addEventListener('atlas:mode',()=>{updateRibbon();wake();});win.addEventListener('atlas:era',()=>{updateRibbon();wake();});
 const obs=new MutationObserver(()=>{if(!$('#weatherCard'))card();});obs.observe($('#dossierBody'),{childList:true});
 win.setInterval(()=>{card();updateRibbon();if(!doc.hidden&&cfg.enabled){loadPoint();loadGlobal();}if(!idle&&cfg.enabled&&cfg.autoIdle&&cfg.cinematic&&!historical()&&!doc.hidden&&!doc.querySelector('dialog[open]')&&!app.liveEarth.context().reduced&&Date.now()-lastActivity>60000){idle=true;oldFocus=app.isGlobeFocused();oldSpin=app.liveEarth.context().spin;app.setGlobeFocus(true);app.liveEarth.rotation(true);doc.body.classList.add('earth-idle');}},30000);
 doc.addEventListener('visibilitychange',()=>{if(doc.hidden){pointAbort?.abort();gridAbort?.abort();wake();}else{selectChanged();loadGlobal();}});
 let sunAt=0,sun=null,shade,shadeCtx,shadeImage,shadeVectors;
 function paint(g,t){
  if(historical())return;const ctx=g.ctx,R=g.radius,now=Date.now();if(!sun||now-sunAt>60000){sun=solar(now);sunAt=now;}
  if(sun){if(!shade){shade=doc.createElement('canvas');shade.width=shade.height=144;shadeCtx=shade.getContext('2d');shadeImage=shadeCtx.createImageData(144,144);shadeVectors=[];for(let y=0;y<144;y++)for(let x=0;x<144;x++){const a=(x+0.5)/72-1,b=1-(y+0.5)/72,r=a*a+b*b;shadeVectors.push(r>1?null:[a,b,Math.sqrt(1-r)]);}}
   const v=sun.vector,sx=v[2]*g.cl-v[0]*g.sl,z=v[0]*g.cl+v[2]*g.sl,sy=v[1]*g.cp-z*g.sp,sz=v[1]*g.sp+z*g.cp;
   for(let i=0;i<shadeVectors.length;i++){const p=shadeVectors[i],j=i*4;shadeImage.data[j]=0;shadeImage.data[j+1]=5;shadeImage.data[j+2]=15;shadeImage.data[j+3]=p?Math.round(clamp((.07-(p[0]*sx+p[1]*sy+p[2]*sz))/.2,0,1)*175):0;}
   shadeCtx.putImageData(shadeImage,0,0);ctx.drawImage(shade,g.cx-R,g.cy-R,R*2,R*2);
  }
  if(!cfg.enabled)return;const reduced=app.liveEarth.context().reduced,phase=cfg.cinematic&&!reduced?t*.00022:0;
  ctx.save();ctx.beginPath();ctx.arc(g.cx,g.cy,R,0,TAU);ctx.clip();
  function cloud(s,local){if(!s||freshness(s,now,!local)!=='current')return;const p=g.project(g.vec(s.lat,s.lon));if(p.z<.07)return;const opacity=local?.38:.105,w=R*(local?.074:.094),h=w*.44;
   if(valid(s.cloud)&&s.cloud>8){for(let n=0;n<3;n++){const x=p.x+(n-1)*w*.32+Math.sin(phase+n+s.lon)*w*.07,y=p.y+Math.cos(phase*.7+n+s.lat)*h*.23;const rad=ctx.createRadialGradient(x,y,0,x,y,w*.64);rad.addColorStop(0,'rgba(216,238,245,'+(opacity*s.cloud/100*p.z)+')');rad.addColorStop(1,'rgba(216,238,245,0)');ctx.fillStyle=rad;ctx.save();ctx.translate(x,y);ctx.scale(1,.52);ctx.translate(-x,-y);ctx.fillRect(x-w,y-w,w*2,w*2);ctx.restore();}}
   if(valid(s.precipitation)&&s.precipitation>.03){ctx.strokeStyle='rgba(87,192,237,'+(local?.65:.18)+')';ctx.lineWidth=local?1.5:.8;const drops=local?12:4;for(let n=0;n<drops;n++){const k=((phase*.4+n/drops)%1),x=p.x+(Math.sin(n*7.1+s.lat))*w*.5,y=p.y+(k-.5)*w*.7;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x-2,y+4+(local?3:0));ctx.stroke();}}
  }
  if(cfg.global&&cache.grid?.samples?.length<=288)cache.grid.samples.forEach(s=>cloud(s,false));cloud(sample,true);ctx.restore();
 }
 app.liveEarth.renderer(paint);selectChanged();updateRibbon();if(cfg.enabled)loadGlobal();
}
return Object.freeze({ENDPOINT,POINT_TTL,GRID_TTL,coordinates,key,grid,url,normalize,freshness,nextHours,description,solar,config,snapshot,fetchJSON,mount});
});
