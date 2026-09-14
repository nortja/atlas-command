'use strict';
// Standalone browser regression: static renderer fixture, isolated browser profile,
// all external requests aborted. Does not run the native helper or touch user data.
// Requires Playwright and installed Edge. ATLAS_TEST_APP_DIR may point to staged output.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {chromium}=require('playwright');
const root=path.resolve(process.env.ATLAS_TEST_APP_DIR||path.join(__dirname,'../app'));
const results=path.resolve(__dirname,'../test-results');fs.mkdirSync(results,{recursive:true});
const server=http.createServer((req,res)=>{
  const relative=new URL(req.url,'http://localhost').pathname.slice(1)||'index.html';
  const file=path.resolve(root,relative);
  if(!file.startsWith(root+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile()){res.writeHead(404);res.end();return;}
  const mime={'.html':'text/html','.js':'application/javascript','.css':'text/css','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg'};
  res.setHeader('Content-Type',mime[path.extname(file)]||'application/octet-stream');res.end(fs.readFileSync(file));
});
(async()=>{
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const base='http://127.0.0.1:'+server.address().port;
  const browser=await chromium.launch({channel:'msedge',headless:true});
  try{
    const context=await browser.newContext({viewport:{width:1440,height:1000},reducedMotion:'reduce'});
    const page=await context.newPage(),errors=[],external=[];
    const diagnostics=await context.newCDPSession(page);await diagnostics.send('Runtime.enable');
    diagnostics.on('Runtime.exceptionThrown',({exceptionDetails:d})=>errors.push({message:d.exception?.description||d.text,url:d.url||''}));
    await page.route('**/*',route=>{if(route.request().url().startsWith(base+'/'))return route.continue();external.push(route.request().url());return route.abort();});
    await page.goto(base);await page.waitForFunction(()=>!!window.AtlasWorkspace);
    const startupErrors=errors.splice(0);
    assert.deepEqual(startupErrors,[]);
    const original=await page.evaluate(()=>JSON.stringify(AtlasWorkspace.sites.list()));
    const count=await page.locator('.site-item').count();assert(count>=26);
    await page.locator('#collaborationBtn').click();
    await page.getByLabel('Space name',{exact:true}).fill('Caucasus field research');
    await page.getByRole('button',{name:'Create session space',exact:true}).click();
    assert(await page.getByRole('button',{name:'Invite researchers',exact:true}).isDisabled());
    await page.getByLabel('Message draft',{exact:true}).fill('<img src=x onerror=alert(1)> private-message-marker');
    assert.equal(await page.getByLabel('Intended visibility',{exact:true}).inputValue(),'private');
    await page.getByRole('button',{name:'Add session draft',exact:true}).click();
    assert.equal(await page.locator('.collab-drafts img').count(),0);
    assert((await page.locator('.collab-drafts').innerText()).includes('<img src=x onerror=alert(1)>'));
    await page.getByRole('button',{name:'Preview disclosure',exact:true}).click();
    assert((await page.locator('#collabStatus').innerText()).includes('omits content, identifiers and coordinates'));
    // Unsaved text survives tab switching without persistence.
    await page.getByLabel('Message draft',{exact:true}).fill('unfinished-marker');
    await page.getByRole('button',{name:'Site notes',exact:true}).click();
    await page.getByLabel('Site note',{exact:true}).fill('private-note-marker');
    await page.getByLabel('Intended visibility',{exact:true}).selectOption('team');
    await page.getByRole('button',{name:'Add session draft',exact:true}).click();
    assert((await page.locator('.collab-drafts').innerText()).includes('Team intent · not shared'));
    await page.getByRole('button',{name:'Proposed edits',exact:true}).click();
    await page.getByLabel('Proposed site name',{exact:true}).fill('Suggested field name');
    await page.getByLabel('Evidence and reason',{exact:true}).fill('proposal-marker');
    await page.getByRole('button',{name:'Add session draft',exact:true}).click();
    assert((await page.locator('.collab-drafts').innerText()).includes('catalog unchanged'));
    assert.equal(await page.evaluate(()=>JSON.stringify(AtlasWorkspace.sites.list())),original);
    await page.screenshot({path:path.join(results,'collaboration-desktop.png')});
    await page.getByRole('button',{name:'Shared storage',exact:true}).click();
    assert(await page.getByRole('button',{name:'Add encrypted file',exact:true}).isDisabled());
    assert.equal(await page.locator('#collaborationDialog input[type=file]').count(),0);
    await page.getByRole('button',{name:'Private chat',exact:true}).click();
    assert.equal(await page.getByLabel('Message draft',{exact:true}).inputValue(),'unfinished-marker');
    await page.getByRole('button',{name:'Close',exact:true}).click();
    await page.locator('#collaborationBtn').click();
    assert.equal(await page.getByLabel('Message draft',{exact:true}).inputValue(),'unfinished-marker');
    await page.getByLabel('Space name',{exact:true}).fill('Second session space');
    await page.getByRole('button',{name:'Create session space',exact:true}).click();
    assert.equal(await page.locator('.collab-drafts article').count(),0);
    assert.equal(await page.getByLabel('Message draft',{exact:true}).inputValue(),'');
    await page.getByRole('button',{name:'Caucasus field research',exact:true}).click();
    assert.equal(await page.getByLabel('Message draft',{exact:true}).inputValue(),'unfinished-marker');
    // Existing save paths are exercised while drafts are still live.
    await page.evaluate(()=>AtlasTest.flush());
    const liveStored=await page.evaluate(()=>JSON.stringify({...localStorage}));
    for(const marker of ['private-message-marker','private-note-marker','proposal-marker','unfinished-marker','Caucasus field research'])assert(!liveStored.includes(marker));
    await page.setViewportSize({width:390,height:844});
    assert(await page.locator('#collaborationDialog').evaluate(d=>d.scrollWidth<=d.clientWidth+1));
    await page.screenshot({path:path.join(results,'collaboration-mobile.png')});
    await page.getByRole('button',{name:'Lock & discard session',exact:true}).click();
    assert.equal(await page.locator('#collaborationDialog').innerText(),'');
    await page.evaluate(()=>AtlasCollaboration.open());
    assert.equal(await page.locator('.collab-space').count(),0);
    await page.keyboard.press('Escape');assert.equal(await page.locator('#collaborationDialog').evaluate(d=>d.open),false);
    await page.setViewportSize({width:1440,height:1000});
    assert.deepEqual(errors,[],'No errors during collaboration interactions');
    await page.reload();await page.waitForFunction(()=>!!window.AtlasWorkspace);
    const reloadErrors=errors.splice(0);assert.deepEqual(reloadErrors,[]);
    await page.locator('#collaborationBtn').click();assert.equal(await page.locator('.collab-space').count(),0);
    await page.getByLabel('Space name',{exact:true}).fill('Shutdown test');
    await page.getByRole('button',{name:'Create session space',exact:true}).click();
    await page.getByRole('button',{name:'Close',exact:true}).click();
    // The static fixture has no native exit endpoint. Verify the capture hook
    // clears the shell without preventing the existing exit handler from running.
    assert.equal(await page.evaluate(()=>{
      const b=document.createElement('button');b.id='shutdownBtn';let ran=false;
      b.onclick=()=>{ran=true;};document.body.append(b);b.click();b.remove();return ran;
    }),true);
    await page.locator('#collaborationBtn').click();assert.equal(await page.locator('.collab-space').count(),0);
    const stored=await page.evaluate(()=>JSON.stringify({...localStorage}));
    for(const marker of ['private-message-marker','private-note-marker','proposal-marker','unfinished-marker','Caucasus field research'])assert(!stored.includes(marker));
    assert.deepEqual(await page.evaluate(()=>AtlasPrivacy.read()),{crashReports:false,performance:false,featureUsage:false,researchContributions:false});
    assert.equal(await page.locator('.site-item').count(),count);
    assert(external.every(url=>url==='https://svs.gsfc.nasa.gov/vis/a000000/a002900/a002915/bluemarble-2048.png'),JSON.stringify(external));
    assert.deepEqual(errors,[]);
    // An earlier failed R8 script still stamped catalogRevision=8. Recover its
    // missing records while retaining user edits, notes and private additions.
    await page.evaluate(()=>{
      AtlasCollaboration.lock();
      const state=JSON.parse(JSON.stringify(AtlasTest.state)),ids=new Set(ATLAS_SITE_EXPANSION_R8.map(r=>r.id));
      state.sites=state.sites.filter(r=>!ids.has(r.id)||r.id==='catalog-moenjodaro');
      state.sites.find(r=>r.id==='catalog-moenjodaro').notes='preserve-curated-note';
      state.sites.push({...state.sites[0],id:'private-recovery-record',name:'Preserved private site'});
      state.settings.catalogRevision=8;delete state.settings.catalogRevision8Complete;
      state.settings.reducedMotion=false;
      state.settings.globeView={lat:34.25,lon:-118.45,zoom:1.73,spin:false,selectedId:state.sites[0].id,mode:'observatory'};
      localStorage.setItem('atlas-command-state',JSON.stringify(state));
    });
    // Avoid beforeunload saving the prior in-memory fixture over the recovery data.
    const recoveryStorage=await page.evaluate(()=>localStorage.getItem('atlas-command-state'));
    await context.close();
    const recovery=await browser.newContext({viewport:{width:1440,height:1000}});
    await recovery.addInitScript(({base,saved})=>{if(location.origin===base)localStorage.setItem('atlas-command-state',saved);},{base,saved:recoveryStorage});
    const restored=await recovery.newPage();await restored.route('**/*',r=>r.request().url().startsWith(base+'/')?r.continue():r.abort());
    await restored.goto(base);await restored.waitForFunction(()=>!!window.AtlasWorkspace);
    assert.equal(await restored.locator('.site-item').count(),count+1);
    assert.equal(await restored.evaluate(()=>AtlasWorkspace.sites.list().find(r=>r.id==='catalog-moenjodaro').notes),'preserve-curated-note');
    assert.equal(await restored.evaluate(()=>AtlasTest.state.settings.catalogRevision8Complete),true);
    await restored.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
    assert.equal(await restored.evaluate(()=>AtlasTest.globe.spin),false);
    assert(Math.abs(await restored.evaluate(()=>AtlasTest.globe.lon)+118.45)<.001);
    await recovery.close();
    console.log('PASS: collaboration drafts, escaping, privacy, proposals, navigation, responsive layout, lock/reload and existing catalog.');
  }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(()=>server.close());
