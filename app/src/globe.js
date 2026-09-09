/* Dependency-free orthographic 3D globe. All basemap assets are local.
   This is an overview renderer, not a terrain, weather or astronomical model. */
(function(){'use strict';
const RAD=Math.PI/180,TAU=Math.PI*2;
class Globe{
 constructor(canvas,world,{onSelect,onHover}){
  this.canvas=canvas;this.ctx=canvas.getContext('2d',{alpha:true});this.onSelect=onSelect;this.onHover=onHover;
  this.lat=22;this.lon=18;this.zoom=1;this.spin=!matchMedia('(prefers-reduced-motion: reduce)').matches;this.reduced=!this.spin;this.options={grid:true,atmosphere:false,concept:false,labels:true,stars:true};this.sites=[];this.hits=[];this.selected=null;this.drag=null;this.target=null;
  const xyz=([lo,la])=>{lo*=RAD;la*=RAD;return [Math.cos(la)*Math.cos(lo),Math.sin(la),Math.cos(la)*Math.sin(lo)];};
  this.coasts=world.coasts.map(r=>r.map(xyz));this.dots=world.dots.map(xyz);this.grids=[];
  for(let lat=-60;lat<=60;lat+=30){let line=[];for(let lon=-180;lon<=180;lon+=3)line.push(xyz([lon,lat]));this.grids.push(line);}
  for(let lon=-180;lon<180;lon+=30){let line=[];for(let lat=-90;lat<=90;lat+=3)line.push(xyz([lon,lat]));this.grids.push(line);}
  let seed=12;const rnd=()=>{seed=(seed*16807)%2147483647;return (seed-1)/2147483646;};this.stars=Array.from({length:190},()=>({x:rnd(),y:rnd(),r:rnd()*.9+.2,a:rnd()*.45+.12}));
  new ResizeObserver(()=>this.resize()).observe(canvas.parentElement);this.resize();this.events();this.last=performance.now();requestAnimationFrame(t=>this.tick(t));
 }
 resize(){const box=this.canvas.getBoundingClientRect();this.w=box.width;this.h=box.height;this.dpr=Math.min(devicePixelRatio||1,2);this.canvas.width=Math.round(this.w*this.dpr);this.canvas.height=Math.round(this.h*this.dpr);this.ctx.setTransform(this.dpr,0,0,this.dpr,0,0);}
 vec(lat,lon){return [Math.cos(lat*RAD)*Math.cos(lon*RAD),Math.sin(lat*RAD),Math.cos(lat*RAD)*Math.sin(lon*RAD)];}
 project(v){const x=v[2]*this.cl-v[0]*this.sl,z0=v[0]*this.cl+v[2]*this.sl,y=v[1]*this.cp-z0*this.sp,z=v[1]*this.sp+z0*this.cp;return {x:this.cx+x*this.radius,y:this.cy-y*this.radius,z};}
 setSites(sites){this.sites=sites.map(s=>({...s,v:this.vec(s.lat,s.lon)}));}
 focus(site){this.selected=site.id;this.target={lat:site.lat,lon:site.lon};this.spin=false;}
 home(){this.target={lat:22,lon:18};this.zoom=1;}
 events(){
  const c=this.canvas;
  c.addEventListener('pointerdown',e=>{if(e.button!==0)return;this.drag={x:e.clientX,y:e.clientY,ox:e.clientX,oy:e.clientY};this.spin=false;this.target=null;c.setPointerCapture(e.pointerId);});
  c.addEventListener('pointermove',e=>{const b=c.getBoundingClientRect(),x=e.clientX-b.left,y=e.clientY-b.top;
   if(this.drag){this.lon-=(e.clientX-this.drag.x)*.25/this.zoom;this.lat=Math.max(-85,Math.min(85,this.lat+(e.clientY-this.drag.y)*.2/this.zoom));this.drag.x=e.clientX;this.drag.y=e.clientY;return;}
   let hit=this.findHit(x,y);c.style.cursor=hit?'pointer':'grab';this.hover=hit?.id||null;this.onHover?.(hit,x,y);
  });
  c.addEventListener('pointerup',e=>{if(!this.drag)return;let d=Math.hypot(e.clientX-this.drag.ox,e.clientY-this.drag.oy);this.drag=null;try{c.releasePointerCapture(e.pointerId);}catch{}if(d<8){const b=c.getBoundingClientRect(),s=this.findHit(e.clientX-b.left,e.clientY-b.top);if(s){this.focus(s);this.onSelect?.(s);}}});
  c.addEventListener('pointercancel',()=>{this.drag=null;});c.addEventListener('pointerleave',()=>{this.hover=null;this.onHover?.(null);});
  c.addEventListener('wheel',e=>{e.preventDefault();this.zoom=Math.max(.6,Math.min(2.5,this.zoom*(e.deltaY>0?.93:1.07)));},{passive:false});
  c.addEventListener('keydown',e=>{const delta=7;if(e.key==='ArrowLeft')this.lon-=delta;else if(e.key==='ArrowRight')this.lon+=delta;else if(e.key==='ArrowUp')this.lat=Math.min(85,this.lat+delta);else if(e.key==='ArrowDown')this.lat=Math.max(-85,this.lat-delta);else if(e.key==='+')this.zoom=Math.min(2.5,this.zoom*1.1);else if(e.key==='-')this.zoom=Math.max(.6,this.zoom*.9);else return;this.spin=false;this.target=null;e.preventDefault();});
 }
 findHit(x,y){return this.hits.filter(s=>Math.hypot(s.p.x-x,s.p.y-y)<18).sort((a,b)=>Math.hypot(a.p.x-x,a.p.y-y)-Math.hypot(b.p.x-x,b.p.y-y))[0];}
 tick(t){const dt=Math.min(.06,(t-this.last)/1000);this.last=t;
  if(!document.hidden){if(this.target){let dl=((((this.target.lon-this.lon)%360)+540)%360)-180;this.lon+=dl*Math.min(1,dt*4);this.lat+=(this.target.lat-this.lat)*Math.min(1,dt*4);if(Math.abs(dl)<.03&&Math.abs(this.target.lat-this.lat)<.03)this.target=null;}
   else if(this.spin&&!this.drag&&!this.hover&&!this.reduced)this.lon+=dt*1.2;
   if(!this.frameAt||t-this.frameAt>32){this.frameAt=t;this.draw(t);}}
  requestAnimationFrame(x=>this.tick(x));
 }
 line(points,color,width=1,back=false){const ctx=this.ctx;ctx.strokeStyle=color;ctx.lineWidth=width;ctx.beginPath();let was=false;for(const v of points){const p=this.project(v),ok=back?p.z<=0:p.z>0;if(ok){if(was)ctx.lineTo(p.x,p.y);else ctx.moveTo(p.x,p.y);}was=ok;}ctx.stroke();}
 draw(t){
  if(this.w<=0||this.h<=0)return;let ctx=this.ctx,W=this.w,H=this.h;ctx.clearRect(0,0,W,H);
  this.cx=W/2;this.cy=H*(W<950?.56:.55);this.radius=Math.min(H*.365,W*(W<950?.34:.248))*this.zoom;
  let R=this.radius;this.cl=Math.cos(this.lon*RAD);this.sl=Math.sin(this.lon*RAD);this.cp=Math.cos(this.lat*RAD);this.sp=Math.sin(this.lat*RAD);
  if(this.options.stars){for(const s of this.stars){ctx.fillStyle=`rgba(171,209,224,${s.a})`;ctx.beginPath();ctx.arc(s.x*W,s.y*H,s.r,0,TAU);ctx.fill();}}
  // Wide halo, wirework and illuminated edge: an intentionally stylized instrument view.
  let halo=ctx.createRadialGradient(this.cx,this.cy,R*.88,this.cx,this.cy,R*1.36);halo.addColorStop(0,'#58c2e300');halo.addColorStop(.33,'#55b7d419');halo.addColorStop(.65,'#30709009');halo.addColorStop(1,'#204c7000');ctx.fillStyle=halo;ctx.fillRect(this.cx-R*1.4,this.cy-R*1.4,R*2.8,R*2.8);
  ctx.save();ctx.translate(this.cx,this.cy);ctx.rotate(-.25);ctx.strokeStyle='#77aabc28';ctx.lineWidth=.8;ctx.beginPath();ctx.ellipse(0,0,R*1.18,R*.35,0,0,TAU);ctx.stroke();ctx.rotate(.54);ctx.beginPath();ctx.ellipse(0,0,R*1.11,R*.41,0,0,TAU);ctx.stroke();ctx.restore();
  const sphere=ctx.createRadialGradient(this.cx-R*.3,this.cy-R*.3,R*.12,this.cx,this.cy,R);sphere.addColorStop(0,'#143a4ce8');sphere.addColorStop(.6,'#0b2534ee');sphere.addColorStop(.92,'#091f2de8');sphere.addColorStop(1,'#1b4859f0');ctx.fillStyle=sphere;ctx.beginPath();ctx.arc(this.cx,this.cy,R,0,TAU);ctx.fill();
  if(this.options.grid){for(const line of this.grids)this.line(line,'#41607120',.65,true);for(const line of this.grids)this.line(line,'#53819536',.7);}
  for(const line of this.coasts)this.line(line,'#72c5d6a0',.72);
  for(const v of this.dots){const p=this.project(v);if(p.z<0)continue;ctx.fillStyle=p.z>.65?'#74bac79a':p.z>.3?'#559caf80':'#356c8060';ctx.beginPath();ctx.arc(p.x,p.y,.65+Math.max(0,p.z)*.35,0,TAU);ctx.fill();}
  if(this.options.atmosphere){ctx.save();ctx.beginPath();ctx.arc(this.cx,this.cy,R,0,TAU);ctx.clip();for(let n=0;n<5;n++){ctx.strokeStyle='#c0e7ed0a';ctx.lineWidth=R*.04;ctx.beginPath();for(let k=0;k<100;k++){const x=this.cx-R+k*R/50,y=this.cy+R*(n*.3-.65)+Math.sin(k*.06+n+(this.reduced?0:t*.00003))*R*.15;if(k===0)ctx.moveTo(x,y);else ctx.lineTo(x,y);}ctx.stroke();}ctx.restore();}
  if(this.environmentRenderer){this.ctx.save();try{this.environmentRenderer(this,t);}finally{this.ctx.restore();}}
  ctx.strokeStyle='#8bdded9a';ctx.lineWidth=1.1;ctx.beginPath();ctx.arc(this.cx,this.cy,R,0,TAU);ctx.stroke();ctx.strokeStyle='#599aad20';ctx.beginPath();ctx.arc(this.cx,this.cy,R*1.022,0,TAU);ctx.stroke();
  if(this.options.concept){ctx.save();ctx.setLineDash([3,6]);ctx.strokeStyle='#e9c57255';for(let n=0;n<4;n++){ctx.beginPath();ctx.ellipse(this.cx,this.cy,R*(.4+n*.25),R*1.3,-.2,0,TAU);ctx.stroke();}ctx.setLineDash([]);ctx.fillStyle='#e9c572';ctx.font='10px "Segoe UI", Arial, sans-serif';ctx.textAlign='center';ctx.fillText('CONCEPT DIAGRAM · NOT A MAGNETIC FIELD MODEL',this.cx,this.cy+R*1.34);ctx.restore();}
  this.hits=[];let front=this.sites.map(s=>({...s,p:this.project(s.v)})).filter(s=>s.p.z>.07).sort((a,b)=>a.p.z-b.p.z);
  for(const s of front){const p=s.p,active=s.id===this.selected,col=AtlasCore.COLORS[s.mystery]||'#b5c7d1',r=active?6.0:4.0;this.hits.push(s);ctx.save();ctx.translate(p.x,p.y);ctx.shadowBlur=active?17:8;ctx.shadowColor=col;ctx.fillStyle=col;ctx.beginPath();if(s.category==='lidar'){ctx.moveTo(0,-r*1.4);ctx.lineTo(r*1.4,0);ctx.lineTo(0,r*1.4);ctx.lineTo(-r*1.4,0);ctx.closePath();}else ctx.arc(0,0,r,0,TAU);ctx.fill();ctx.shadowBlur=0;
   if(active||s.id===this.hover){ctx.strokeStyle=col+'80';ctx.lineWidth=.9;ctx.beginPath();ctx.arc(0,0,active?12:9,0,TAU);ctx.stroke();if(!this.reduced){ctx.strokeStyle=col+'30';ctx.beginPath();ctx.arc(0,0,14+(t%2400)/2400*8,0,TAU);ctx.stroke();}}
   ctx.restore();
  }
  if(this.options.labels){const boxes=[];let labels=front.filter(s=>s.id===this.selected||s.p.z>.79).sort((a,b)=>(b.id===this.selected)-(a.id===this.selected)||b.p.z-a.p.z).slice(0,6);for(const s of labels){let name=s.name.split(' · ')[0];if(name.length>28)name=name.slice(0,26)+'…';ctx.font='11px "Segoe UI", Arial, sans-serif';const tw=ctx.measureText(name).width,x=s.p.x+12;let y=s.p.y-9,box,ok=false;for(let n=0;n<4;n++){y=s.p.y-9+n*23;box={x:x-5,y:y-12,w:tw+10,h:21};if(!boxes.some(b=>box.x<b.x+b.w+4&&box.x+box.w>b.x-4&&box.y<b.y+b.h+3&&box.y+box.h>b.y-3)){ok=true;break;}}if(!ok)continue;boxes.push(box);if(Math.abs(y-(s.p.y-9))>10){ctx.strokeStyle='#829cab60';ctx.lineWidth=.7;ctx.beginPath();ctx.moveTo(s.p.x+5,s.p.y);ctx.lineTo(x-7,y-2);ctx.stroke();}ctx.fillStyle='#07141ce9';ctx.fillRect(box.x,box.y,box.w,box.h);ctx.fillStyle=s.id===this.selected?'#e6d8b3':'#b3c8d2';ctx.textAlign='left';ctx.fillText(name,x,y+2);}}
  // Small instrument ticks on the rim, not a latitude-based magnetic representation.
  for(let i=0;i<72;i++){let a=i*TAU/72;ctx.strokeStyle=i%6===0?'#73a8bd80':'#45677840';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(this.cx+Math.cos(a)*R*1.065,this.cy+Math.sin(a)*R*1.065);ctx.lineTo(this.cx+Math.cos(a)*R*(i%6===0?1.087:1.075),this.cy+Math.sin(a)*R*(i%6===0?1.087:1.075));ctx.stroke();}
 }
}
window.AtlasGlobe=Globe;
})();
