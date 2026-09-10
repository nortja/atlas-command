'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const s=fs.readFileSync('app/src/field-camera-test.js','utf8');
test('camera route test starts only from a user-clicked button',()=>{assert.match(s,/fieldRouteTest/);assert.match(s,/b\.onclick=\(\)=>run\(p\)/);assert.doesNotMatch(s,/addEventListener\(['"]load['"][^]*run\(/);});
test('renderer calls only the local Atlas route-test API',()=>{assert.match(s,/fetch\('api\/field-camera-test\/route'/);assert.match(s,/X-Atlas-Request['"]:\s*['"]local/);assert.doesNotMatch(s,/fetch\([^)]*p\.host|https?:\/\/|rtsp:\/\//);});
test('route request contains no username password or camera secret',()=>{const call=s.slice(s.indexOf('async function localRoute'),s.indexOf('function stages'));assert.doesNotMatch(call,/username|password|token|secret|authorization/i);});
test('route success does not claim live view or decode',()=>{assert.match(s,/ONVIF service verification is next/);assert.doesNotMatch(s,/canOpenLiveView\s*=\s*true|Media verified|LIVE VIDEO/);});
test('browser preview cannot run the private camera test',()=>{assert.match(s,/!native\?'disabled'/);assert.match(s,/Windows desktop app/);});
