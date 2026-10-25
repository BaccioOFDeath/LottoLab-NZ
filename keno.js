(()=>{
'use strict';
const $=id=>document.getElementById(id), base='./data/keno-results.json', key='lottolab-keno-import-v1';
let records=[],selected=[],active=null,dailyPicks=null;
const iso=s=>/^\d{4}-\d{2}-\d{2}$/.test(s)&&!Number.isNaN(Date.parse(s+'T12:00:00Z'));
const sanitize=r=>{if(!r||!iso(String(r.date||'')))return null;let n=Array.isArray(r.numbers)?r.numbers:String(r.numbers||'').trim().split(/[ ;|]+/).map(Number);n=n.map(Number);if(n.length!==20||new Set(n).size!==20||n.some(x=>!Number.isInteger(x)||x<1||x>80))return null;const draw=String(r.draw||'').trim();return {date:String(r.date),draw,time:r.time||"",source:r.source||"",numbers:n.sort((a,b)=>a-b),multiplier:r.multiplier||null};};
const merge=(a,b)=>{const m=new Map();[...a,...b].forEach(x=>{const r=sanitize(x);if(r)m.set(r.date+'|'+r.draw+'|'+r.numbers.join('-'),r)});return [...m.values()].sort((x,y)=>x.date.localeCompare(y.date)||Number(x.draw||0)-Number(y.draw||0))};
const latest=()=>records[records.length-1];
const sample=()=>Number($('window').value)?records.slice(-Number($('window').value)):records;
const counts=data=>{const c=Array(81).fill(0);data.forEach(r=>r.numbers.forEach(n=>c[n]++));return c};
const balls=(id,handler)=>{const root=$(id);root.replaceChildren();for(let n=1;n<=80;n++){const b=document.createElement('button');b.className='ball';b.textContent=n;b.type='button';b.dataset.number=n;b.onclick=()=>handler(n);root.append(b)}};
const chosen=()=>[...selected].sort((a,b)=>a-b);
const render=()=>{const d=sample(),c=counts(d),last=latest();$('drawCount').textContent=records.length.toLocaleString();$('dateRange').textContent=records.length?records[0].date+' → '+last.date:'No history';$('latestDraw').textContent=last?last.draw||last.date:'—';$('status').textContent=records.length?'Loaded '+records.length.toLocaleString()+' distinct verified-format draw records. Imported results must still be checked against their source.':'No verified historical Keno draws have been imported yet. Upload a results CSV to begin.';const rows=records.slice(-30).reverse();$('historyRows').replaceChildren();rows.forEach(r=>{const tr=document.createElement('tr');[r.date,r.draw||'—',r.numbers.join(' · '),r.multiplier||'—'].forEach(t=>{let td=document.createElement('td');td.textContent=t;tr.append(td)});$('historyRows').append(tr)});[...$('heatmap').children].forEach(b=>{const n=Number(b.dataset.number),p=d.length?c[n]/d.length:0;b.style.background=d.length?'hsl('+Math.round(200-160*Math.min(1,p/.4))+' 55% '+Math.round(18+25*Math.min(1,p/.4))+'%)':'';b.title=n+': '+c[n]+' / '+d.length+' draws';b.classList.toggle('selected',active===n)});[...$('builder').children].forEach(b=>b.classList.toggle('selected',selected.includes(Number(b.dataset.number))));$('selection').textContent=selected.length?chosen().join('  ·  '):'No numbers selected';$('numberDetails').textContent=active==null?'Select a number to inspect historical frequency and pairings.':details(active,d,c);$('suggestion').textContent=selected.length?details(selected[selected.length-1],d,c):'Select a number to inspect historical co-occurrences.';if(!last||!selected.length)$('checkResult').textContent='Load historical results and select a line to check the latest draw.';else{const match=selected.filter(n=>last.numbers.includes(n));$('checkResult').textContent=match.length+' of '+selected.length+' matched on '+last.date+' ('+(last.draw||'draw unknown')+'): '+(match.join(', ')||'none')+'. This is not a prize determination.'}};
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
 if(!list)return;list.replaceChildren();
 if(!dailyPicks||!Array.isArray(dailyPicks.models)||!dailyPicks.models.length){list.textContent='No dated Keno research selections have been published yet.';meta.textContent='Awaiting validated daily selection file';score.textContent='No daily model performance can be calculated without a published selection.';return}
 if(date)date.textContent='Research lines for '+formatDay(dailyPicks.date);
 const today=nzDate();
 const aged=dailyPicks.date!==today;
 const eligible=Number(dailyPicks.first_scored_draw||0);
 const countEligible=records.filter(r=>r.date===dailyPicks.date&&(!eligible||Number(r.draw)>=eligible));
 intro.textContent=(aged?'These are the most recently published selections, not fresh picks for today. ':'')+'Dated model selections using '+(dailyPicks.training_draws||'?')+' earlier results. All valid 10-number lines have equal mathematical odds; models are research experiments only.';
 meta.textContent='Saved '+new Date(dailyPicks.created_at).toLocaleString('en-NZ',{timeZone:'Pacific/Auckland',dateStyle:'medium',timeStyle:'short'})+' NZT · eligible from '+(dailyPicks.eligible_from||'publication')+' · historical sample '+dailyPicks.training_draws;
 const recordSets=countEligible.map(r=>({draw:r.draw,ns:new Set(r.numbers)}));
 dailyPicks.models.forEach((m,i)=>{
  const card=document.createElement('article');card.className='prediction-card'+(m.id==='random'?' control':'');
  const index=document.createElement('div');index.className='ticket-number';index.textContent='TICKET '+String(i+1).padStart(2,'0')+(m.id==='random'?' · CONTROL':' · MODEL');
  const title=document.createElement('h3');title.textContent=m.name;const sub=document.createElement('div');sub.className='subtitle';sub.textContent=m.description||'Historical research selection';
  const balls=document.createElement('div');balls.className='prediction-balls';const numbers=Array.isArray(m.numbers)?m.numbers:[];
  numbers.forEach(n=>{const b=document.createElement('span');b.textContent=String(n).padStart(2,'0');balls.append(b)});
  const bottom=document.createElement('footer'), stats=document.createElement('div');stats.className='small';
  if(recordSets.length){const matches=recordSets.map(r=>numbers.filter(n=>r.ns.has(n)).length);const sum=matches.reduce((a,b)=>a+b,0);const chip=document.createElement('span');chip.className='score-chip';chip.textContent=(sum/matches.length).toFixed(2)+' avg matches';stats.append(chip);stats.append(document.createTextNode(' '+matches.length+' draws'))}
  else stats.textContent='Awaiting next eligible draw';
  const use=document.createElement('button');use.type='button';use.textContent='Use numbers';use.setAttribute('aria-label','Load '+m.name+' numbers into ticket builder');
  use.onclick=()=>{selected=[...numbers];$('pickSize').value=String(numbers.length);render();document.getElementById('builder').scrollIntoView({behavior:'smooth',block:'center'})};
  bottom.append(stats,use);card.append(index,title,sub,balls,bottom);list.append(card);
 });
 score.textContent=countEligible.length?'Verified results for '+countEligible.length+' eligible draw(s) are now compared above. Expected matches for each 10-number line: 2.5 per draw.':'No eligible draw results available yet. Today’s selections are eligible for subsequent draws only; earlier draws never count as model successes.';
 $('copyAllPicks').onclick=async()=>{const content=dailyPicks.models.map((m,i)=>String(i+1)+'. '+m.name+': '+m.numbers.join(', ')).join('\n');const okay=await copyText('LottoLab Keno '+dailyPicks.date+'\n'+content);$('status').textContent=okay?'Copied all published model lines.':'Copy not available in this browser.'};
}
async function refreshKeno(){
 try{
  const response=await fetch(base,{cache:'no-store'});if(!response.ok)throw Error('Keno history unavailable');
  const data=await response.json();let stored=[];try{stored=JSON.parse(localStorage.getItem(key)||'[]')}catch{}
  records=merge(Array.isArray(data)?data:(data.draws||[]),stored);render();
 }catch(e){if(!records.length){try{records=merge([],JSON.parse(localStorage.getItem(key)||'[]'))}catch{records=[]};render();$('status').textContent='Unable to refresh remote history: '+e.message}}
 try{const p=await fetch('./data/keno-daily-picks.json',{cache:'no-store'});if(p.ok){dailyPicks=await p.json()}}catch{}
 renderPredictions();
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
for(const id of ['oddsPickSize','oddsStake','oddsMultiplier'])$(id).addEventListener('change',updateKenoOdds);
updateKenoOdds();

refreshKeno();
setInterval(refreshKeno,5*60*1000);
})();