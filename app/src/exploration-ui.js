/* Quiet exploration controls. Only a local input-size preference is stored. */
(function(win){'use strict';function mount(){
 const d=win.document,app=win.AtlasWorkspace;if(!app||d.getElementById('touchModeBtn'))return;
 d.body.classList.add('calm-exploration');
 const controls=d.querySelector('.globe-controls'),modules=d.querySelector('.instrument-modules');
 const touch=d.createElement('button');touch.id='touchModeBtn';touch.textContent='Touch controls';touch.type='button';modules.append(touch);
 const media=win.matchMedia('(any-pointer: coarse)');let preference=null;
 try{const saved=win.localStorage.getItem('atlas.input-size');if(saved==='touch'||saved==='compact')preference=saved;}catch{}
 function apply(){const enabled=preference===null?media.matches:preference==='touch';d.body.classList.toggle('touch-controls',enabled);touch.setAttribute('aria-pressed',String(enabled));app.resizeGlobe();}
 touch.onclick=()=>{preference=d.body.classList.contains('touch-controls')?'compact':'touch';try{win.localStorage.setItem('atlas.input-size',preference);}catch{}apply();};media.addEventListener('change',apply);apply();
 const overview=d.createElement('button');overview.id='overviewBtn';overview.textContent='Overview';overview.setAttribute('aria-haspopup','dialog');modules.append(overview);
 const dialog=d.createElement('dialog');dialog.id='overviewDialog';dialog.className='next-dialog';dialog.setAttribute('aria-labelledby','overviewTitle');
 const close=d.createElement('button');close.className='dialog-close';close.textContent='Close';close.onclick=()=>dialog.close();
 const title=d.createElement('h2');title.id='overviewTitle';title.textContent='Your research at a glance';dialog.append(close,title);
 const board=d.getElementById('atlasInstruments');if(board)dialog.append(board);
 const credit=d.createElement('p');credit.className='hint';credit.textContent='Earth: NASA/Goddard Space Flight Center Scientific Visualization Studio · Blue Marble, 2048 × 1024 satellite mosaic. Bundled for offline exploration; not live imagery or terrain elevation.';dialog.append(credit);d.body.append(dialog);overview.onclick=()=>dialog.showModal();
 const focus=d.getElementById('focusBtn');controls.append(focus);focus.setAttribute('aria-pressed',String(app.isGlobeFocused()));
 const sync=()=>{focus.setAttribute('aria-pressed',String(app.isGlobeFocused()));focus.textContent=app.isGlobeFocused()?'Show panels':'Earth only';};new MutationObserver(sync).observe(d.body,{attributes:true,attributeFilter:['class']});sync();
 const hint=d.createElement('span');hint.className='globe-gesture-hint';hint.textContent='Drag to explore · pinch or use + / − to zoom';controls.before(hint);
 const spin=d.getElementById('spinBtn');
 app.liveEarth.renderer(g=>{g.options.calmEarth=true;const label=g.spin?'Ⅱ Pause':'▷ Rotate';if(spin.textContent!==label)spin.textContent=label;spin.setAttribute('aria-pressed',String(g.spin));},'quiet-exploration');
}if(win.AtlasWorkspace)mount();else win.addEventListener('atlas:ready',mount,{once:true});})(window);
