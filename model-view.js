'use strict';
(()=>{const byId=id=>document.getElementById(id);
const text=(id,v)=>{const el=byId(id);if(el)el.textContent=String(v)};
const ball=(n,kind='')=>'<span class="ball '+kind+'">'+String(n).padStart(2,'0')+'</span>';
const friendly={'adaptive_frequency_v1':'Adaptive frequency','random_baseline_v1':'Random baseline'};
const fmt=d=>new Date(d+'T12:00:00Z').toLocaleDateString('en-NZ',{timeZone:'UTC',weekday:'long',day:'numeric',month:'long',year:'numeric'});
function renderPick(id,p){const el=byId(id);if(!el)return;if(!p){el.textContent='No pre-draw selection recorded yet.';return}
if(!Array.isArray(p.numbers)||p.numbers.length!==6||p.numbers.some(n=>!Number.isInteger(n)||n<1||n>40)||!Number.isInteger(p.powerball)||p.powerball<1||p.powerball>14){el.textContent='Invalid stored model selection — not displayed.';return}
const line=p.numbers.map(n=>ball(n)).join('');
el.innerHTML='<div class="model-pick-date">For '+fmt(p.target_date)+' · <strong>'+p.status+'</strong></div><div class="model-balls">'+line+'</div><div class="model-power">Powerball '+ball(p.powerball,'power')+'</div><div class="model-pick-foot"><span>Recorded '+new Date(p.created_at).toLocaleString('en-NZ',{timeZone:'Pacific/Auckland',dateStyle:'medium',timeStyle:'short'})+'</span><button type="button" class="btn btn-export model-copy">Copy line</button></div>';
const copy=el.querySelector('button.model-copy');
copy.addEventListener('click',async()=>{const value=p.numbers.map(n=>String(n).padStart(2,'0')).join(' - ')+' | PB '+String(p.powerball).padStart(2,'0');try{await navigator.clipboard.writeText(value);copy.textContent='Copied ✓'}catch(e){copy.textContent='Select numbers above to copy'}});
}

function ledger(picks,history){
  const host=byId('modelLedgerRows');if(!host)return;
  const verified=new Map(history.filter(d=>d.verification==='two-source').map(d=>[d.date,d]));
  const list=[...picks].sort((a,b)=>b.target_date.localeCompare(a.target_date)||a.model.localeCompare(b.model));
  let completed=0, awaiting=0;
  host.innerHTML=list.map(p=>{
    const actual=verified.get(p.target_date);
    const legitimate=Array.isArray(p.numbers)&&p.numbers.length===6&&p.numbers.every(n=>Number.isInteger(n)&&n>=1&&n<=40);
    if(!legitimate)return '';
    const confirmed=actual&&p.status==='scored';
    if(confirmed)completed++;else awaiting++;
    const count=confirmed?p.numbers.filter(n=>actual.numbers.includes(n)).length:0;
    const powerMatch=confirmed&&actual.powerball===p.powerball;
    const outcome=confirmed?'<span class="ledger-result">'+count+'/6 main'+(powerMatch?' · PB ✓':' · PB ✕')+'</span>':'<span class="ledger-pending">Awaiting result</span>';
    const label=(friendly[p.model]||'Research model')+' · #'+(p.line_number||1);
    const date=/^\d{4}-\d\d-\d\d$/.test(p.target_date)?p.target_date:'Unknown date';
    return '<tr><td>'+date+'</td><td>'+label+'</td><td>'+p.numbers.map(n=>String(n).padStart(2,'0')).join(' · ')+'</td><td><span class="ball bonus ledger-ball">'+(Number.isInteger(p.bonus_prediction)?String(p.bonus_prediction).padStart(2,'0'):'—')+'</span></td><td><span class="ball power ledger-ball">'+String(p.powerball).padStart(2,'0')+'</span></td><td>'+outcome+(confirmed&&p.bonus_prediction!=null?' · bonus '+(p.bonus_prediction===actual.bonus?'✓':'✕'):'')+'</td></tr>';
  }).join('')||'<tr><td colspan="5">No recorded selections yet.</td></tr>';
  text('modelLedgerSummary',completed+' selections scored · '+awaiting+' awaiting future draws. All results displayed, including zero matches. Check original dated commits for audit history.');
}
async function init(){try{
const [a,b,c]=await Promise.all([fetch('./data/model-performance.json',{cache:'no-store'}),fetch('./data/model-picks.json',{cache:'no-store'}),fetch('./data/draws.json',{cache:'no-store'})]);if(!a.ok||!b.ok||!c.ok)throw Error('Performance files unavailable');
const report=await a.json(),picks=await b.json(),draws=await c.json();
if(!Array.isArray(picks)||!report||!report.backtest)throw Error('Invalid scorecard data');
ledger(picks,draws);text('modelVerified',report.verified_draw_count);text('modelBacktests',report.backtest_draws);
const prospective=report.prospective||{};
text('modelLiveDraws',Math.max(0,...Object.values(prospective).map(x=>Number(x.draws_scored)||0)));
for(const [key,id,statsid] of [['adaptive_frequency_v1','modelAdaptive','modelAdaptiveStats'],['random_baseline_v1','modelRandom','modelRandomStats']]){
const row=picks.filter(p=>p.model===key).sort((x,y)=>y.target_date.localeCompare(x.target_date))[0];
renderPick(id,row);const bt=report.backtest[key],real=prospective[key];
if(bt&&real){
const historical=bt.average_matches===null?'Not yet measured':Number(bt.average_matches).toFixed(2);
text(statsid,'Held-out historical tests: '+bt.tested+' · Average main-ball matches: '+historical+' / 6 · Prospective selections scored: '+real.draws_scored);
}}
const next=report.upcoming_date?fmt(report.upcoming_date):'not yet available';
text('modelMethodStatus','Target date: '+next+' · 20 frozen lines (10 experimental + 10 random control), published before the draw. '+report.verified_draw_count+' verified results · '+report.backtest_draws+' historical held-out tests. Original published lines never change. No statistically reliable edge over random picks has been demonstrated.');
}catch(e){text('modelError','Unable to load model scorecard: '+e.message);for(const id of ['modelAdaptive','modelRandom'])text(id,'Model data unavailable.');}}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();