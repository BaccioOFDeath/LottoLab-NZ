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
async function init(){try{
const [a,b]=await Promise.all([fetch('./data/model-performance.json',{cache:'no-store'}),fetch('./data/model-picks.json',{cache:'no-store'})]);if(!a.ok||!b.ok)throw Error('Performance files unavailable');
const report=await a.json(),picks=await b.json();
if(!Array.isArray(picks)||!report||!report.backtest)throw Error('Invalid scorecard data');
text('modelVerified',report.verified_draw_count);text('modelBacktests',report.backtest_draws);
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
text('modelMethodStatus','Target date: '+next+' · '+report.verified_draw_count+' cross-checked records · '+report.backtest_draws+' held-out tests. The adaptive model updates after every verified draw. No statistically reliable edge over random picks has been demonstrated.');
}catch(e){text('modelError','Unable to load model scorecard: '+e.message);for(const id of ['modelAdaptive','modelRandom'])text(id,'Model data unavailable.');}}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();