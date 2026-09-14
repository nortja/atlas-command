'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');
test('collaboration assets ship through exact native and package allowlists',()=>{
  for(const name of ['app/index.html','app/workspace-preview.html','native/AtlasHost.cs','build/Build-OwnerPreview.ps1','build/Build-Store.ps1']){
    const source=read(name);for(const asset of ['collaboration-model.js','collaboration-shell.js','collaboration-shell.css'])assert(source.includes('src/'+asset),name+': '+asset);
  }
  const html=read('app/index.html');assert(html.indexOf('src/collaboration-model.js')<html.indexOf('src/collaboration-shell.js'));
});
test('shell never routes private drafts through existing storage or networking',()=>{
  for(const name of ['collaboration-model.js','collaboration-shell.js']){
    const source=read('app/src/'+name);
    assert.doesNotMatch(source,/\b(?:fetch|XMLHttpRequest|WebSocket|sendBeacon|localStorage|sessionStorage|indexedDB)\s*[.(]/);
    assert.doesNotMatch(source,/innerHTML|insertAdjacentHTML|document\.write|console\./);
  }
  const app=read('app/src/app.js');assert.doesNotMatch(app,/AtlasCollaborationModel|collaborationDrafts/);
});
test('integration is included in owner-preview chain without opening a service',()=>{
  const w=read('.github/workflows/owner-preview.yml');assert(w.indexOf('python build/integrate_collaboration.py')>w.indexOf('python build/integrate_power_lifecycle.py'));
  const recipe=read('build/integrate_collaboration.py');assert.doesNotMatch(recipe,/connect-src|api\/|unsafe-eval|unsafe-inline/);
});
