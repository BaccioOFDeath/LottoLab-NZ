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
 const compareButton=form?.querySelector('.quick-check-button');
 const output=$('checkerStatus');
 function showCheckMessage(message,isError){
  if(!output)return;
  output.textContent=message;
  output.classList.toggle('quick-check-error',!!isError);
  output.classList.toggle('quick-check-completed',!isError);
  output.setAttribute('aria-live','assertive');
  // On iOS Safari, display feedback close to the compare button after a tap.
  if(document.activeElement?.tagName!=='INPUT')output.scrollIntoView({block:'nearest',behavior:'auto'});
 }
 function compareNumbers(){
  try{
   if(!currentDraw)drawReady();
   if($('checkNumbers')?.dataset.pasteInvalid==='true'){
    showCheckMessage('The pasted line contains extra or invalid characters. Enter exactly six numbers, each from 1 to 40.',true);
    return;
   }
   const ballFields=[...form.querySelectorAll('.ball-entry-field')];
   const values=ballFields.length===6?ballFields.map(field=>field.value.trim()):$('checkNumbers').value.trim().split(/[\s,;|]+/).filter(Boolean);
   const numbers=values.map(Number);
   const numbersValid=values.length===6&&values.every(t=>/^\d{1,2}$/.test(t))&&numbers.every(n=>Number.isInteger(n)&&n>=1&&n<=40)&&new Set(numbers).size===6;
   if(!numbersValid){
    const empty=values.filter(v=>v==='').length;
    showCheckMessage(empty?'Enter all six Lotto balls before comparing.':'Enter six DIFFERENT Lotto numbers from 1 to 40. Repeated or invalid balls must be changed.',true);
    return;
   }
   const pbField=$('checkPowerball').value.trim();
   if(pbField&&!/^(?:[1-9]|1[0-4])$/.test(pbField)){
    showCheckMessage('Powerball must be between 1 and 14. Leave it empty if you do not play Powerball.',true);
    return;
   }
   if(!currentDraw){
    showCheckMessage('The latest draw data is not loaded. Your entered numbers remain saved on this device; please try again once the results load.',true);
    return;
   }
   const matches=numbers.filter(n=>currentDraw.numbers.includes(n));
   const bonus=numbers.includes(currentDraw.bonus);
   const pb=pbField&&Number.isInteger(currentDraw.powerball)?Number(pbField)===currentDraw.powerball:false;
   const result='Stored draw #'+currentDraw.draw+' ('+currentDraw.date+'): '+matches.length+' of 6 main numbers matched'+(matches.length?' — '+matches.map(n=>String(n).padStart(2,'0')).join(', '):'')+'. Bonus: '+(bonus?'matched':'not matched')+'. Powerball: '+(!pbField?'not selected':currentDraw.powerball===null?'not offered':pb?'matched':'not matched')+'. This is a numbers comparison only, not a ticket or prize verification.';
   showCheckMessage(result,false);
   window.dispatchEvent(new CustomEvent('lottolab:quick-check-valid',{detail:{numbers:[...numbers].sort((a,b)=>a-b),powerball:pbField?Number(pbField):null}}));
  }catch(error){
   showCheckMessage('Could not complete the comparison. '+(error&&error.message?error.message:'Please try again.'),true);
  }
 }
 if(form){
  // Native iOS HTML5 form validation may silently block submit events when the
  // originally required field is moved into a closed Paste details element.
  // Validate visibly here instead so the Compare button always gives feedback.
  form.noValidate=true;
  form.addEventListener('submit',event=>{event.preventDefault();compareNumbers();});
  if(compareButton)compareButton.addEventListener('click',event=>{event.preventDefault();compareNumbers();});
 }
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
