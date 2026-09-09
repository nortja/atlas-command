'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {preset, fit, scope} = require('../app/src/workspace-layout.js');
const keys = ['catalog', 'layers', 'dossier', 'plan'];
const root = path.join(__dirname, '..');
for (const [w,h] of [[950,400],[1366,550],[1920,881],[2560,1241],[3440,1241]]) {
  for (const name of ['explore','research','expedition']) {
    test(`${name} bounds and nonoverlap at ${w} x ${h}`, () => {
      const p = preset(name,w,h);
      assert.deepEqual(Object.keys(p),keys);
      for (const a of Object.values(p)) {
        const height = a.collapsed ? 47 : a.h;
        assert(a.x >= 16 && a.y >= 16 && a.w >= 250 && a.h >= 120);
        assert(a.x+a.w <= w-16 && a.y+height <= h-32);
      }
      for (let i=0;i<keys.length;i++) for (let j=i+1;j<keys.length;j++) {
        const a = p[keys[i]], b = p[keys[j]];
        const ah = a.collapsed ? 47 : a.h, bh = b.collapsed ? 47 : b.h;
        const overlap = a.x < b.x+b.w && a.x+a.w > b.x && a.y < b.y+bh && a.y+ah > b.y;
        assert.equal(overlap, false, keys[i]+' overlaps '+keys[j]);
      }
    });
  }
}
test('research expands dossier and folds planning',()=>{
  const p=preset('research',1920,880); assert(p.plan.collapsed); assert(!p.dossier.collapsed); assert(p.dossier.h>600);
});
test('expedition expands planning and folds dossier',()=>{
  const p=preset('expedition',1920,880); assert(p.dossier.collapsed); assert(!p.plan.collapsed); assert(p.plan.h>600);
});
test('scopes keep desktop and ultrawide saved layouts separate',()=>{
  assert.equal(scope(1366),'desktop');assert.equal(scope(1699),'desktop');assert.equal(scope(1700),'ultrawide');
});
test('narrow, short and nonfinite viewport inputs are rejected',()=>{
  for(const args of [[949,880],[1920,399],[NaN,880],[Infinity,880],[1920,NaN]])assert.throws(()=>preset('explore',...args));
});
test('invalid preset names cannot fall through',()=>assert.throws(()=>preset('unknown',1920,880)));
test('fit makes a new bounded object without changing caller data',()=>{
  const raw=preset('explore',3440,1241),copy=structuredClone(raw);
  raw.catalog.x=-500;raw.catalog.y=-10;const before=structuredClone(raw);
  const output=fit(raw,1366,550);assert.deepEqual(raw,before);assert.notStrictEqual(output,raw);assert.equal(output.catalog.x,16);
  assert(output.plan.x+output.plan.w<=1350);assert(copy.catalog.x>=16);
});
test('invalid saved values do not become CSS or silent NaN',()=>{
  for (const value of ['10px',NaN,Infinity,null]) {const p=preset('research',1920,880);p.catalog.x=value;assert.throws(()=>fit(p,1920,880));}
  assert.throws(()=>fit({},1920,880));
});
test('preview explicitly labels its status and loads the module',()=>{
  const page=fs.readFileSync(path.join(root,'app/workspace-preview.html'),'utf8');
  assert.match(page,/NEXT VERSION · DEVELOPMENT PREVIEW/);assert.match(page,/src\/workspace-layout.js/);
});
test('submitted entrypoint and runtime remain separate from developer preview',()=>{
  for(const file of ['app/index.html','native/AtlasHost.cs','build/Build-Store.ps1']){
    const text=fs.readFileSync(path.join(root,file),'utf8');assert.doesNotMatch(text,/workspace-layout\.js|workspace-preview\.html/);
  }
});
test('module adds no network services or dynamic code execution',()=>{
  const text=fs.readFileSync(path.join(root,'app/src/workspace-layout.js'),'utf8');
  assert.doesNotMatch(text,/\bfetch\(|XMLHttpRequest|WebSocket|eval\(|new Function\(/);
});
