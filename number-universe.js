/* LottoLab Number Universe — source-backed, touch-responsive canvas for 40 Lotto balls.
 * 40 lightweight Canvas 2D nodes, no remote graphics libraries or invented data.
 * Touch gestures never prevent natural scrolling. Reduced motion / data saver
 * pauses animation; a native select provides accessible keyboard exploration.
 */
(()=>{
'use strict';
const canvas=document.getElementById('universeCanvas');
if(!canvas)return;
const context=canvas.getContext('2d',{alpha:false});
const $=id=>document.getElementById(id);
const motionControl=$('universeMotion'),pairsControl=$('universeConnections');
const reduceMedia=window.matchMedia('(prefers-reduced-motion: reduce)');
const saveData=!!(navigator.connection&&navigator.connection.saveData);
let enabled=!(reduceMedia.matches||saveData);
let visible=false,showPairs=false,selected=0,rows=[],counts=Array(41).fill(0),pairCounts=Array.from({length:41},()=>Array(41).fill(0));
let w=0,h=0,dpr=1,nodes=[],edges=[],stars=[],pointer=null,pointerDown=null,shocks=[],frame=0,lastFrame=0;
const pi=Math.PI;
const scramble=Array.from({length:40},(_,i)=>i);
let rng=277721;
const random=()=>{rng=(Math.imul(rng,1664525)+1013904223)>>>0;return rng/4294967296};
for(let i=scramble.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[scramble[i],scramble[j]]=[scramble[j],scramble[i]];}
const sampleLabel=()=>rows.length+' draw'+(rows.length===1?'':'s')+' in the current like-for-like sample';
function sanitize(d){return d&&Array.isArray(d.numbers)&&d.numbers.length===6&&d.numbers.every(n=>Number.isInteger(n)&&n>=1&&n<=40);}
function refreshData(){
 const shared=window.lottoLabAnalysisDraws;
 if(!Array.isArray(shared))return;
 rows=shared.filter(sanitize);
 counts=Array(41).fill(0);
 pairCounts=Array.from({length:41},()=>Array(41).fill(0));
 for(const row of rows){
  const nums=[...new Set(row.numbers)];
  for(const n of nums)counts[n]++;
  for(let a=0;a<nums.length;a++)for(let b=a+1;b<nums.length;b++){
   pairCounts[nums[a]][nums[b]]++;pairCounts[nums[b]][nums[a]]++;
  }
 }
 edges=[];
 for(let a=1;a<=40;a++)for(let b=a+1;b<=40;b++)if(pairCounts[a][b]>0)edges.push({a,b,count:pairCounts[a][b]});
 edges.sort((a,b)=>b.count-a.count||a.a-b.a||a.b-b.b);
 $('universeDataStatus').textContent=rows.length?
  'Showing '+sampleLabel()+'. Ball glow reflects observed main-number appearances, not a prediction.':
  'No draws match these analysis conditions. Change the Number Lab filters to explore.';
 refreshSelection();
 render();
}
function refreshSelection(){
 const picker=$('universeNumberPicker');
 if(!selected){
  $('universeSelectedBall').textContent='✦';
  $('universeSelectedTitle').textContent='Your universe awaits';
  $('universeSelectedDescription').textContent='Tap one of the floating numbers, or choose it below, to see what actually happened in the historical draws.';
  for(const id of ['universeHits','universeSample','universeRate','universeDelta'])$(id).textContent='—';
  $('universePair').textContent='Tap a ball to reveal';
  picker.value='';
  return;
 }
 const hits=counts[selected],total=rows.length,observed=total?hits/total:0;
 const expected=total*0.15;
 const candidates=Array.from({length:40},(_,i)=>i+1).filter(n=>n!==selected);
 candidates.sort((a,b)=>pairCounts[selected][b]-pairCounts[selected][a]||a-b);
 const partner=candidates[0],partnerCount=partner?pairCounts[selected][partner]:0;
 $('universeSelectedBall').textContent=String(selected).padStart(2,'0');
 $('universeSelectedTitle').textContent='Number '+selected;
 $('universeSelectedDescription').textContent='How often this ball appeared among the six main numbers in the selected archived results.';
 $('universeHits').textContent=hits;
 $('universeSample').textContent=total;
 $('universeRate').textContent=total?(observed*100).toFixed(1)+'%':'—';
 $('universeDelta').textContent=total?(hits-expected>=0?'+':'')+(hits-expected).toFixed(1)+' hits':'—';
 $('universePair').textContent=partnerCount?selected+' + '+partner+' · '+partnerCount+' shared draw'+(partnerCount===1?'':'s'):'No repeated pairs in this sample';
 picker.value=String(selected);
}
function inspect(n){
 if(!Number.isInteger(n)||n<1||n>40)return;
 selected=n;
 refreshSelection();
 if(enabled)shocks.push({x:nodes[n-1]?.x||w/2,y:nodes[n-1]?.y||h/2,start:performance.now(),size:1.15});
 render();
}
const picker=$('universeNumberPicker');
for(let n=1;n<=40;n++){
 const option=document.createElement('option');option.value=String(n);option.textContent='Number '+String(n).padStart(2,'0');picker.append(option);
}
picker.addEventListener('change',()=>{if(picker.value)inspect(Number(picker.value));else reset();});
function reset(){
 selected=0;
 refreshSelection();
 pointer=null;
 shocks=[];
 render();
}
$('universeReset').addEventListener('click',()=>{reset();showPairs=false;pairsControl.setAttribute('aria-pressed','false');pairsControl.classList.remove('is-on');render();});
pairsControl.addEventListener('click',()=>{
 showPairs=!showPairs;
 pairsControl.setAttribute('aria-pressed',String(showPairs));
 pairsControl.classList.toggle('is-on',showPairs);
 pairsControl.innerHTML=showPairs?'<span aria-hidden="true">⟷</span> Hide historical connections':'<span aria-hidden="true">⟷</span> Reveal actual number pairs';
 render();
});
function updateMotionState(next){
 enabled=!!next&&!(reduceMedia.matches||saveData);
 motionControl.setAttribute('aria-pressed',String(enabled));
 motionControl.innerHTML=enabled?'<span aria-hidden="true">◌</span> Motion on':'<span aria-hidden="true">◉</span> Motion off';
 document.documentElement.classList.toggle('motion-off',!enabled);
 window.lottoLabMotionEnabled=enabled;
 if(!enabled){pointer=null;shocks=[];cancelAnimationFrame(frame);frame=0;render();}
 else if(visible)requestNextFrame();
}
motionControl.addEventListener('click',()=>{updateMotionState(!enabled);});
reduceMedia.addEventListener?.('change',()=>updateMotionState(!reduceMedia.matches&&!saveData));
if(reduceMedia.matches||saveData){motionControl.title='Motion is disabled automatically for reduced-motion or data-saving preferences.';updateMotionState(false);}
function populateLayout(){
 if(!w||!h)return;
 nodes=Array.from({length:40},(_,i)=>{
  const place=scramble.indexOf(i),col=place%8,row=Math.floor(place/8);
  const r=(12.5+random()*2);
  const jitterX=(random()-.5)*12,jitterY=(random()-.5)*12;
  const x=((col+.5)/8)*w+jitterX,y=((row+.5)/5)*h+jitterY;
  return {n:i+1,x,y,ax:x,ay:y,r,phase:random()*pi*2};
 });
 stars=Array.from({length:70},()=>({x:random()*w,y:random()*h,r:random()*.9+.4,a:random()*.3+.06,phase:random()*pi*2}));
}
function resize(){
 const rect=canvas.getBoundingClientRect();
 if(rect.width<1)return;
 w=rect.width;h=rect.height;
 dpr=Math.min(window.devicePixelRatio||1,2);
 canvas.width=Math.ceil(w*dpr);canvas.height=Math.ceil(h*dpr);
 context.setTransform(dpr,0,0,dpr,0,0);
 populateLayout();
 render();
}
function nearest(x,y,acceptClosest=false){
 let best=null,distance=Infinity;
 for(const node of nodes){
  const d=Math.hypot(node.x-x,node.y-y);
  if(d<distance){best=node;distance=d;}
 }
 return acceptClosest||distance<=Math.max(24,(best?.r||12)+12)?best:null;
}
function coords(e){
 const box=canvas.getBoundingClientRect();return {x:e.clientX-box.left,y:e.clientY-box.top};
}
canvas.addEventListener('pointerdown',e=>{
 if(e.button!==0&&e.pointerType==='mouse')return;
 pointerDown={...coords(e),id:e.pointerId,t:performance.now()};
 pointer=coords(e);
 if(enabled)shocks.push({x:pointer.x,y:pointer.y,start:performance.now(),size:0.8});
 render();
},{passive:true});
canvas.addEventListener('pointermove',e=>{
 if(!enabled)return;
 pointer=coords(e);
 if(!visible)render();
},{passive:true});
canvas.addEventListener('pointerup',e=>{
 const pos=coords(e);
 if(pointerDown&&pointerDown.id===e.pointerId&&Math.hypot(pos.x-pointerDown.x,pos.y-pointerDown.y)<12){
  // A finger covers more area than a mouse pointer: accept the closest ball
  // for a stationary touch, even if the animation nudged it away slightly.
  const match=nearest(pos.x,pos.y,e.pointerType!=='mouse');
  if(match)inspect(match.n);
 }
 pointerDown=null;
 if(e.pointerType!=='mouse')pointer=null;
},{passive:true});
canvas.addEventListener('pointercancel',()=>{pointerDown=null;pointer=null;},{passive:true});
canvas.addEventListener('pointerleave',()=>{pointer=null;pointerDown=null;},{passive:true});
function draw(now=performance.now()){
 if(!w||!h)return;
 const ctx=context;
 ctx.clearRect(0,0,w,h);
 const background=ctx.createLinearGradient(0,0,w,h);
 background.addColorStop(0,'#180d35');background.addColorStop(.55,'#28115a');background.addColorStop(1,'#150b36');
 ctx.fillStyle=background;ctx.fillRect(0,0,w,h);
 const halo=ctx.createRadialGradient(w*.47,h*.45,10,w*.47,h*.45,w*.55);
 halo.addColorStop(0,'rgba(144,68,239,.22)');halo.addColorStop(1,'rgba(144,68,239,0)');
 ctx.fillStyle=halo;ctx.fillRect(0,0,w,h);
 for(const star of stars){
  const twinkle=enabled?.7+.3*Math.sin(now/1700+star.phase):1;
  ctx.fillStyle='rgba(218,191,255,'+(star.a*twinkle)+')';
  ctx.beginPath();ctx.arc(star.x,star.y,star.r,0,pi*2);ctx.fill();
 }
 const max=Math.max(1,...counts.slice(1)),min=Math.min(...counts.slice(1));
 const active=pointer&&enabled;
 for(const node of nodes){
  const wobble=enabled?Math.sin(now/1500+node.phase)*3:0;
  let tx=node.ax+wobble,ty=node.ay+(enabled?Math.cos(now/1800+node.phase)*2.8:0);
  if(active){
   const dx=node.ax-pointer.x,dy=node.ay-pointer.y,d=Math.max(1,Math.hypot(dx,dy));
   if(d<110){const strength=(1-d/110)**2*29;tx+=dx/d*strength;ty+=dy/d*strength;}
  }
  const factor=enabled?.19:1;
  node.x+=(tx-node.x)*factor;node.y+=(ty-node.y)*factor;
 }
 if(showPairs&&rows.length){
  const maxPairs=Math.max(1,edges[0]?.count||1);
  const limit=selected?20:16;
  let drawn=0;
  for(const edge of edges){
   if(selected&&edge.a!==selected&&edge.b!==selected)continue;
   const from=nodes[edge.a-1],to=nodes[edge.b-1];
   if(!from||!to)continue;
   ctx.strokeStyle='rgba(225,132,255,'+(.08+.47*edge.count/maxPairs)+')';
   ctx.lineWidth=.8+edge.count/maxPairs;
   ctx.beginPath();ctx.moveTo(from.x,from.y);ctx.lineTo(to.x,to.y);ctx.stroke();
   if(++drawn>=limit)break;
  }
 }
 for(const node of nodes){
  const normalized=max===min?.52:(counts[node.n]-min)/(max-min);
  const chosen=selected===node.n;
  const radius=node.r+(chosen?5:0)+(enabled&&chosen?Math.sin(now/220)*1.3:0);
  if(chosen){
   ctx.strokeStyle='rgba(248,218,255,.82)';ctx.lineWidth=1.65;ctx.beginPath();ctx.arc(node.x,node.y,radius+8,0,pi*2);ctx.stroke();
   ctx.strokeStyle='rgba(224,134,255,.22)';ctx.lineWidth=4;ctx.beginPath();ctx.arc(node.x,node.y,radius+12,0,pi*2);ctx.stroke();
  }
  const g=ctx.createRadialGradient(node.x-radius*.34,node.y-radius*.35,1,node.x,node.y,radius*1.35);
  const alpha=.65+.35*normalized;
  g.addColorStop(0,'rgba(204,166,255,'+alpha+')');
  g.addColorStop(.48,'rgba(133,67,238,'+alpha+')');
  g.addColorStop(1,'rgba(72,28,158,'+alpha+')');
  ctx.shadowColor=chosen?'#ffb8ff':'rgba(181,85,255,'+(.17+.37*normalized)+')';
  ctx.shadowBlur=chosen?26:7+12*normalized;
  ctx.fillStyle=g;ctx.beginPath();ctx.arc(node.x,node.y,radius,0,pi*2);ctx.fill();ctx.shadowBlur=0;
  ctx.fillStyle='#fff';ctx.font='800 '+(radius>16?11:10)+'px system-ui,-apple-system,sans-serif';
  ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(String(node.n).padStart(2,'0'),node.x,node.y+.4);
 }
 if(shocks.length){
  shocks=shocks.filter(s=>now-s.start<670);
  for(const shock of shocks){
   const progress=Math.min(1,(now-shock.start)/670);
   ctx.strokeStyle='rgba(240,196,255,'+(.52*(1-progress))+')';
   ctx.lineWidth=1.5*(1-progress)+.4;
   ctx.beginPath();ctx.arc(shock.x,shock.y,8+progress*86*shock.size,0,pi*2);ctx.stroke();
  }
 }
}
function render(){if(!enabled||!visible)draw();}
function requestNextFrame(){
 if(frame||!enabled||!visible||document.hidden)return;
 frame=requestAnimationFrame(tick);
}
function tick(now){
 frame=0;
 if(!enabled||!visible||document.hidden)return;
 if(now-lastFrame>=28){draw(now);lastFrame=now;}
 requestNextFrame();
}
const watcher=('IntersectionObserver'in window)?new IntersectionObserver(entries=>{
 visible=entries[0].isIntersecting;
 if(visible){draw();requestNextFrame();}
 else {cancelAnimationFrame(frame);frame=0;}
},{rootMargin:'120px 0px 120px 0px',threshold:0}):null;
if(watcher)watcher.observe(canvas);else visible=true;
if('ResizeObserver'in window)new ResizeObserver(resize).observe(canvas);
else window.addEventListener('resize',resize,{passive:true});
document.addEventListener('visibilitychange',()=>{if(!document.hidden&&visible)requestNextFrame();});
window.addEventListener('lottolab:analysis-changed',refreshData);
if(Array.isArray(window.lottoLabAnalysisDraws))refreshData();
resize();
})();
