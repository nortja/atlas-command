/* Atlas Command physical Earth detail. Simplified global reference vectors; no network access. Natural Earth is the intended public-domain cartographic basis for later full-resolution ingestion. */
(function(root,factory){'use strict';const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else{root.AtlasPhysicalEarth=api;root.addEventListener('atlas:ready',()=>api.mount(root),{once:true});}})(typeof window==='object'?window:globalThis,function(){
'use strict';const RAD=Math.PI/180,TAU=Math.PI*2;
const MOUNTAINS=Object.freeze([
 ['Andes',[[-78,7],[-78,-3],[-76,-10],[-70,-18],[-68,-25],[-70,-34],[-72,-43],[-71,-52]]],
 ['Rockies',[[-116,32],[-114,38],[-111,43],[-113,48],[-119,53],[-123,59],[-127,64]]],
 ['Himalaya',[[68,35],[73,35],[78,33],[83,29],[88,28],[94,29],[99,31]]],
 ['Alps',[[5,44.6],[7,45.6],[9,46.4],[11,47],[13,46.8],[15,46.3]]],
 ['Atlas',[[-10,31],[-6,32],[-2,34],[2,35],[7,36]]],
 ['Caucasus',[[38,43],[41,43.4],[44,43.2],[47,42.4]]],
 ['Zagros',[[43,30],[45,32],[47,34],[49,35.5],[51,37]]],
 ['Tien Shan',[[69,40],[74,42],[80,42.5],[86,43]]],
 ['Ethiopian Highlands',[[35,7],[37,9],[39,11],[40,13],[41,15]]],
 ['Great Dividing Range',[[145,-38],[148,-34],[150,-30],[151,-25],[149,-21],[146,-18]]]
]);
const RIVERS=Object.freeze([
 ['Nile',[[31.2,31.5],[31.0,28],[32.5,24],[33,20],[32,16],[31,12],[32,8],[30,3], [30,-1]]],
 ['Amazon',[[-79,-4],[-74,-5],[-69,-4],[-64,-4],[-59,-3],[-54,-2],[-50,-1]]],
 ['Mississippi',[[-95,47],[-93,44],[-91,40],[-90,36],[-91,32],[-90,29]]],
 ['Yangtze',[[91,33],[98,31],[104,30],[109,30],[114,30],[119,31],[122,31]]],
 ['Yellow',[[96,35],[102,36],[108,37],[111,35],[116,37],[119,37]]],
 ['Ganges-Brahmaputra',[[78,30],[82,27],[86,25],[89,24],[91,25],[94,29]]],
 ['Mekong',[[95,32],[99,28],[101,23],[102,19],[104,16],[105,12],[106,10]]],
 ['Congo',[[27,-11],[25,-7],[24,-2],[21,1],[17,-1],[13,-5],[12,-6]]],
 ['Danube',[[9,48],[14,48],[18,47],[22,45],[26,44],[29,45]]],
 ['Paraná',[[-55,-16],[-56,-21],[-57,-25],[-58,-30],[-59,-34]]],
 ['Volga',[[33,57],[39,55],[44,52],[47,49],[48,46]]],
 ['Niger',[[-10,11],[-6,13],[-2,16],[2,15],[6,12],[7,5]]],
 ['Lena',[[106,54],[111,58],[116,62],[123,66],[126,71]]]
]);
const LAKES=Object.freeze([
 ['Superior',47.7,-87.5,3.6,1.6],['Michigan',44,-87,1.5,3.2],['Huron',45,-82.5,2.1,2.4],['Erie',42.2,-81.3,2.5,1],['Ontario',43.7,-77.9,1.7,.8],
 ['Victoria',-1,33,2.6,2.1],['Tanganyika',-6,29.5,1.1,3.5],['Malawi',-12,34.5,1,3.3],['Baikal',53,108,1.3,3.8],['Titicaca',-15.8,-69.3,.9,1.2],['Ladoga',61.1,31.3,1.4,1],['Balkhash',46,74.5,2.6,.9],['Great Bear',66,-121,2.3,1.7],['Great Slave',61.5,-114,2.6,1.5],['Chad',13.2,14.3,1.2,.9]
]);
function pathVec(g,line){return line.map(([lon,lat])=>g.vec(lat,lon));}
function drawGeoLine(g,line,stroke,width,shadow){const ctx=g.ctx,pts=pathVec(g,line);ctx.beginPath();let active=false;for(const v of pts){const p=g.project(v);if(p.z>.025){if(active)ctx.lineTo(p.x,p.y);else ctx.moveTo(p.x,p.y);active=true;}else active=false;}if(shadow){ctx.save();ctx.shadowColor=shadow;ctx.shadowBlur=5;ctx.strokeStyle=stroke;ctx.lineWidth=width;ctx.stroke();ctx.restore();}else{ctx.strokeStyle=stroke;ctx.lineWidth=width;ctx.stroke();}}
function ellipsePoints(lat,lon,rx,ry){const out=[];for(let i=0;i<=28;i++){const a=i/28*TAU,cl=Math.max(.25,Math.cos(lat*RAD));out.push([lon+Math.cos(a)*rx/cl,lat+Math.sin(a)*ry]);}return out;}
function ring(lat){const out=[];for(let lon=-180;lon<=180;lon+=5)out.push([lon,lat]);return out;}
function paint(g,t){if(g.options.photoEarth)return;const ctx=g.ctx,R=g.radius;if(!R)return;ctx.save();ctx.beginPath();ctx.arc(g.cx,g.cy,R,0,TAU);ctx.clip();
 // Ocean depth cue and subtle latitude-driven polar ice reference.
 const deep=ctx.createRadialGradient(g.cx+R*.18,g.cy+R*.2,R*.25,g.cx,g.cy,R);deep.addColorStop(0,'rgba(2,30,52,.00)');deep.addColorStop(1,'rgba(0,10,25,.18)');ctx.fillStyle=deep;ctx.fillRect(g.cx-R,g.cy-R,R*2,R*2);
 for(const lat of [72,79,-72,-79])drawGeoLine(g,ring(lat),'rgba(230,244,247,'+(Math.abs(lat)>75?'.26':'.13')+')',Math.abs(lat)>75?5.5:2.8,'rgba(220,244,250,.15)');
 // Major mountain systems: dark relief foot plus snow/rock highlight. This is cartographic relief, not a DEM.
 for(const [name,line] of MOUNTAINS){drawGeoLine(g,line,'rgba(18,24,22,.48)',4.2,'rgba(0,0,0,.28)');drawGeoLine(g,line,name==='Himalaya'||name==='Andes'||name==='Rockies'?'rgba(224,230,211,.68)':'rgba(190,188,151,.54)',1.2,'rgba(238,240,218,.18)');}
 // Rivers and lakes remain visible at overview scale without overwhelming site markers.
 for(const [,line] of RIVERS)drawGeoLine(g,line,'rgba(87,177,213,.66)',Math.max(.65,R/520),'rgba(78,175,218,.22)');
 for(const [,lat,lon,rx,ry] of LAKES){const pts=ellipsePoints(lat,lon,rx,ry).map(([lo,la])=>g.project(g.vec(la,lo))).filter(p=>p.z>.03);if(pts.length<8)continue;ctx.beginPath();ctx.moveTo(pts[0].x,pts[0].y);for(let i=1;i<pts.length;i++)ctx.lineTo(pts[i].x,pts[i].y);ctx.closePath();ctx.fillStyle='rgba(40,129,166,.72)';ctx.fill();ctx.strokeStyle='rgba(130,211,229,.48)';ctx.lineWidth=.6;ctx.stroke();}
 ctx.restore();
 // Present-day celestial context outside the Earth disc. Moon marker shows phase context, not sky position.
 const context=window.AtlasWorkspace?.liveEarth?.context?.();if(context?.historical)return;const sun=window.AtlasLiveWeather?.solar?.(Date.now());if(sun){const p=g.project(sun.vector),dx=p.x-g.cx,dy=p.y-g.cy,len=Math.max(1,Math.hypot(dx,dy)),x=g.cx+dx/len*R*1.18,y=g.cy+dy/len*R*1.18;const glow=ctx.createRadialGradient(x,y,1,x,y,18);glow.addColorStop(0,'rgba(255,239,176,.98)');glow.addColorStop(.28,'rgba(255,210,101,.55)');glow.addColorStop(1,'rgba(255,185,79,0)');ctx.fillStyle=glow;ctx.beginPath();ctx.arc(x,y,18,0,TAU);ctx.fill();ctx.fillStyle='rgba(255,239,190,.95)';ctx.beginPath();ctx.arc(x,y,4.2,0,TAU);ctx.fill();ctx.font='9px Segoe UI';ctx.fillStyle='rgba(229,221,180,.76)';ctx.textAlign='center';ctx.fillText('SUN',x,y+29);
 const moon=window.AtlasCore?.moonPhase?.();if(moon){const a=Math.atan2(dy,dx)+Math.PI*.85+moon.phase*Math.PI*.55,mx=g.cx+Math.cos(a)*R*1.18,my=g.cy+Math.sin(a)*R*1.18;ctx.fillStyle='rgba(221,231,235,.88)';ctx.beginPath();ctx.arc(mx,my,5.2,0,TAU);ctx.fill();ctx.fillStyle='rgba(9,20,27,'+(0.25+Math.abs(.5-moon.illumination)*.7)+')';ctx.beginPath();ctx.arc(mx+(moon.phase<.5?2.5:-2.5),my,4.7,0,TAU);ctx.fill();ctx.font='9px Segoe UI';ctx.fillStyle='rgba(205,219,224,.72)';ctx.fillText('MOON '+Math.round(moon.illumination*100)+'%',mx,my+19);}}
 }
function mount(win){const app=win.AtlasWorkspace;if(!app?.liveEarth)return;app.liveEarth.renderer(paint,'physical-earth');}
return Object.freeze({MOUNTAINS,RIVERS,LAKES,paint,mount});
});
