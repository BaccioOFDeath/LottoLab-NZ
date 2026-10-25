/* Spatial Lotto Number World — 2.5D perspective projection, no external dependencies.
   Inspired by navigable file graphs, not copied from FileStructureMapper.
   Frequencies from the shared era-filtered dataset; no predictions.
*/
(()=>{'use strict';
const $=id=>document.getElementById(id),canvas=$('worldCanvas');if(!canvas)return;
const c=canvas.getContext('2d'),reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
let w=0,h=0,dpr=1,rot=.3,tilt=.13,zoom=1.0,auto=!reduced,connections=false,selected=0,visible=true,raf=0,last=0,drag=null;
let counts=Array(41).fill(0),pairs=Array.from({length:41},()=>Array(41).fill(0)),total=0,rendered=[];
const nodes=Array.from({length:40},(_,i)=>{
 const y=1-2*(i+.5)/40, r=Math.sqrt(1-y*y),a=i*Math.PI*(3-Math.sqrt(5));
 return {n:i+1,x:Math.cos(a)*r,y,z:Math.sin(a)*r};
});
for(let n=1;n<=40;n++){const opt=document.createElement('option');opt.value=n;opt.textContent='Number '+String(n).padStart(2,'0');$('worldSelect').append(opt);}
const choose=n=>{selected=n;$('worldSelect').value=n||'';if(n){$('worldSelected').textContent='Number '+String(n).padStart(2,'0');$('worldInfo').textContent=counts[n]+' appearances in '+total+' stored draws · '+(total?(counts[n]*100/total).toFixed(1)+'%':'—')+' observed';}else{$('worldSelected').textContent='Explore the number world';$('worldInfo').textContent='Drag to rotate · pinch to zoom · tap to select';}draw(performance.now());};
$('worldSelect').addEventListener('change',e=>choose(Number(e.target.value)||0));
$('worldSpin').addEventListener('click',()=>{auto=!auto&&!reduced;$('worldSpin').setAttribute('aria-pressed',String(auto));draw(performance.now());});
$('worldConnections').addEventListener('click',()=>{connections=!connections;$('worldConnections').setAttribute('aria-pressed',String(connections));draw(performance.now());});
$('worldReset').addEventListener('click',()=>{rot=.3;tilt=.13;zoom=1;choose(0);});
function data(){
 const rows=(window.lottoLabAnalysisDraws||[]).filter(r=>Array.isArray(r.numbers)&&r.numbers.length===6);
 total=rows.length;counts=Array(41).fill(0);pairs=Array.from({length:41},()=>Array(41).fill(0));
 for(const d of rows){const nums=[...new Set(d.numbers.filter(n=>Number.isInteger(n)&&n>=1&&n<=40))];for(const n of nums)counts[n]++;for(let i=0;i<nums.length;i++)for(let j=i+1;j<nums.length;j++)pairs[nums[i]][nums[j]]++,pairs[nums[j]][nums[i]]++;}
 $('worldStatus').textContent=total+' stored draw'+(total===1?'':'s')+' in current like-for-like sample · historical appearances, not predictions';
 if(selected)choose(selected);else draw(performance.now());
}
function size(){const r=canvas.getBoundingClientRect();w=Math.max(1,r.width);h=Math.max(1,r.height);dpr=Math.min(2,devicePixelRatio||1);canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);c.setTransform(dpr,0,0,dpr,0,0);draw(performance.now());}
function project(n){
 const cy=Math.cos(rot),sy=Math.sin(rot),cx=Math.cos(tilt),sx=Math.sin(tilt);
 const xx=n.x*cy-n.z*sy,zz=n.x*sy+n.z*cy,yy=n.y*cx-zz*sx,z=n.y*sx+zz*cx;
 const f=(2.9/(3.5-z))*zoom,rad=Math.min(w,h)*.305;
 return {...n,x:w/2+xx*rad*f,y:h/2+yy*rad*f,z,size:(11+4*f)*f};
}
function draw(time){
 if(!w||!h)return;
 const gradient=c.createRadialGradient(w*.46,h*.45,5,w*.52,h*.51,Math.max(w,h)*.83);
 gradient.addColorStop(0,'#40257b');gradient.addColorStop(.49,'#1b1646');gradient.addColorStop(1,'#080c25');
 c.fillStyle=gradient;c.fillRect(0,0,w,h);
 c.strokeStyle='#e1c8ff0c';for(let i=0;i<8;i++){c.beginPath();c.arc(w/2,h/2,Math.min(w,h)*(.12+i*.054),0,Math.PI*2);c.stroke();}
 const balls=nodes.map(project).sort((a,b)=>a.z-b.z);rendered=balls;
 if(connections){
  let edges=[];
  for(let a=1;a<=40;a++)for(let b=a+1;b<=40;b++)if(pairs[a][b]&&(!selected||a===selected||b===selected))edges.push([a,b,pairs[a][b]]);
  edges.sort((a,b)=>b[2]-a[2]);edges=edges.slice(0,selected?12:15);
  const lookup=Object.fromEntries(balls.map(n=>[n.n,n]));
  for(const [a,b,count] of edges){let x=lookup[a],y=lookup[b];c.lineWidth=.8;c.strokeStyle='rgba(123,240,211,'+Math.min(.65,.12+count/(total||1)*4)+')';c.beginPath();c.moveTo(x.x,x.y);c.lineTo(y.x,y.y);c.stroke();}
 }
 const max=Math.max(1,...counts);
 for(const n of balls){
  const r=Math.max(9,n.size),chosen=n.n===selected,rate=counts[n.n]/max;
  c.globalAlpha=.55+Math.max(0,n.z)*.45;
  if(chosen){c.strokeStyle='#ffdc8c';c.lineWidth=2;c.beginPath();c.arc(n.x,n.y,r+8,0,Math.PI*2);c.stroke();}
  const grad=c.createRadialGradient(n.x-r*.35,n.y-r*.38,1,n.x,n.y,r*1.3);
  grad.addColorStop(0,chosen?'#ffe4c4':'#e2bbff');grad.addColorStop(.47,chosen?'#f7a44d':'#9554ed');grad.addColorStop(1,chosen?'#a94c32':'#48218b');
  c.shadowColor=chosen?'#f7b362':'#a76cf0';c.shadowBlur=chosen?21:Math.round(3+rate*8);
  c.fillStyle=grad;c.beginPath();c.arc(n.x,n.y,r,0,Math.PI*2);c.fill();c.shadowBlur=0;
  c.fillStyle='#fff';c.textAlign='center';c.textBaseline='middle';c.font='800 '+Math.max(10,Math.min(15,r*.86))+'px system-ui';c.fillText(String(n.n).padStart(2,'0'),n.x,n.y);
 }
 c.globalAlpha=1;
}
function loop(t){raf=0;if(auto&&visible&&!document.hidden){if(t-last>25){rot+=.0025;draw(t);last=t;}raf=requestAnimationFrame(loop);}}
function start(){if(auto&&visible&&!raf)raf=requestAnimationFrame(loop);}
function point(e){const b=canvas.getBoundingClientRect();return{x:e.clientX-b.left,y:e.clientY-b.top};}
canvas.addEventListener('pointerdown',e=>{if(e.pointerType==='mouse'&&e.button!==0)return;const p=point(e);drag={x:p.x,y:p.y,rot,tilt,moved:false,id:e.pointerId};if(e.pointerType==='mouse')canvas.setPointerCapture(e.pointerId);auto=false;$('worldSpin').setAttribute('aria-pressed','false');},{passive:true});
canvas.addEventListener('pointermove',e=>{if(!drag||e.pointerId!==drag.id)return;const p=point(e),dx=p.x-drag.x,dy=p.y-drag.y;if(Math.abs(dx)+Math.abs(dy)>8)drag.moved=true;rot=drag.rot+dx*.008;tilt=Math.max(-1.1,Math.min(1.1,drag.tilt+dy*.008));draw(performance.now());},{passive:true});
canvas.addEventListener('pointerup',e=>{if(!drag||drag.id!==e.pointerId)return;const p=point(e);if(!drag.moved){let nearest=rendered.filter(n=>Math.hypot(n.x-p.x,n.y-p.y)<Math.max(25,n.size+12)).sort((a,b)=>Math.hypot(a.x-p.x,a.y-p.y)-Math.hypot(b.x-p.x,b.y-p.y))[0];if(nearest)choose(nearest.n);}drag=null;},{passive:true});
canvas.addEventListener('pointercancel',()=>drag=null,{passive:true});
canvas.addEventListener('wheel',e=>{if(!e.ctrlKey&&!e.metaKey)return;if(e.cancelable)e.preventDefault();zoom=Math.min(2.3,Math.max(.7,zoom*Math.exp(-e.deltaY*.008)));draw(performance.now());},{passive:false});
if('ResizeObserver'in window)new ResizeObserver(size).observe(canvas);else window.addEventListener('resize',size);
if('IntersectionObserver'in window)new IntersectionObserver(a=>{visible=a[0].isIntersecting;if(!visible){cancelAnimationFrame(raf);raf=0;}else start();}).observe(canvas);
window.addEventListener('lottolab:analysis-changed',data);size();data();start();
})();
