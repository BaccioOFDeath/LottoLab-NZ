/* On-page, evidence-based status for every major LottoLab feature group.
 * Distinguish files that loaded from archive completeness and model validity.
 */
(()=>{
'use strict';
const anchor=document.getElementById('myData')||document.getElementById('combinations');
if(!anchor)return;
const root=document.createElement('section');root.id='dataHealth';root.className='data-health';root.setAttribute('aria-labelledby','healthHeading');
root.innerHTML="<div class=\"health-title\"><div><p>TRANSPARENT DATA COVERAGE</p><h3 id=\"healthHeading\">Site data & quality audit</h3><span>What actually loaded, how much historical coverage exists and which sections still use partial data.</span></div><button type=\"button\" id=\"healthRefresh\">Run audit again</button></div>\n<div class=\"health-summary\"><div><span>Stored Lotto draws</span><strong id=\"healthDraws\">—</strong></div><div><span>Cross-checked draws</span><strong id=\"healthVerified\">—</strong></div><div><span>Missing draw IDs in range</span><strong id=\"healthMissing\">—</strong></div></div>\n<p id=\"healthSummary\" class=\"health-explainer\" role=\"status\" aria-live=\"polite\">Checking live data source files and available site sections…</p>\n<div id=\"healthRows\" class=\"health-grid\"></div>\n<p id=\"healthDate\" class=\"health-date\">Data status reflects stored files at the time checked, not official real-time Lotto NZ updates.</p>";anchor.insertAdjacentElement('afterend',root);
const $=id=>document.getElementById(id);
const items=[
 ['Latest results and archive','results','draws'],
 ['Number frequency, pairings & history','insights','analysis'],
 ['Forever Numbers and history checker','foreverNumbers','saved'],
 ['2–5 number combinations','combinations','combos'],
 ['Next draw research lines','picker','picks'],
 ['Prediction scorecard & ledger','predictions','models'],
 ['Evidence Lab & source coverage','evidence','evidence'],
 ['Geo Lab winning locations','geo','geo'],
 ['Number Universe & Number World','universe','universe'],
 ['Equipment and rule history','insights','context']
];
let running=false,errors=[];
window.addEventListener('error',event=>{if(event.message)errors.push(String(event.message).slice(0,120));});
window.addEventListener('unhandledrejection',event=>{errors.push(String(event.reason||'An unhandled request failed').slice(0,120));});
function output(id,value){$(id).textContent=String(value);}
function entry(title,state,desc,href){
 const div=document.createElement('article');div.className='health-row health-'+state;
 const heading=document.createElement('div'),name=document.createElement('strong'),tag=document.createElement('span');
 name.textContent=title;tag.textContent=state==='ok'?'Data loaded':state==='partial'?'Partial / limited':state==='failed'?'Needs attention':'Waiting';
 heading.append(name,tag);div.append(heading);
 const p=document.createElement('p');p.textContent=desc;div.append(p);
 if(href&&document.getElementById(href)){const a=document.createElement('a');a.href='#'+href;a.textContent='View section';div.append(a);}
 return div;
}
function dateStamp(){return new Date().toLocaleString('en-NZ',{dateStyle:'medium',timeStyle:'short',timeZone:'Pacific/Auckland'});}
async function jsonFile(path){
 const r=await fetch('./data/'+path,{cache:'no-store'});
 if(!r.ok)throw Error('HTTP '+r.status);
 return r.json();
}
function validDraw(d){return d&&Number.isInteger(d.draw)&&/^\d{4}-\d{2}-\d{2}$/.test(d.date)&&Array.isArray(d.numbers)&&d.numbers.length===6&&new Set(d.numbers).size===6&&d.numbers.every(n=>Number.isInteger(n)&&n>=1&&n<=40);}
function newZealandToday(){
 return new Intl.DateTimeFormat('en-CA',{timeZone:'Pacific/Auckland',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
}
async function audit(){
 if(running)return;running=true;
 $('healthRefresh').disabled=true;output('healthSummary','Rechecking the available archive, model, location and rule datasets…');
 const files=['draws.json','legacy-draws.json','model-picks.json','model-performance.json','geo-winners.json','nz-outline.geojson','draw-context.json'];
 const found=await Promise.all(files.map(async path=>{try{return {path,data:await jsonFile(path)}}catch(e){return {path,error:e.message}};}));
 const file=path=>found.find(x=>x.path===path);
 const live=Array.isArray(window.lottoLabDraws)?window.lottoLabDraws.filter(validDraw):[];
 const drawIds=new Set(live.map(d=>d.draw));
 const span=live.length?Math.max(...drawIds)-Math.min(...drawIds)+1:0;
 const missing=span-drawIds.size;
 const verified=live.filter(d=>d.verification==='two-source'&&new Set(d.sources||[]).size>=2).length;
 output('healthDraws',live.length.toLocaleString('en-NZ'));
 output('healthVerified',verified.toLocaleString('en-NZ'));
 output('healthMissing',live.length?missing.toLocaleString('en-NZ'):'—');
 const host=$('healthRows');host.replaceChildren();
 const has=key=>!!document.getElementById(key);
 const latest=live.length?live[0]:null;
 const latestDesc=latest?'Latest stored #'+latest.draw+' ('+latest.date+'). '+verified+' cross-checked records out of '+live.length+'.':'No merged draw history loaded.';
 const latestDate=latest?.date;
 const daysSince=latestDate?Math.max(0,Math.round((Date.parse(newZealandToday()+'T00:00:00Z')-Date.parse(latestDate+'T00:00:00Z'))/86400000)):null;
 const archiveLoaded=!!live.length;
 const fileSummary=path=>file(path)?.error?path+': '+file(path).error:'';
 for(const [title,id,kind] of items){
  let state='ok',desc='';
  if(!has(id)){state='failed';desc='Section is missing from this version of the page.';}
  else if(kind==='draws'){
   if(!archiveLoaded){state='failed';desc='Merged draw archive did not initialise. '+fileSummary('draws.json');}
   else{state=missing||verified<live.length?'partial':'ok';desc=latestDesc+' '+(daysSince>7?'Latest stored draw is more than seven days old. ':'')+'Missing '+missing+' draw IDs in the stored number range.';if(daysSince>7)state='failed';}
  }else if(kind==='analysis'){
   if(!Array.isArray(window.lottoLabAnalysisDraws)){state='failed';desc='Shared number-analysis sample not initialised.';}
   else{state=archiveLoaded?'partial':'failed';desc=window.lottoLabAnalysisDraws.length+' draws available in the current analysis filters. The archive is incomplete; equipment filters cannot infer missing assignment IDs.';}
  }else if(kind==='saved'){
   state=archiveLoaded?'partial':'ok';desc='Six-number entry and private local saved lines are on-device only. '+(archiveLoaded?live.length+' historical draws available to compare.':'Historical comparison requires the draw archive.');
  }else if(kind==='combos'){
   state=archiveLoaded?'partial':'failed';desc=archiveLoaded?'Ranks 2–5 number combinations from the '+live.length+' available draws; incomplete history affects counts.':'History missing, cannot rank combinations.';
  }else if(kind==='picks'){
   const picks=file('model-picks.json');
   if(picks.error||!Array.isArray(picks.data)){state='failed';desc='Published research selections unavailable. '+(picks.error||'');}
   else{
    const pending=picks.data.filter(p=>p.status==='pending');
    const dated=pending.map(p=>p.target_date).sort().at(-1);
    const lines=pending.filter(p=>p.target_date===dated&&Array.isArray(p.numbers)&&p.numbers.length===6);
    state=lines.length===20?'ok':'partial';desc=lines.length+' stored lines target '+(dated||'unavailable')+'. These are research lines, not validated predictions or purchased tickets.';
   }
  }else if(kind==='models'){
   const stats=file('model-performance.json');
   if(stats.error||!stats.data?.backtest){state='failed';desc='Model performance dataset unavailable. '+(stats.error||'');}
   else{
    const s=stats.data;state='partial';
    desc='Scorecard generated '+(s.generated_at?.slice(0,10)||'unknown')+'; '+(s.stored_draw_count??'unknown')+' draws in its own modelling subset, compared with '+live.length+' available in the public merged archive. These counts need not be equal. Future-draw predictive edge is unproven.';
   }
  }else if(kind==='evidence'){
   state=archiveLoaded?'partial':'failed';
   desc=archiveLoaded?verified+' independently cross-checked stored draws; '+missing+' missing IDs within the archive range. The 1987-to-present history remains incomplete.':'Draw archive not available for evidence tests.';
  }else if(kind==='geo'){
   const geo=file('geo-winners.json'),outline=file('nz-outline.geojson');
   if(geo.error||outline.error||!Array.isArray(geo.data?.records)){state='failed';desc='Map source files unavailable. '+(geo.error||outline.error||'');}
   else{
    state='partial';
    const dates=geo.data.records.map(r=>r.draw_date).filter(d=>/^\d{4}-\d{2}-\d{2}$/.test(d)).sort();
    desc=geo.data.records.length+' published winner-location references; latest reported date '+(dates.at(-1)||'unknown')+'. This is a selected release sample without reliable ticket-sales denominators; NOT a complete geographic win census.';
   }
  }else if(kind==='universe'){
   if(!archiveLoaded||!has('universeCanvas')||!has('worldCanvas')){state='failed';desc='One or more visualizations or their shared draw data are unavailable.';}
   else{state='partial';desc='Both canvases are present, using the current filtered draw sample ('+(window.lottoLabAnalysisDraws?.length??'unknown')+' draws). The original archive is incomplete. Presence does not guarantee device GPU rendering.';}
  }else if(kind==='context'){
   const ctx=file('draw-context.json');
   if(ctx.error||!ctx.data?.events){state='failed';desc='Rules/equipment history unavailable. '+(ctx.error||'');}
   else{state='partial';desc=ctx.data.events.length+' dated rule/history events. Individual draw machine IDs and ball-set IDs are not documented and must not be fabricated.';}
  }
  host.append(entry(title,state,desc,id));
 }
 const missingFiles=found.filter(x=>x.error);
 const problem=missingFiles.length?' '+missingFiles.length+' source file(s) could not be loaded.':'';
 output('healthSummary',live.length?
  'Data audit: '+live.length.toLocaleString('en-NZ')+' stored draw records; '+verified.toLocaleString('en-NZ')+' cross-checked. '+missing.toLocaleString('en-NZ')+' missing draw IDs between the earliest and latest stored draw. This is a PARTIAL archive, not a complete history.'+problem:
  'Unable to confirm the public draw archive.'+problem);
 output('healthDate','Last checked: '+dateStamp()+'. '+(errors.length?'Browser errors seen since this tool loaded: '+errors.length+'.':'No uncaught browser errors captured since this tool loaded.')+' This audit checks files, metadata and section presence; it is not an official Lotto NZ audit.');
 $('healthRefresh').disabled=false;running=false;
}
$('healthRefresh').addEventListener('click',audit);
window.addEventListener('lottolab:data-ready',()=>{if(!running)audit();});
window.addEventListener('lottolab:data-error',()=>{if(!running)audit();});
audit();
})();