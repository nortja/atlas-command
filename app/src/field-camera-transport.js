/* Private camera transport contract. Pure validation/data only; no sockets, DNS, fetch, credentials, or playback. */
(function(root,factory){'use strict';const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.AtlasFieldCameraTransport=api;})(typeof window==='object'?window:globalThis,function(){
'use strict';
const SCHEMES=Object.freeze(['http','https','rtsp','rtsps']);
const PURPOSES=Object.freeze(['route-test','onvif-service','media-stream']);
function host(v){if(typeof v!=='string'||!v.trim())throw Error('Camera host is required.');const s=v.trim().toLowerCase();if(/[\s/@?#\\]/.test(s))throw Error('Use only the saved camera IP address or hostname.');return s.replace(/^\[|\]$/g,'');}
function port(v){const n=Number(v);if(!Number.isInteger(n)||n<1||n>65535)throw Error('Camera port must be between 1 and 65535.');return n;}
function path(v){if(v==null||v==='')return '/';if(typeof v!=='string')throw Error('Camera path must be text.');const s=v.trim();if(!s.startsWith('/')||s.startsWith('//')||/[?#@\\\s]/.test(s))throw Error('Camera path must be a local path without credentials or query tokens.');return s;}
function profile(profile){if(!profile||typeof profile!=='object'||Array.isArray(profile))throw Error('Saved camera profile is required.');if(typeof profile.id!=='string'||!/^cam-[A-Za-z0-9-]{1,90}$/.test(profile.id))throw Error('Saved camera profile identifier is required.');return Object.freeze({profileId:profile.id,host:host(profile.host)});}
function request(profileInput,input={}){
 const p=profile(profileInput),purpose=input.purpose,scheme=String(input.scheme||'').toLowerCase();
 if(!PURPOSES.includes(purpose))throw Error('Unknown camera transport purpose.');if(!SCHEMES.includes(scheme))throw Error('Unsupported camera transport scheme.');
 const targetHost=host(input.host);if(targetHost!==p.host)throw Error('Camera transport target must match the saved camera host.');
 const targetPort=port(input.port),targetPath=path(input.path),timeoutMs=Number(input.timeoutMs??5000);
 if(!Number.isInteger(timeoutMs)||timeoutMs<1000||timeoutMs>15000)throw Error('Camera transport timeout must be between 1000 and 15000 ms.');
 if(purpose==='route-test'&&targetPath!=='/')throw Error('Route tests do not use a camera path.');
 if(purpose==='onvif-service'&&!['http','https'].includes(scheme))throw Error('ONVIF service checks require HTTP or HTTPS.');
 if(purpose==='media-stream'&&!['rtsp','rtsps','http','https'].includes(scheme))throw Error('Unsupported media transport.');
 return Object.freeze({schemaVersion:1,profileId:p.profileId,host:p.host,scheme,port:targetPort,path:targetPath,purpose,timeoutMs,resolveOnce:true,allowRedirects:false,scanNetwork:false,sendCredentials:false});
}
function routeCandidates(profileInput,onvifCandidates=[]){const p=profile(profileInput);if(!Array.isArray(onvifCandidates)||onvifCandidates.length<1||onvifCandidates.length>2)throw Error('Use one or two explicit ONVIF candidates only.');const seen=new Set(),out=[];for(const c of onvifCandidates){if(!c||typeof c!=='object')throw Error('Invalid ONVIF candidate.');const scheme=String(c.scheme||'').toLowerCase(),targetHost=host(c.host);if(targetHost!==p.host)throw Error('ONVIF candidate host changed.');let n=c.port;if(n==null||n==='')n=scheme==='https'?443:80;n=port(n);const key=scheme+':'+n;if(seen.has(key))continue;seen.add(key);out.push(request(profileInput,{purpose:'route-test',scheme,host:targetHost,port:n,path:'/',timeoutMs:4000}));}return Object.freeze(out);}
return Object.freeze({SCHEMES,PURPOSES,profile,request,routeCandidates});
});
