(()=>{
'use strict';
const $=id=>document.getElementById(id), base='./data/keno-results.json', key='lottolab-keno-import-v1';
let records=[],selected=[],active=null,dailyPicks=null,ticketsExpanded=false;
const iso=s=>/^\d{4}-\d{2}-\d{2}$/.test(s)&&!Number.isNaN(Date.parse(s+'T12:00:00Z'));
const sanitize=r=>{if(!r||!iso(String(r.date||'')))return null;let n=Array.isArray(r.numbers)?r.numbers:String(r.numbers||'').trim().split(/[ ;|]+/).map(Number);n=n.map(Number);if(n.length!==20||new Set(n).size!==20||n.some(x=>!Number.isInteger(x)||x<1||x>80))return null;const draw=String(r.draw||'').trim();return {date:String(r.date),draw,time:r.time||"",source:r.source||"",numbers:n.sort((a,b)=>a-b),multiplier:r.multiplier||null};};
const merge=(a,b)=>{const m=new Map();[...a,...b].forEach(x=>{const r=sanitize(x);if(r)m.set(r.date+'|'+r.draw+'|'+r.numbers.join('-'),r)});return [...m.values()].sort((x,y)=>x.date.localeCompare(y.date)||Number(x.draw||0)-Number(y.draw||0))};
const latest=()=>records[records.length-1];
const sample=()=>Number($('window').value)?records.slice(-Number($('window').value)):records;
const counts=data=>{const c=Array(81).fill(0);data.forEach(r=>r.numbers.forEach(n=>c[n]++));return c};
const balls=(id,handler)=>{const root=$(id);root.replaceChildren();for(let n=1;n<=80;n++){const b=document.createElement('button');b.className='ball';b.textContent=n;b.type='button';b.dataset.number=n;b.onclick=()=>handler(n);root.append(b)}};
const chosen=()=>[...selected].sort((a,b)=>a-b);
const render=()=>{const d=sample(),c=counts(d),last=latest();$('drawCount').textContent=records.length.toLocaleString();$('dateRange').textContent=records.length?records[0].date+' → '+last.date:'No history';$('latestDraw').textContent=last?last.draw||last.date:'—';if($('latestDateLabel'))$('latestDateLabel').textContent=last?last.date:'No published draws';if($('latestTimeLabel'))$('latestTimeLabel').textContent=last?last.time||'Time unavailable':'—';if($('latestBalls')){const root=$('latestBalls');root.replaceChildren();if(last){last.numbers.forEach(n=>{const b=document.createElement('span');b.textContent=String(n).padStart(2,'0');root.append(b)})}else root.textContent='Historical results have not loaded yet.'}$('status').textContent=records.length?'Loaded '+records.length.toLocaleString()+' distinct verified-format draw records. Imported results must still be checked against their source.':'No verified historical Keno draws have been imported yet. Upload a results CSV to begin.';const rows=records.slice(-30).reverse();$('historyRows').replaceChildren();rows.forEach(r=>{const tr=document.createElement('tr');[r.date,r.draw||'—',r.numbers.join(' · '),r.multiplier||'—'].forEach(t=>{let td=document.createElement('td');td.textContent=t;tr.append(td)});$('historyRows').append(tr)});[...$('heatmap').children].forEach(b=>{const n=Number(b.dataset.number),p=d.length?c[n]/d.length:0;b.style.background=d.length?'hsl('+Math.round(200-160*Math.min(1,p/.4))+' 55% '+Math.round(18+25*Math.min(1,p/.4))+'%)':'';b.title=n+': '+c[n]+' / '+d.length+' draws';b.classList.toggle('selected',active===n)});[...$('builder').children].forEach(b=>b.classList.toggle('selected',selected.includes(Number(b.dataset.number))));$('selection').textContent=selected.length?chosen().join('  ·  '):'No numbers selected';$('numberDetails').textContent=active==null?'Select a number to inspect historical frequency and pairings.':details(active,d,c);$('suggestion').textContent=selected.length?details(selected[selected.length-1],d,c):'Select a number to inspect historical co-occurrences.';if(!last||!selected.length)$('checkResult').textContent='Load historical results and select a line to check the latest draw.';else{const match=selected.filter(n=>last.numbers.includes(n));$('checkResult').textContent=match.length+' of '+selected.length+' matched on '+last.date+' ('+(last.draw||'draw unknown')+'): '+(match.join(', ')||'none')+'. This is not a prize determination.'}renderIndependentOdds();};
const details=(n,data,c)=>{if(!data.length)return 'Number '+n+': no historical data loaded.';const pair=Array(81).fill(0);data.filter(r=>r.numbers.includes(n)).forEach(r=>r.numbers.forEach(v=>{if(v!==n)pair[v]++}));const top=Array.from({length:80},(_,i)=>i+1).filter(x=>x!==n).sort((a,b)=>pair[b]-pair[a]||a-b).slice(0,5);return 'Number '+n+': '+c[n]+' appearances / '+data.length+' draws ('+(100*c[n]/data.length).toFixed(1)+'%). Top co-occurrences: '+top.map(x=>x+' ('+pair[x]+')').join(', ')+'. These do not improve future odds.'};
balls('heatmap',n=>{active=n;render()});balls('builder',n=>{if(selected.includes(n))selected=selected.filter(x=>x!==n);else if(selected.length<Number($('pickSize').value))selected.push(n);render()});
$('window').onchange=render;$('pickSize').onchange=()=>{selected=selected.slice(0,Number($('pickSize').value));render()};
$('clearLine').onclick=()=>{selected=[];render()};
$('randomLine').onclick=()=>{const a=Array.from({length:80},(_,i)=>i+1);for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}selected=a.slice(0,Number($('pickSize').value));render()};
$('frequencyLine').onclick=()=>{const c=counts(sample());selected=Array.from({length:80},(_,i)=>i+1).sort((a,b)=>c[b]-c[a]||a-b).slice(0,Number($('pickSize').value));render()};
$('copyLine').onclick=async()=>{const txt=chosen().join(', ');try{await navigator.clipboard.writeText(txt);$('status').textContent='Copied: '+txt}catch{$('status').textContent='Copy unavailable; selected numbers: '+txt}};
function parseCsv(s){const lines=s.replace(/^\uFEFF/,'').trim().split(/\r?\n/);const head=lines.shift().split(',').map(x=>x.trim().toLowerCase());const idx=n=>head.indexOf(n);if(idx('date')<0)throw Error('Missing date column');let result=[];for(const line of lines){const p=line.split(',').map(x=>x.trim().replace(/^"|"$/g,''));let nums=idx('numbers')>=0?p[idx('numbers')]:Array.from({length:20},(_,i)=>p[idx('n'+(i+1))]);const r=sanitize({date:p[idx('date')],draw:idx('draw')<0?'':p[idx('draw')],numbers:nums,multiplier:idx('multiplier')<0?'':p[idx('multiplier')]});if(r)result.push(r)}return result}
$('csvFile').onchange=async e=>{try{const imported=parseCsv(await e.target.files[0].text());if(!imported.length)throw Error('No valid results rows found');const local=JSON.parse(localStorage.getItem(key)||'[]');localStorage.setItem(key,JSON.stringify(merge(local,imported)));records=merge(records,imported);render();$('status').textContent='Imported '+imported.length+' valid rows. Verify against official results; imports are saved on this device.'}catch(e){$('status').textContent='Import failed: '+e.message}};
$('resetData').onclick=()=>{localStorage.removeItem(key);location.reload()};
$('exportCsv').onclick=()=>{const csv=['date,draw,n1,n2,n3,n4,n5,n6,n7,n8,n9,n10,n11,n12,n13,n14,n15,n16,n17,n18,n19,n20,multiplier',...records.map(r=>[r.date,r.draw,...r.numbers,r.multiplier||''].join(','))].join('\n');const a=document.createElement('a'),u=URL.createObjectURL(new Blob([csv],{type:'text/csv'}));a.href=u;a.download='lottolab-keno-results.csv';a.click();setTimeout(()=>URL.revokeObjectURL(u),1000)};
function modelLinesFor(history,seedNumber){
 const all=counts(history),recent=counts(history.slice(-80));
 const nums=Array.from({length:80},(_,i)=>i+1);
 const ranked=(c,asc=false)=>nums.slice().sort((a,b)=>asc?c[a]-c[b]||a-b:c[b]-c[a]||a-b).slice(0,10);
 const hot=ranked(all),momentum=ranked(recent),cold=ranked(recent,true);
 const pair=Array.from({length:81},()=>new Uint16Array(81));
 const limited=history.slice(-300), limitedCount=counts(limited);
 for(const row of limited){for(let i=0;i<row.numbers.length;i++)for(let j=i+1;j<row.numbers.length;j++){const a=row.numbers[i],b=row.numbers[j];pair[a][b]++;pair[b][a]++}}
 const chosen=[hot[0]];
 while(chosen.length<10){
  let next=0,best=-Infinity;
  for(const n of nums){if(chosen.includes(n))continue;let v=0;for(const k of chosen)v+=pair[n][k]-(limitedCount[n]*limitedCount[k]/limited.length);v+=.05*all[n];if(v>best){best=v;next=n}}
  chosen.push(next)
 }
 const zones=[];for(let low=1;low<=80;low+=8)zones.push(nums.slice(low-1,low+7).sort((a,b)=>all[b]-all[a]||a-b)[0]);
 let seed=seedNumber>>>0;
 const rand=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296};
 const pool=nums.slice();for(let i=pool.length-1;i>0;i--){const j=Math.floor(rand()*(i+1));[pool[i],pool[j]]=[pool[j],pool[i]]}
 return {historical:hot,recent:momentum,cold,network:chosen,spread:zones,random:pool.slice(0,10)};
}
$('runTest').onclick=()=>{
 const panel=$('backtest');if(records.length<51){panel.textContent='At least 51 chronological draws are needed to run walk-forward validation. Loaded: '+records.length;return}
 const last=Math.max(50,records.length-150),scores={historical:0,recent:0,cold:0,network:0,spread:0,random:0},wins={historical:0,recent:0,cold:0,network:0,spread:0,random:0},n=records.length-last;
 for(let i=last;i<records.length;i++){
  const previous=records.slice(Math.max(0,i-600),i),sets=modelLinesFor(previous,Number(records[i].draw)),actual=new Set(records[i].numbers);
  for(const id of Object.keys(scores)){const hits=sets[id].filter(v=>actual.has(v)).length;scores[id]+=hits;if(hits>=5)wins[id]++}
 }
 panel.replaceChildren();
 const summary=document.createElement('p');summary.textContent='Walk-forward validation across '+n+' held-out draws. Each prediction is generated using previous draws only, with no future data.';
 panel.append(summary);
 const table=document.createElement('table'),thead=document.createElement('thead'),head=document.createElement('tr');['Model','Average hits of 10','5+ matches'].forEach(label=>{const th=document.createElement('th');th.textContent=label;head.append(th)});thead.append(head);table.append(thead);
 const tbody=document.createElement('tbody');
 for(const [id,name] of Object.entries({historical:'Historical hot',recent:'Recent momentum',cold:'Recent cold',network:'Pair network',spread:'Balanced zones',random:'Random control'})){
  const tr=document.createElement('tr');[name,(scores[id]/n).toFixed(3),wins[id]+' / '+n].forEach(value=>{const td=document.createElement('td');td.textContent=value;tr.append(td)});tbody.append(tr)
 }
 table.append(tbody);panel.append(table);
 const foot=document.createElement('p');foot.className='small';foot.textContent='Random-draw expectation: 2.500 matches per 10-number line. Even apparently better historical results can be chance or overfitting. Comparing many models increases the risk of misleading winners.';panel.append(foot);
};

