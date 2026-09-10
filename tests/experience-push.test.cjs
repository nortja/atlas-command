'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const currents=require('../app/src/ocean-currents.js');
const weatherDesk=fs.readFileSync('app/src/weather-desk.js','utf8');
const detail=fs.readFileSync('app/src/site-detail-enhance.js','utf8');
const integration=fs.readFileSync('build/integrate_experience_push.py','utf8');

test('ocean currents are opt-in and global model samples are bounded',()=>{
 const c=currents.config({});assert.equal(c.enabled,false);assert.equal(currents.grid().length,60);assert.ok(currents.grid().length<=120);
});

test('live current requests use only the approved marine endpoint and model variables',()=>{
 const u=currents.liveUrl([{lat:0,lon:-30},{lat:25,lon:-45}]);assert.ok(u.startsWith(currents.ENDPOINT+'?'));assert.match(u,/ocean_current_velocity/);assert.match(u,/ocean_current_direction/);assert.match(u,/cell_selection=sea/);assert.doesNotMatch(u,/apikey|password|token=/i);
});

test('historical currents are clearly limited to ERA5-Ocean era',()=>{
 assert.throws(()=>currents.historicalUrl([{lat:0,lon:-30}],-5000),/1940/);assert.throws(()=>currents.historicalUrl([{lat:0,lon:-30}],1939),/1940/);const u=currents.historicalUrl([{lat:0,lon:-30}],2000);assert.match(u,/models=era5_ocean/);assert.match(u,/2000-07-15/);
});

test('current normalization refuses implausible or missing flow values',()=>{
 const good={latitude:0,longitude:-30,current_units:{time:'unixtime',ocean_current_velocity:'km/h',ocean_current_direction:'°'},current:{time:1700000000,ocean_current_velocity:2.2,ocean_current_direction:90}};assert.equal(currents.normalize(good).length,1);const bad=structuredClone(good);bad.current.ocean_current_velocity=999;assert.equal(currents.normalize(bad).length,0);
});

test('weather is a separate selected-location plugin rather than dossier-only UI',()=>{
 assert.match(weatherDesk,/weatherDeskBtn/);assert.match(weatherDesk,/AtlasWorkspace/);assert.match(weatherDesk,/liveEarth\.selection/);assert.match(weatherDesk,/weatherCard/);assert.match(weatherDesk,/atlas:selection/);
});

test('starter site detail layer expands context without inventing a new mystery score',()=>{
 assert.match(detail,/SITE BRIEFING/);assert.match(detail,/Why this site matters/);assert.match(detail,/What to compare closely/);assert.match(detail,/Current research question/);assert.doesNotMatch(detail,/probability|chance of discovery/i);
});

test('experience integration preserves minimized native lifetime without a background service',()=>{
 assert.match(integration,/api\/window-state/);assert.match(integration,/WindowHidden/);assert.match(integration,/idleMinutes > 480/);assert.doesNotMatch(integration,/schtasks|TaskScheduler|Windows Service|Set-MpPreference|ExecutionPolicy Bypass/i);
});

test('experience integration adds multiple trusted globe layers and marine CSP only',()=>{
 assert.match(integration,/environmentRenderers/);assert.match(integration,/marine-api\.open-meteo\.com/);for(const file of ['weather-desk.js','ocean-currents.js','site-detail-enhance.js'])assert.match(integration,new RegExp(file.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')));
});
