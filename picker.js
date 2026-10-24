// LottoLab NZ — exactly 20 committed selections per draw, no new client-side generations.
(()=>{
'use strict';
const el=id=>document.getElementById(id);
const modeLabels={
  'adaptive_frequency_v1':'Research',
  'random_baseline_v1':'Random control'
};
let frozen=[],target='';
function fmt(n){return String(n).padStart(2,'0')}
function formatDate(d){return new Date(d+'T12:00:00Z').toLocaleDateString('en-NZ',{timeZone:'UTC',weekday:'long',day:'numeric',month:'long',year:'numeric'})}
function formatLine(p){return p.numbers.map(fmt).join(' - ')+' | PB '+fmt(p.powerball)}
function valid(p){return p&&Array.isArray(p.numbers)&&p.numbers.length===6&&new Set(p.numbers).size===6&&p.numbers.every(n=>Number.isInteger(n)&&n>=1&&n<=40)&&Number.isInteger(p.powerball)&&p.powerball>=1&&p.powerball<=14}
function slot(p){return Number.isInteger(p.line_number)?p.line_number:1}
async function copy(value,button){try{await navigator.clipboard.writeText(value);const old=button.textContent;button.textContent='Copied ✓';el('pickerStatus').textContent='Copied the already recorded lines — no new numbers were generated.';setTimeout(()=>{button.textContent=old},1600)}catch(e){el('pickerStatus').textContent='Clipboard permission unavailable. Select the numbers to copy.'}}
function render(){
  const selected=el('pickerMode').value;
  const shown=selected==='all'?frozen:frozen.filter(p=>p.model===selected);
  const list=el('pickerLines');list.replaceChildren();
  for(const [index,p] of shown.entries()){
    const row=document.createElement('div');row.className='fixed-pick-line';
    const name=document.createElement('div');name.className='fixed-pick-name';
    const number=document.createElement('strong');number.textContent='Line '+String(frozen.indexOf(p)+1).padStart(2,'0');
    const method=document.createElement('small');method.textContent=(modeLabels[p.model]||p.model)+' · slot '+slot(p);
    name.append(number,method);
    const nums=document.createElement('div');nums.className='fixed-pick-numbers';
    for(const n of p.numbers){const b=document.createElement('span');b.className='ball';b.textContent=fmt(n);nums.append(b)}
    const pb=document.createElement('span');pb.className='fixed-pick-pb';
    pb.textContent='PB '+fmt(p.powerball);
    const button=document.createElement('button');button.type='button';button.className='fixed-copy btn btn-export';button.textContent='Copy';button.setAttribute('aria-label','Copy line '+(frozen.indexOf(p)+1));
    button.addEventListener('click',()=>copy(formatLine(p),button));
    row.append(name,nums,pb,button);list.appendChild(row);
  }
  el('pickerStatus').textContent='Showing '+shown.length+' of 20 frozen lines · 10 research + 10 random comparison. These do not change when you reload or change the analysis filters.';
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
el('pickerMode').addEventListener('change',()=>{if(frozen.length===20)render()});
el('pickerCopyAll').addEventListener('click',()=>{if(frozen.length!==20)return;copy(frozen.map((p,i)=>String(i+1).padStart(2,'0')+' '+formatLine(p)).join('\n'),el('pickerCopyAll'))});
init();
})();