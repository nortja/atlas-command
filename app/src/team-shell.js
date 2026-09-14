/* Local encrypted workspace UI; text-only rendering and no remote collaboration. */
(function(){
'use strict';
const C=window.AtlasTeamCrypto,V=window.AtlasTeamVault;if(!C||!V)return;
let vault,dialog,tab='chat',exists=false,openEpoch=0,uiBusy=false;
const titles={chat:'Private chat',note:'Site notes',file:'Research files',proposal:'Proposed edits',members:'Members',account:'Identity & access',audit:'Audit',backup:'Backup & privacy'};
const vis={private:'Private to me',team:'Shared with team',public:'Public contribution'};
const el=(tag,text)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;return n;};
function button(text,action){const b=el('button',text);b.type='button';b.onclick=text==='Lock & close'?action:()=>run(action);return b;}
function field(form,label,name,type='text',options){const l=el('label',label),n=el(options?'select':type==='textarea'?'textarea':'input');n.name=name;n.setAttribute('aria-label',label);if(options)for(const [value,text] of Object.entries(options)){const o=el('option',text);o.value=value;n.append(o);}else if(type!=='textarea')n.type=type;n.required=true;n.autocomplete='off';if(type!=='file')n.maxLength=type==='password'?1024:8000;l.append(n);form.append(l);return n;}
function form(parent,submit,action){const f=el('form');parent.append(f);f.onsubmit=e=>{e.preventDefault();run(async()=>{const data=new FormData(f);for(const n of f.querySelectorAll('input[type=password]'))n.value='';await action(data);});};const b=el('button',submit);b.type='submit';f.append(b);return f;}
async function run(fn){if(uiBusy)return;uiBusy=true;const s=dialog?.querySelector('[role=status]'),buttons=Array.from(dialog?.querySelectorAll('button')||[]).filter(b=>!b.disabled&&b.textContent!=='Lock & close');for(const b of buttons)b.disabled=true;if(s)s.textContent='Working…';try{await fn();if(s?.isConnected)s.textContent='Completed on this device.';}catch{if(s?.isConnected)s.textContent='Could not complete this action. Check the passphrase, permissions, size limits, or a newer saved version.';}finally{uiBusy=false;for(const b of buttons)if(b.isConnected)b.disabled=false;}}
function lock(){openEpoch++;vault?.lock();if(dialog){dialog.replaceChildren();dialog.close();}}
async function open(){const epoch=++openEpoch;if(!vault)vault=V.create(V.storage());if(!dialog){dialog=el('dialog');dialog.id='teamVaultDialog';dialog.setAttribute('aria-label','Encrypted Research Teams');document.body.append(dialog);dialog.addEventListener('cancel',e=>{e.preventDefault();lock();});}exists=await vault.exists();if(epoch!==openEpoch)return;render();if(!dialog.open)dialog.showModal();}
function render(){
  dialog.replaceChildren();const h=el('header');h.append(el('div','RESEARCH TEAMS · LOCAL ENCRYPTED WORKSPACE'),button('Lock & close',lock));dialog.append(h);
  const status=el('p','');status.setAttribute('role','status');dialog.append(status);
  if(vault.locked){dialog.append(el('h2',exists?'Welcome back. Unlock your research.':'A private home for your research.'),el('p','Your passphrase stays on this device. There is no recovery if you lose it. Use at least 16 characters.'));
    const f=form(dialog,exists?'Unlock workspace':'Create encrypted workspace',async d=>{if(exists)await vault.unlock(d.get('pass'));else await vault.create(d.get('pass'),d.get('name'));render();});if(!exists){const n=field(f,'Workspace name','name');n.maxLength=80;}const p=field(f,'Passphrase','pass','password');p.minLength=16;
    if(!exists)backupImport(dialog);else dialog.append(el('p','Unlock as Owner before replacing an existing workspace with a backup.'));return;
  }
  if(!vault.authenticated){dialog.append(el('h2','Sign in to this local workspace'),el('p','The Owner has opened this workstation session. Enter your own member credential. Lock & close ends the entire session.'));
    const f=form(dialog,'Sign in',async v=>{await vault.authenticate(v.get('identity'),v.get('credential'));render();});field(f,'Local identity','identity','text',Object.fromEntries(vault.identities().map(m=>[m.id,m.name])));const p=field(f,'Member passphrase','credential','password');p.minLength=16;return;
  }
  const d=vault.view(),principal=vault.principal,manage=['Owner','Admin'].includes(principal.role),write=principal.role!=='Viewer';dialog.append(el('h2',d.name),el('p','Authenticated locally as '+principal.role+'. Saved encrypted on this device; nothing is sent.'),button('Switch member',()=>{vault.signOut();render();}));
  const nav=el('nav');nav.setAttribute('aria-label','Team workspace sections');for(const [key,title] of Object.entries(titles)){const b=button(title,()=>{tab=key;render();});b.setAttribute('aria-pressed',String(tab===key));nav.append(b);}dialog.append(nav);
  const main=el('section');main.append(el('h3',titles[tab]));dialog.append(main);
  if(tab==='account'){
    main.append(el('p','Your user identity is independent of your display name. This workstation session has no remote accounts or invitations.'),el('p','User ID: '+principal.id));
    const f=form(main,'Change passphrase',async v=>{await vault.changePassphrase(v.get('current'),v.get('next'));render();});field(f,'Current passphrase','current','password');const p=field(f,'New passphrase','next','password');p.minLength=16;
    main.append(el('p','Existing encrypted backups still need their old passphrases. There is no administrator reset for private member content.'));
    if(/^\/[a-f0-9]{32}\//.test(location.pathname))main.append(button('Show Windows-protected device identity',async()=>{const r=await fetch(new URL('api/team-device',location.href),{method:'POST',headers:{'X-Atlas-Request':'local'},cache:'no-store'});if(!r.ok)throw new Error('Device identity unavailable');const identity=await r.json();if(!/^[a-f0-9]{64}$/.test(identity.id)||identity.protection!=='windows-current-user')throw new Error('Invalid device identity');if(main.isConnected)main.append(el('p','Device fingerprint: '+identity.id));}));else main.append(el('p','Browser preview has no Windows-protected device identity.'));
    return;
  }
  if(tab==='audit'){if(!manage){main.append(el('p','Audit review requires Owner or Admin.'));return;}main.append(el('p','Encrypted action metadata only. No messages, file contents, names or coordinates.'));for(const a of vault.audit())main.append(el('p',a.sequence+' · '+a.action+' · '+a.role+' · '+new Date(a.at).toLocaleString()));return;}
  if(tab==='members'){
    main.append(el('p','Credentials authenticate members inside this unlocked workstation session. Invitations and remote access are not connected. Members should enter their own passphrases.'));
    const active=new Set(vault.identities().map(m=>m.id));
    for(const m of d.members){const row=el('article');row.append(el('strong',m.name+' · '+m.role));if(manage&&m.role!=='Owner'){
      const f=form(row,'Update role',async v=>{await vault.mutate({type:'member',id:m.id,name:m.name,role:v.get('role')});render();});const role=field(f,'Role','role','text',{Admin:'Admin',Researcher:'Researcher',Viewer:'Viewer'});role.value=m.role;
      row.append(button('Remove member',async()=>{await vault.mutate({type:'member',id:m.id,role:m.role,remove:true});render();}));if(!active.has(m.id)){const enroll=form(row,'Activate local credential',async v=>{await vault.enroll({id:m.id,name:m.name,role:m.role},v.get('pass'));render();});const p=field(enroll,'Enrollment passphrase','pass','password');p.minLength=16;}}main.append(row);}
    if(!manage)return;
    const f=form(main,'Add local member',async v=>{await vault.enroll({name:v.get('name'),role:v.get('role')},v.get('pass'));render();});const n=field(f,'Member name','name');n.maxLength=80;field(f,'Role','role','text',{Researcher:'Researcher',Viewer:'Viewer',Admin:'Admin'});const p=field(f,'Enrollment passphrase','pass','password');p.minLength=16;return;
  }
  if(tab==='backup'){
    main.append(el('p','Backups contain encrypted workspace and file versions. Restoring replaces this device’s team workspace and uses the backup passphrase. Ordinary Atlas exports contain no team content.'));
    if(principal.role==='Owner'){main.append(button('Export encrypted backup',async()=>download(new Blob([await vault.backup()],{type:'application/json'}),'atlas-team-encrypted-backup.json')));backupImport(main);}else main.append(el('p','Full backup export and replacement require authenticated Owner access.'));
    main.append(el('h4','Disclosure preview · coordinates redacted'),el('p','Text, site identifiers, file names and coordinates are withheld to avoid indirect location disclosure. No publication is connected.'));
    for(const r of vault.disclosure())main.append(el('p',titles[r.kind]+' · '+vis[r.visibility]+' · '+r.coordinates+' · '+r.content));return;
  }
  if(tab==='proposal')main.append(el('p','Compare against the team’s working copy. Approval updates that copy only; the Atlas catalog stays unchanged. Private proposals must remain unapproved until recreated with team visibility.'));
  if(write){const f=form(main,tab==='file'?'Save encrypted file':tab==='proposal'?'Propose edit':'Save '+(tab==='chat'?'message':'note'),async v=>{
    const op={type:'create',id:C.id(),kind:tab,body:v.get('body'),site:v.get('site')||'General research',visibility:v.get('visibility'),sensitive:v.get('sensitive')==='yes'};
    if(tab==='file'){const file=v.get('file');if(file.size>2*1024*1024)throw new Error('File limit');const data=new Uint8Array(await file.arrayBuffer());try{await vault.file({...op,body:file.name},data);}finally{data.fill(0);}}else await vault.mutate(op);render();
  });
  if(tab!=='chat'){const site=field(f,'Site reference (kept encrypted)','site');site.maxLength=200;site.value=window.AtlasWorkspace?.sites?.selected?.()?.name||'General research';}
  if(tab==='file')field(f,'File · maximum 2 MiB','file','file');else field(f,tab==='proposal'?'Proposed team research text':'Text','body','textarea');
  field(f,'Visibility intent','visibility','text',vis);field(f,'Sensitive coordinates','sensitive','text',{yes:'Sensitive · redact',no:'Still redacted in disclosure preview'});}else main.append(el('p','Viewer access · read only.'));
  for(const r of d.records.filter(r=>r.kind===tab)){
    const card=el('article');card.append(el('strong',r.site+' · '+vis[r.visibility]),el('p','Version '+r.versions.length+(r.status?' · '+r.status:'')));
    if(r.kind==='proposal'){card.append(el('h4','Before · team working copy'),el('p',r.before||'No team working copy yet'),el('h4','Proposed'));}
    card.append(el('p',r.versions.at(-1).body));
    if(write&&r.authorId===principal.id&&!(r.kind==='proposal'&&r.status!=='pending')){const visibility=form(card,'Change visibility',async v=>{await vault.visibility(r.id,v.get('visibility'),r.versions.length);render();});const select=field(visibility,'Record visibility','visibility','text',vis);select.value=r.visibility;card.append(el('p','Making previously shared content private cannot revoke earlier copies. Public contribution does not publish anything.'));}
    if(manage&&r.kind==='proposal'&&r.status==='pending'){for(const decision of ['approved','rejected']){const b=button(decision==='approved'?'Approve':'Reject',async()=>{await vault.mutate({type:'decide',id:r.id,expectedVersion:r.versions.length,decision});render();});b.disabled=decision==='approved'&&r.visibility==='private';card.append(b);}}
    if(write&&['note','file'].includes(r.kind)&&(manage||r.authorId===principal.id)){
      const edit=form(card,'Save new version',async v=>{if(r.kind==='file'){const file=v.get('file');if(file.size>2*1024*1024)throw new Error('File limit');const bytes=new Uint8Array(await file.arrayBuffer());try{await vault.file({id:r.id,body:file.name,expectedVersion:r.versions.length},bytes);}finally{bytes.fill(0);}}else await vault.mutate({type:'revise',id:r.id,body:v.get('body'),expectedVersion:r.versions.length});render();});field(edit,r.kind==='file'?'Replacement file':'Revised note',r.kind==='file'?'file':'body',r.kind==='file'?'file':'textarea');
    }
    const history=el('details');history.append(el('summary','Version history'));for(const v of r.versions){history.append(el('p','v'+v.number+' · '+v.body));if(r.kind==='file')history.append(button('Download v'+v.number,async()=>{const bytes=await vault.readFile(r.id,v.number);try{download(new Blob([bytes],{type:'application/octet-stream'}),'atlas-research-file.bin');}finally{bytes.fill(0);}}));}card.append(history);main.append(card);
  }
}
function backupImport(parent){const f=form(parent,'Restore encrypted backup',async v=>{const file=v.get('backup');if(file.size>C.MAX)throw new Error('Backup limit');await vault.restore(await file.text(),v.get('backupPass'),v.get('replace')==='on');exists=true;render();});field(f,'Encrypted backup file','backup','file');const p=field(f,'Backup passphrase','backupPass','password');p.minLength=16;field(f,'Replace the local team workspace; use the backup passphrase afterward','replace','checkbox');}
function download(blob,name){const url=URL.createObjectURL(blob),a=el('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
window.addEventListener('pagehide',lock);window.addEventListener('beforeunload',lock);
document.addEventListener('click',e=>{if(e.target.closest?.('#shutdownBtn,#stopLocal'))lock();},{capture:true});
function mount(){const b=document.getElementById('collaborationBtn');if(b)b.onclick=()=>run(open);}
window.AtlasTeams=Object.freeze({open,lock});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});else mount();
})();
