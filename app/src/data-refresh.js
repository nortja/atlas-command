/* Data refresh policy, not an executable/software updater. All adapters are bundled.
   A daily selection is a 24-hour cache interval while the app is open, not an OS task. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.AtlasDataRefresh=api;})(typeof window==='object'?window:globalThis,function(){
'use strict';
const HOUR=3600000;
const PROFILES=Object.freeze({
 balanced:Object.freeze({label:'Balanced',point:20*60000,global:3*HOUR,detail:'Selected area: 20 minutes · Global model: 3 hours'}),
 hourly:Object.freeze({label:'Hourly local',point:HOUR,global:3*HOUR,detail:'Selected area: 1 hour · Global model: 3 hours'}),
 daily:Object.freeze({label:'Daily',point:24*HOUR,global:24*HOUR,detail:'Selected area and global model: 24 hours; older weather is marked stale'}),
 manual:Object.freeze({label:'Manual only',point:Infinity,global:Infinity,detail:'No automatic weather requests. Use Refresh or Refresh weather now.'})
});
function choice(value){return typeof value==='string'&&Object.prototype.hasOwnProperty.call(PROFILES,value)?value:'balanced';}
function profile(value){return PROFILES[choice(value)];}
function interval(value,kind){if(!['point','global'].includes(kind))throw Error('Unknown refresh channel.');return profile(value)[kind];}
return Object.freeze({PROFILES,choice,profile,interval});
});
