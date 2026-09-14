/* Offline NASA Blue Marble, orthographic texture projection matching AtlasGlobe.
   Satellite mosaic reference only, not live imagery or terrain elevation. */
(function(win){'use strict';if(!win.document)return;
const BLUE_MARBLE='assets/earth-blue-marble-2048.png';
const RAD=Math.PI/180;
function moonIcon(phase){return ['🌑','🌒','🌓','🌔','🌕','🌖','🌗','🌘'][Math.round((((phase%1)+1)%1)*8)%8];}
function createRenderer(canvas){
 const gl=canvas.getContext('webgl',{alpha:true,antialias:false,depth:false,premultipliedAlpha:false});if(!gl)return null;
 function shader(type,source){const s=gl.createShader(type);gl.shaderSource(s,source);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS)){gl.deleteShader(s);throw Error('Earth renderer unavailable');}return s;}
 const vertex=shader(gl.VERTEX_SHADER,'attribute vec2 position;varying vec2 point;void main(){point=position;gl_Position=vec4(position,0.,1.);}');
 const fragment=shader(gl.FRAGMENT_SHADER,`precision highp float;
 varying vec2 point;uniform sampler2D earth;uniform vec2 angle;
 void main(){float rr=dot(point,point);if(rr>=1.){gl_FragColor=vec4(0.);return;}
 float z=sqrt(1.-rr),cp=cos(angle.x),sp=sin(angle.x),cl=cos(angle.y),sl=sin(angle.y);
 float y=point.y*cp+z*sp,z0=z*cp-point.y*sp;
 vec3 world=vec3(z0*cl-point.x*sl,y,z0*sl+point.x*cl);
 vec2 uv=vec2(atan(world.z,world.x)/6.28318530718+.5,.5-asin(clamp(world.y,-1.,1.))/3.14159265359);
 vec3 color=texture2D(earth,uv).rgb;
 float limb=pow(z,.24);color*=.68+.32*limb;
 color+=vec3(.10,.32,.47)*pow(1.-z,4.)*.24;
 gl_FragColor=vec4(color,1.-smoothstep(.997,1.,rr));}`);
 const program=gl.createProgram();gl.attachShader(program,vertex);gl.attachShader(program,fragment);gl.linkProgram(program);gl.deleteShader(vertex);gl.deleteShader(fragment);
 if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error('Earth renderer unavailable');
 gl.useProgram(program);const buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),gl.STATIC_DRAW);
 const position=gl.getAttribLocation(program,'position');gl.enableVertexAttribArray(position);gl.vertexAttribPointer(position,2,gl.FLOAT,false,0,0);
 const texture=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,texture);const angle=gl.getUniformLocation(program,'angle');
 return {upload(image){gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,false);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,image);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.REPEAT);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR_MIPMAP_LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.generateMipmap(gl.TEXTURE_2D);if(gl.getError()!==gl.NO_ERROR)throw Error('Earth texture unavailable');},
 draw(g,size){if(canvas.width!==size){canvas.width=canvas.height=size;gl.viewport(0,0,size,size);}gl.uniform2f(angle,g.lat*RAD,g.lon*RAD);gl.drawArrays(gl.TRIANGLES,0,6);}};
}
win.addEventListener('atlas:ready',()=>{
 const app=win.AtlasWorkspace,doc=win.document;if(!app?.liveEarth||doc.getElementById('satelliteEarth'))return;
 const canvas=doc.getElementById('globe'),workspace=doc.getElementById('workspace');if(!canvas||!workspace)return;
 const earth=doc.createElement('div');earth.id='satelliteEarth';earth.className='satellite-earth fallback';earth.setAttribute('aria-hidden','true');
 const surface=doc.createElement('canvas');surface.className='satellite-earth-texture';earth.append(surface);workspace.insertBefore(earth,canvas);
 const moon=doc.createElement('div');moon.id='atlasMoonContext';moon.hidden=true;moon.title='approximate lunar phase context';workspace.append(moon);
 let renderer=null,ready=false,image=null,last='';
 function fallback(){ready=false;earth.className='satellite-earth fallback';earth.dataset.rendering='vector';last='';}
 function prepare(){try{renderer=createRenderer(surface);if(!renderer){fallback();return;}if(image){renderer.upload(image);ready=true;earth.className='satellite-earth loaded';earth.dataset.rendering='photographic';last='';}}catch{fallback();}}
 surface.addEventListener('webglcontextlost',e=>{e.preventDefault();fallback();});surface.addEventListener('webglcontextrestored',prepare);
 prepare();const probe=new Image();probe.decoding='async';probe.onload=()=>{image=probe;if(renderer)try{renderer.upload(image);ready=true;earth.className='satellite-earth loaded';earth.dataset.rendering='photographic';}catch{fallback();}};probe.onerror=fallback;probe.src=BLUE_MARBLE;
 function paint(g){g.options.photoEarth=ready;const R=g.radius,size=R*2;earth.style.left=(g.cx-R)+'px';earth.style.top=(g.cy-R)+'px';earth.style.width=size+'px';earth.style.height=size+'px';
 if(!ready)return;const pixels=Math.max(2,Math.min(2048,Math.round(size*Math.min(win.devicePixelRatio||1,2))));
 const stamp=[g.lat,g.lon,pixels].join(':');if(stamp!==last){renderer.draw(g,pixels);last=stamp;}}
 app.liveEarth.renderer(paint,'satellite-earth');
},{once:true});
win.AtlasSatelliteEarth=Object.freeze({BLUE_MARBLE,moonIcon,credit:'NASA BLUE MARBLE · SATELLITE MOSAIC'});
})(typeof window==='object'?window:globalThis);
