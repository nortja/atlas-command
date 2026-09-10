/* ONVIF response parsing only. No network, credentials, discovery, or playback. */
(function(root,factory){'use strict';const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.AtlasFieldCameraOnvifParser=api;})(typeof window==='object'?window:globalThis,function(){
'use strict';
function text(v,max=1048576){if(typeof v!=='string')throw Error('ONVIF response must be text.');if(!v.trim())throw Error('ONVIF response is empty.');if(v.length>max)throw Error('ONVIF response is too large.');return v;}
function entities(s){return s.replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&apos;/g,"'").replace(/&amp;/g,'&');}
function tag(xml,name){const r=new RegExp('<(?:[A-Za-z0-9_-]+:)?'+name+'(?:\\s[^>]*)?>([\\s\\S]*?)<\\/(?:[A-Za-z0-9_-]+:)?'+name+'>','i'),m=xml.match(r);return m?entities(m[1].trim()):'';}
function attr(fragment,name){const r=new RegExp('\\b'+name+'\\s*=\\s*["\\']([^"\\']+)["\\']','i'),m=fragment.match(r);return m?entities(m[1].trim()):'';}
function all(xml,name){const r=new RegExp('<(?:[A-Za-z0-9_-]+:)?'+name+'(?:\\s[^>]*)?>([\\s\\S]*?)<\\/(?:[A-Za-z0-9_-]+:)?'+name+'>','ig'),out=[];let m;while((m=r.exec(xml)))out.push(m[0]);return out;}
function fault(xml){xml=text(xml);const f=all(xml,'Fault')[0];if(!f)return null;const reason=tag(f,'Text')||tag(f,'Reason')||tag(f,'faultstring')||'ONVIF service returned a fault.';return Object.freeze({reason:reason.slice(0,240)});}
function mediaXAddr(xml){xml=text(xml);const f=fault(xml);if(f)throw Error(f.reason);for(const block of all(xml,'Media')){const x=tag(block,'XAddr');if(x)return x;}const x=tag(xml,'XAddr');if(x)return x;throw Error('ONVIF media service address was not advertised.');}
function profiles(xml){xml=text(xml);const f=fault(xml);if(f)throw Error(f.reason);const out=[];const r=/<(?:[A-Za-z0-9_-]+:)?Profiles\b([^>]*)>([\s\S]*?)<\/(?:[A-Za-z0-9_-]+:)?Profiles>/ig;let m;while((m=r.exec(xml))){const token=attr(m[1],'token');if(!token)continue;const name=tag(m[2],'Name')||token;const enc=tag(m[2],'Encoding').toUpperCase();const width=Number(tag(m[2],'Width'))||null,height=Number(tag(m[2],'Height'))||null;out.push(Object.freeze({token,name,encoding:enc,width,height}));if(out.length>=32)break;}if(!out.length)throw Error('ONVIF returned no usable media profiles.');return Object.freeze(out);}
function streamUri(xml){xml=text(xml);const f=fault(xml);if(f)throw Error(f.reason);const uri=tag(xml,'Uri');if(!uri)throw Error('ONVIF stream URI is missing.');if(uri.length>2048)throw Error('ONVIF stream URI is too long.');return uri;}
function preferredProfile(list){if(!Array.isArray(list)||!list.length)throw Error('Media profiles are required.');const h264=list.filter(p=>String(p.encoding||'').toUpperCase()==='H264');const pool=h264.length?h264:list;return pool.slice().sort((a,b)=>((b.width||0)*(b.height||0))-((a.width||0)*(a.height||0)))[0];}
return Object.freeze({fault,mediaXAddr,profiles,streamUri,preferredProfile});
});
