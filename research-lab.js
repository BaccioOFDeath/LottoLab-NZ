/* LottoLab Evidence Lab: descriptive statistical checks with transparent caveats.
   These diagnostics do NOT establish predictability of independent lottery draws. */
(()=>{
'use strict';
const $=id=>document.getElementById(id);
const set=(id,s)=>{const el=$(id);if(el)el.textContent=String(s)};
const pMain=6/40;
let allRows=[],picks=[],drawContext=null;
function dateOnly(s){return new Date(s+'T12:00:00Z').toLocaleDateString('en-NZ',{timeZone:'UTC',day:'numeric',month:'short',year:'numeric'})}
function logFacts(n){const a=new Float64Array(n+1);for(let i=2;i<=n;i++)a[i]=a[i-1]+Math.log(i);return a}
function binomialP(n,k,p=pMain){
  if(n===0)return 1;
  const fact=logFacts(n);
  const logMass=t=>fact[n]-fact[t]-fact[n-t]+t*Math.log(p)+(n-t)*Math.log1p(-p);
  const observed=logMass(k);
  let total=0;
  // Exact probability of outcomes at least as improbable as the observed count.
  for(let i=0;i<=n;i++){
    const l=logMass(i);
    if(l<=observed+1e-9)total+=Math.exp(l);
  }
  return Math.min(1,total);
}
function observedStats(rows){
  const n=rows.length;
  const counts=Array(41).fill(0);
  for(const d of rows)for(const x of d.numbers)counts[x]++;
  return {n,counts,expected:n*pMain};
}
function histogram(rows){
  const holder=$('evidenceDeviations');if(!holder)return;
  const {n,counts,expected}=observedStats(rows);
  set('evidenceDraws',n);
  set('evidenceExpected',n?(expected).toFixed(2):'—');
  holder.replaceChildren();
  if(n===0){
    set('evidenceFlags','—');set('evidenceVerdict','No comparable draws in this selection. Adjust the rule-era, equipment or sample filters.');return;
  }
  const result=counts.slice(1).map((x,i)=>{
    const count=x,number=i+1,raw=binomialP(n,count),corrected=Math.min(1,raw*40);
    return {number,count,raw,corrected,delta:count-expected};
  }).sort((a,b)=>Math.abs(b.delta)-Math.abs(a.delta)||a.number-b.number);
  const flagged=result.filter(x=>x.corrected<.05);
  set('evidenceFlags',flagged.length+' / 40');
  for(const item of result.slice(0,8)){
    const row=document.createElement('div');row.className='deviation-row';
    const left=document.createElement('span');left.className='deviation-number';left.textContent=String(item.number).padStart(2,'0');
    const bar=document.createElement('div');bar.className='deviation-track';bar.setAttribute('role','img');bar.setAttribute('aria-label',item.count+' appearances, expected '+expected.toFixed(2));
    const fill=document.createElement('div');fill.className='deviation-fill';
    fill.style.width=Math.max(3,Math.min(100,item.count/Math.max(1,Math.max(...counts))*100))+'%';
    bar.appendChild(fill);
    const info=document.createElement('div');info.className='deviation-info';
    const value=document.createElement('strong');value.textContent=item.count+' observed';
    const expectedTag=document.createElement('small');expectedTag.textContent=(item.delta>=0?'+':'')+item.delta.toFixed(1)+' vs expected';
    info.append(value,expectedTag);
    const sig=document.createElement('span');sig.className='deviation-significance';
    sig.textContent=item.corrected<.05?'Flagged':'p-adj '+item.corrected.toFixed(3);
    if(item.corrected<.05)sig.classList.add('flagged');
    row.append(left,bar,info,sig);
    holder.append(row);
  }
  set('evidenceVerdict',flagged.length?
    flagged.length+' of 40 numbers depart from the simple fair-draw frequency expectation after correction. That calls for an independent, pre-specified audit—not a winning-number prediction.':
    'No individual number passes the conservative 40-test significance threshold in this sample. That does not prove perfect randomness or predict future results.');
}
function quality(){
  const rows=allRows;if(!rows.length)return;
  const ids=rows.map(d=>d.draw);
  const lower=Math.min(...ids),upper=Math.max(...ids);
  const total=upper-lower+1,covered=new Set(ids).size;
  const verified=rows.filter(d=>d.verification==='two-source'&&new Set(d.sources||[]).size>=2).length;
  const nEquipment=rows.filter(d=>drawContext&&drawContext.by_draw&&drawContext.by_draw[d.draw]?.machine_id&&drawContext.by_draw[d.draw]?.ball_set_id).length;
  set('evidenceVerified',verified+'/'+rows.length);
  set('coverageRange','#'+lower+'–#'+upper);
  set('coverageInside',covered+' / '+total);
  set('coverageVerified',verified+' / '+rows.length);
  set('coverageEquipment',nEquipment+' / '+rows.length);
  const chronological=[...rows].sort((a,b)=>a.date.localeCompare(b.date));
  const missing=total-covered;
  set('coverageNote',dateOnly(chronological[0].date)+' to '+dateOnly(chronological[chronological.length-1].date)+': '+missing+' missing draw IDs within this stored range. The complete 1987–present historical archive is NOT yet available.');
}
function portfolio(){
  const latest=picks.filter(p=>p&&p.target_date&&p.numbers&&p.status==='pending').sort((a,b)=>b.target_date.localeCompare(a.target_date));
  if(!latest.length){set('portfolioStatus','No future selections recorded');return}
  const target=latest[0].target_date;
  const group=latest.filter(p=>p.target_date===target);
  const valid=group.filter(p=>Array.isArray(p.numbers)&&p.numbers.length===6&&new Set(p.numbers).size===6&&p.numbers.every(n=>Number.isInteger(n)&&n>=1&&n<=40)&&Number.isInteger(p.powerball)&&p.powerball>=1&&p.powerball<=14);
  const unique=new Set(valid.map(p=>[...p.numbers].sort((a,b)=>a-b).join(',')+':'+p.powerball));
  const covered=new Set(valid.flatMap(p=>p.numbers));
  let matches=0,pairs=0;
  for(let i=0;i<valid.length;i++)for(let j=i+1;j<valid.length;j++){
    pairs++;const other=new Set(valid[j].numbers);
    matches+=valid[i].numbers.filter(n=>other.has(n)).length;
  }
  const immutable=valid.filter(p=>p.created_at&&p.created_at.slice(0,10)<target).length;
  set('portfolioStatus',valid.length===20&&unique.size===20?'20 lines verified':'Incomplete / invalid set');
  set('portfolioTarget',dateOnly(target));
  set('portfolioCoverage',covered.size+' / 40');
  set('portfolioUnique',unique.size+' / 20');
  set('portfolioOverlap',pairs?(matches/pairs).toFixed(2):'—');
  set('portfolioLocked',immutable+' / 20');
  const counts=Array(41).fill(0);for(const p of valid)for(const n of p.numbers)counts[n]++;
  const host=$('portfolioBars');host.replaceChildren();
  const max=Math.max(1,...counts);
  for(let n=1;n<=40;n++){
    const cell=document.createElement('div');cell.className='portfolio-number';
    const observed=counts[n];
    cell.style.background='rgba(118,60,218,'+(0.05+observed/max*.81).toFixed(3)+')';
    cell.style.color=observed/max>.56?'white':'#624187';
    cell.textContent=String(n).padStart(2,'0');
    cell.title='Number '+n+': '+observed+' of '+valid.length+' lines';
    cell.setAttribute('aria-label',cell.title);
    host.append(cell);
  }
}
function render(){
  const selected=window.lottoLabAnalysisDraws;
  if(!Array.isArray(selected))return;
  histogram(selected);
}
window.addEventListener('lottolab:analysis-changed',render);
Promise.all([
  fetch('./data/draws.json',{cache:'no-store'}).then(r=>r.ok?r.json():[]).catch(()=>[]),
  fetch('./data/model-picks.json',{cache:'no-store'}).then(r=>r.ok?r.json():[]).catch(()=>[]),
  fetch('./data/draw-context.json',{cache:'no-store'}).then(r=>r.ok?r.json():null).catch(()=>null)
]).then(([rows,records,context])=>{
  allRows=Array.isArray(rows)?rows.filter(x=>Number.isInteger(x.draw)&&Array.isArray(x.numbers)&&x.numbers.length===6):[];
  picks=Array.isArray(records)?records:[];
  drawContext=context||{};
  quality();portfolio();render();
}).catch(()=>{set('evidenceVerdict','Research data unavailable.');set('portfolioStatus','Unable to load portfolio.');});
})();
