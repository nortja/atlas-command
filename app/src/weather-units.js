/* Shared display units for future weather cards and overlays. No weather feed or network access. */
(function(root, factory){
  'use strict'; const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  else root.AtlasWeatherUnits=api;
})(typeof window==='object'?window:globalThis,function(){
  'use strict';
  const DEFAULT='us';
  const definitions=Object.freeze({
    us:Object.freeze({id:'us',label:'°F + mph',temperature:'°F',wind:'mph'}),
    metric:Object.freeze({id:'metric',label:'°C + km/h',temperature:'°C',wind:'km/h'})
  });
  const valid=x=>typeof x==='number'&&Number.isFinite(x);
  function normalize(value){return value==='metric'?'metric':DEFAULT;}
  function requireSystem(value){if(value!=='us'&&value!=='metric')throw Error('Choose Fahrenheit + mph or Celsius + km/h.');return value;}
  function temperature(celsius,system=DEFAULT){if(!valid(celsius))return null;return normalize(system)==='us'?celsius*9/5+32:celsius;}
  function wind(kmh,system=DEFAULT){if(!valid(kmh)||kmh<0)return null;return normalize(system)==='us'?kmh/1.609344:kmh;}
  function format(value,unit){return value===null?'—':String(Math.round(value))+' '+unit;}
  // Canonical values remain Celsius and km/h. Never convert already-rounded display values.
  function quickGlance(sample,system=DEFAULT){
    const u=definitions[normalize(system)],s=sample&&typeof sample==='object'?sample:{};
    return Object.freeze({system:u.id,label:u.label,
      temperature:format(temperature(s.temperatureC,u.id),u.temperature),
      feelsLike:format(temperature(s.feelsLikeC,u.id),u.temperature),
      wind:format(wind(s.windKmh,u.id),u.wind),gust:format(wind(s.gustKmh,u.id),u.wind)});
  }
  function preferenceStore(read,write,persist,notify=()=>{}){
    let queue=Promise.resolve();
    return Object.freeze({
      getUnits:()=>normalize(read()),
      setUnits:value=>{
        requireSystem(value);
        const task=queue.then(async()=>{
          const before=read();write(value);
          try{await persist();}catch(error){write(before);throw error;}
          notify(value);return value;
        });
        queue=task.catch(()=>{});return task;
      }
    });
  }
  function mountSettings(container,api){
    if(!container||!api||typeof api.getUnits!=='function'||typeof api.setUnits!=='function')return;
    const buttons=Array.from(container.querySelectorAll('[data-weather-unit]'));
    const status=container.querySelector('[data-weather-unit-status]');
    let busy=false;
    const refresh=()=>buttons.forEach(b=>{
      const selected=b.dataset.weatherUnit===api.getUnits();
      b.classList.toggle('primary',selected);b.setAttribute('aria-pressed',String(selected));b.disabled=busy;
    });
    refresh();
    buttons.forEach(b=>{b.onclick=async()=>{
      if(busy)return;busy=true;refresh();status.textContent='Saving units…';
      try{await api.setUnits(b.dataset.weatherUnit);status.textContent='Saved locally: '+definitions[api.getUnits()].label;}
      catch(error){status.textContent='Could not confirm save. Previous units kept in this window. '+error.message;}
      finally{busy=false;refresh();}
    };});
  }
  return Object.freeze({DEFAULT,definitions,normalize,requireSystem,temperature,wind,quickGlance,preferenceStore,mountSettings});
});
