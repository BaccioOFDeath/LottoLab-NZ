/* Six independent Lotto number fields for touch keyboards.
   The existing text inputs remain available in a collapsed full-line paste option
   and remain the single source of truth for existing draw-checking logic. */
(()=>{
'use strict';
const $=id=>document.getElementById(id);
const STORAGE='lottolab:ball-entry-draft:v1:';
const SAVED='lottolab:checked-lines:v1';
const pad=n=>String(n).padStart(2,'0');
function readSix(text){
 const tokens=String(text||'').trim().split(/[\s,;|/-]+/).filter(Boolean);
 if(tokens.length!==6||tokens.some(t=>!/^\d{1,2}$/.test(t)))return null;
 const n=tokens.map(Number);
 return n.every(x=>x>=1&&x<=40)&&new Set(n).size===6?n:null;
}
function wire(id,containerId,labelId){
 const original=$(id),parent=original?.parentElement;
 if(!original||!parent)return;
 const mainLabel=labelId?$(labelId):parent.querySelector('label[for="'+id+'"]');
 const grid=document.createElement('div');
 grid.className='ball-entry-grid';grid.setAttribute('role','group');
 grid.setAttribute('aria-label','Enter six Lotto numbers, one ball at a time');
 const inputs=[];
 for(let k=0;k<6;k++){
  const el=document.createElement('input');
  el.type='text';el.inputMode='numeric';el.pattern='[0-9]*';el.maxLength=2;
  el.autocomplete='off';el.spellcheck=false;el.enterKeyHint=k===5?'done':'next';
  el.className='ball-entry-field';el.dataset.position=String(k+1);
  el.id=id+'Ball'+(k+1);el.setAttribute('aria-label','Lotto ball '+(k+1)+' of 6, number 1 to 40');
  el.placeholder='–';el.setAttribute('aria-describedby',id+'Instructions');
  grid.append(el);inputs.push(el);
 }
 const tip=document.createElement('p');tip.className='ball-entry-instructions';
 tip.id=id+'Instructions';tip.textContent='Tap a ball, type its number, then tap the next. Two-digit numbers move to the next ball automatically.';
 const pasteBox=document.createElement('details');pasteBox.className='ball-entry-paste';
 const summary=document.createElement('summary');summary.textContent='Or paste all six numbers at once';
 original.required=false;original.removeAttribute('inputmode');original.setAttribute('inputmode','text');
 original.setAttribute('aria-label','Paste six Lotto numbers separated by spaces or commas');
 pasteBox.append(summary,original);
 if(mainLabel)mainLabel.setAttribute('for',inputs[0].id);
 // The input is already immediately after its label on both checker forms.
 if(containerId==='checkerNumbers'){
  const help=parent.querySelector('p');
  if(help)help.textContent='Enter one number per ball, or use the full-line paste option.';
 }
 parent.insertBefore(grid,pasteBox);parent.insertBefore(tip,pasteBox);parent.insertBefore(pasteBox,parent.children[parent.children.length-1]||null);
 // For the quick checker, both grid and paste controls must stay before the PB / Submit row.
 if(containerId==='checkNumbers'){
  const bottom=parent.querySelector('.quick-check-bottom');
  if(bottom){parent.insertBefore(grid,bottom);parent.insertBefore(tip,bottom);parent.insertBefore(pasteBox,bottom);}
 }
 // For the historical checker, the source input sits between its label and helper paragraph.
 if(containerId==='checkerNumbers'){
  const help=parent.querySelector('p');
  if(help){parent.insertBefore(grid,help);parent.insertBefore(tip,help);parent.insertBefore(pasteBox,help);}
 }
 let syncing=false;
 function readCells(){return inputs.map(el=>el.value.trim());}
 function setCells(values){
  syncing=true;
  inputs.forEach((el,i)=>{el.value=values[i]===undefined||values[i]===''?'':String(values[i]).slice(0,2);el.classList.remove('is-error');});
  syncing=false;sync();
 }
 function sync(){
  if(syncing)return;
  const values=readCells();
  original.value=values.filter(Boolean).join(' ');
  try{localStorage.setItem(STORAGE+id,JSON.stringify(values));}catch{}
  original.dispatchEvent(new Event('input',{bubbles:true}));
  mark();
 }
 function mark(){
  const values=readCells(),seen=new Set();
  for(const el of inputs){
   const raw=el.value;
   const n=Number(raw);
   const invalid=raw!==''&&(!/^\d{1,2}$/.test(raw)||n<1||n>40||seen.has(n));
   el.classList.toggle('is-error',invalid);
   el.setAttribute('aria-invalid',String(invalid));
   if(raw!==''&&!invalid)seen.add(n);
  }
 }
 original.addEventListener('input',()=>{
  if(syncing)return;
  const parsed=readSix(original.value);
  if(parsed){
   syncing=true;inputs.forEach((el,i)=>{el.value=pad(parsed[i]);});syncing=false;
   try{localStorage.setItem(STORAGE+id,JSON.stringify(inputs.map(e=>e.value)));}catch{}
   mark();
  }
 });
 inputs.forEach((input,index)=>{
  input.addEventListener('input',()=>{
   const cleaned=input.value.replace(/\D/g,'').slice(0,2);
   if(input.value!==cleaned)input.value=cleaned;
   sync();
   if(cleaned.length===2&&Number(cleaned)>=1&&Number(cleaned)<=40&&index<5)inputs[index+1].focus();
  });
  input.addEventListener('paste',event=>{
   const pasted=event.clipboardData?.getData('text');
   const parsed=readSix(pasted);
   if(!parsed)return;
   event.preventDefault();setCells(parsed.map(pad));
   inputs[5].blur();
  });
  input.addEventListener('focus',()=>input.select());
  input.addEventListener('blur',()=>{
   if(input.value&&Number(input.value)>=1&&Number(input.value)<=40)input.value=pad(Number(input.value));
   sync();
  });
  input.addEventListener('keydown',event=>{
   if(event.key==='Enter'){
    event.preventDefault();
    if(index<5)inputs[index+1].focus();
    else{
     input.blur();
     if(id==='checkNumbers')$('quickCheckForm')?.requestSubmit();
     else $('checkerSearch')?.click();
    }
   }else if(event.key==='ArrowLeft'&&index>0){event.preventDefault();inputs[index-1].focus();}
   else if(event.key==='ArrowRight'&&index<5){event.preventDefault();inputs[index+1].focus();}
   else if(event.key==='Backspace'&&!input.value&&index>0){event.preventDefault();inputs[index-1].focus();inputs[index-1].select();}
  });
 });
 let restored=null;
 try{const array=JSON.parse(localStorage.getItem(STORAGE+id)||'null');if(Array.isArray(array)&&array.length===6&&array.every(x=>typeof x==='string'&&x.length<=2))restored=array;}catch{}
 const existing=readSix(original.value);
 if(existing)setCells(existing.map(pad));
 else if(restored)setCells(restored);
 else mark();
 return {inputs,read:()=>readSix(readCells().join(' ')),sync,setCells};
}
const quick=wire('checkNumbers','checkNumbers');
const historical=wire('checkerNumbers','checkerNumbers');
// A successful latest-draw check also remembers the line in the historical checker library.
const form=$('quickCheckForm');
if(form&&quick)form.addEventListener('submit',()=>{
 const numbers=quick.read();
 if(!numbers)return;
 const rawPB=$('checkPowerball')?.value.trim()||'';
 const pb=rawPB===''?null:Number(rawPB);
 if(pb!==null&&(!Number.isInteger(pb)||pb<1||pb>14))return;
 const savedLine={numbers:[...numbers].sort((a,b)=>a-b),powerball:pb,name:'Latest draw check'};
 try{
  const loaded=JSON.parse(localStorage.getItem(SAVED)||'[]');
  const lines=Array.isArray(loaded)?loaded.filter(x=>x&&Array.isArray(x.numbers)):[];
  const key=savedLine.numbers.join(',')+'|'+(pb??'');
  const filtered=lines.filter(x=>x.numbers.join(',')+'|'+(x.powerball??'')!==key);
  localStorage.setItem(SAVED,JSON.stringify([savedLine,...filtered].slice(0,50)));
  window.dispatchEvent(new Event('lottolab:checked-line-added'));
 }catch{}
});
// Historical checker programmatic "Load" action supplies a new text value.
window.addEventListener('lottolab:load-ball-line',event=>{
 const six=readSix(event.detail?.numbers?.join(' '));
 if(six&&historical)historical.setCells(six.map(pad));
});
})();