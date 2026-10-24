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
let all=[],filtered=[],countries=null,dates=[],index=0,selected='',layer='heat',scale=1,playTimer=0,scene=null;
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
  const rings=Array.isArray(poly[0]?.[0]?.[0])?poly: [poly];
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
  const radius=(layer==='regions'?97:68)*factor*(.65+.45*weight);
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
   style:'left:'+(p.x/580*100).toFixed(4)+'%;top:'+(p.y/760*100).toFixed(4)+'%;--pin-size:'+(19+Math.sqrt(g.tickets/max)*19).toFixed(1)+'px'});
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
 renderPins(groups);drawHeat(groups);renderRanking(groups);
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
function resize(){if(all.length)drawHeat(grouped());}
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
 let zoom=1;
 const setZoom=v=>{zoom=Math.max(1,Math.min(2,v));scene.style.transform='scale('+zoom+')';$('geoZoomIn').disabled=zoom>=2;$('geoZoomOut').disabled=zoom<=1;};
 $('geoZoomIn').addEventListener('click',()=>setZoom(+(zoom+.25).toFixed(2)));
 $('geoZoomOut').addEventListener('click',()=>setZoom(+(zoom-.25).toFixed(2)));
 $('geoZoomReset').addEventListener('click',()=>setZoom(1));
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
