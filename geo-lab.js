/* LottoLab Geo v1 — NZ sourced winner-distribution map, not a location predictor.
   Local GeoJSON silhouette, canvas weather-style density, accessible location pins,
   public-source inspector, filtering, timeline and safe location precision handling.
   No third-party map SDK, geolocation access, trackers or external tile dependencies.
*/
(()=>{
'use strict';
const $=id=>document.getElementById(id);
const svgNS='http://www.w3.org/2000/svg';
const stage=$('geoMapStage'),svg=$('geoOutline'),coast=$('geoCoast'),pins=$('geoPins'),canvas=$('geoWeather'),ctx=canvas?.getContext('2d');
if(!stage||!svg||!ctx)return;
let all=[],filtered=[],countries=null,dates=[],index=0,selected='',layer='heat',scale=1,panX=0,panY=0,moveMode=false,pinch=null,touchDrag=null,mouseDrag=null,playTimer=0,scene=null;
const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
const state={game:'all',tier:'all',channel:'retail',region:'all'};
const bounds={west:165.4,east:179.7,north:-33.6,south:-48.1};
const project=(lat,lon)=>({x:(lon-bounds.west)/(bounds.east-bounds.west)*580,y:(bounds.north-lat)/(bounds.north-bounds.south)*760});
const escapeDate=d=>new Date(d+'T12:00:00Z').toLocaleDateString('en-NZ',{timeZone:'UTC',day:'numeric',month:'short',year:'numeric'});
const sum=a=>a.reduce((s,r)=>s+r.tickets,0);
const labelTier={first:'First Division',second:'Second Division',four:'Strike Four',roll_down:'Powerball roll-down'};
const pct=v=>v.toFixed(1)+'%';
const allowedSource=u=>typeof u==='string'&&/^https:\/\/(mylotto\.co\.nz|www\.scoop\.co\.nz)\//.test(u);
const valid=r=>r&&r.id&&/^\d{4}-\d\d-\d\d$/.test(r.draw_date)&&['Lotto','Powerball','Strike'].includes(r.game)&&
 ['first','second','four','roll_down'].includes(r.tier)&&['retail','online'].includes(r.channel)&&
 Number.isInteger(r.tickets)&&r.tickets>0&&r.tickets<10000&&
 Number.isFinite(r.lat)&&Number.isFinite(r.lon)&&r.lat>=-48.3&&r.lat<=-34&&r.lon>=165&&r.lon<=180&&
 typeof r.place==='string'&&r.place.trim()&&typeof r.region==='string'&&r.region.trim()&&allowedSource(r.source_url);
function make(tag,attrs={},txt=''){
 const el=document.createElement(tag);
 for(const [k,v] of Object.entries(attrs))el.setAttribute(k,String(v));
 if(txt!==undefined)el.textContent=txt;
 return el;
}
function createSVGPath(shape){
 coast.replaceChildren();
 if(!shape?.geometry?.coordinates){$('geoMapStatus').textContent='The map outline is unavailable, but reported locations are still listed below.';return;}
 for(const poly of shape.geometry.coordinates){
  const rings=poly; // MultiPolygon: each polygon contains one or more coordinate rings.
  for(const ring of rings){
   if(!Array.isArray(ring)||ring.length<3)continue;
   let path='',good=0;
   for(const point of ring){
    if(!Array.isArray(point)||point.length<2||!Number.isFinite(point[0])||!Number.isFinite(point[1]))continue;
    const p=project(point[1],point[0]);
    path+=(good++?' L ':'M ')+p.x.toFixed(2)+' '+p.y.toFixed(2);
   }
   if(good<3)continue;
   const el=document.createElementNS(svgNS,'path');el.setAttribute('d',path+' Z');el.setAttribute('class','geo-island');coast.append(el);
  }
 }
}
function initScene(){
 scene=make('div',{id:'geoScene',class:'geo-scene'});
 const keep=[svg,canvas,pins];
 for(const item of keep)scene.append(item);
 stage.prepend(scene);
}
function initializeDates(){
 dates=[...new Set(all.map(r=>r.draw_date))].sort();
 index=Math.max(0,dates.length-1);
 const slider=$('geoDateSlider');slider.max=String(Math.max(0,dates.length-1));slider.value=String(index);slider.disabled=dates.length<2;
 $('geoPlay').disabled=dates.length<2;
 $('geoFrom').textContent=dates.length?escapeDate(dates[0]):'No reports';
 $('geoUntil').textContent=dates.length?escapeDate(dates[dates.length-1]):'No reports';
 const select=$('geoRegion');
 for(const region of [...new Set(all.map(r=>r.region))].sort()){
  select.append(make('option',{value:region},region));
 }
 // Restore a shared URL's visual settings; do not claim its filters predict outcomes.
 const url=new URL(location.href);
 for(const [key,param,id] of [['game','geoGame','geoGame'],['tier','geoTier','geoTier'],['channel','geoChannel','geoChannel'],['region','geoRegion','geoRegion']]){
  const value=url.searchParams.get(param);
  if(value&&[...$(id).options].some(o=>o.value===value)){$(id).value=value;state[key]=value;}
 }
}
function current(){
 const date=dates[index]||'9999-12-31';
 return all.filter(r=>r.draw_date<=date&&(state.game==='all'||r.game===state.game)&&
 (state.tier==='all'||r.tier===state.tier)&&(state.channel==='all'||r.channel===state.channel)&&
 (state.region==='all'||r.region===state.region));
}
function groupPlaces(rows){
 const map=new Map();
 for(const r of rows){
  const key=r.place;
  if(!map.has(key))map.set(key,{key,place:r.place,region:r.region,lat:r.lat,lon:r.lon,records:[],tickets:0,retail:0,online:0});
  const g=map.get(key);g.records.push(r);g.tickets+=r.tickets;g[r.channel]+=r.tickets;
 }
 return [...map.values()].sort((a,b)=>b.tickets-a.tickets||a.place.localeCompare(b.place));
}
function groupRegions(rows){
 const map=new Map();
 for(const r of rows){
  const key=r.region;
  if(!map.has(key))map.set(key,{key,place:r.region,region:r.region,lat:0,lon:0,tickets:0,retail:0,online:0,records:[]});
  const g=map.get(key);g.records.push(r);g.tickets+=r.tickets;g[r.channel]+=r.tickets;
  g.lat+=r.lat*r.tickets;g.lon+=r.lon*r.tickets;
 }
 for(const g of map.values()){g.lat/=g.tickets;g.lon/=g.tickets;}
 return [...map.values()].sort((a,b)=>b.tickets-a.tickets||a.place.localeCompare(b.place));
}
function grouped(){return layer==='regions'?groupRegions(filtered):groupPlaces(filtered);}
function drawHeat(groups){
 const box=stage.getBoundingClientRect(),dpr=Math.min(devicePixelRatio||1,2);
 // Parent scene has fixed 580:760 aspect ratio. Canvas matches its rendered size.
 const width=Math.max(1,Math.round(box.width)),height=Math.max(1,Math.round(box.height));
 const desiredW=Math.round(width*dpr),desiredH=Math.round(height*dpr);
 if(canvas.width!==desiredW||canvas.height!==desiredH){canvas.width=desiredW;canvas.height=desiredH;}
 ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,width,height);
 if(layer==='markers'||!groups.length)return;
 const maximum=Math.max(1,...groups.map(g=>g.tickets)),factor=width/580;
 // Density is sampled report counts, NOT spatial probability or per-ticket win rate.
 for(const group of [...groups].sort((a,b)=>a.tickets-b.tickets)){
  const p=project(group.lat,group.lon),x=p.x*factor,y=p.y*height/760;
  const weight=Math.sqrt(group.tickets/maximum);
  const radius=(layer==='regions'?97:68)*factor*(.65+.45*weight)/Math.pow(scale,.72); // prevent giant heat blobs at 4× zoom
  const g=ctx.createRadialGradient(x,y,0,x,y,Math.max(7,radius));
  const opacity=Math.min(.85,.23+.58*weight);
  g.addColorStop(0,'rgba(255,214,94,'+opacity+')');
  g.addColorStop(.25,'rgba(255,99,128,'+(.68*opacity)+')');
  g.addColorStop(.58,'rgba(152,78,239,'+(.46*opacity)+')');
  g.addColorStop(1,'rgba(100,57,217,0)');
  ctx.globalCompositeOperation='screen';
  ctx.fillStyle=g;ctx.fillRect(x-radius,y-radius,radius*2,radius*2);
 }
 ctx.globalCompositeOperation='source-over';
}
function renderPins(groups){
 pins.replaceChildren();
 if(!groups.length)return;
 const max=Math.max(1,...groups.map(g=>g.tickets));
 for(const g of groups){
  const p=project(g.lat,g.lon);
  const button=make('button',{type:'button',class:'geo-pin'+(selected===g.key?' selected':'')+(g.online&&!g.retail?' online':''),
   'aria-label':g.place+': '+g.tickets+' publicly reported winning tickets','aria-pressed':String(selected===g.key),
   style:'left:'+(p.x/580*100).toFixed(4)+'%;top:'+(p.y/760*100).toFixed(4)+'%;--pin-size:'+(19+Math.sqrt(g.tickets/max)*19).toFixed(1)+'px;--geo-pin-opacity:'+(g.tickets===1?'.87':'1')});
  button.append(make('span',{class:'geo-pin-dot'},String(g.tickets)));
  button.title=g.place+' · '+g.tickets+' reported tickets'+(g.online?' · '+g.online+' online winner-area records':'');
  button.addEventListener('click',()=>selectGroup(g.key));
  pins.append(button);
 }
}
function inspect(g){
 $('geoSelectedTitle').textContent=g.place;
 $('geoSelectedDescription').textContent=g.tickets+' reported ticket'+(g.tickets===1?'':'s')+' · '+g.region+
 (g.online?' · '+g.online+' MyLotto area record'+(g.online===1?'':'s'):'')+
 (g.retail?' · '+g.retail+' reported physical retailer win'+(g.retail===1?'':'s'):'')+
 '. Coordinates are approximate.';
 const list=$('geoSelectedList');list.replaceChildren();
 for(const r of [...g.records].sort((a,b)=>b.draw_date.localeCompare(a.draw_date)).slice(0,30)){
  const item=make('article',{class:'geo-report'});
  const head=make('div',{class:'geo-report-top'});
  head.append(make('strong',{},r.game+' · '+(labelTier[r.tier]||r.tier)),make('span',{},escapeDate(r.draw_date)));
  item.append(head,make('p',{},(r.channel==='online'?'MyLotto · winner area: ':'Retailer · reported town: ')+
     r.outlet+' · '+r.place+(r.tickets>1?' · '+r.tickets+' tickets':'')));
  const note=make('small',{},r.channel==='online'?'Online purchase; point shows reported player area':'Approximate town reference, not exact shop coordinates');
  item.append(note);
  if(allowedSource(r.source_url)){
   item.append(make('a',{href:r.source_url,target:'_blank',rel:'noopener noreferrer'},'Read published source ↗'));
  }
  list.append(item);
 }
 if(g.records.length>30)list.append(make('p',{class:'geo-empty'},'Showing the latest 30 reports for this area.'));
}
function selectGroup(key){
 selected=key;
 const gs=grouped(),item=gs.find(g=>g.key===key);
 if(item)inspect(item);
 renderPins(gs);
 const rankButtons=[...$('geoRanking').querySelectorAll('button')];
 for(const b of rankButtons)b.setAttribute('aria-pressed',String(b.dataset.place===selected));
}
function renderRanking(groups){
 const list=$('geoRanking');list.replaceChildren();
 if(!groups.length){list.append(make('p',{class:'geo-empty'},'No published winners match these filters.'));return;}
 groups.slice(0,8).forEach((g,i)=>{
  const button=make('button',{type:'button','data-place':g.key,'aria-pressed':String(selected===g.key),class:'geo-rank-item'});
  button.append(make('span',{class:'geo-rank-index'},String(i+1)),
    make('span',{class:'geo-rank-name'},g.place),
    make('strong',{},String(g.tickets)));
  button.addEventListener('click',()=>selectGroup(g.key));
  list.append(button);
 });
}
function renderResearch(rows){
 const tickets=sum(rows),retail=sum(rows.filter(r=>r.channel==='retail')),online=tickets-retail;
 const precisionCity=sum(rows.filter(r=>r.precision==='city'));
 const preciseRegion=sum(rows.filter(r=>r.precision==='region'));
 $('geoSources').textContent=new Set(rows.map(r=>r.source_url)).size;
 $('geoCityPrecision').textContent=precisionCity;
 $('geoRegionPrecision').textContent=preciseRegion;
 $('geoReportDates').textContent=new Set(rows.map(r=>r.draw_date)).size;
 const pct=v=>tickets?(100*v/tickets).toFixed(1)+'%':'—';
 $('geoRetailShare').textContent='Retail: '+retail+' ('+pct(retail)+')';
 $('geoOnlineShare').textContent='MyLotto: '+online+' ('+pct(online)+')';
 $('geoRetailBar').style.width=(tickets?retail/tickets*100:0).toFixed(2)+'%';
 $('geoOnlineBar').style.width=(tickets?online/tickets*100:0).toFixed(2)+'%';
 const latest=dates[index]||'2026-10-01',month=latest.slice(0,7);
 const [yr,m]=month.split('-').map(Number),months=[];
 for(let i=11;i>=0;i--){
  const d=new Date(Date.UTC(yr,m-1-i,1));
  months.push(d.toISOString().slice(0,7));
 }
 const totals=months.map(m=>sum(rows.filter(r=>r.draw_date.startsWith(m))));
 const max=Math.max(1,...totals),host=$('geoMonthlyBars');
 host.replaceChildren();
 for(let i=0;i<months.length;i++){
  const [y,m]=months[i].split('-').map(Number);
  const date=new Date(Date.UTC(y,m-1,1));
  const title=date.toLocaleDateString('en-NZ',{month:'short',year:'numeric',timeZone:'UTC'});
  const col=make('div',{class:'geo-month-col',title:title+': '+totals[i]+' reported tickets in sampled releases'});
  const label=make('span',{class:'geo-month-value'},String(totals[i]));
  const bar=make('span',{class:'geo-month-rail'});
  bar.append(make('span',{class:'geo-month-fill',style:'height:'+(totals[i]?Math.max(8,100*totals[i]/max):0).toFixed(1)+'%'}));
  const monthLabel=make('small',{},date.toLocaleDateString('en-NZ',{month:'short',timeZone:'UTC'}));
  col.append(label,bar,monthLabel);
  host.append(col);
 }
}

function update(){
 filtered=current();const groups=grouped();
 $('geoTotal').textContent=sum(filtered).toLocaleString('en-NZ');
 $('geoPlaces').textContent=new Set(filtered.map(r=>r.place)).size;
 $('geoRetail').textContent=sum(filtered.filter(r=>r.channel==='retail'));
 $('geoCoverage').textContent=new Set(filtered.map(r=>r.draw_date)).size;
 $('geoDateText').textContent=dates.length?'Through '+escapeDate(dates[index]):'No source reports';
 $('geoMapStatus').textContent=filtered.length?sum(filtered)+' tickets in '+groups.length+
   (layer==='regions'?' regions':' mapped places')+' · selected published reports only · not adjusted for tickets sold.':
   'No reports match this filter or timeline position; try another selection.';
 renderPins(groups);drawHeat(groups);renderRanking(groups);renderResearch(filtered);
 if(selected&&groups.some(g=>g.key===selected))inspect(groups.find(g=>g.key===selected));
 else {selected='';$('geoSelectedTitle').textContent='Explore a hotspot';
 $('geoSelectedDescription').textContent='Tap a map marker or ranked location to inspect a published winner report.';
 $('geoSelectedList').replaceChildren(make('p',{class:'geo-empty'},'Each location links to its public source and explains its accuracy.'));}
}
function setLayer(mode){
 layer=mode;
 for(const [id,v] of [['geoHeat','heat'],['geoMarkers','markers'],['geoRegions','regions']]){
  $(id).setAttribute('aria-pressed',String(v===mode));$(id).classList.toggle('active',v===mode);
 }
 selected='';update();
}
function stop(){if(playTimer){clearInterval(playTimer);playTimer=0;}$('geoPlay').setAttribute('aria-pressed','false');$('geoPlay').textContent='▶ Play';}
function play(){
 if(playTimer){stop();return;}
 if(dates.length<2)return;
 if(index>=dates.length-1)index=0;
 $('geoPlay').setAttribute('aria-pressed','true');$('geoPlay').textContent='Ⅱ Pause';
 playTimer=setInterval(()=>{
  if(index>=dates.length-1){stop();return;}
  index++;$('geoDateSlider').value=String(index);update();
 },950);
 update();
}
let heatFrame=0;
function requestHeatRedraw(){
 if(heatFrame)return;
 heatFrame=requestAnimationFrame(()=>{heatFrame=0;if(all.length)drawHeat(grouped());});
}
function resize(){if(all.length){requestHeatRedraw();applyView();}}
/* Pinch-and-zoom engine: translate + scale anchored at the gesture centroid.
 * Default single-finger vertical gestures still scroll the webpage.
 * Two-finger gestures stay inside the map only; no global gesture interception.
 */
const clamp=(v,min,max)=>Math.min(max,Math.max(min,v));
const dims=()=>({w:stage.clientWidth,h:stage.clientHeight});
function updateHint(){
 const hint=$('geoGestureHint');
 if(!hint)return;
 hint.textContent=moveMode?'Move mode · drag with one finger · tap Move again to scroll page':
  scale>1.01?'Pinch or drag with two fingers · single finger scrolls page':
  'Pinch with two fingers · drag with two fingers to move';
}
function applyView(nextScale=scale,nextX=panX,nextY=panY){
 if(!scene)return;
 const {w,h}=dims();
 scale=clamp(nextScale,1,4);
 if(scale<=1.0001){scale=1;panX=0;panY=0;}
 else{
  panX=clamp(nextX,-w*(scale-1)/2,w*(scale-1)/2);
  panY=clamp(nextY,-h*(scale-1)/2,h*(scale-1)/2);
 }
 // No origin ambiguity: translate is applied AFTER scaling around the centre.
 scene.style.transform='translate3d('+panX.toFixed(2)+'px,'+panY.toFixed(2)+'px,0) scale('+Number(scale.toFixed(3))+')';
 stage.dataset.zoom=String(Number(scale.toFixed(3)));
 $('geoZoomValue').textContent=scale.toFixed(1)+'×';
 $('geoZoomIn').disabled=scale>=3.999;
 $('geoZoomOut').disabled=scale<=1.001;
 $('geoZoomReset').disabled=scale===1&&Math.abs(panX)<.1&&Math.abs(panY)<.1&&!moveMode;
 stage.classList.toggle('geo-is-zoomed',scale>1.01);
 // Compensate each marker for the parent's 1–4× zoom. At 4× its *visible*
 // diameter is ~66% of its original diameter, instead of ballooning to 400%.
 // Keep labels readable via a separate type-size countercompensation.
 pins.style.setProperty('--geo-pin-compensation',(1/Math.pow(scale,1.3)).toFixed(5));
 pins.style.setProperty('--geo-label-compensation',Math.pow(scale,.19).toFixed(4));
 if(all.length)requestHeatRedraw();
 updateHint();
}
function zoomAt(nextScale,x,y){
 const {w,h}=dims();
 const next=clamp(nextScale,1,4),ratio=next/scale;
 const focalX=Number.isFinite(x)?x:w/2,focalY=Number.isFinite(y)?y:h/2;
 const nx=(focalX-w/2)-(focalX-w/2-panX)*ratio;
 const ny=(focalY-h/2)-(focalY-h/2-panY)*ratio;
 applyView(next,nx,ny);
}
const inStage=(touch)=>{
 const rect=stage.getBoundingClientRect();
 return {x:touch.clientX-rect.left,y:touch.clientY-rect.top};
};
function twoFinger(touches){
 const a=inStage(touches[0]),b=inStage(touches[1]);
 return {x:(a.x+b.x)/2,y:(a.y+b.y)/2,dist:Math.max(1,Math.hypot(a.x-b.x,a.y-b.y))};
}
function setMoveMode(on){
 moveMode=!!on;
 // Moving an unzoomed map has no effect. Entering Move mode from 1x
 // immediately zooms slightly so dragging does something useful.
 if(moveMode&&scale<=1.001)zoomAt(1.7);
 stage.classList.toggle('geo-move-on',moveMode);
 $('geoMove').setAttribute('aria-pressed',String(moveMode));
 $('geoMove').setAttribute('aria-label',moveMode?'Disable one-finger map dragging':'Enable one-finger map dragging');
 $('geoMove').textContent=moveMode?'✓ Moving':'✋ Move';
 touchDrag=null;
 applyView();
}
function gestures(){
 // Touch listeners are deliberately local. Never set body touch-action:none
 // or disable the user's browser pinch/zoom outside the actual map.
 stage.addEventListener('touchstart',e=>{
  if(e.touches.length>=2){
   if(e.cancelable)e.preventDefault();
   const p=twoFinger(e.touches);
   pinch={scale,panX,panY,midX:p.x,midY:p.y,dist:p.dist};
   touchDrag=null;
   stage.classList.add('geo-gesture-active');
  }else if(e.touches.length===1&&moveMode){
   const p=inStage(e.touches[0]);
   touchDrag={id:e.touches[0].identifier,x:p.x,y:p.y,panX,panY};
  }
 },{passive:false});
 stage.addEventListener('touchmove',e=>{
  if(e.touches.length>=2){
   if(e.cancelable)e.preventDefault();
   if(!pinch){const p=twoFinger(e.touches);pinch={scale,panX,panY,midX:p.x,midY:p.y,dist:p.dist};}
   const p=twoFinger(e.touches);
   const next=clamp(pinch.scale*(p.dist/pinch.dist),1,4),ratio=next/pinch.scale;
   const {w,h}=dims();
   const nx=(p.x-w/2)-(pinch.midX-w/2-pinch.panX)*ratio;
   const ny=(p.y-h/2)-(pinch.midY-h/2-pinch.panY)*ratio;
   applyView(next,nx,ny);
  }else if(e.touches.length===1&&moveMode&&touchDrag&&!pinch){
   const touch=e.touches[0];
   if(touch.identifier!==touchDrag.id)return;
   if(e.cancelable)e.preventDefault();
   const p=inStage(touch);
   applyView(scale,touchDrag.panX+p.x-touchDrag.x,touchDrag.panY+p.y-touchDrag.y);
  }
 },{passive:false});
 const finish=e=>{
  if(e.touches.length<2){pinch=null;stage.classList.remove('geo-gesture-active');}
  if(e.touches.length===0)touchDrag=null;
  // If one finger remains after a pinch, require a fresh touch for move mode:
  // this prevents the ugly jump between pinch and one-finger dragging.
 };
 stage.addEventListener('touchend',finish,{passive:true});
 stage.addEventListener('touchcancel',()=>{pinch=null;touchDrag=null;stage.classList.remove('geo-gesture-active');},{passive:true});
 // iOS Safari may fire proprietary gesture events. Suppress *only inside map*,
 // letting the touch handlers implement the real focal-point transform.
 stage.addEventListener('gesturestart',e=>{if(e.cancelable)e.preventDefault();},{passive:false});
 stage.addEventListener('gesturechange',e=>{if(e.cancelable)e.preventDefault();},{passive:false});
 // Trackpad pinch sends ctrl+wheel on many browsers. Normal wheel still scrolls page.
 stage.addEventListener('wheel',e=>{
  if(!e.ctrlKey&&!e.metaKey)return;
  if(e.cancelable)e.preventDefault();
  const p=inStage(e);
  zoomAt(scale*Math.exp(-e.deltaY*.01),p.x,p.y);
 },{passive:false});
 // Desktop click+drag (only when zoomed). Do not steal clicks from hotspot pins.
 stage.addEventListener('pointerdown',e=>{
  if(e.pointerType!=='mouse'||e.button!==0||scale<=1||e.target.closest('button'))return;
  mouseDrag={id:e.pointerId,x:e.clientX,y:e.clientY,panX,panY};
  stage.setPointerCapture(e.pointerId);
  stage.classList.add('geo-gesture-active');
 });
 stage.addEventListener('pointermove',e=>{
  if(!mouseDrag||e.pointerId!==mouseDrag.id)return;
  applyView(scale,mouseDrag.panX+e.clientX-mouseDrag.x,mouseDrag.panY+e.clientY-mouseDrag.y);
 });
 const endMouse=e=>{if(mouseDrag&&e.pointerId===mouseDrag.id){mouseDrag=null;stage.classList.remove('geo-gesture-active');if(stage.hasPointerCapture(e.pointerId))stage.releasePointerCapture(e.pointerId);}};
 stage.addEventListener('pointerup',endMouse);
 stage.addEventListener('pointercancel',endMouse);
 $('geoMove').addEventListener('click',()=>setMoveMode(!moveMode));
 $('geoZoomIn').addEventListener('click',()=>zoomAt(scale+.5));
 $('geoZoomOut').addEventListener('click',()=>zoomAt(scale-.5));
 $('geoZoomReset').addEventListener('click',()=>{setMoveMode(false);applyView(1,0,0);});
 // One-finger double-tap on the background zooms without stealing hotspot taps.
 let lastTap=null;
 stage.addEventListener('touchend',e=>{
  if(e.touches.length||e.changedTouches.length!==1||pinch||moveMode)return;
  if(e.target.closest('button'))return;
  const p=inStage(e.changedTouches[0]),now=performance.now();
  if(lastTap&&now-lastTap.time<320&&Math.hypot(p.x-lastTap.x,p.y-lastTap.y)<40){
   zoomAt(scale>=3?1:scale*1.65,p.x,p.y);
   lastTap=null;
   if(e.cancelable)e.preventDefault();
  }else lastTap={...p,time:now};
 },{passive:false});
 applyView(1,0,0);
}

function initialise(){
 $('geoGame').addEventListener('change',e=>{state.game=e.target.value;selected='';update();});
 $('geoTier').addEventListener('change',e=>{state.tier=e.target.value;selected='';update();});
 $('geoChannel').addEventListener('change',e=>{state.channel=e.target.value;selected='';update();});
 $('geoRegion').addEventListener('change',e=>{state.region=e.target.value;selected='';update();});
 $('geoHeat').addEventListener('click',()=>setLayer('heat'));
 $('geoMarkers').addEventListener('click',()=>setLayer('markers'));
 $('geoRegions').addEventListener('click',()=>setLayer('regions'));
 $('geoDateSlider').addEventListener('input',e=>{stop();index=Number(e.target.value);selected='';update();});
 $('geoPlay').addEventListener('click',play);
 gestures();
 document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();});
 if(reduce){$('geoPlay').title='Timeline playback available on request; animation is not automatic.';}
 if('ResizeObserver'in window)new ResizeObserver(resize).observe(stage);
 else window.addEventListener('resize',resize,{passive:true});
}
async function load(){
 try{
  const [a,b]=await Promise.all([
   fetch('./data/geo-winners.json',{cache:'no-store'}),fetch('./data/nz-outline.geojson',{cache:'no-store'})]);
  if(!a.ok||!b.ok)throw new Error('Map records or the NZ outline could not be loaded');
  const info=await a.json(),outline=await b.json();
  if(info.schema_version!==1||!Array.isArray(info.records))throw new Error('Unexpected location database');
  all=info.records.filter(valid);
  if(!all.length)throw new Error('No validated winner locations');
  const ids=new Set();for(const row of all){if(ids.has(row.id))throw new Error('Duplicate location report');ids.add(row.id);}
  countries=outline;createSVGPath(countries);initScene();initializeDates();initialise();
  update();
 }catch(e){
  $('geoMapStatus').textContent='Geo Lab currently unavailable: '+e.message;
  $('geoSelectedTitle').textContent='Reports unavailable';
  $('geoRanking').textContent='Location data cannot be loaded. Try again later.';
 }
}
load();
})();
