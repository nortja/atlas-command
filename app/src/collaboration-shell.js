/* Local collaboration UI prototype. No persistence, transport or encryption. */
(function(){
'use strict';
const M=window.AtlasCollaborationModel;if(!M)return;
let session=M.createSession('local-owner'),activeSpace=null,view='message',dialog,context=null,sequence=0;
const forms=new Map();
const titles={message:'Private chat',note:'Site notes',proposal:'Proposed edits',file:'Shared storage'};
const labels={private:'Private to me',team:'Team intent · not shared',public:'Public intent · not published'};
function element(tag,content,className){const node=document.createElement(tag);if(content!==undefined)node.textContent=content;if(className)node.className=className;return node;}
function button(label,fn,className){const node=element('button',label,className);node.type='button';node.onclick=fn;return node;}
function nextId(){return 'session-'+(++sequence);}
function selectedSite(){
  const s=window.AtlasWorkspace?.sites?.selected?.();
  // Never copy private coordinates, notes or other workspace fields into the shell.
  return s?{id:s.id,name:s.name}:null;
}
function stash(){const f=dialog?.querySelector('#collabDraftForm');if(f)forms.set(activeSpace+':'+view,Object.fromEntries(new FormData(f)));}
function status(message){const n=dialog.querySelector('#collabStatus');n.textContent=message;}
function guard(action){try{action();}catch{status('This draft could not be added. Check its fields and session limits.');}}
function clearSession(){
  session.lock();forms.clear();activeSpace=null;context=null;
  if(dialog){dialog.replaceChildren();if(dialog.open)dialog.close();}
}
function open(){
  if(session.locked)session=M.createSession('local-owner');
  if(!dialog){dialog=element('dialog',undefined,'collab-dialog');dialog.id='collaborationDialog';dialog.setAttribute('aria-labelledby','collabTitle');document.body.append(dialog);}
  if(!dialog.childElementCount){context=selectedSite();render();}
  if(!dialog.open)dialog.showModal();
}
function field(form,label,name,tag='input',value=''){
  const wrap=element('label',undefined,'collab-field'),caption=element('span',label);caption.id='collab-label-'+nextId();wrap.append(caption);
  const input=element(tag);input.name=name;input.value=value;
  input.setAttribute('aria-labelledby',caption.id);
  if(tag!=='select'){input.maxLength=name==='body'?8000:2000;input.required=true;}
  wrap.append(input);form.append(wrap);return input;
}
function render(){
  dialog.replaceChildren();
  const shell=element('div',undefined,'collab-shell');dialog.append(shell);
  const head=element('header',undefined,'collab-header'),title=element('div');
  title.append(element('span','RESEARCH TOGETHER','collab-kicker'));const h=element('h2','Research Teams');h.id='collabTitle';title.append(h,element('p','A quieter place for shared discovery.'));
  head.append(title,button('Close',()=>{stash();dialog.close();},'collab-close'));shell.append(head);
  const banner=element('section',undefined,'collab-notice');banner.id='collabNotice';
  banner.append(element('strong','Session preview · nothing is sent'),element('p','Drafts are held in memory only, without encryption or saving. Reloading, locking or shutting down discards them. Encrypted team storage and sync are not connected.'));
  shell.append(banner);
  const layout=element('div',undefined,'collab-layout'),aside=element('aside',undefined,'collab-sidebar');
  aside.append(element('h3','Your spaces'));
  const spaces=session.listSpaces();
  if(!spaces.length)aside.append(element('p','Create a session space to explore the workspace.','collab-muted'));
  for(const space of spaces){const b=button(space.name,()=>{stash();activeSpace=space.id;render();},'collab-space');b.setAttribute('aria-pressed',String(space.id===activeSpace));aside.append(b);}
  const create=element('form');create.id='collabSpaceForm';const name=field(create,'Space name','spaceName');name.maxLength=80;name.autocomplete='off';
  const add=element('button','Create session space');add.type='submit';create.append(add);
  create.onsubmit=e=>{e.preventDefault();guard(()=>{stash();const s=session.createSpace({id:nextId(),name:name.value.trim()});activeSpace=s.id;render();});};aside.append(create);
  aside.append(element('p','Owner · Researcher · Contributor · Viewer','collab-muted'));
  const invite=button('Invite researchers',()=>{});invite.disabled=true;aside.append(invite,element('p','Invitations require secure identity and encryption.','collab-muted'));
  const main=element('section',undefined,'collab-main');layout.append(aside,main);shell.append(layout);
  const state=element('p','','collab-status');state.id='collabStatus';state.setAttribute('role','status');state.setAttribute('aria-live','polite');shell.append(state);
  if(!activeSpace){
    main.append(element('span','LOCAL FIRST','collab-kicker'),element('h3','Keep research close. Bring your team when you’re ready.'),element('p','Explore private chat, site notes, reviewed proposals and shared storage in a session space.','collab-muted'));
    const cards=element('div',undefined,'collab-cards');for(const [kind,title] of Object.entries(titles)){const c=element('article');c.append(element('h4',title),element('p',({message:'Draft a conversation before sharing.',note:'Give each site its own research thread.',proposal:'Review changes without overwriting the catalog.',file:'Plan evidence storage with private defaults.'})[kind]));cards.append(c);}main.append(cards);
  }else{
    const nav=element('nav',undefined,'collab-nav');nav.setAttribute('aria-label','Collaboration sections');
    for(const [kind,title] of Object.entries(titles)){const b=button(title,()=>{stash();view=kind;render();});b.setAttribute('aria-pressed',String(kind===view));nav.append(b);}main.append(nav);
    const space=spaces.find(s=>s.id===activeSpace);main.append(element('h3',space.name),element('p','You are the local Owner. No other members are connected.','collab-muted'));
    if(view==='file'){
      main.append(element('h4','Encrypted shared storage'),element('p','File upload is unavailable until the encrypted vault is ready. File contents never enter this preview.','collab-muted'));
      const upload=button('Add encrypted file',()=>{});upload.disabled=true;main.append(upload);
    }else renderComposer(main);
    const list=element('section',undefined,'collab-drafts');list.setAttribute('aria-label','Session drafts');
    const drafts=session.listDrafts(activeSpace).filter(r=>r.kind===view);
    if(!drafts.length)list.append(element('p','No '+(view==='file'?'files':'session drafts')+' yet.','collab-muted'));
    for(const r of drafts){
      const card=element('article');card.append(element('strong',labels[r.visibility]));
      if(r.site)card.append(element('small','Site reference: '+r.site.id));
      if(r.kind==='proposal'){card.append(element('p','Before: '+r.payload.before),element('p','Proposed: '+r.payload.after),element('p','Reason: '+r.payload.reason),element('small','Draft only · catalog unchanged'));}
      else card.append(element('p',r.payload.body));
      card.append(button('Preview disclosure',()=>{const p=M.disclosurePreview(r);status(labels[p.intendedVisibility]+'. Preview omits content, identifiers and coordinates. Nothing is sent or published.');}),button('Discard draft',()=>guard(()=>{stash();session.discard(r.id);render();})));
      list.append(card);
    }
    main.append(list);
  }
  const foot=element('footer');foot.append(element('span','Offline session · sync off · telemetry unchanged'),button('Lock & discard session',clearSession));shell.append(foot);
}
function renderComposer(main){
  if(view==='note'||view==='proposal'){
    const site=element('div',undefined,'collab-site');site.append(element('strong',context?context.name:'No site selected'));
    site.append(element('small','Coordinates excluded. Select a site on the globe, then use it here.'));
    site.append(button('Use selected site',()=>{stash();context=selectedSite();render();}));main.append(site);
    if(!context)return;
  }
  const f=element('form');f.id='collabDraftForm';f.setAttribute('aria-describedby','collabNotice');
  if(view==='proposal'){
    const before=field(f,'Current site name','before','input',context.name);before.readOnly=true;before.maxLength=8000;
    field(f,'Proposed site name','after');field(f,'Evidence and reason','reason','textarea');
  }else field(f,view==='message'?'Message draft':'Site note','body','textarea');
  const visibility=field(f,'Intended visibility','visibility','select');
  for(const [value,label] of Object.entries(labels)){const option=element('option',label);option.value=value;visibility.append(option);}
  const cached=forms.get(activeSpace+':'+view);if(cached)for(const el of f.elements)if(el.name in cached&&el.name!=='before')el.value=cached[el.name];
  const submit=element('button','Add session draft','collab-primary');submit.type='submit';f.append(submit);
  f.onsubmit=e=>{e.preventDefault();guard(()=>{
    const data=Object.fromEntries(new FormData(f));
    const payload=view==='message'?{channel:'team',body:data.body}:view==='note'?{body:data.body}:
      {baseRevision:'session-observation',field:'name',before:data.before,after:data.after,reason:data.reason};
    session.addDraft(activeSpace,{id:nextId(),kind:view,visibility:data.visibility,
      site:view==='message'?null:{id:context.id,sensitive:true,coordinates:null},payload});
    forms.delete(activeSpace+':'+view);render();status('Draft added to this session only. It has not been saved or shared.');
  });};main.append(f);
}
function mount(){
  if(document.getElementById('collaborationBtn'))return;
  const actions=document.querySelector('.top-actions');if(!actions)return;
  const b=button('Teams',open,'collab-launch');b.id='collaborationBtn';b.title='Open Research Teams';b.setAttribute('aria-haspopup','dialog');actions.insertBefore(b,document.getElementById('settingsBtn')||null);
}
window.addEventListener('pagehide',clearSession);
window.addEventListener('beforeunload',clearSession);
// Clear before the existing native exit handler runs, including failed exits.
// Do not intercept, cancel or replace the host's save/exit implementation.
document.addEventListener('click',e=>{if(e.target.closest?.('#shutdownBtn'))clearSession();},{capture:true});
window.AtlasCollaboration=Object.freeze({open,lock:clearSession});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});else mount();
})();