const nzDate=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'Pacific/Auckland',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
const formatDay=s=>{const [y,m,d]=s.split('-').map(Number);return new Intl.DateTimeFormat('en-NZ',{day:'numeric',month:'long',year:'numeric',timeZone:'UTC'}).format(new Date(Date.UTC(y,m-1,d,12)))};
const copyText=async text=>{try{await navigator.clipboard.writeText(text);return true}catch{return false}};
function renderPredictions(){
 const list=$('suggestedLines'), meta=$('picksMeta'), intro=$('picksIntro'),date=$('picksDate'),score=$('dailyScore');
 if(!list)return;
 list.replaceChildren();list.dataset.expanded=String(ticketsExpanded);
 const toggle=$('togglePicks');
 if(toggle){toggle.textContent=ticketsExpanded?'Show fewer tickets ↑':'View all 6 tickets ↓';toggle.setAttribute('aria-expanded',String(ticketsExpanded));toggle.onclick=()=>{ticketsExpanded=!ticketsExpanded;list.dataset.expanded=String(ticketsExpanded);toggle.textContent=ticketsExpanded?'Show fewer tickets ↑':'View all 6 tickets ↓';toggle.setAttribute('aria-expanded',String(ticketsExpanded))}}
 if(!dailyPicks||!Array.isArray(dailyPicks.models)||!dailyPicks.models.length){list.textContent='Dated Keno research tickets have not yet been published.';meta.textContent='Awaiting selections';score.textContent='No draw record or historical model performance is claimed without published selections.';if(toggle)toggle.hidden=true;return}
 if(toggle)toggle.hidden=dailyPicks.models.length<=2;
 const stale=dailyPicks.date!==nzDate(), eligible=Number(dailyPicks.first_scored_draw||0);
 if(date)date.textContent=(stale?'MOST RECENT POSTED · ':'DAILY RESEARCH · ')+formatDay(dailyPicks.date).toUpperCase();
 const valid=records.filter(r=>r.date===dailyPicks.date&&(!eligible||Number(r.draw)>=eligible));
 const sets=valid.map(r=>({draw:r.draw,ns:new Set(r.numbers)}));
 intro.textContent=(stale?'These are the last published tickets, NOT new selections for today. ':'')+
 'Each ticket highlights its ten numbers on the full 1–80 Keno grid. '+
 'Models use earlier results and have exactly the same theoretical draw probability as random picks.';
 meta.textContent='Published '+new Date(dailyPicks.created_at).toLocaleString('en-NZ',{timeZone:'Pacific/Auckland',dateStyle:'medium',timeStyle:'short'})+
 ' NZT · '+(dailyPicks.training_draws||'—')+' training draws · eligible from '+(dailyPicks.eligible_from||'publication');
 dailyPicks.models.forEach((m,i)=>{
  const numbers=Array.isArray(m.numbers)?m.numbers.map(Number):[];
  const chosenSet=new Set(numbers);
  if(numbers.length!==10||chosenSet.size!==10||numbers.some(n=>!Number.isInteger(n)||n<1||n>80))return;
  const card=document.createElement('article');card.className='prediction-card'+(m.id==='random'?' control':'');card.setAttribute('aria-label',m.name+' Keno number ticket');
  const head=document.createElement('div');head.className='ticket-header';
  const block=document.createElement('div');const ticketTag=document.createElement('div');ticketTag.className='ticket-number';ticketTag.textContent='KENO TICKET '+String(i+1).padStart(2,'0')+(m.id==='random'?' · CONTROL':'');
  const title=document.createElement('h3');title.textContent=m.name;
  const sub=document.createElement('p');sub.className='subtitle';sub.textContent=m.description||'Historical research selection';
  block.append(ticketTag,title,sub);const badge=document.createElement('div');badge.className='ticket-meta';badge.textContent='10 / 80';head.append(block,badge);
  const sheet=document.createElement('div');sheet.className='ticket-sheet';
  const top=document.createElement('div');top.className='ticket-topline';const name=document.createElement('span');name.textContent='LOTTOLAB KENO · NZ';const count=document.createElement('span');count.textContent='MARKED: 10';top.append(name,count);
  const grid=document.createElement('div');grid.className='ticket-grid';grid.setAttribute('aria-label','Numbers 1 to 80; marked numbers: '+numbers.slice().sort((a,b)=>a-b).join(', '));
  for(let n=1;n<=80;n++){const cell=document.createElement('span');cell.className='ticket-cell'+(chosenSet.has(n)?' hit':'');cell.textContent=String(n).padStart(2,'0');grid.append(cell)}
  const sheetBottom=document.createElement('div');sheetBottom.className='ticket-sheet-footer';const f1=document.createElement('span');f1.textContent='1—80 KENO';const f2=document.createElement('span');f2.textContent='TEN NUMBERS PICKED';sheetBottom.append(f1,f2);sheet.append(top,grid,sheetBottom);
  const footer=document.createElement('div');footer.className='ticket-bottom';const stats=document.createElement('div');stats.className='small';
  if(sets.length){const values=sets.map(r=>numbers.filter(n=>r.ns.has(n)).length);const average=values.reduce((a,b)=>a+b,0)/sets.length;const chip=document.createElement('span');chip.className='score-chip';chip.textContent=average.toFixed(2)+' avg matches';stats.append(chip);stats.append(document.createTextNode(' · '+sets.length+' scored draw'+(sets.length===1?'':'s')))}
  else stats.textContent='Not yet scored · awaiting eligible draw';
  const use=document.createElement('button');use.className='use-ticket';use.type='button';use.textContent='Use ticket ↗';use.setAttribute('aria-label','Load '+m.name+' into Keno line builder');
  use.onclick=()=>{selected=numbers.slice();setPickCount(numbers.length);render();$('builderPanel')?.scrollIntoView({behavior:'smooth',block:'start'})};
  footer.append(stats,use);card.append(head,sheet,footer);list.append(card);
 });
 score.textContent=sets.length?'Results are now available for '+sets.length+' eligible draw(s). The score shown on each ticket uses only results after its publication.':
 'No eligible draw results are available for these research tickets yet. Earlier draws are excluded from scoring.';
 $('copyAllPicks').onclick=async()=>{const copy='LottoLab Keno tickets '+dailyPicks.date+'\n'+dailyPicks.models.map((m,i)=>'Ticket '+(i+1)+' · '+m.name+': '+m.numbers.join(', ')).join('\n');$('status').textContent=(await copyText(copy))?'All Keno ticket numbers copied.':'Copy unavailable on this browser.'};
}
async function refreshModelAudit(){
 const target=$('modelAudit');if(!target)return;
 try{
  const response=await fetch('./data/keno-model-audit.json',{cache:'no-store'});
  if(!response.ok)throw Error('Audit has not been published');
  const audit=await response.json();
  if(!audit.walk_forward_evaluated_draws||!audit.models)throw Error('No evaluated draws yet');
  target.replaceChildren();
  const intro=document.createElement('p');
  intro.textContent=audit.walk_forward_evaluated_draws.toLocaleString('en-NZ')+' unseen historical draws scored after training, with '+audit.warmup_draws+' warm-up draws. Expected hits on any 10-number line: 2.50 per draw. These are descriptive comparisons, not proof of future performance.';
  target.append(intro);
  const table=document.createElement('table'),head=document.createElement('thead'),tr=document.createElement('tr');
  for(const label of ['Historical strategy','Average hits','5+ hits','Difference vs random']){const th=document.createElement('th');th.textContent=label;tr.append(th)}
  head.append(tr);table.append(head);const body=document.createElement('tbody');
  const labels={long_term_hot:'Lifetime hot',long_term_cold:'Lifetime cold',recent_hot:'Last 80 hot',recent_200_hot:'Last 200 hot',recent_cold:'Last 80 cold',same_time_repeat_hot:'Previous same-time repeat',time_of_day_hot:'Time-of-day frequency',balanced_zones:'Balanced zones',blended_hot:'Blended hot',random_control:'Random control'};
  const random=Number(audit.models.random_control?.average_hits||0);
  for(const [id,label] of Object.entries(labels)){const m=audit.models[id];if(!m)continue;const row=document.createElement('tr');const diff=m.average_hits-random;
   for(const value of [label,m.average_hits.toFixed(3),m.five_or_more_hits+' / '+m.draws,(diff>=0?'+':'')+diff.toFixed(3)]){const cell=document.createElement('td');cell.textContent=value;row.append(cell)}body.append(row)}
  table.append(body);target.append(table);
  const note=document.createElement('p');note.className='small';note.textContent='Models tested chronologically without future data. Multiple comparisons and repeated tuning can overfit. Actual fair-draw probabilities are unchanged by these historical patterns.';target.append(note);
 }catch(e){target.textContent='Research audit not yet available: '+e.message+'. Only source-checked draws are displayed; no simulated performance.'}
}
async function refreshKeno(){
 try{
  const response=await fetch(base,{cache:'no-store'});if(!response.ok)throw Error('Keno history unavailable');
  const data=await response.json();let stored=[];try{stored=JSON.parse(localStorage.getItem(key)||'[]')}catch{}
  records=merge(Array.isArray(data)?data:(data.draws||[]),stored);render();
 }catch(e){if(!records.length){try{records=merge([],JSON.parse(localStorage.getItem(key)||'[]'))}catch{records=[]};render();$('status').textContent='Unable to refresh remote history: '+e.message}}
 try{const p=await fetch('./data/keno-daily-picks.json',{cache:'no-store'});if(p.ok){dailyPicks=await p.json()}}catch{}
 renderPredictions();
 refreshModelAudit();
}

