// LottoLab NZ — exactly 20 committed selections per draw, no new client-side generations.
(()=>{
'use strict';
const el=id=>document.getElementById(id);
const modeLabels={
  'adaptive_frequency_v1':'Research',
  'random_baseline_v1':'Random control'
};
let frozen=[],target='',expanded=false;
function fmt(n){return String(n).padStart(2,'0')}
function formatDate(d){return new Date(d+'T12:00:00Z').toLocaleDateString('en-NZ',{timeZone:'UTC',weekday:'long',day:'numeric',month:'long',year:'numeric'})}
function formatLine(p){return p.numbers.map(fmt).join(' - ')+' | PB '+fmt(p.powerball)}
function valid(p){return p&&Array.isArray(p.numbers)&&p.numbers.length===6&&new Set(p.numbers).size===6&&p.numbers.every(n=>Number.isInteger(n)&&n>=1&&n<=40)&&Number.isInteger(p.powerball)&&p.powerball>=1&&p.powerball<=14&& (p.bonus_prediction==null||(Number.isInteger(p.bonus_prediction)&&p.bonus_prediction>=1&&p.bonus_prediction<=40&&!p.numbers.includes(p.bonus_prediction)&&p.bonus_prediction_created_at))}
function slot(p){return Number.isInteger(p.line_number)?p.line_number:1}
async function copy(value,button){try{await navigator.clipboard.writeText(value);const old=button.textContent;button.textContent='Copied ✓';el('pickerStatus').textContent='Copied the already recorded lines — no new numbers were generated.';setTimeout(()=>{button.textContent=old},1600)}catch(e){el('pickerStatus').textContent='Clipboard permission unavailable. Select the numbers to copy.'}}
const ticketLetters=['A','B','C','D','E','F','G','H','J','K'];
function render(){
  const selected=el('pickerMode').value;
  const shown=selected==='all'?frozen:frozen.filter(p=>p.model===selected);
  const display=expanded?shown:shown.slice(0,10);
  const list=el('pickerLines');list.replaceChildren();
  const groups=new Map();
  for(const p of display){
    if(!groups.has(p.model))groups.set(p.model,[]);
    groups.get(p.model).push(p);
  }
  for(const [model,lines] of groups){
    const ticket=document.createElement('article');ticket.className='lotto-ticket';
    const ordinal=model==='adaptive_frequency_v1'?1:2;
    ticket.dataset.ticket=String(ordinal);
    ticket.setAttribute('aria-label','Research Lotto slip '+ordinal+' with '+lines.length+' of 10 recorded lines');
    const header=document.createElement('div');header.className='lotto-ticket-head';
    const logo=document.createElement('span');logo.className='lotto-ticket-logo';logo.textContent='L';
    const identity=document.createElement('div');identity.className='lotto-ticket-identity';
    const heading=document.createElement('strong');heading.textContent='LOTTO LAB';
    const sub=document.createElement('span');sub.textContent=ordinal===1?'TICKET 1 · RESEARCH':'TICKET 2 · RANDOM CONTROL';
    identity.append(heading,sub);
    const draw=document.createElement('div');draw.className='lotto-ticket-draw';
    const drawLabel=document.createElement('strong');drawLabel.textContent='10 LINES';
    const drawDate=document.createElement('small');drawDate.textContent='Draw '+target;
    draw.append(drawLabel,drawDate);
    header.append(logo,identity,draw);
    const colHeads=document.createElement('div');colHeads.className='lotto-ticket-columns';
    const numbersTitle=document.createElement('span');numbersTitle.textContent='SIX LOTTO NUMBERS';
    const powerTitle=document.createElement('span');powerTitle.textContent='PB';
    colHeads.append(numbersTitle,powerTitle);
    const rows=document.createElement('div');rows.className='lotto-ticket-rows';
    for(const p of lines){
      const index=frozen.indexOf(p);
      const letter=ticketLetters[slot(p)-1]||String(slot(p));
      const row=document.createElement('div');row.className='fixed-pick-line';
      row.dataset.letter=letter;row.setAttribute('role','group');
      row.setAttribute('aria-label','Line '+letter+', six Lotto numbers '+p.numbers.map(fmt).join(', ')+', Powerball '+fmt(p.powerball));
      const name=document.createElement('div');name.className='fixed-pick-name';
      const number=document.createElement('strong');number.textContent=letter;
      number.title='Line '+String(index+1).padStart(2,'0');
      name.append(number);
      const nums=document.createElement('div');nums.className='fixed-pick-numbers';
      for(const n of p.numbers){
        const b=document.createElement('span');b.className='ball';b.textContent=fmt(n);nums.append(b);
      }
      const extras=document.createElement('div');extras.className='fixed-pick-extras';
      const power=document.createElement('div');power.className='pick-extra ticket-power';
      const powerCircle=document.createElement('span');powerCircle.className='ball power';powerCircle.textContent=fmt(p.powerball);
      powerCircle.title='Powerball '+fmt(p.powerball);
      power.append(powerCircle);extras.append(power);
      const button=document.createElement('button');button.type='button';button.className='fixed-copy';
      button.textContent='⧉';button.title='Copy line '+letter;button.setAttribute('aria-label','Copy line '+letter+' ('+(index+1)+')');
      button.addEventListener('click',()=>copy(formatLine(p),button));
      // The Bonus is never a playable ticket ball; reveal its forecast on demand.
      const research=document.createElement('details');research.className='ticket-bonus';
      const researchToggle=document.createElement('summary');researchToggle.textContent='Bonus forecast (research only)';
      researchToggle.title='See non-playable research Bonus forecast';
      const bonus=document.createElement('div');bonus.className='pick-extra';
      const bonusLabel=document.createElement('span');bonusLabel.className='pick-extra-label';
      bonusLabel.textContent='BONUS · RESEARCH ONLY';
      const bonusCircle=document.createElement('span');bonusCircle.className='ball bonus';
      bonusCircle.textContent=p.bonus_prediction==null?'—':fmt(p.bonus_prediction);
      bonusCircle.title='Non-playable Bonus forecast; recorded '+(p.bonus_prediction_created_at||'when available');
      bonus.append(bonusLabel,bonusCircle);
      research.append(researchToggle,bonus);
      row.append(name,nums,extras,button,research);rows.append(row);
    }
    const footer=document.createElement('div');footer.className='lotto-ticket-footer';
    const count=document.createElement('strong');count.textContent='10 research selections · '+(modeLabels[model]||model);
    const notice=document.createElement('span');notice.textContent='NOT A PURCHASED TICKET · No winning advantage';
    footer.append(count,notice);
    ticket.append(header,colHeads,rows,footer);list.append(ticket);
  }
  el('pickerStatus').textContent='Showing '+display.length+' of '+shown.length+' locked lines as '+groups.size+' Lotto-style research ticket'+(groups.size===1?'':'s')+'.';
  const expand=el('pickerExpand');
  expand.hidden=shown.length<=10;expand.disabled=false;
  expand.textContent=expanded?'Show first ticket only ↑':'Show both tickets · all '+shown.length+' lines ↓';
  expand.setAttribute('aria-expanded',String(expanded));
}
async function init(){
  try{
    const [p,r]=await Promise.all([fetch('./data/model-picks.json',{cache:'no-store'}),fetch('./data/model-performance.json',{cache:'no-store'})]);
    if(!p.ok||!r.ok)throw Error('Prediction files not available');
    const [rows,report]=await Promise.all([p.json(),r.json()]);
    if(!Array.isArray(rows)||typeof report.upcoming_date!=='string')throw Error('Invalid prediction data');
    target=report.upcoming_date;
    frozen=rows.filter(row=>row.target_date===target);
    const models=['adaptive_frequency_v1','random_baseline_v1'];
    frozen.sort((a,b)=>models.indexOf(a.model)-models.indexOf(b.model)||slot(a)-slot(b));
    const keys=new Set(frozen.map(x=>x.model+':'+slot(x)));
    const combos=new Set(frozen.map(x=>x.numbers.join(',')+':'+x.powerball));
    if(frozen.length!==20||keys.size!==20||combos.size!==20||frozen.some(x=>!valid(x)))throw Error('20 unique pre-draw lines not yet available. No additional numbers will be generated in your browser.');
    if(models.some(m=>frozen.filter(x=>x.model===m).length!==10))throw Error('Expected 10 lines from each research method');
    el('pickerCount').textContent='20 of 20 lines locked';
    el('pickerDate').textContent='For '+formatDate(target);
    el('pickerCopyAll').disabled=false;
    render();
  }catch(e){el('pickerCount').textContent='Selections not ready';el('pickerDate').textContent='Awaiting verified publication';el('pickerStatus').textContent=e.message;el('pickerLines').textContent='Published suggestions are temporarily unavailable. We do not generate extra picks to replace missing data.';}
}
el('pickerMode').addEventListener('change',()=>{expanded=false;if(frozen.length===20)render()});
el('pickerExpand').addEventListener('click',()=>{expanded=!expanded;if(frozen.length===20)render()});
el('pickerCopyAll').addEventListener('click',()=>{if(frozen.length!==20)return;copy(frozen.map((p,i)=>String(i+1).padStart(2,'0')+' '+formatLine(p)).join('\n'),el('pickerCopyAll'))});
const share=el('pickerShare');
if(share)share.addEventListener('click',async()=>{
 if(frozen.length!==20)return;
 const lines=frozen.map((p,i)=>String(i+1).padStart(2,'0')+' '+formatLine(p)).join('\n');
 try{if(navigator.share){await navigator.share({title:'LottoLab NZ · 20 locked lines',text:'20 pre-recorded Lotto NZ selections for '+formatDate(target)+'\n'+lines+'\nResearch only. Bonus forecasts are not ticket selections.',url:location.origin+location.pathname+'#picker'});}
 else await copy(lines,share);}catch(e){if(e.name!=='AbortError')el('pickerStatus').textContent='Sharing unavailable. Use Copy all 20 instead.'}
});
init();
})();