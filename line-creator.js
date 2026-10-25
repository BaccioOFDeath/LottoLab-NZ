/* Interactive six-from-40 Lotto line builder.
 * Co-occurrence is descriptive history, not predictive probability.
 * Data: same merged and validated records as the rest of LottoLab.
 */
(()=>{
'use strict';
const $=id=>document.getElementById(id), MAX=6, CHOICE_MAX=40;
const picked=new Set();
let rows=[], scored=[], candidates=[], choiceMode='all', saved=[];
const storageKey='lottolab:user-lines:v1';
const numberText=n=>String(n).padStart(2,'0');
function sourceRows(){return choiceMode==='verified'?rows.filter(d=>d.verification==='two-source'&&new Set(d.sources||[]).size>=2):rows;}
function store(){try{localStorage.setItem(storageKey,JSON.stringify(saved.slice(0,30)))}catch{}}
function restore(){
 try{
  const value=JSON.parse(localStorage.getItem(storageKey)||'[]');
  saved=Array.isArray(value)?value.filter(v=>v&&Array.isArray(v.numbers)&&v.numbers.length===6&&
   new Set(v.numbers).size===6&&v.numbers.every(n=>Number.isInteger(n)&&n>=1&&n<=40)&&
   (v.powerball===null||Number.isInteger(v.powerball)&&v.powerball>=1&&v.powerball<=14)).slice(0,30):[];
 }catch{saved=[]}
}
function setStatus(value){$('lineBuilderStatus').textContent=value}
function numberButton(n){
 const button=document.createElement('button');
 button.type='button';button.className='build-ball'+(picked.has(n)?' is-picked':'');
 button.textContent=numberText(n);button.dataset.n=String(n);
 button.setAttribute('aria-label','Lotto number '+n+(picked.has(n)?', selected':', add to your line'));
 button.setAttribute('aria-pressed',String(picked.has(n)));
 if(picked.size>=MAX&&!picked.has(n))button.disabled=true;
 return button;
}
function renderGrid(){
 const frag=document.createDocumentFragment();
 for(let n=1;n<=CHOICE_MAX;n++)frag.append(numberButton(n));
 $('lineNumberGrid').replaceChildren(frag);
}
function bestCandidates(){
 const available=sourceRows();
 if(!available.length)return {list:[],kind:'unavailable',sample:0,total:0};
 const selection=[...picked];
 const matching=available.filter(d=>selection.every(n=>d.numbers.includes(n)));
 const useJoint=selection.length>0&&matching.length>=3;
 const usePairs=selection.length>0&&!useJoint;
 const pool=useJoint?matching:available;
 const result=[];
 for(let n=1;n<=CHOICE_MAX;n++){
  if(picked.has(n))continue;
  let count=0;
  if(usePairs){
   for(const row of available){
    if(row.numbers.includes(n))for(const key of selection)if(row.numbers.includes(key))count++;
   }
  }else for(const row of pool)if(row.numbers.includes(n))count++;
  result.push({n,count});
 }
 result.sort((a,b)=>b.count-a.count||a.n-b.n);
 return {list:result.slice(0,8),kind:selection.length===0?'overall':usePairs?'pairwise':'joint',
  sample:usePairs?available.length:pool.length,total:available.length,joint:matching.length,selected:selection.length};
}
function renderSuggestions(){
 const r=bestCandidates();candidates=r.list;
 const title=$('lineSuggestionTitle'),detail=$('lineSuggestionDetail');
 if(!rows.length){title.textContent='Load results to see suggestions';detail.textContent='Historical records are still loading. You can still choose numbers manually.'}
 else if(r.kind==='overall'){title.textContent='Start with any Lotto ball';detail.textContent='Most frequent main numbers in '+r.total.toLocaleString('en-NZ')+' available stored draws. Past frequency does not alter the next draw.'}
 else if(r.kind==='joint'){title.textContent=r.selected===1?'Numbers seen with '+numberText([...picked][0]):'Numbers seen with your '+r.selected+' picks';detail.textContent='These '+r.selected+' selections occurred together in '+r.joint+' of '+r.total+' stored draws. Counts below show additional appearances within those '+r.joint+' draws.'}
 else if(r.kind==='pairwise'){title.textContent='Closest historical pairings';detail.textContent='Only '+r.joint+' stored draws contained every selected number. Showing summed pair appearances against your '+r.selected+' picks instead; each draw can count more than once. Not a probability.'}
 else {title.textContent='No verified records available';detail.textContent='Choose the full archive or select numbers yourself.'}
 $('lineSampleSize').textContent=r.total?('Sample: '+r.total.toLocaleString('en-NZ')+' draws'+(choiceMode==='verified'?' · cross-checked only':' · includes one-source history')):'No available comparison';
 const host=$('lineSuggestGrid'),frag=document.createDocumentFragment();
 for(const v of candidates){
  const btn=document.createElement('button');btn.type='button';btn.className='line-suggestion';
  btn.dataset.n=String(v.n);
  const bubble=document.createElement('strong');bubble.textContent=numberText(v.n);
  const description=document.createElement('small');
  description.textContent=r.kind==='pairwise'?v.count+' pair hits':v.count+' / '+r.sample+' draws';
  btn.append(bubble,description);btn.setAttribute('aria-label','Add '+v.n+', '+description.textContent);btn.disabled=picked.size>=MAX;
  frag.append(btn);
 }
 if(!candidates.length){const p=document.createElement('p');p.textContent='No historical comparison is available for these filters.';frag.append(p)}
 host.replaceChildren(frag);
 $('lineSuggestionsNote').textContent=r.kind==='pairwise'?'Pairwise fallback is used when fewer than 3 draws share every chosen number.':'Historical association is not an advantage in a fair independent future draw.';
}
function renderChosen(){
 $('lineSelectedCount').textContent=String(picked.size);
 const host=$('lineChosen'),frag=document.createDocumentFragment();
 for(let i=0;i<MAX;i++){
  const n=[...picked][i];
  if(n===undefined){const span=document.createElement('span');span.className='line-empty-slot';span.textContent='+';span.setAttribute('aria-label','Empty Lotto number slot');frag.append(span)}
  else{const b=document.createElement('button');b.type='button';b.className='line-picked-ball';b.dataset.n=String(n);b.textContent=numberText(n)+' ×';b.title='Remove number '+n;b.setAttribute('aria-label','Remove number '+n);frag.append(b)}
 }
 host.replaceChildren(frag);
 const complete=picked.size===MAX;
 $('lineCopy').disabled=!complete;$('lineSave').disabled=!complete;$('lineAuto').disabled=complete||!rows.length;
 $('linePowerball').disabled=!complete;
}
function render(){renderChosen();renderGrid();renderSuggestions()}
function pick(n){
 if(picked.has(n)){picked.delete(n);setStatus('Removed '+numberText(n)+' from your line.')}
 else if(picked.size>=MAX){setStatus('Six numbers selected. Remove one before choosing another.');return}
 else {picked.add(n);setStatus('Selected '+numberText(n)+'. '+picked.size+' of 6 Lotto numbers.')}
 render();
}
function lineString(line){return line.numbers.map(numberText).join(' ')+' | PB '+(line.powerball===null?'—':numberText(line.powerball))}
function currentLine(){const pb=$('linePowerball').value;return {numbers:[...picked].sort((a,b)=>a-b),powerball:pb===''?null:Number(pb)}}
function renderSaved(){
 const holder=$('lineSavedList');holder.replaceChildren();
 $('lineSavedCount').textContent=String(saved.length);
 if(!saved.length){const p=document.createElement('p');p.className='line-saved-empty';p.textContent='Your saved lines will appear here on this device.';holder.append(p);return}
 for(let i=0;i<saved.length;i++){
  const data=saved[i],row=document.createElement('div');row.className='line-saved-item';
  const name=document.createElement('span');name.textContent=lineString(data);
  const controls=document.createElement('div');
  for(const [action,label] of [['load','Edit'],['copy','Copy'],['remove','Delete']]){
   const b=document.createElement('button');b.type='button';b.dataset.action=action;b.dataset.index=String(i);b.textContent=label;
   b.setAttribute('aria-label',label+' saved line '+(i+1));controls.append(b);
  }
  row.append(name,controls);holder.append(row);
 }
}
async function copyLine(line){
 const value=lineString(line);
 try{if(navigator.clipboard?.writeText)await navigator.clipboard.writeText(value);
 else if(window.lottoLabToast)window.lottoLabToast('Copy not available: select and copy the numbers manually.');
 else throw Error('Clipboard unavailable');
 setStatus('Copied '+value+'.')}
 catch{setStatus('Clipboard unavailable in this browser. Your line: '+value)}
}
function save(){
 const line=currentLine();
 if(line.numbers.length!==MAX)return;
 if(saved.some(x=>lineString(x)===lineString(line))){setStatus('This line is already saved on this device.');return}
 saved.unshift(line);saved=saved.slice(0,30);store();renderSaved();setStatus('Saved this line on this device only. It is not a published or scored prediction.');
}
function autocomplete(){
 if(!rows.length)return;
 while(picked.size<MAX){
  const best=bestCandidates().list.find(v=>v.count>0);
  if(!best)break;
  picked.add(best.n);
 }
 render();
 setStatus(picked.size===MAX?'Completed six numbers using historical co-occurrence rankings. This is not a predictive advantage.':'Historical comparison could not complete your line.');
}
function randomFill(){
 picked.clear();
 const nums=Array.from({length:40},(_,i)=>i+1);
 const cryptoRandom=()=>{const a=new Uint32Array(1);if(globalThis.crypto?.getRandomValues){crypto.getRandomValues(a);return a[0]/4294967296}return Math.random()};
 for(let i=nums.length-1;i>0;i--){const j=Math.floor(cryptoRandom()*(i+1));[nums[i],nums[j]]=[nums[j],nums[i]]}
 for(const n of nums.slice(0,6))picked.add(n);
 render();setStatus('Random six-number line created, independent of historical frequencies.');
}
function onData(){
 const source=window.lottoLabDraws;
 if(!Array.isArray(source))return;
 rows=source.filter(d=>Array.isArray(d.numbers)&&d.numbers.length===6&&new Set(d.numbers).size===6);
 render();
}
const grid=$('lineNumberGrid');if(!grid)return;
grid.addEventListener('click',e=>{const b=e.target.closest('button[data-n]');if(b)pick(Number(b.dataset.n))});
$('lineSuggestGrid').addEventListener('click',e=>{const b=e.target.closest('button[data-n]');if(b)pick(Number(b.dataset.n))});
$('lineChosen').addEventListener('click',e=>{const b=e.target.closest('button[data-n]');if(b)pick(Number(b.dataset.n))});
$('lineSource').addEventListener('change',e=>{choiceMode=e.target.value;renderSuggestions()});
$('lineClear').addEventListener('click',()=>{picked.clear();$('linePowerball').value='';render();setStatus('Your line is clear.')});
$('lineRandom').addEventListener('click',randomFill);
$('lineAuto').addEventListener('click',autocomplete);
$('lineCopy').addEventListener('click',()=>{if(picked.size===MAX)copyLine(currentLine())});
$('lineSave').addEventListener('click',save);
$('lineSavedList').addEventListener('click',e=>{
 const btn=e.target.closest('button[data-action]');if(!btn)return;
 const idx=Number(btn.dataset.index),data=saved[idx];if(!data)return;
 if(btn.dataset.action==='remove'){saved.splice(idx,1);store();renderSaved();setStatus('Saved line removed.')}
 else if(btn.dataset.action==='copy')copyLine(data);
 else {picked.clear();for(const n of data.numbers)picked.add(n);$('linePowerball').value=data.powerball===null?'':String(data.powerball);render();setStatus('Loaded your saved line for editing.')}
});
window.addEventListener('lottolab:data-ready',onData);
window.addEventListener('lottolab:data-error',()=>setStatus('Could not load historical draws. You can still choose your own numbers.'));
restore();renderSaved();render();onData();
})();