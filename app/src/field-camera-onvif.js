/* ONVIF request planning only. No network, discovery, credentials or playback. */
(function(root,factory){'use strict';const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.AtlasFieldCameraOnvif=api;})(typeof window==='object'?window:globalThis,function(){
'use strict';
const DEFAULT_PATH='/onvif/device_service';
function cleanHost(v){if(typeof v!=='string'||!v.trim())throw Error('Camera host is required.');const s=v.trim();if(/[\s/@?#\\]/.test(s))throw Error('Use only a camera IP address or hostname.');return s.toLowerCase();}
function port(v){if(v==null||v==='')return null;const n=Number(v);if(!Number.isInteger(n)||n<1||n>65535)throw Error('ONVIF port must be between 1 and 65535.');return n;}
function servicePath(v){if(v==null||v==='')return DEFAULT_PATH;if(typeof v!=='string')throw Error('ONVIF service path must be text.');const s=v.trim();if(!s.startsWith('/')||s.startsWith('//')||/[?#@\\\s]/.test(s))throw Error('ONVIF service path must be a local path only.');return s;}
function endpoint(profile,scheme='http'){
 if(!profile||typeof profile!=='object'||Array.isArray(profile))throw Error('Saved camera profile is required.');
 const host=cleanHost(profile.host),p=port(profile.port),path=servicePath(profile.path&&profile.method==='onvif'?profile.path:'');
 if(scheme!=='http'&&scheme!=='https')throw Error('Unsupported ONVIF scheme.');
 const bracket=host.includes(':')&&!host.startsWith('[')?'['+host+']':host;
 return Object.freeze({scheme,host,port:p,path,url:scheme+'://'+bracket+(p?':'+p:'')+path});
}
function automaticCandidates(profile){
 const base=endpoint(profile,'http'),out=[];
 if(base.port)out.push(base);
 else {out.push(endpoint(profile,'http'));out.push(endpoint(profile,'https'));}
 const seen=new Set();return Object.freeze(out.filter(x=>{if(seen.has(x.url))return false;seen.add(x.url);return true;}));
}
function soapEnvelope(action,body=''){
 if(typeof action!=='string'||!/^http:\/\/www\.onvif\.org\//.test(action))throw Error('ONVIF action is required.');
 if(typeof body!=='string')throw Error('ONVIF body must be text.');
 return `<?xml version="1.0" encoding="UTF-8"?><s:Envelope xmlns:s="http://www.w3.org/2003/05/soap-envelope"><s:Body>${body}</s:Body></s:Envelope>`;
}
function getCapabilitiesEnvelope(){return soapEnvelope('http://www.onvif.org/ver10/device/wsdl/GetCapabilities','<tds:GetCapabilities xmlns:tds="http://www.onvif.org/ver10/device/wsdl"><tds:Category>Media</tds:Category></tds:GetCapabilities>');}
function getProfilesEnvelope(){return soapEnvelope('http://www.onvif.org/ver10/media/wsdl/GetProfiles','<trt:GetProfiles xmlns:trt="http://www.onvif.org/ver10/media/wsdl"/>');}
function validateAdvertisedUri(uri,expectedHost){
 if(typeof uri!=='string'||uri.length>2048)throw Error('Invalid advertised media URI.');let u;try{u=new URL(uri);}catch{throw Error('Invalid advertised media URI.');}
 if(!['rtsp:','rtsps:','http:','https:'].includes(u.protocol))throw Error('Unsupported advertised media URI scheme.');
 if(u.username||u.password)throw Error('Credential-bearing media URIs are not accepted.');
 const host=cleanHost(expectedHost);if(u.hostname.toLowerCase()!==host.replace(/^\[|\]$/g,''))throw Error('Advertised media URI points to a different host.');
 return Object.freeze({scheme:u.protocol.slice(0,-1),host:u.hostname,port:u.port?Number(u.port):null,path:u.pathname});
}
return Object.freeze({DEFAULT_PATH,endpoint,automaticCandidates,soapEnvelope,getCapabilitiesEnvelope,getProfilesEnvelope,validateAdvertisedUri});
});
