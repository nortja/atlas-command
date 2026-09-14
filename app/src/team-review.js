/* Pure local review helpers. Inputs must already be authorized by the vault. */
(function(root,factory){const api=factory();if(typeof module==='object')module.exports=api;else root.AtlasTeamReview=api;})(globalThis,function(){
'use strict';
const normalize=s=>String(s||'').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase();
function select(records,{kind,query='',visibility='all',status='all'}={}){
  const needle=normalize(query.slice(0,200));
  return records.filter(r=>(!kind||r.kind===kind)&&(visibility==='all'||r.visibility===visibility)&&(status==='all'||r.status===status)&&(!needle||normalize([r.site,...r.versions.map(v=>v.body)].join('\n')).includes(needle))).slice().reverse();
}
function diff(before,after){
  if(before===after)return [{type:'same',text:before}];
  const a=before.split('\n'),b=after.split('\n');
  // Bounded work even for text made entirely of newlines.
  if(a.length>200||b.length>200)return [{type:'removed',text:before},{type:'added',text:after}];
  const width=b.length+1,table=new Uint16Array((a.length+1)*width);
  for(let i=a.length-1;i>=0;i--)for(let j=b.length-1;j>=0;j--)table[i*width+j]=a[i]===b[j]?1+table[(i+1)*width+j+1]:Math.max(table[(i+1)*width+j],table[i*width+j+1]);
  const rows=[];let i=0,j=0;
  while(i<a.length||j<b.length){if(i<a.length&&j<b.length&&a[i]===b[j]){rows.push({type:'same',text:a[i++]});j++;}else if(i<a.length&&(j===b.length||table[(i+1)*width+j]>=table[i*width+j+1]))rows.push({type:'removed',text:a[i++]});else rows.push({type:'added',text:b[j++]});}
  return rows;
}
function memberRoles(role,targetRole){if(role==='Owner'&&targetRole!=='Owner')return ['Admin','Researcher','Viewer'];if(role==='Admin'&&!['Owner','Admin'].includes(targetRole))return ['Researcher','Viewer'];return [];}
function auditPage(events,{role='all',action='all',page=0}={}){const matching=events.filter(a=>(role==='all'||a.role===role)&&(action==='all'||a.action===action)).slice().reverse(),pages=Math.max(1,Math.ceil(matching.length/50));page=Math.max(0,Math.min(Number.isSafeInteger(page)?page:0,pages-1));return {events:matching.slice(page*50,page*50+50),page,pages,total:matching.length};}
function inactivity({now=()=>performance.now(),onLock,idleMs=600000,hiddenMs=60000}){
  let active=false,last=0,hiddenAt=null;
  function check(){if(active&&(now()-last>=idleMs||(hiddenAt!==null&&now()-hiddenAt>=hiddenMs))){active=false;onLock();return false;}return active;}
  return Object.freeze({start(){if(!active){active=true;last=now();hiddenAt=null;}},stop(){active=false;hiddenAt=null;},touch(){if(check())last=now();},hidden(value){if(!check())return;if(value){if(hiddenAt===null)hiddenAt=now();}else hiddenAt=null;},check});
}
const auditLabels=Object.freeze({workspace_created:'Workspace created',legacy_migrated:'Earlier workspace upgraded',record_created:'Research saved',record_revised:'Research revised',visibility_changed:'Visibility changed',proposal_created:'Edit proposed',proposal_approved:'Proposal approved',proposal_rejected:'Proposal rejected',file_added:'File added',file_revised:'File revised',file_export:'File downloaded',member_enrolled:'Member activated',member_role_changed:'Member role changed',member_removed:'Member removed',backup_export:'Encrypted backup exported',backup_import:'Encrypted backup restored',passphrase_changed:'Passphrase changed'});
return Object.freeze({select,diff,memberRoles,inactivity,auditLabels,auditPage});
});
