/* Offline policy rehearsal only. No proof, wallet, storage or transport access. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.AtlasMidnightReadiness=api;})(typeof window==='object'?window:globalThis,function(){'use strict';
const freeze=v=>{if(v&&typeof v==='object'){Object.values(v).forEach(freeze);Object.freeze(v);}return v;};
const CASES=freeze({
 contribution:{title:'Contribution receipt',purpose:'Rehearse acknowledgment of an explicitly public example contribution.',units:2,fields:[['exampleKind','synthetic contribution'],['reviewResult','example reviewed']],audience:'Hypothetical public contract and its readers',local:'Actual research, site identifiers, notes, coordinates and files stay outside this example.',risk:'A real public receipt may link actions over time. No site hash is generated here.'},
 membership:{title:'Membership claim',purpose:'Rehearse explaining a limited membership claim before authorization.',units:3,fields:[['exampleKind','synthetic membership'],['claim','example eligible']],audience:'Hypothetical verifier; any public contract fields need separate review',local:'Actual names, team identity, member roles and credentials stay outside this example.',risk:'A real proof needs a reviewed circuit and authenticated membership. This example proves nothing.'},
 consent:{title:'Consent acknowledgment',purpose:'Rehearse a narrowly described consent acknowledgment.',units:1,fields:[['exampleKind','synthetic consent'],['policy','example policy v1']],audience:'Hypothetical public contract and its readers',local:'Actual consent preferences, user identity and private activity stay outside this example.',risk:'Withdrawing future consent cannot erase a prior public record or another party’s copy.'}
});
const CAPABILITIES=freeze({mode:'offline-rehearsal',walletConnected:false,proofsAvailable:false,networkEnabled:false,sponsorshipLive:false});
function fault(){return Error('Offline rehearsal input is invalid.');}
function blocked(){return Promise.reject(Error('Midnight is not connected. No action was sent.'));}
const transport=Object.freeze({status:()=>({...CAPABILITIES}),connect:blocked,prove:blocked,submit:blocked});
function createSession({now=()=>performance.now()}={}){
 let scenario='contribution',policy={paused:true,budget:10,perAction:3},used=0,version=0,review=null,events=[],lastTime=-Infinity;
 function time(){const n=now();if(!Number.isFinite(n)||n<lastTime){review=null;throw fault();}lastTime=n;return n;}
 function event(action){events.push({action});if(events.length>40)events.shift();}
 function invalidate(){version++;review=null;}
 function snapshot(){const t=time();if(review&&t>=review.expires){review=null;event('review-expired');}return freeze({mode:CAPABILITIES.mode,scenario,example:CASES[scenario],policy:{...policy},used,remaining:Math.max(0,policy.budget-used),reviewed:!!review,secondsLeft:review?Math.ceil((review.expires-t)/1000):0,events:events.map(e=>({...e}))});}
 return Object.freeze({
  snapshot,
  choose(id){invalidate();if(typeof id!=='string'||!Object.hasOwn(CASES,id))throw fault();scenario=id;event('example-changed');return snapshot();},
  configure(value){invalidate();if(!value||Object.keys(value).sort().join(',')!=='budget,paused,perAction'||typeof value.paused!=='boolean'||!Number.isInteger(value.budget)||value.budget<0||value.budget>1000||!Number.isInteger(value.perAction)||value.perAction<0||value.perAction>100)throw fault();policy={paused:value.paused,budget:value.budget,perAction:value.perAction};event('policy-changed');return snapshot();},
  review(acknowledged){review=null;if(acknowledged!==true)throw fault();const t=time();review={version,expires:t+120000};event('example-reviewed');return snapshot();},
  cancel(){invalidate();event('review-cancelled');return snapshot();},
  rehearse(){const s=snapshot();if(!review||review.version!==version)return freeze({outcome:'review-required',liveAction:false,proofCreated:false,sentFields:[]});review=null;let outcome='example-allowed';if(s.policy.paused)outcome='sponsor-paused';else if(s.example.units>s.policy.perAction)outcome='per-action-limit';else if(s.example.units>s.remaining)outcome='capacity-exhausted';else used+=s.example.units;event(outcome);return freeze({outcome,liveAction:false,proofCreated:false,sentFields:[]});},
  reset(){scenario='contribution';policy={paused:true,budget:10,perAction:3};used=0;invalidate();events=[];return snapshot();}
 });
}
return Object.freeze({cases:CASES,capabilities:()=>({...CAPABILITIES}),transport,createSession});
});
