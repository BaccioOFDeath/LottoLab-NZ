'use strict';const $=id=>document.getElementById(id);let draws=[],visible=[],limit=12,selectedNumber=null,drawContext={events:[],by_draw:{}};
const ball=(n,kind='')=>'<span class="ball '+kind+'">'+String(n).padStart(2,'0')+'</span>';
const dateNZ=d=>new Date(d+'T12:00:00Z').toLocaleDateString('en-NZ',{timeZone:'UTC',weekday:'long',day:'numeric',month:'long',year:'numeric'}); // Draw dates are civil NZ calendar dates, not UTC instants.
const calendarDay=d=>new Date(d+'T12:00:00Z').getUTCDay();
function valid(d){return Number.isInteger(d.draw)&&/^\d{4}-\d{2}-\d{2}$/.test(d.date)&&Array.isArray(d.numbers)&&d.numbers.length===6&&new Set(d.numbers).size===6&&d.numbers.every(n=>Number.isInteger(n)&&n>=1&&n<=40)&&Number.isInteger(d.bonus)&&d.bonus>=1&&d.bonus<=40&&!d.numbers.includes(d.bonus)&&((d.date<'2001-02-01'&&d.powerball===null)||(Number.isInteger(d.powerball)&&d.powerball>=1&&d.powerball<=(d.date>='2026-09-16'?14:10)))}
function sample(){const era=$('ruleFilter').value,machine=$('equipmentFilter').value,ballSet=$('ballSetFilter').value,operator=$('operatorFilter').value;
let subset=draws.filter(d=>(era==='all'||(era==='pb14'?d.date>='2026-09-16':(d.date>='2001-02-01'&&d.date<'2026-09-13')))&&
(machine==='all'||drawContext.by_draw?.[d.draw]?.machine_id===machine)&&
(ballSet==='all'||drawContext.by_draw?.[d.draw]?.ball_set_id===ballSet)&&
(operator==='all'||drawContext.by_draw?.[d.draw]?.operator_id===operator));
const n=$('windowFilter').value;return n==='all'?subset:subset.slice(0,+n)}
function updateLatest(){let d=draws[0];$('lastUpdated').textContent='Archive through '+dateNZ(d.date);$('latestDate').textContent=dateNZ(d.date);$('latestDraw').textContent='Draw #'+d.draw;$('mainBalls').innerHTML=d.numbers.map(n=>'<button type="button" class="ball result-number-button" data-inspect="'+n+'" aria-label="Explore historical frequency for Lotto number '+n+'" title="Touch to explore this number">'+String(n).padStart(2,'0')+'</button>').join('');$('bonusBall').innerHTML=ball(d.bonus,'bonus');$('powerBall').innerHTML=ball(d.powerball,'power');$('verifyBadge').textContent=d.verification==='two-source'?'Cross-checked · 2 sources':'Awaiting verification';$('resultCaption').textContent=d.verification==='two-source'?'Matched across two published sites':'Stored record · not independently audited';$('resultSource').href='https://mylotto.co.nz/';const verifiedCount=draws.filter(x=>x.verification==='two-source').length;$('dataState').textContent=draws.length+' records · '+verifiedCount+' cross-checked';let next=new Date();const nowParts=new Intl.DateTimeFormat('en-CA',{timeZone:'Pacific/Auckland',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(next);const p=Object.fromEntries(nowParts.map(x=>[x.type,x.value]));const base=new Date(p.year+'-'+p.month+'-'+p.day+'T12:00:00Z');for(let i=0;i<=7;i++){let d=new Date(base.getTime()+i*86400000);let w=d.getUTCDay();if(w===3||w===6){$('nextDraw').textContent=d.toLocaleDateString('en-NZ',{timeZone:'UTC',weekday:'long',day:'numeric',month:'long'});$('nextDrawTime').textContent=w===3?'8:20 pm NZ time':'8:00 pm NZ time';break}}}
function renderContext(){
const ids=drawContext.by_draw||{};
for(const [selectId,key,type] of [['equipmentFilter','machine_id','machines'],['ballSetFilter','ball_set_id','ball sets'],['operatorFilter','operator_id','operators']]){
const select=$(selectId),current=select.value;
const options=[...new Set(Object.values(ids).map(x=>x?.[key]).filter(v=>typeof v==='string'&&v.trim()))].sort();
select.innerHTML='';
const base=document.createElement('option');base.value='all';base.textContent=options.length?'All documented '+type+' (unknowns included)':'Unknown · no individual IDs';
select.appendChild(base);for(const id of options){const o=document.createElement('option');o.value=id;o.textContent=id+' (documented)';select.appendChild(o)}
select.disabled=options.length===0;select.value=options.includes(current)?current:'all';
}
const covered=draws.filter(d=>ids[d.draw]?.machine_id&&ids[d.draw]?.ball_set_id).length;
$('equipmentCoverage').textContent=covered+' of '+draws.length+' archived draws have both a documented machine and ball-set ID. Operator IDs are not recorded. Unknown never means a specific machine, ball set or operator.';
const events=$('contextTimeline');events.replaceChildren();
for(const e of drawContext.events||[]){
const row=document.createElement('div');row.className='context-event';
const anchor=document.createElement('a');anchor.href=e.source||'#';anchor.target='_blank';anchor.rel='noopener noreferrer';anchor.textContent='Source ↗';
const main=document.createElement('div'),date=document.createElement('strong'),title=document.createElement('span'),note=document.createElement('p');
date.textContent=e.date||'Date unknown';title.textContent=e.title;note.textContent=e.note||'';
main.append(date,title,note);row.append(main,anchor);events.appendChild(row);
}
if(!events.children.length)events.textContent='No documented change events available.';
}
function updateContextHint(){
const selected=sample(),era=$('ruleFilter').value;
const description=era==='pb14'?'New Powerball 1–14 format':era==='pb10'?'Old Powerball 1–10 format':'Lotto 6/40 format across available dates';
$('contextCount').textContent=selected.length+' comparable draws';
$('contextHint').textContent=description+' · '+selected.length+' draws. Six-from-40 main-ball odds stay the same.';
window.lottoLabAnalysisDraws=selected;
window.dispatchEvent(new Event('lottolab:analysis-changed'));
}
function updateAnalysis(){const data=sample(),n=data.length,counts=Array(41).fill(0),pb=Array(15).fill(0),pairs=new Map();let odd=0,sum=0,withConsecutive=0;
for(const d of data){const ns=[...d.numbers].sort((a,b)=>a-b);for(const x of ns)counts[x]++;if(Number.isInteger(d.powerball))pb[d.powerball]++;odd+=ns.filter(x=>x%2===1).length;sum+=ns.reduce((a,b)=>a+b,0);if(ns.some((x,i)=>i>0&&x===ns[i-1]+1))withConsecutive++;for(let i=0;i<6;i++)for(let j=i+1;j<6;j++){const k=ns[i]+','+ns[j];pairs.set(k,(pairs.get(k)||0)+1)}}
updateContextHint();if(n===0){$('drawCount').textContent='0';$('hotNumber').textContent='—';$('coldNumber').textContent='—';$('topPower').textContent='—';$('hotDesc').textContent='No records';$('coldDesc').textContent='No records';$('powerRule').textContent='No records in this comparable group';$('frequencyGrid').textContent='No data for these conditions.';$('pairList').textContent='No comparable number pairs.';$('patternList').textContent='No statistics for the chosen conditions.';$('numberDetail').textContent='Adjust the filters to include more draws.';updatePower();return}
let ranking=counts.slice(1).map((count,i)=>({number:i+1,count})).sort((a,b)=>b.count-a.count||a.number-b.number);
$('drawCount').textContent=n;$('hotNumber').textContent=String(ranking[0].number).padStart(2,'0');$('hotDesc').textContent=ranking[0].count+' appearances';let least=[...ranking].sort((a,b)=>a.count-b.count||a.number-b.number)[0];$('coldNumber').textContent=String(least.number).padStart(2,'0');$('coldDesc').textContent=least.count+' appearances';const period=$('powerPeriod').value,cap=period==='current'?14:10;
const periodRows=data.filter(d=>Number.isInteger(d.powerball)&&(period==='current'?d.date>='2026-09-16':d.date<'2026-09-13'));
const periodPb=Array(cap+1).fill(0);for(const d of periodRows)periodPb[d.powerball]++;
const top=periodPb.slice(1).map((count,i)=>({number:i+1,count})).sort((a,b)=>b.count-a.count||a.number-b.number)[0];
$('topPower').textContent=periodRows.length?String(top.number).padStart(2,'0'):'—';
$('powerRule').textContent=periodRows.length?top.count+' / '+periodRows.length+' draws · PB 1–'+cap:'No PB 1–'+cap+' draws in selected conditions';
const max=Math.max(1,...counts);$('frequencyGrid').innerHTML=counts.slice(1).map((c,i)=>{let alpha=(.08+c/max*.86).toFixed(3);return '<button type="button" class="frequency-cell '+(selectedNumber===i+1?'selected':'')+'" data-number="'+(i+1)+'" title="Number '+(i+1)+': '+c+' appearance(s)" style="background:rgba(120,62,244,'+alpha+');color:'+(c/max>.50?'white':'#52387c')+'">'+String(i+1).padStart(2,'0')+'</button>'}).join('');
$('sampleExplanation').textContent='Based on '+n+' stored draws ('+(6*n)+' main-ball observations).';const see=selectedNumber;const detail=see?ranking.find(x=>x.number===see):null;$('numberDetail').textContent=detail?'Number '+see+' appeared '+detail.count+' time(s) in the selected sample ('+(100*detail.count/n).toFixed(1)+'% of draws). Expected probability per draw under 6/40 rules: 15%.':'Select a number in the heat map to see its history.';
$('patternList').innerHTML=[['Average odd numbers',(odd/n).toFixed(2)+' / 6'],['Average sum of six numbers',(sum/n).toFixed(1)],['Draws containing consecutive numbers',(100*withConsecutive/n).toFixed(1)+'%'],['Expected appearances per number',(6*n/40).toFixed(2)]].map(([a,b])=>'<div class="pattern-row"><span>'+a+'</span><strong>'+b+'</strong></div>').join('');
$('pairList').innerHTML=[...pairs.entries()].sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0])).slice(0,12).map(([k,v])=>'<span class="pair">'+k.replace(',',' + ')+' <small>· '+v+'x</small></span>').join('');updatePower();}
function updatePower(){let period=$('powerPeriod').value,subset=sample().filter(d=>Number.isInteger(d.powerball)&&(period==='current'?d.date>='2026-09-16':d.date<'2026-09-13')),cap=period==='current'?14:10,counts=Array(cap+1).fill(0);for(const d of subset)counts[d.powerball]++;const max=Math.max(1,...counts);$('powerChart').innerHTML=counts.slice(1).map((n,i)=>'<div class="chart-col" title="Powerball '+(i+1)+': '+n+' time(s)"><div class="bar" style="height:'+(8+100*n/max)+'px"></div>'+(i+1)+'</div>').join('');$('powerPeriodNote').textContent=subset.length+' stored draws in this period. These figures describe this sample only.'}
function archiveFilter(){const q=$('searchDraws').value.trim().toLowerCase(),day=$('weekdayFilter').value;visible=draws.filter(d=>(day==='all'||calendarDay(d.date)===Number(day))&&(!q||String(d.draw).includes(q)||d.date.includes(q)||d.numbers.some(n=>String(n)===q)));if($('orderFilter').value==='oldest')visible.reverse();renderArchive()}
function renderArchive(){const rows=visible.slice(0,limit);$('archiveList').innerHTML='<div class="archive-row archive-head"><div>DRAW</div><div>DATE</div><div>WINNING NUMBERS</div><div>BONUS</div><div>POWER</div></div>'+rows.map(d=>'<div class="archive-row"><div class="archive-draw">#'+d.draw+'</div><div>'+d.date+'</div><div class="archive-numbers">'+d.numbers.map(n=>ball(n)).join('')+'</div><div>'+ball(d.bonus,'bonus')+'</div><div>'+(d.powerball===null?'<span class="ball-na" title="Powerball was not offered for this draw">—</span>':ball(d.powerball,'power'))+'</div></div>').join('')+(rows.length?'':'<p style="padding:22px">No matching results.</p>');$('archiveCount').textContent='Showing '+rows.length+' of '+visible.length+' matching records';$('showMore').hidden=rows.length>=visible.length}
$('windowFilter').addEventListener('change',updateAnalysis);$('powerPeriod').addEventListener('change',updateAnalysis);$('ruleFilter').addEventListener('change',()=>{const era=$('ruleFilter').value;if(era==='pb14')$('powerPeriod').value='current';if(era==='pb10')$('powerPeriod').value='previous';updateAnalysis()});for(const id of ['equipmentFilter','ballSetFilter','operatorFilter'])$(id).addEventListener('change',updateAnalysis);$('frequencyGrid').addEventListener('click',e=>{const btn=e.target.closest('[data-number]');if(btn){selectedNumber=+btn.dataset.number;updateAnalysis()}});for(const el of ['searchDraws','weekdayFilter','orderFilter'])$(el).addEventListener(el==='searchDraws'?'input':'change',()=>{limit=12;archiveFilter()});$('showMore').addEventListener('click',()=>{limit+=25;renderArchive()});$('exportCsv').addEventListener('click',()=>{const csv=['draw,date,n1,n2,n3,n4,n5,n6,bonus,powerball',...visible.map(d=>[d.draw,d.date,...d.numbers,d.bonus,d.powerball].join(','))].join('\n');const u=URL.createObjectURL(new Blob([csv],{type:'text/csv'})),a=document.createElement('a');a.href=u;a.download='lottolab-nz-draws.csv';a.click();setTimeout(()=>URL.revokeObjectURL(u),2000)});
$('menuToggle').addEventListener('click',()=>{let open=$('mobileNav').hidden;$('mobileNav').hidden=!open;$('menuToggle').setAttribute('aria-expanded',String(open))});$('mobileNav').addEventListener('click',e=>{if(e.target.closest('a')){$('mobileNav').hidden=true;$('menuToggle').setAttribute('aria-expanded','false')}});$('year').textContent=new Date().getFullYear();
Promise.all([fetch('./data/draws.json',{cache:'no-store'}).then(r=>{if(!r.ok)throw Error('Archive HTTP '+r.status);return r.json()}),fetch('./data/draw-context.json',{cache:'no-store'}).then(r=>r.ok?r.json():null).catch(()=>null),fetch('./data/legacy-draws.json',{cache:'no-store'}).then(r=>r.ok?r.json():[]).catch(()=>[])]).then(([rows,ctx,legacy])=>{drawContext=ctx&&typeof ctx==='object'?ctx:{events:[],by_draw:{}};if(!Array.isArray(rows))throw Error('Invalid archive format');const all=new Map();for(const d of Array.isArray(legacy)?legacy:[])if(valid(d))all.set(d.draw,d);for(const d of rows.filter(valid))all.set(d.draw,d);draws=[...all.values()].sort((a,b)=>b.draw-a.draw);if(!draws.length)throw Error('No valid records');window.lottoLabDraws=draws;renderContext();window.dispatchEvent(new Event('lottolab:data-ready'));updateLatest();updateAnalysis();archiveFilter()}).catch(e=>{
 $('dataState').textContent='Archive unavailable';
 $('lastUpdated').textContent='Unable to load data';
 $('archiveList').textContent='Unable to load archived draw data. '+e.message;
 $('latestDate').textContent='Results temporarily unavailable';
 $('latestDraw').textContent='Unable to load latest draw';
 $('verifyBadge').textContent='Unavailable';
 $('resultCaption').textContent='Please check back for the verified draw';
 $('mainBalls').textContent='Results currently unavailable';
 $('bonusBall').textContent='—';$('powerBall').textContent='—';
 $('drawCount').textContent='—';$('hotNumber').textContent='—';
 $('coldNumber').textContent='—';$('topPower').textContent='—';
 $('frequencyGrid').textContent='Number analysis is unavailable until the archive loads.';
 $('powerChart').textContent='Powerball history is temporarily unavailable.';
 $('archiveCount').textContent='Data unavailable';
 $('contextHint').textContent='Draw data unavailable; filters are temporarily inactive.';
 window.dispatchEvent(new Event('lottolab:data-error'));
});