function renderIndependentOdds(){
 const target=$('independentOdds');if(!target)return;
 const engine=window.KenoEmpirical,math=window.KenoMath;
 if(!engine||!math){$('empiricalCompare').textContent='Odds analysis unavailable: calculation modules did not load.';return}
 const n=Number($('pickSize').value);
 const chosenLine=selected.length===n?chosen():[];
 let observed;
 try{observed=engine.evaluate(records,chosenLine,n,math.TABLE[n])}
 catch(e){$('empiricalCompare').textContent='Unable to calculate historical comparison: '+e.message;return}
 const calculated=math.getStats(n,Number($('oddsStake').value),$('oddsMultiplier').checked);
 const p=calculated.probabilityOfAnyPrize,ci=observed.interval95;
 const pct=x=>(x*100).toFixed(2)+'%';
 const number=x=>new Intl.NumberFormat('en-NZ',{maximumFractionDigits:2}).format(x);
 $('empiricalChance').textContent=observed.draws?(observed.wins?('1 in '+number(observed.observedOdds)):'0 recorded wins'):'No data';
 $('empiricalHits').textContent=observed.draws?observed.averageMatches.toFixed(3)+' / '+n:'—';
 $('empiricalCount').textContent=observed.draws.toLocaleString('en-NZ');
 const mode=observed.method==='chosen-retrospective'?'your '+n+' chosen numbers':'a fixed '+n+'-number reference line';
 $('empiricalExplanation').textContent='Analysed '+mode+': '+observed.numbers.join(', ')+
 '. '+(observed.method==='chosen-retrospective'?'This is an in-sample retrospective check, not a prediction backtest.':
 'This reference line was defined independently of these historical outcomes.')+
 ' Your stake or Multiplier does not change the frequency of matching numbers.';
 const comparison=$('empiricalCompare');comparison.replaceChildren();
 const title=document.createElement('strong');title.textContent='LottoLab calculated: '+pct(p)+' (1 in '+number(calculated.oddsOfAnyPrize)+')';
 const measured=document.createElement('span');
 if(observed.draws){
   const inside=ci.lower<=p&&p<=ci.upper;
   measured.textContent='Historical sample: '+pct(observed.observedPrizeRate)+
     ' ('+observed.wins+' prize-tier matches in '+number(observed.draws)+' draws); 95% uncertainty interval '+pct(ci.lower)+'–'+pct(ci.upper)+'. '+
     (inside?'The calculated rate lies within this interval.':
       'The sample differs from the calculated rate; sampling effects, post-selection bias or data quality may contribute.');
 }else measured.textContent='No imported draw results are available for comparison yet.';
 const small=document.createElement('small');small.textContent='Different observed percentages are normal in finite samples. These statistics do not change the odds of future fair draws. Lotto NZ payout tiers determine what counts as a prize.';
 comparison.append(title,measured,small);
}
function updateKenoOdds(){
 const api=window.KenoMath;if(!api||!$('oddsPickSize'))return;
 const n=Number($('oddsPickSize').value),stake=Number($('oddsStake').value),multiplier=$('oddsMultiplier').checked;
 try{
  const data=api.getStats(n,stake,multiplier);
  const fmt=new Intl.NumberFormat('en-NZ',{maximumFractionDigits:2});
  const money=x=>new Intl.NumberFormat('en-NZ',{style:'currency',currency:'NZD',maximumFractionDigits:2}).format(x);
  $('oddsAny').textContent='1 in '+fmt.format(data.oddsOfAnyPrize);
  $('oddsAll').textContent='1 in '+fmt.format(data.oddsAllMatched);
  $('oddsExpected').textContent=money(data.expectedNet)+' net';
  $('oddsCost').textContent=money(data.cost);
  $('oddsTable').replaceChildren();
  for(const r of data.rows){
   if(!r.basePrize)continue;
   const tr=document.createElement('tr');
   const parts=[r.matches+' of '+n,'1 in '+fmt.format(1/r.probability),money(r.payout)];
   for(const value of parts){const td=document.createElement('td');td.textContent=value;tr.append(td)}
   $('oddsTable').append(tr);
  }
  $('oddsDisclaimer').textContent='Official Keno paytable effective 23 October 2025. '+(multiplier?'Multiplier doubles the ticket cost; values shown are standard prizes before any random multiplier. Expected net uses an approximate multiplier-weighted return. ':'')+'Expected return assumes fair independent draws. Estimated net return includes ticket cost but excludes high-tier prize-cap adjustments. Stakes change cost and payout, never the draw probability.';
 }catch(e){$('oddsDisclaimer').textContent=e.message}
}
function setPickCount(n){
 const size=Number(n);if(!Number.isInteger(size)||size<1||size>10)return;
 $('pickSize').value=String(size);$('oddsPickSize').value=String(size);
 if(selected.length>size)selected=selected.slice(0,size);
 for(const button of $('pickCountPills').querySelectorAll('button'))button.setAttribute('aria-pressed',String(Number(button.value)===size));
 updateKenoOdds();render();
}
for(let i=1;i<=10;i++){const b=document.createElement('button');b.type='button';b.textContent=i;b.value=i;b.setAttribute('aria-pressed',String(i===10));b.onclick=()=>setPickCount(i);$('pickCountPills').append(b)}
$('pickSize').addEventListener('change',()=>setPickCount($('pickSize').value));
$('oddsPickSize').addEventListener('change',()=>setPickCount($('oddsPickSize').value));

