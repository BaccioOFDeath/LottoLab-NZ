'use strict';
/* LottoLab fast path: optional ticket comparison and transparent performance snapshot. */
(()=>{
 const $=id=>document.getElementById(id);
 const set=(id,value)=>{const el=$(id);if(el)el.textContent=String(value)};
 let currentDraw=null;
 function drawReady(){
  const rows=window.lottoLabDraws;
  if(!Array.isArray(rows)||!rows.length)return;
  currentDraw=rows[0];
  set('checkerDraw','Compare with stored draw #'+currentDraw.draw+' · '+currentDraw.date+(currentDraw.verification==='two-source'?' · two-source cross-checked':' · verification pending'));
 }
 window.addEventListener('lottolab:data-ready',drawReady);
 drawReady();
 window.addEventListener('lottolab:data-error',()=>set('checkerStatus','The result archive is unavailable. Check the official Lotto NZ results.'));
 const form=$('quickCheckForm');
 if(form)form.addEventListener('submit',event=>{
  event.preventDefault();
  const output=$('checkerStatus');
  if(!currentDraw){output.textContent='Results have not loaded; please try again after the archive is available.';return}
  const fields=$('checkNumbers').value.trim().split(/[\s,;|]+/).filter(Boolean);
  const numbers=fields.map(Number);
  if(numbers.length!==6||numbers.some((n,i)=>!/^\d{1,2}$/.test(fields[i])||!Number.isInteger(n)||n<1||n>40)||new Set(numbers).size!==6){
   output.textContent='Enter exactly six different Lotto numbers from 1 to 40, separated by spaces or commas.';return
  }
  const pbField=$('checkPowerball').value.trim();
  if(pbField&&!/^(?:[1-9]|1[0-4])$/.test(pbField)){output.textContent='Powerball must be 1–14, or leave it blank.';return}
  const main=numbers.filter(n=>currentDraw.numbers.includes(n));
  const bonus=numbers.includes(currentDraw.bonus);
  const pb=pbField&&Number.isInteger(currentDraw.powerball)?(Number(pbField)===currentDraw.powerball):false;
  output.textContent='Stored draw #'+currentDraw.draw+': '+main.length+' of 6 main matches'+(main.length?' ('+main.map(n=>String(n).padStart(2,'0')).join(', ')+')':'')+' · Bonus '+(bonus?'matched':'not matched')+' · Powerball '+(!pbField?'not entered':currentDraw.powerball===null?'not offered':pb?'matched':'not matched')+'. This compares numbers only; it does not verify a prize or ticket purchase.';
 });
 async function performance(){
  try{
   const response=await fetch('./data/model-performance.json',{cache:'no-store'});
   if(!response.ok)throw Error('Scorecard unavailable');
   const report=await response.json();
   const a=report.backtest?.adaptive_frequency_v1;
   const b=report.backtest?.random_baseline_v1;
   const real=Object.values(report.prospective||{});
   const scored=Math.max(0,...real.map(v=>Number(v?.draws_scored)||0));
   set('focusScored',String(scored));
   set('focusScoredLabel',scored===0?'First real draw still awaiting a result':scored+' verified future draw(s) evaluated');
   if(a&&b&&Number.isFinite(Number(a.average_matches))&&Number.isFinite(Number(b.average_matches))){
    const av=Number(a.average_matches),bv=Number(b.average_matches);
    set('focusBacktest',av.toFixed(2)+' vs '+bv.toFixed(2));
    set('focusBacktestLabel','Main-ball matches per line · historical walk-forward tests (model vs random)');
    set('focusVerdict',scored===0?'No prospective prediction advantage established':scored<30?'Early results — too few future draws for a reliable claim':'Check the full prospective comparison below');
   }else set('focusBacktest','Not yet available');
   set('focusLastUpdate','Scorecard data: '+(report.generated_at?new Date(report.generated_at).toLocaleDateString('en-NZ',{timeZone:'Pacific/Auckland'}):'date unknown'));
  }catch(e){
   set('focusScored','—');set('focusBacktest','Unavailable');set('focusVerdict','Performance data currently unavailable');
  }
 }
 performance();
})();
