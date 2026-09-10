/* Per-camera live-view geometry model. Pure data only; no media or network activity. */
(function(root,factory){'use strict';const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.AtlasFieldCameraLayout=api;})(typeof window==='object'?window:globalThis,function(){
'use strict';
const CLASSES=Object.freeze(['laptop','desktop','ultrawide']);
function viewportClass(width){const w=Number(width);if(!Number.isFinite(w)||w<320)throw Error('Invalid viewport width.');return w>=2560?'ultrawide':w>=1440?'desktop':'laptop';}
function num(v,label,min,max){const n=Number(v);if(!Number.isFinite(n)||n<min||n>max)throw Error('Invalid '+label+'.');return n;}
function defaults(width,height){const w=num(width,'viewport width',320,10000),h=num(height,'viewport height',320,10000),cls=viewportClass(w);let pw,ph,x,y;
 if(cls==='ultrawide'){pw=Math.min(1180,w*.38);ph=Math.min(760,h*.68);x=w*.47;y=Math.max(72,h*.12);}else if(cls==='desktop'){pw=Math.min(900,w*.46);ph=Math.min(700,h*.68);x=w*.42;y=Math.max(72,h*.13);}else{pw=Math.min(w-40,760);ph=Math.min(620,h*.62);x=Math.max(20,w-pw-20);y=Math.max(72,h*.16);}return Object.freeze({x:Math.round(x),y:Math.round(y),width:Math.round(pw),height:Math.round(ph),viewportClass:cls,expanded:false});}
function clamp(raw,width,height){const w=num(width,'viewport width',320,10000),h=num(height,'viewport height',320,10000),d=defaults(w,h);if(!raw||typeof raw!=='object')return d;const minW=Math.min(360,w-24),minH=Math.min(260,h-96),maxW=Math.max(minW,w-24),maxH=Math.max(minH,h-96);const pw=Math.min(maxW,Math.max(minW,Number(raw.width)||d.width)),ph=Math.min(maxH,Math.max(minH,Number(raw.height)||d.height));const x=Math.min(w-pw-12,Math.max(12,Number(raw.x)||d.x)),y=Math.min(h-ph-12,Math.max(72,Number(raw.y)||d.y));return Object.freeze({x:Math.round(x),y:Math.round(y),width:Math.round(pw),height:Math.round(ph),viewportClass:viewportClass(w),expanded:false});}
function key(profileId,viewport){if(typeof profileId!=='string'||!/^cam-[A-Za-z0-9-]{1,90}$/.test(profileId))throw Error('Invalid camera profile identifier.');if(!CLASSES.includes(viewport))throw Error('Invalid viewport class.');return profileId+'|'+viewport;}
function save(memory,profileId,geometry,width,height){const c=clamp(geometry,width,height),out={...(memory&&typeof memory==='object'?memory:{})};out[key(profileId,c.viewportClass)]={x:c.x,y:c.y,width:c.width,height:c.height};return Object.freeze(out);}
function restore(memory,profileId,width,height){const cls=viewportClass(width),stored=memory&&memory[key(profileId,cls)];return clamp(stored,width,height);}
function reset(memory,profileId,width,height){const cls=viewportClass(width),out={...(memory&&typeof memory==='object'?memory:{})};delete out[key(profileId,cls)];return Object.freeze({memory:Object.freeze(out),geometry:defaults(width,height)});}
return Object.freeze({CLASSES,viewportClass,defaults,clamp,key,save,restore,reset});
});
