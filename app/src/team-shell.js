/* Local encrypted workspace UI; text-only rendering and no remote collaboration. */
(function(){
'use strict';
const C=window.AtlasTeamCrypto,V=window.AtlasTeamVault,H=window.AtlasTeamReview;if(!C||!V||!H)return;
let vault,dialog,tab='chat',exists=false,openEpoch=0,uiBusy=false;
const filters=new Map();let lastActor=null,reviewToken=null,reviewTimer=null;
const idle=H.inactivity({onLock:()=>{lock();document.getElementById('collaborationBtn')?.setAttribute('title','Teams locked after inactivity.');}});
const titles={chat:'Private chat',note:'Site notes',file:'Research files',proposal:'Proposed edits',members:'Members',account:'Identity & access',audit:'Audit',backup:'Backup & privacy'};
const vis={private:'Private to me',team:'Shared with team',public:'Public contribution'};
const quantity=(n,label)=>n+' '+label+(n===1?'':'s');
const el=(tag,text)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;return n;};
function button(text,action){const b=el('button',text);b.type='button';b.onclick=text==='Lock & close'?action:()=>run(action);return b;}
function field(form,label,name,type='text',options){const l=el('label',label),n=el(options?'select':type==='textarea'?'textarea':'input');n.name=name;n.setAttribute('aria-label',label);if(options)for(const [value,text] of Object.entries(options)){const o=el('option',text);o.value=value;n.append(o);}else if(type!=='textarea')n.type=type;n.required=true;n.autocomplete='off';if(type!=='file')n.maxLength=type==='password'?1024:8000;l.append(n);form.append(l);return n;}
function form(parent,submit,action){const f=el('form');parent.append(f);f.onsubmit=e=>{e.preventDefault();run(async()=>{const data=new FormData(f);for(const n of f.querySelectorAll('input[type=password]'))n.value='';await action(data);});};const b=el('button',submit);b.type='submit';f.append(b);return f;}
async function run(fn){if(uiBusy)return;uiBusy=true;const wasUnlocked=vault&&!vault.locked,s=dialog?.querySelector('[role=status]'),buttons=Array.from(dialog?.querySelectorAll('button')||[]).filter(b=>!b.disabled&&b.textContent!=='Lock & close');for(const b of buttons)b.setAttribute('aria-disabled','true');if(s)s.textContent='Working…';try{await fn();if(s?.isConnected)s.textContent='Completed on this device.';}catch{if(wasUnlocked&&vault.locked){lock();document.getElementById('collaborationBtn')?.setAttribute('title','Workspace changed or locked. Reopen Teams to authenticate.');}if(s?.isConnected)s.textContent='Could not complete this action. Check the passphrase, permissions, size limits, or a newer saved version.';}finally{uiBusy=false;for(const b of buttons)if(b.isConnected)b.removeAttribute('aria-disabled');}}
function lock(){openEpoch++;clearReview();filters.clear();lastActor=null;idle.stop();vault?.lock();if(dialog){dialog.replaceChildren();dialog.close();}}
async function open(){const epoch=++openEpoch;if(!vault)vault=V.create(V.storage());if(!dialog){dialog=el('dialog');dialog.id='teamVaultDialog';dialog.setAttribute('aria-label','Encrypted Research Teams');document.body.append(dialog);dialog.addEventListener('cancel',e=>{e.preventDefault();lock();});}exists=await vault.exists();if(epoch!==openEpoch)return;render();if(!dialog.open)dialog.showModal();}
function render(){
  clearReview();const who=vault.principal?.id||null;if(who!==lastActor){filters.clear();lastActor=who;}if(!vault.locked){idle.start();idle.hidden(document.hidden);}
  dialog.replaceChildren();const h=el('header');h.append(el('div','RESEARCH TEAMS · LOCAL ENCRYPTED WORKSPACE'),button('Lock & close',lock));dialog.append(h);
  const status=el('p','');status.setAttribute('role','status');dialog.append(status);
  if(vault.locked){dialog.append(el('h2',exists?'Welcome back. Unlock your research.':'A private home for your research.'),el('p','Your passphrase stays on this device. There is no recovery if you lose it. Use at least 16 characters.'));
    const f=form(dialog,exists?'Unlock workspace':'Create encrypted workspace',async d=>{if(exists)await vault.unlock(d.get('pass'));else await vault.create(d.get('pass'),d.get('name'));render();});if(!exists){const n=field(f,'Workspace name','name');n.maxLength=80;}const p=field(f,'Passphrase','pass','password');p.minLength=16;
    if(!exists)backupImport(dialog);else dialog.append(el('p','Unlock as Owner before replacing an existing workspace with a backup.'));return;
  }
  if(!vault.authenticated){dialog.append(el('h2','Sign in to this local workspace'),el('p','The Owner has opened this workstation session. Enter your own member credential. Lock & close ends the entire session.'));
    const f=form(dialog,'Sign in',async v=>{await vault.authenticate(v.get('identity'),v.get('credential'));render();});field(f,'Local identity','identity','text',Object.fromEntries(vault.identities().map(m=>[m.id,m.name])));const p=field(f,'Member passphrase','credential','password');p.minLength=16;return;
  }
  const d=vault.view(),principal=vault.principal,manage=['Owner','Admin'].includes(principal.role),write=principal.role!=='Viewer';dialog.append(el('h2',d.name),el('p','Authenticated locally as '+principal.role+'. Saved encrypted on this device; nothing is sent.'),button('Switch member',()=>{clearReview();filters.clear();vault.signOut();render();}));
  const nav=el('nav');nav.setAttribute('aria-label','Team workspace sections');for(const [key,title] of Object.entries(titles)){const b=button(title,()=>{tab=key;render();});b.setAttribute('aria-pressed',String(tab===key));nav.append(b);}dialog.append(nav);
  const main=el('section');main.append(el('h3',titles[tab]));dialog.append(main);
  if(tab==='account'){
    main.append(el('p','Your user identity is independent of your display name. Teams lock after 10 minutes without activity, or 1 minute with this page hidden. No remote accounts or invitations are connected.'),el('p','User ID: '+principal.id));
    const f=form(main,'Change passphrase',async v=>{await vault.changePassphrase(v.get('current'),v.get('next'));render();});field(f,'Current passphrase','current','password');const p=field(f,'New passphrase','next','password');p.minLength=16;
    main.append(el('p','Existing encrypted backups still need their old passphrases. There is no administrator reset for private member content.'));
    if(/^\/[a-f0-9]{32}\//.test(location.pathname))main.append(button('Show Windows-protected device identity',async()=>{const r=await fetch(new URL('api/team-device',location.href),{method:'POST',headers:{'X-Atlas-Request':'local'},cache:'no-store'});if(!r.ok)throw new Error('Device identity unavailable');const identity=await r.json();if(!/^[a-f0-9]{64}$/.test(identity.id)||identity.protection!=='windows-current-user')throw new Error('Invalid device identity');if(main.isConnected)main.append(el('p','Device fingerprint: '+identity.id));}));else main.append(el('p','Browser preview has no Windows-protected device identity.'));
    return;
  }
  if(tab==='audit'){if(!manage){main.append(el('p','Audit review requires Owner or Admin.'));return;}renderAudit(main);return;}
  if(tab==='members'){
    main.append(el('p','Credentials authenticate members inside this unlocked workstation session. Invitations and remote access are not connected. Members should enter their own passphrases.'));
    const active=new Set(vault.identities().map(m=>m.id));
    for(const m of d.members){const row=el('article');row.append(el('strong',m.name+' · '+m.role));if(H.memberRoles(principal.role,m.role).length){
      const f=form(row,'Update role',async v=>{await vault.mutate({type:'member',id:m.id,name:m.name,role:v.get('role')});render();});const role=field(f,'Role','role','text',Object.fromEntries(H.memberRoles(principal.role,m.role).map(r=>[r,r])));role.value=m.role;
      row.append(button('Remove member',()=>confirmRemoval(row,m)));if(!active.has(m.id)){const enroll=form(row,'Activate local credential',async v=>{await vault.enroll({id:m.id,name:m.name,role:m.role},v.get('pass'));render();});const p=field(enroll,'Enrollment passphrase','pass','password');p.minLength=16;}}main.append(row);}
    if(!manage)return;
    const f=form(main,'Add local member',async v=>{await vault.enroll({name:v.get('name'),role:v.get('role')},v.get('pass'));render();});const n=field(f,'Member name','name');n.maxLength=80;field(f,'Role','role','text',principal.role==='Owner'?{Researcher:'Researcher',Viewer:'Viewer',Admin:'Admin'}:{Researcher:'Researcher',Viewer:'Viewer'});const p=field(f,'Enrollment passphrase','pass','password');p.minLength=16;return;
  }
  if(tab==='backup'){
    renderHealth(main);
    main.append(el('p','Backups contain encrypted workspace and file versions. Restoring replaces this device’s team workspace and uses the backup passphrase. Ordinary Atlas exports contain no team content.'));
    if(principal.role==='Owner'){main.append(button('Export encrypted backup',async()=>{download(new Blob([await vault.backup()],{type:'application/json'}),'atlas-team-encrypted-backup.json');render();}));backupImport(main);}else main.append(el('p','Full backup export and replacement require authenticated Owner access.'));
    main.append(el('h4','Disclosure preview · coordinates redacted'),el('p','Text, site identifiers, file names and coordinates are withheld to avoid indirect location disclosure. No publication is connected.'));
    for(const r of vault.disclosure())main.append(el('p',titles[r.kind]+' · '+vis[r.visibility]+' · '+r.coordinates+' · '+r.content));return;
  }
  if(tab==='proposal')main.append(el('p','Compare against the team’s working copy. Approval updates that copy only; the Atlas catalog stays unchanged. Private proposals can be reviewed after their author changes visibility to Shared with team.'));
  if(write){const f=form(main,tab==='file'?'Save encrypted file':tab==='proposal'?'Propose edit':'Save '+(tab==='chat'?'message':'note'),async v=>{
    const op={type:'create',id:C.id(),kind:tab,body:v.get('body'),site:v.get('site')||'General research',visibility:v.get('visibility'),sensitive:v.get('sensitive')==='yes'};
    if(tab==='file'){const file=v.get('file');if(file.size>2*1024*1024)throw new Error('File limit');const data=new Uint8Array(await file.arrayBuffer());try{await vault.file({...op,body:file.name},data);}finally{data.fill(0);}}else await vault.mutate(op);render();
  });
  if(tab!=='chat'){const site=field(f,'Site reference (kept encrypted)','site');site.maxLength=200;site.value=window.AtlasWorkspace?.sites?.selected?.()?.name||'General research';}
  if(tab==='file')field(f,'File · maximum 2 MiB','file','file');else field(f,tab==='proposal'?'Proposed team research text':'Text','body','textarea');
  field(f,'Visibility intent','visibility','text',vis);field(f,'Sensitive coordinates','sensitive','text',{yes:'Sensitive · redact',no:'Still redacted in disclosure preview'});}else main.append(el('p','Viewer access · read only.'));
  renderLibrary(main,d,principal,manage,write);
}
function renderRecords(main,records,principal,manage,write){
  for(const r of records){
    const card=el('article');card.append(el('strong',r.site+' · '+vis[r.visibility]),el('p','Version '+r.versions.length+(r.status?' · '+r.status:'')));
    if(r.kind==='proposal'){card.append(el('h4','Before · team working copy'),el('p',r.before||'No team working copy yet'),el('h4','Proposed'));const comparison=el('details');comparison.append(el('summary','Compare proposed change'));renderDiff(comparison,r.before,r.versions.at(-1).body);card.append(comparison);}
    card.append(el('p',r.versions.at(-1).body));
    if(write&&r.authorId===principal.id&&!(r.kind==='proposal'&&r.status!=='pending')){const visibility=form(card,'Change visibility',async v=>{await vault.visibility(r.id,v.get('visibility'),r.versions.length);render();});const select=field(visibility,'Record visibility','visibility','text',vis);select.value=r.visibility;card.append(el('p','Making previously shared content private cannot revoke earlier copies. Public contribution does not publish anything.'));}
    if(manage&&r.kind==='proposal'&&r.status==='pending'){for(const decision of ['approved','rejected']){const b=button(decision==='approved'?'Approve':'Reject',async()=>{await vault.mutate({type:'decide',id:r.id,expectedVersion:r.versions.length,decision});render();});b.disabled=decision==='approved'&&r.visibility==='private';card.append(b);}}
    if(write&&['note','file'].includes(r.kind)&&(manage||r.authorId===principal.id)){
      const edit=form(card,'Save new version',async v=>{if(r.kind==='file'){const file=v.get('file');if(file.size>2*1024*1024)throw new Error('File limit');const bytes=new Uint8Array(await file.arrayBuffer());try{await vault.file({id:r.id,body:file.name,expectedVersion:r.versions.length},bytes);}finally{bytes.fill(0);}}else await vault.mutate({type:'revise',id:r.id,body:v.get('body'),expectedVersion:r.versions.length});render();});field(edit,r.kind==='file'?'Replacement file':'Revised note',r.kind==='file'?'file':'body',r.kind==='file'?'file':'textarea');
    }
    const history=el('details');history.append(el('summary','Version history'));if(r.versions.length>1)renderVersionCompare(history,r);for(const v of r.versions){history.append(el('p','v'+v.number+' · '+v.body));if(r.kind==='file')history.append(button('Download v'+v.number,async()=>{const bytes=await vault.readFile(r.id,v.number);try{download(new Blob([bytes],{type:'application/octet-stream'}),'atlas-research-file.bin');}finally{bytes.fill(0);}}));}card.append(history);main.append(card);
  }
}

function clearReview(){if(reviewTimer)clearTimeout(reviewTimer);reviewTimer=null;vault?.cancelRestore(reviewToken);reviewToken=null;}
function backupImport(parent){
  let selectionVersion=0;const region=el('section');region.className='team-recovery';parent.append(region);
  const f=form(region,'Inspect encrypted backup',async v=>{
    const selection=selectionVersion;clearReview();preview.replaceChildren();const file=v.get('backup');if(file.size>C.MAX)throw new Error('Backup limit');
    const result=await vault.inspectBackup(await file.text(),v.get('backupPass'));if(!region.isConnected||selection!==selectionVersion){vault.cancelRestore(result.token);return;}reviewToken=result.token;
    preview.append(el('h4','Review before replacing'),el('p',result.name+' · '+quantity(result.records,'record')+' · '+quantity(result.versions,'version')+' · '+quantity(result.members,'member')));
    preview.append(el('p','Backup revision '+result.backupRevision+' · current local revision '+result.currentRevision));
    if(result.differentWorkspace)preview.append(el('p','This is a different workspace. Restoring replaces the current local team workspace.'));
    if(result.older)preview.append(el('p','This backup is older than the current workspace. Newer local changes will be replaced.'));
    preview.append(el('p',(result.privateEnvelopes?quantity(result.privateEnvelopes,'private member record')+' remain encrypted until their authors authenticate. ':'')+'The backup Owner passphrase will unlock the restored workspace.'));
    const confirm=form(preview,'Restore reviewed backup',async data=>{await vault.restoreReviewed(result.token,data.get('replace')==='on');exists=true;render();});field(confirm,'Replace the local team workspace; use the backup passphrase afterward','replace','checkbox');
    preview.append(button('Cancel restore',()=>{clearReview();preview.replaceChildren();}));
    reviewTimer=setTimeout(()=>{if(reviewToken===result.token){clearReview();if(preview.isConnected)preview.replaceChildren(el('p','Review expired. Inspect the backup again before restoring.'));}},120000);
  });field(f,'Encrypted backup file','backup','file');const p=field(f,'Backup passphrase','backupPass','password');p.minLength=16;
  const preview=el('section');preview.setAttribute('aria-live','polite');region.append(preview);f.oninput=()=>{selectionVersion++;if(reviewToken){clearReview();preview.replaceChildren(el('p','Backup selection changed. Inspect it again before restoring.'));}};
}
function renderLibrary(main,d,principal,manage,write){
  const state=filters.get(tab)||{query:'',visibility:'all',status:'all'};filters.set(tab,state);
  const tools=el('section');tools.className='team-filters';const q=field(tools,'Search saved research','query');q.required=false;q.maxLength=200;q.value=state.query;
  const v=field(tools,'Filter visibility','visibility','text',{all:'All visible records',...vis});v.value=state.visibility;
  let status;if(tab==='proposal'){status=field(tools,'Proposal status','status','text',{all:'All decisions',pending:'Pending review',approved:'Approved',rejected:'Rejected'});status.value=state.status;}
  const count=el('p');count.setAttribute('role','status');const list=el('section');list.className='team-record-list';
  function refresh(){const records=H.select(d.records,{...state,kind:tab});count.textContent=quantity(records.length,'matching record');list.replaceChildren();if(!records.length)list.append(el('p','No saved records match these filters.'));renderRecords(list,records,principal,manage,write);}
  q.oninput=()=>{state.query=q.value;refresh();};v.onchange=()=>{state.visibility=v.value;refresh();};if(status)status.onchange=()=>{state.status=status.value;refresh();};main.append(tools,count,list);refresh();
}
function renderDiff(parent,before,after){const box=el('div');box.className='team-diff';for(const row of H.diff(before,after)){const n=el('p',(row.type==='added'?'+ ':row.type==='removed'?'− ':'  ')+row.text);n.className='team-diff-'+row.type;box.append(n);}parent.append(box);}
function renderVersionCompare(parent,r){
  const controls=el('section');controls.className='team-filters';const options=Object.fromEntries(r.versions.map(v=>[v.number,'Version '+v.number]));
  const from=field(controls,'Earlier version','from','text',options),to=field(controls,'Later version','to','text',options);from.value=String(r.versions.length-1);to.value=String(r.versions.length);
  const result=el('section');function compare(){result.replaceChildren();if(r.kind==='file')result.append(el('p','File names compared below. File contents are available only through explicit downloads.'));renderDiff(result,r.versions.find(v=>v.number===Number(from.value)).body,r.versions.find(v=>v.number===Number(to.value)).body);}
  from.onchange=to.onchange=compare;parent.append(controls,result);compare();
}
function confirmRemoval(row,m){
  if(row.querySelector('.team-confirm'))return;const region=el('section');region.className='team-confirm';region.append(el('p','Remove '+m.name+'? Future sign-in is denied. Their private records remain encrypted, and previously copied content cannot be revoked.'),button('Confirm removal',async()=>{await vault.mutate({type:'member',id:m.id,role:m.role,remove:true});render();}),button('Keep member',()=>region.remove()));row.append(region);
}
function renderHealth(main){
  const h=vault.health(),box=el('section');box.className='team-health';box.append(el('h4','Local recovery status'),el('p','Saved revision '+h.revision+' · '+h.visibleRecords+' records visible to you'),el('p','Files: 2 MiB maximum each · 20 versions per record'));
  if(h.records!==undefined){box.append(el('p',h.records+' / '+h.maxRecords+' records · '+(h.snapshotBytes<1048576?Math.ceil(h.snapshotBytes/1024)+' KiB':(h.snapshotBytes/1048576).toFixed(2)+' MiB')+' / 8 MiB workspace storage'),el('p',h.auditEvents+' / '+h.maxAuditEvents+' audit events'));if(h.snapshotBytes>h.maxSnapshotBytes*.8||h.auditEvents>h.maxAuditEvents*.8)box.append(el('p','Approaching a workspace limit. Export an encrypted backup before adding more research. Existing versions are never silently discarded.'));}
  box.append(el('p','Keep encrypted backups in a separate safe location. They require the passwords valid when exported. A Windows device fingerprint is not a recovery key.'));main.append(box);
}
function renderAudit(main){
  main.append(el('p','Encrypted action metadata only. No messages, file contents, names or coordinates.'));
  const controls=el('section');controls.className='team-filters';const role=field(controls,'Filter audit role','role','text',{all:'All roles',Owner:'Owner',Admin:'Admin',Researcher:'Researcher',Viewer:'Viewer'}),action=field(controls,'Filter audit action','action','text',{all:'All actions',...H.auditLabels}),list=el('section'),summary=el('p');let page=0;
  const previous=button('Newer events',()=>{page=Math.max(0,page-1);draw();}),next=button('Older events',()=>{page++;draw();});
  function draw(){const result=H.auditPage(vault.audit(),{role:role.value,action:action.value,page});page=result.page;list.replaceChildren();for(const a of result.events){const line=el('p',a.sequence+' · '+H.auditLabels[a.action]+' · '+a.role+' · '+new Date(a.at).toLocaleString());line.dataset.auditAction=a.action;list.append(line);}summary.textContent=result.total+' events · page '+(page+1)+' of '+result.pages;previous.disabled=page===0;next.disabled=page+1===result.pages;}
  role.onchange=action.onchange=()=>{page=0;draw();};main.append(controls,summary,list,previous,next);draw();
}
function download(blob,name){const url=URL.createObjectURL(blob),a=el('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
setInterval(()=>idle.check(),1000);
document.addEventListener('pointerdown',()=>idle.touch(),{capture:true});document.addEventListener('keydown',()=>idle.touch(),{capture:true});document.addEventListener('visibilitychange',()=>idle.hidden(document.hidden));
window.addEventListener('pagehide',lock);window.addEventListener('beforeunload',lock);
document.addEventListener('click',e=>{if(e.target.closest?.('#shutdownBtn,#stopLocal'))lock();},{capture:true});
function mount(){const b=document.getElementById('collaborationBtn');if(b)b.onclick=()=>run(open);}
window.AtlasTeams=Object.freeze({open,lock});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});else mount();
})();
