'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.join(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');

test('power integration adds a small explicit red native shutdown control',()=>{
 const css=read('app/src/power-controls.css'),py=read('build/integrate_power_lifecycle.py');
 assert(css.includes('#shutdownBtn'));
 assert(css.includes('width:30px')&&css.includes('height:30px'));
 assert(css.includes('#9b2f35')&&css.includes('#6f2025'));
 assert(py.includes("shutdown.textContent='⏻'"));
 assert(py.includes("await flush();await api('exit'"));
});

test('minimize and close are distinct lifecycle states',()=>{
 const py=read('build/integrate_power_lifecycle.py');
 assert(py.includes("document.hidden?'hidden':'visible'"));
 assert(py.includes("sendLifecycle('closing')"));
 assert(py.includes('WindowHidden'));
 assert(/TotalHours\s*>\s*12/.test(py));
 assert(/DateTime\.UtcNow\.AddSeconds\(2\)\.Ticks/.test(py));
});

test('second app launch can reopen only the saved local Atlas session',()=>{
 const py=read('build/integrate_power_lifecycle.py');
 for(const token of ['runtime-session.txt','TryReopenRunningWindow','127.0.0.1','^/[a-f0-9]{32}/index','uri.UserInfo','uri.Query','uri.Fragment'])assert(py.includes(token));
 assert(py.includes('FileInfo(RuntimeSessionPath).Length>1024'));
 assert(py.includes('Process.Start(start)!=null'));
});

test('last globe position and selected site are restored across a clean restart',()=>{
 const py=read('build/integrate_power_lifecycle.py');
 for(const token of ['state.settings.globeView','selectedId','savedGlobeView','globe.lat=lat','globe.lon=lon','globe.zoom=zoom'])assert(py.includes(token));
});

test('power lifecycle does not add a background service or security bypass',()=>{
 const py=read('build/integrate_power_lifecycle.py').toLowerCase();
 assert(!py.includes('schtasks'));
 assert(!py.includes('runas'));
 assert(!py.includes('firewall'));
 assert(!py.includes('disableantispyware'));
});
