/* Recording metadata model only. Does not start, stop, capture, encode, or upload media. */
(function(root,factory){'use strict';const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.AtlasFieldCameraRecordings=api;})(typeof window==='object'?window:globalThis,function(){
'use strict';
function text(v,max=240){if(v==null)return '';if(typeof v!=='string')throw Error('Recording metadata must be text.');const s=v.trim();if(s.length>max)throw Error('Recording metadata is too long.');if(/[\u0000-\u001f\u007f]/.test(s))throw Error('Recording metadata contains unsupported characters.');return s;}
function id(v,label){const s=text(v,200);if(!s)return '';if(!/^[A-Za-z0-9._:-]{1,200}$/.test(s))throw Error('Invalid '+label+' identifier.');return s;}
function stamp(v,label){const s=text(v,40);if(!s)return '';const ms=Date.parse(s);if(!Number.isFinite(ms))throw Error('Invalid '+label+' time.');return new Date(ms).toISOString();}
function cameraContext(camera){if(!camera||typeof camera!=='object'||Array.isArray(camera))throw Error('Camera profile is required.');const cameraId=id(camera.id,'camera');if(!cameraId)throw Error('Save the camera profile before recording.');return Object.freeze({cameraId,cameraName:text(camera.name,100),cameraLocation:text(camera.location,160),cameraHost:text(camera.host,253),linkedSiteId:id(camera.siteId,'site')});}
function createContext(input={}){
 const c=cameraContext(input.camera),site=input.site&&typeof input.site==='object'?input.site:null,mission=input.mission&&typeof input.mission==='object'?input.mission:null;
 const selectedSiteId=site?id(site.id,'site'):'',selectedMissionId=mission?id(mission.id,'mission'):'';
 const linkedSiteId=c.linkedSiteId||selectedSiteId;
 if(c.linkedSiteId&&selectedSiteId&&c.linkedSiteId!==selectedSiteId)throw Error('Selected site does not match this camera link.');
 const startedAt=stamp(input.startedAt,'recording start')||new Date().toISOString();
 const out={schemaVersion:1,cameraId:c.cameraId,cameraName:c.cameraName,cameraLocation:c.cameraLocation,linkedSiteId,linkedSiteName:linkedSiteId&&site&&selectedSiteId===linkedSiteId?text(site.name,240):'',missionId:selectedMissionId,missionName:selectedMissionId?text(mission.name,240):'',startedAt,endedAt:'',status:'recording',audioIncluded:Boolean(input.audioIncluded),source:'field-camera'};
 return Object.freeze(out);
}
function finish(context,endedAt){if(!context||context.schemaVersion!==1||context.status!=='recording')throw Error('Active recording context is required.');const end=stamp(endedAt,'recording end');if(!end)throw Error('Recording end time is required.');if(Date.parse(end)<Date.parse(context.startedAt))throw Error('Recording end cannot precede start.');return Object.freeze({...context,endedAt:end,status:'complete'});}
return Object.freeze({cameraContext,createContext,finish});
});
