/* Friendly camera setup journey. Presentation only: no credentials, transport or network activity. */
(function(win){'use strict';if(!win.document)return;
const doc=win.document;
function step(label,state,detail){return `<li data-state="${state}"><span aria-hidden="true"></span><div><b>${label}</b><small>${detail}</small></div></li>`;}
function render(){
 const desk=doc.getElementById('fieldCameraDesk');if(!desk||!desk.open)return;
 const content=desk.querySelector('#fieldContent');if(!content)return;
 let bar=content.querySelector('.field-journey');if(!bar){bar=doc.createElement('section');bar.className='field-journey';bar.setAttribute('aria-label','Camera setup progress');content.prepend(bar);}
 const form=content.querySelector('#fieldForm'),hasProfile=!!content.querySelector('.field-detail-head h3')&&!form;
 const detailsState=form?'active':hasProfile?'done':'active';
 const detailsText=form?'Add the camera basics':'Camera profile saved';
 bar.innerHTML=`<div class="field-journey-title"><span class="eyebrow">QUICK SETUP</span><strong>${hasProfile?'Next: secure sign-in':'Start with the basics'}</strong></div><ol>${step('1 · Details',detailsState,detailsText)}${step('2 · Secure sign-in',hasProfile?'next':'locked',hasProfile?'Save username + password to Windows securely':'Available after the profile is saved')}${step('3 · Test camera','locked','Atlas will try ONVIF first, then offer RTSP/manual fallback')}${step('4 · Open live view','locked','Opens only after a real frame is decoded; always starts in the normal workspace panel')}</ol><p class="field-journey-note">Simple by default. Advanced ports and paths stay tucked away unless Atlas needs them. Expanded viewing is optional and never becomes the reopen default.</p>`;
}
function schedule(){setTimeout(render,0);setTimeout(render,120);}
win.addEventListener('atlas:ready',()=>{const desk=doc.getElementById('fieldCameraDesk');if(!desk)return;desk.addEventListener('click',schedule);desk.addEventListener('input',schedule);desk.addEventListener('change',schedule);new MutationObserver(schedule).observe(desk,{childList:true,subtree:true});}, {once:true});
})(typeof window==='object'?window:globalThis);
