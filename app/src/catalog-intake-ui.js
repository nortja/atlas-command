/* Local review UI. Imported strings are rendered as text, never executed. */
(function(win){'use strict';function mount(){
 const d=win.document,app=win.AtlasWorkspace,I=win.AtlasCatalogIntake,C=win.AtlasCore,esc=C.escapeHTML;
 if(!app||win.AtlasCatalogIntakeUI)return;
 const modal=d.getElementById('dialog'),content=d.getElementById('dialogContent');
 const labels={source:'Source needed',date:'Date unresolved',rating:'Unrated',imported:'Imported'};
 let busy=false,returnFocus=null;
 function shell(title,body){
  returnFocus=d.activeElement;modal.classList.add('catalog-intake-dialog');
  content.innerHTML=`<div class="dialog-head"><div><span class="eyebrow">LOCAL CATALOG · REVIEW</span><h2 id="intakeTitle">${esc(title)}</h2></div><button id="closeDialog" aria-label="Close catalog review">×</button></div><div class="dialog-body">${body}</div>`;
  modal.setAttribute('aria-labelledby','intakeTitle');content.querySelector('#closeDialog').onclick=()=>{if(!busy)modal.close();};
  if(!modal.open)modal.showModal();
 }
 modal.addEventListener('cancel',e=>{if(busy)e.preventDefault();});
 modal.addEventListener('close',()=>{modal.classList.remove('catalog-intake-dialog');modal.removeAttribute('aria-labelledby');if(returnFocus?.isConnected)returnFocus.focus();returnFocus=null;});
 const chips=flags=>flags.map(f=>`<span class="intake-chip">${labels[f]}</span>`).join('');
 function open(raw,meta={}){
  const report=app.catalogIntake.review(raw),chosen=new Set(report.rows.filter(r=>r.status==='new').map(r=>r.row));let page=0;
  shell('Review your incoming records',`<p>${esc(meta.name||'Local file')} · ${report.counts.new} new · ${report.counts.duplicate} duplicates · ${report.counts.conflict} ID conflicts · ${report.counts.invalid} invalid</p><p class="hint">${esc(meta.formatNote||'')} Existing records are never overwritten. Unresolved dates and inherited ratings are retained as supplied.</p>${meta.workspace?'<p class="warning">Only site records are merged. Team workspaces, plans, layouts and media files are not imported here.</p>':''}<div class="intake-filters"><label>Find a row<input id="intakeSearch" type="search" placeholder="Site, country or row number"></label><label>Show<select id="intakeStatus"><option value="all">All rows</option><option value="new">New records</option><option value="duplicate">Duplicates</option><option value="conflict">ID conflicts</option><option value="invalid">Invalid rows</option></select></label></div><div class="intake-actions"><button id="intakeSelect">Select matching new rows</button><button id="intakeClear">Clear selection</button><span id="intakeSelection" role="status"></span></div><div id="intakeRows"></div><div class="intake-pages"><button id="intakePrev">Previous</button><span id="intakePage" role="status"></span><button id="intakeNext">Next</button></div><p id="intakeError" class="field-error" role="alert"></p><div class="form-actions"><button id="cancelImport">Cancel</button><button id="confirmImport" class="primary"></button></div>`);
  const $=q=>content.querySelector(q),matching=()=>I.filtered(report.rows,{query:$('#intakeSearch').value,status:$('#intakeStatus').value});
  function selection(){ $('#intakeSelection').textContent=chosen.size+' selected across all pages';$('#confirmImport').textContent='Import '+chosen.size+' records';$('#confirmImport').disabled=busy||!chosen.size; }
  function render(){const rows=matching(),pages=Math.max(1,Math.ceil(rows.length/20));page=Math.min(page,pages-1);
   $('#intakeRows').innerHTML=rows.slice(page*20,page*20+20).map(r=>`<article class="intake-row" data-row="${r.row}"><div class="intake-row-heading">${r.status==='new'?`<label><input type="checkbox" data-select="${r.row}" ${chosen.has(r.row)?'checked':''} aria-label="Select row ${r.row}: ${esc(r.site.name)}"></label>`:''}<div><strong>${esc(r.site?.name||r.name)}</strong><small>Row ${r.row} · ${esc(r.status)}${r.site?' · '+esc(r.site.country||r.site.category):''}</small></div></div>${r.status==='invalid'?`<p class="field-error">${esc(r.message)}</p>`:r.status==='new'?`<p class="hint">${esc(C.yearLabel(r.site.yearStart))} ${chips(r.flags)}</p>`:`<details><summary>Compare with ${r.matchRow?'incoming row '+r.matchRow:'existing catalog record'}</summary><p>${esc(r.match.name)} · ${r.status==='conflict'?'This identifier belongs to a different record. Resolve the identifier in your source file.':'Matching name or source at the same rounded coordinates.'}</p>${r.differences.length?`<div class="intake-compare"><table><thead><tr><th>Field</th><th>Existing</th><th>Incoming</th></tr></thead><tbody>${r.differences.map(x=>`<tr><th>${esc(x.field)}</th><td>${esc(String(x.before))}</td><td>${esc(String(x.after))}</td></tr>`).join('')}</tbody></table></div>`:'<p>No differences in the compared research fields.</p>'}<p class="hint">Comparison covers core research fields. Media and extended metadata are not merged. This row cannot overwrite the matched record.</p></details>`}</article>`).join('')||'<p>No matching rows.</p>';
   $('#intakePage').textContent=`Page ${page+1} of ${pages} · ${rows.length} matching rows`;$('#intakePrev').disabled=page===0;$('#intakeNext').disabled=page===pages-1;
   content.querySelectorAll('[data-select]').forEach(n=>n.onchange=()=>{if(n.checked)chosen.add(Number(n.dataset.select));else chosen.delete(Number(n.dataset.select));selection();});selection();
  }
  $('#intakeSearch').oninput=$('#intakeStatus').onchange=()=>{page=0;render();};$('#intakePrev').onclick=()=>{page--;render();};$('#intakeNext').onclick=()=>{page++;render();};
  $('#intakeSelect').onclick=()=>{matching().filter(r=>r.status==='new').forEach(r=>chosen.add(r.row));render();};$('#intakeClear').onclick=()=>{chosen.clear();render();};
  $('#cancelImport').onclick=()=>{if(!busy){app.catalogIntake.cancel();modal.close();}};
  $('#confirmImport').onclick=async()=>{if(busy)return;busy=true;content.querySelectorAll('button,input,select').forEach(n=>n.disabled=true);$('#intakeError').textContent='Saving locally…';try{const result=await app.catalogIntake.commit([...chosen]);modal.close();app.notify('Imported '+result.count+' records. Undo is available in Overview → Catalog review until the catalog or mission queue changes.');}catch(e){$('#intakeError').textContent=e.message;}finally{busy=false;content.querySelectorAll('button,input,select').forEach(n=>n.disabled=false);render();}};render();
 }
 function evidence(){
  let page=0;
  shell('Review your research evidence',`<p class="hint">These filters identify missing catalog fields, not historical credibility. Reviewing a record does not automatically verify it or change a rating. Private team content is kept in the Teams workspace.</p><div class="intake-filters"><label>Find research<input id="evidenceSearch" type="search" placeholder="Name, country or evidence"></label><label>Review focus<select id="evidenceIssue"><option value="all">All records</option>${Object.entries(labels).map(([k,v])=>`<option value="${k}">${v}</option>`).join('')}</select></label></div><div class="intake-actions"><button id="evidenceImport">Import a catalog file</button><button id="intakeUndo">Undo last import</button></div><p id="evidenceStatus" role="status"></p><div id="evidenceRows"></div><div class="intake-pages"><button id="evidencePrev">Previous</button><span id="evidencePage" role="status"></span><button id="evidenceNext">Next</button></div>`);
  const $=q=>content.querySelector(q);
  function render(){const rows=I.evidence(app.sites.list(),{query:$('#evidenceSearch').value,issue:$('#evidenceIssue').value}),pages=Math.max(1,Math.ceil(rows.length/20));page=Math.min(page,pages-1);
   $('#evidenceRows').innerHTML=rows.slice(page*20,page*20+20).map(r=>`<article class="intake-row"><button class="intake-site" data-open-site="${esc(r.site.id)}"><strong>${esc(r.site.name)}</strong><small>${esc(r.site.country)} · ${esc(C.yearLabel(r.site.yearStart))}</small></button><div>${chips(r.flags)}</div></article>`).join('')||'<p>No matching records.</p>';
   $('#evidencePage').textContent=`Page ${page+1} of ${pages} · ${rows.length} records`;$('#evidencePrev').disabled=page===0;$('#evidenceNext').disabled=page===pages-1;$('#intakeUndo').disabled=!app.catalogIntake.undoAvailable();
   content.querySelectorAll('[data-open-site]').forEach(n=>n.onclick=()=>{modal.close();app.sites.show(n.dataset.openSite);});
  }
  $('#evidenceSearch').oninput=$('#evidenceIssue').onchange=()=>{page=0;render();};$('#evidencePrev').onclick=()=>{page--;render();};$('#evidenceNext').onclick=()=>{page++;render();};
  $('#evidenceImport').onclick=()=>{modal.close();d.getElementById('fileImport').click();};
  $('#intakeUndo').onclick=async()=>{if(busy)return;busy=true;content.querySelectorAll('button,input,select').forEach(n=>n.disabled=true);try{const r=await app.catalogIntake.undo();$('#evidenceStatus').textContent='Removed '+r.count+' records from the last import.';}catch(e){$('#evidenceStatus').textContent=e.message;}finally{busy=false;content.querySelectorAll('button,input,select').forEach(n=>n.disabled=false);render();}};render();
 }
 win.AtlasCatalogIntakeUI=Object.freeze({open,evidence});
 const button=d.createElement('button');button.id='catalogReviewBtn';button.textContent='Catalog review';button.setAttribute('aria-haspopup','dialog');button.onclick=()=>{d.getElementById('overviewDialog')?.close();evidence();};
 (d.getElementById('overviewDialog')||d.querySelector('.instrument-modules')).append(button);
}if(win.AtlasWorkspace)mount();else win.addEventListener('atlas:ready',mount,{once:true});})(window);