for(const id of ['oddsPickSize','oddsStake','oddsMultiplier'])$(id).addEventListener('change',updateKenoOdds);
updateKenoOdds();

/* Safari-safe section jumps: use a fixed small offset and no smooth-scroll race. */
function jumpToKenoSection(hash,addHistory){
 if(!hash||hash[0]!=='#')return false;
 const id=decodeURIComponent(hash.slice(1)),target=document.getElementById(id);
 if(!target)return false;
 const advanced=target.closest('#advancedTools');
 if(advanced&&advanced.tagName==='DETAILS')advanced.open=true;
 if(target.tagName==='DETAILS'&&['advancedTools','modelProof'].includes(target.id))target.open=true;
 const menu=document.querySelector('.site-menu');if(menu)menu.open=false;
 if(addHistory&&window.location.hash!==hash)window.history.pushState(null,'',hash);
 // Wait until any previously hidden disclosure is laid out before computing its position.
 requestAnimationFrame(()=>{
  const top=Math.max(0,window.scrollY+target.getBoundingClientRect().top-14);
  window.scrollTo({top,behavior:'auto'});
 });
 return true;
}
for(const link of document.querySelectorAll('a[href^="#"]')){
 link.addEventListener('click',event=>{
  const hash=link.getAttribute('href');
  if(hash&&jumpToKenoSection(hash,true))event.preventDefault();
 });
}
window.addEventListener('hashchange',()=>jumpToKenoSection(window.location.hash,false));

refreshKeno();
setInterval(refreshKeno,5*60*1000);
})();