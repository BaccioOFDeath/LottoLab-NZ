/* Forever Numbers: private, local-only, historically informed reusable Lotto lines.
 * No algorithm can increase the chance of a particular valid line in a fair draw.
 */
(()=>{
'use strict';
const previous=document.getElementById('lineCreator');
if(!previous)return;
const root=document.createElement('section');
root.id='foreverNumbers';root.className='forever-card';
root.setAttribute('aria-labelledby','foreverTitle');
root.innerHTML="\n<div class=\"forever-top\">\n <div><p class=\"forever-eyebrow\">YOUR NUMBERS · YOUR TRADITION</p><h3 id=\"foreverTitle\">Pick My <em>Forever Numbers</em> <span aria-hidden=\"true\">∞</span></h3><p>Create a historically weighted Lotto line to keep using each week. Lock it, keep a backup and see how it matches future recorded draws.</p></div>\n <div class=\"forever-mark\" aria-hidden=\"true\">∞</div>\n</div>\n<div class=\"forever-columns\">\n <div class=\"forever-workspace\">\n  <div class=\"forever-row-head\"><strong>1 · Create your forever line</strong><span id=\"foreverSample\">Checking archive…</span></div>\n  <div class=\"forever-controls\">\n   <label for=\"foreverMode\">Selection method<select id=\"foreverMode\"><option value=\"balanced\">Balanced history · recommended</option><option value=\"pairs\">Historical pairings</option><option value=\"random\">Pure random · control</option></select></label>\n   <label class=\"forever-switch\"><input id=\"foreverBirthday\" type=\"checkbox\" checked><span>Prefer some numbers above 31 to avoid birthday-only patterns</span></label>\n  </div>\n  <div class=\"forever-ticket\" aria-label=\"Generated Lotto numbers\">\n   <div class=\"forever-ticket-label\"><span>LOTTO · SIX NUMBERS</span><span>ONE SET, AS LONG AS YOU LIKE</span></div>\n   <div id=\"foreverBalls\" class=\"forever-balls\" aria-live=\"polite\"><span class=\"forever-blank\">—</span></div>\n   <div class=\"forever-pb-row\"><span>POWERBALL</span><strong id=\"foreverPB\">—</strong><small>Random 1–14</small></div>\n  </div>\n  <div class=\"forever-actions\"><button type=\"button\" class=\"forever-primary\" id=\"foreverGenerate\">Generate my forever line</button><button type=\"button\" id=\"foreverCopy\" disabled>Copy numbers</button></div>\n  <div class=\"forever-lock\"><label for=\"foreverName\">Name this set<input id=\"foreverName\" type=\"text\" maxlength=\"48\" value=\"My forever numbers\" autocomplete=\"off\"></label><button type=\"button\" id=\"foreverLock\" disabled>Lock and save this set</button></div>\n  <p id=\"foreverStatus\" class=\"forever-status\" role=\"status\" aria-live=\"polite\">Generate a line to get started.</p>\n  <details class=\"forever-details\"><summary>How weighting and number selection work</summary>\n   <p>Balanced history gently weights numbers by frequency across the stored archive and more recent draws. Pairings mode also considers which numbers appeared together. Random mode is an independent baseline. The Powerball is sampled uniformly from 1–14 because its rules changed in September 2026. These methods describe historical patterns, <strong>not a higher probability of winning</strong>.</p>\n   <p>Preferring values above 31 may make a line less birthday-like and could reduce the chance of sharing a prize, but that is not guaranteed. Neither that option nor the history modes changes the chance that a line is drawn. Historical records are incomplete, and saved lines are not purchased tickets.</p>\n  </details>\n </div>\n <div class=\"forever-collection\">\n  <div class=\"forever-row-head\"><strong>2 · Your locked numbers</strong><span><output id=\"foreverCount\">0</output> saved</span></div>\n  <div id=\"foreverSaved\" class=\"forever-saved\"><p>No locked lines yet. Generate one, give it a name and save it here.</p></div>\n  <div class=\"forever-report\"><strong>Recorded draw tracker</strong><p id=\"foreverPerformance\">Save a line to begin tracking the recorded draws that occur after it is locked.</p></div>\n  <div class=\"forever-backup\"><button type=\"button\" id=\"foreverExport\" disabled>Export backup</button><button type=\"button\" id=\"foreverImport\">Import backup</button><input type=\"file\" id=\"foreverImportFile\" accept=\".json,application/json\" hidden></div>\n  <p class=\"forever-storage\">Saved in this browser only, not synced between devices. Export a backup before clearing browser data or changing phones. Nothing is entered into MyLotto automatically.</p>\n </div>\n</div>\n<p class=\"forever-warning\"><strong>Fair-draw reality:</strong> Every valid combination has the same chance of winning. Weighted numbers are a personalised selection style, not a demonstrated advantage. A saved line is not an official Lotto entry.</p>";
previous.insertAdjacentElement('afterend',root);
const $=id=>document.getElementById(id);
const KEY='lottolab:forever-numbers:v1',LIMIT=20;
const two=n=>String(n).padStart(2,'0');
let draws=[],saved=[],current=null,viewId=null;
const random=()=>{if(globalThis.crypto&&typeof crypto.getRandomValues==='function'){const b=new Uint32Array(1);crypto.getRandomValues(b);return b[0]/4294967296;}return Math.random();};
const clamp=(v,low,high)=>Math.max(low,Math.min(high,v));
const lineLabel=line=>line.numbers.map(two).join('  ')+'  |  Powerball '+two(line.powerball);
function status(value){$('foreverStatus').textContent=value;}
function validate(value){
 if(!value||typeof value!=='object'||!Array.isArray(value.numbers)||value.numbers.length!==6)return null;
 const numbers=value.numbers.map(Number);
 if(numbers.some(n=>!Number.isInteger(n)||n<1||n>40)||new Set(numbers).size!==6)return null;
 const powerball=Number(value.powerball);
 if(!Number.isInteger(powerball)||powerball<1||powerball>14)return null;
 return {
  id:typeof value.id==='string'&&value.id.length<100?value.id:String(Date.now())+'-'+String(random()),
  name:typeof value.name==='string'?value.name.slice(0,48).trim()||'My forever numbers':'My forever numbers',
  numbers:numbers.sort((a,b)=>a-b),powerball,
  mode:['balanced','pairs','random'].includes(value.mode)?value.mode:'balanced',
  birthday:!!value.birthday,
  lockedAfterDraw:Number.isInteger(value.lockedAfterDraw)&&value.lockedAfterDraw>0?value.lockedAfterDraw:null,
  lockedDate:typeof value.lockedDate==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(value.lockedDate)?value.lockedDate:new Date().toISOString().slice(0,10)
 };
}
function persist(items){
 try{localStorage.setItem(KEY,JSON.stringify(items));return true;}catch{return false;}
}
function load(){
 try{const data=JSON.parse(localStorage.getItem(KEY)||'[]');saved=Array.isArray(data)?data.map(validate).filter(Boolean).slice(0,LIMIT):[];}
 catch{saved=[];}
}
function readArchive(){
 const input=window.lottoLabDraws;
 if(!Array.isArray(input))return;
 draws=input.filter(d=>d&&Number.isInteger(d.draw)&&/^\d{4}-\d{2}-\d{2}$/.test(d.date)&&Array.isArray(d.numbers)&&d.numbers.length===6&&new Set(d.numbers).size===6&&d.numbers.every(n=>Number.isInteger(n)&&n>=1&&n<=40)).sort((a,b)=>b.draw-a.draw);
 $('foreverSample').textContent=draws.length.toLocaleString('en-NZ')+' stored draws · partial archive';
 renderSaved();
}
function selectWeighted(numbers,weights){
 let total=0;
 for(const n of numbers)total+=weights[n];
 if(!(total>0))return numbers[Math.floor(random()*numbers.length)];
 let draw=random()*total;
 for(const n of numbers){draw-=weights[n];if(draw<0)return n;}
 return numbers[numbers.length-1];
}
function generate(){
 const mode=$('foreverMode').value, birthday=$('foreverBirthday').checked;
 if(mode!=='random'&&!draws.length){status('Archive is unavailable. Use Pure random, or try again once draw records load.');return;}
 const overall=Array(41).fill(0),recent=Array(41).fill(0);
 const pair=Array.from({length:41},()=>Array(41).fill(0));
 const latest=draws.slice(0,Math.min(120,draws.length));
 for(const d of draws){for(const n of d.numbers){overall[n]++;for(const m of d.numbers)if(n!==m)pair[n][m]++;}}
 for(const d of latest)for(const n of d.numbers)recent[n]++;
 const result=[],pool=Array.from({length:40},(_,i)=>i+1);
 while(result.length<6){
  const weights=Array(41).fill(1);
  for(const n of pool){
   if(mode!=='random'){
    const f=overall[n]/draws.length, r=recent[n]/latest.length;
    weights[n]=1+.42*clamp((f-.15)/.15,-.6,.6)+.12*clamp((r-.15)/.15,-.6,.6);
    if(mode==='pairs'&&result.length){
     let pairing=0;
     for(const selected of result){
      // Shrink low-sample pair ratios toward the independent 15% baseline.
      const observed=(pair[selected][n]+.15*28)/(overall[selected]+28);
      pairing+=clamp(observed/.15,.75,1.25);
     }
     weights[n]*=Math.pow(pairing/result.length,1.8);
    }
   }
   if(birthday)weights[n]*=n>31?1.35:.92;
  }
  const chosen=selectWeighted(pool,weights);
  result.push(chosen);pool.splice(pool.indexOf(chosen),1);
 }
 current={numbers:result.sort((a,b)=>a-b),powerball:1+Math.floor(random()*14),mode,birthday};
 renderCurrent();
 const method=mode==='random'?'independent random numbers':mode==='pairs'?'historical frequency and pairings':'moderate historical frequency weighting';
 status('Generated using '+method+'. You can regenerate or lock this combination.');
}
function renderCurrent(){
 const holder=$('foreverBalls');holder.replaceChildren();
 if(!current){
  for(let i=0;i<6;i++){const b=document.createElement('span');b.className='forever-blank';b.textContent='—';holder.append(b);}
  $('foreverPB').textContent='—';
 }else{
  for(const n of current.numbers){const b=document.createElement('span');b.className='forever-ball';b.textContent=two(n);holder.append(b);}
  $('foreverPB').textContent=two(current.powerball);
 }
 $('foreverCopy').disabled=!current;$('foreverLock').disabled=!current;
}
async function copy(line){
 try{
  if(!navigator.clipboard||!navigator.clipboard.writeText)throw Error('Clipboard unsupported');
  await navigator.clipboard.writeText(lineLabel(line));
  status('Copied numbers. Enter them manually on MyLotto to play.');
 }catch{status('Copy unavailable. Your line is: '+lineLabel(line));}
}
function lock(){
 if(!current)return;
 const name=$('foreverName').value.trim().slice(0,48)||'My forever numbers';
 if(saved.some(s=>s.numbers.join(',')===current.numbers.join(',')&&s.powerball===current.powerball)){
  status('That exact combination is already saved.');return;
 }
 const line=validate({...current,name,id:String(Date.now())+'-'+String(Math.floor(random()*1e9)),lockedAfterDraw:draws.length?draws[0].draw:null,lockedDate:new Date().toISOString().slice(0,10)});
 if(!line)return;
 const next=[line,...saved].slice(0,LIMIT);
 if(!persist(next)){status('Browser storage is blocked. Please allow site storage before saving.');return;}
 saved=next;viewId=line.id;renderSaved();
 status('Locked '+name+' on this device. Export a backup to keep it when switching devices.');
}
function recordSince(line){
 return draws.filter(d=>line.lockedAfterDraw!==null?d.draw>line.lockedAfterDraw:d.date>line.lockedDate);
}
function stats(line){
 const after=recordSince(line);const count=n=>n>=3;
 let best=0,three=0,power=0;
 for(const d of after){
  const matched=line.numbers.filter(n=>d.numbers.includes(n)).length;
  best=Math.max(best,matched);if(count(matched))three++;
  if(d.powerball===line.powerball)power++;
 }
 const latest=after[0],latestMatch=latest?line.numbers.filter(n=>latest.numbers.includes(n)).length:0;
 return {after,best,three,power,latest,latestMatch};
}
function renderSaved(){
 const host=$('foreverSaved');host.replaceChildren();$('foreverCount').textContent=String(saved.length);
 $('foreverExport').disabled=!saved.length;
 if(!saved.length){const p=document.createElement('p');p.className='forever-empty';p.textContent='No locked lines yet. Generate one, give it a name and save it here.';host.append(p);$('foreverPerformance').textContent='Save a line to begin tracking the recorded draws that occur after it is locked.';return;}
 for(const item of saved){
  const card=document.createElement('article');card.className='forever-saved-item'+(item.id===viewId?' is-active':'');
  const text=document.createElement('div');const name=document.createElement('strong');name.textContent=item.name;
  const nums=document.createElement('small');nums.textContent=lineLabel(item);text.append(name,nums);
  const actions=document.createElement('div');actions.className='forever-saved-actions';
  for(const [action,label] of [['view','Track'],['copy','Copy'],['delete','Delete']]){
   const b=document.createElement('button');b.type='button';b.dataset.action=action;b.dataset.id=item.id;b.textContent=label;
   b.setAttribute('aria-label',label+' '+item.name);actions.append(b);
  }
  card.append(text,actions);host.append(card);
 }
 const focus=saved.find(s=>s.id===viewId)||saved[0];viewId=focus.id;
 const result=stats(focus);
 $('foreverPerformance').textContent=result.after.length?
  focus.name+': '+result.after.length+' recorded draws since locking · best '+result.best+'/6 · '+result.three+' draws with 3+ main matches · '+result.power+' Powerball matches. Latest recorded draw #'+result.latest.draw+': '+result.latestMatch+'/6'+(result.latest.powerball===focus.powerball?' + Powerball':'')+'. These are matches, not verified prizes.':
  focus.name+': no later recorded draws available yet. Tracking begins after the draw when this line was saved.';
}
function exportBackup(){
 if(!saved.length)return;
 const blob=new Blob([JSON.stringify({format:'LottoLab-Forever-v1',exportedAt:new Date().toISOString(),lines:saved},null,2)],{type:'application/json'});
 const url=URL.createObjectURL(blob),a=document.createElement('a');
 a.href=url;a.download='lottolab-forever-numbers.json';document.body.append(a);a.click();a.remove();
 setTimeout(()=>URL.revokeObjectURL(url),1000);
 status('Backup exported. Save it somewhere safe to restore these numbers on another device.');
}
async function importBackup(file){
 if(!file)return;
 try{
  if(file.size>150000)throw Error('File is too large');
  const parsed=JSON.parse(await file.text());
  if(!parsed||parsed.format!=='LottoLab-Forever-v1'||!Array.isArray(parsed.lines))throw Error('Not a Forever Numbers backup');
  if(parsed.lines.length>LIMIT)throw Error('Backup has too many lines');
  const lines=parsed.lines.map(validate);
  if(lines.some(x=>!x))throw Error('Backup contains invalid Lotto numbers');
  const existing=new Set(saved.map(x=>x.numbers.join(',')+'|'+x.powerball));
  const incoming=lines.filter(x=>!existing.has(x.numbers.join(',')+'|'+x.powerball));
  const merged=[...saved,...incoming].slice(0,LIMIT);
  if(!persist(merged))throw Error('Browser storage is blocked');
  saved=merged;renderSaved();
  status('Backup imported: '+incoming.length+' additional line(s).');
 }catch(error){status('Import failed: '+error.message);}
 finally{$('foreverImportFile').value='';}
}
$('foreverGenerate').addEventListener('click',generate);
$('foreverLock').addEventListener('click',lock);
$('foreverCopy').addEventListener('click',()=>{if(current)copy(current);});
$('foreverSaved').addEventListener('click',event=>{
 const b=event.target.closest('button[data-action]');if(!b)return;
 const line=saved.find(s=>s.id===b.dataset.id);if(!line)return;
 if(b.dataset.action==='copy'){copy(line);return;}
 if(b.dataset.action==='view'){viewId=line.id;renderSaved();status('Viewing draw tracking for '+line.name+'.');return;}
 if(!confirm('Delete the saved set "'+line.name+'"?'))return;
 const next=saved.filter(s=>s.id!==line.id);
 if(!persist(next)){status('Could not delete because browser storage is blocked.');return;}
 saved=next;if(viewId===line.id)viewId=null;renderSaved();status('Saved set deleted.');
});
$('foreverExport').addEventListener('click',exportBackup);
$('foreverImport').addEventListener('click',()=>$('foreverImportFile').click());
$('foreverImportFile').addEventListener('change',e=>importBackup(e.target.files[0]));

window.addEventListener('lottolab:forever-from-checker',event=>{
 const line=event.detail;
 if(!line||!Array.isArray(line.numbers)||line.numbers.length!==6||new Set(line.numbers).size!==6
  ||line.numbers.some(n=>!Number.isInteger(n)||n<1||n>40)
  ||!Number.isInteger(line.powerball)||line.powerball<1||line.powerball>14)return;
 current={numbers:[...line.numbers].sort((a,b)=>a-b),powerball:line.powerball,mode:'manual',birthday:false};
 $('foreverName').value=(line.name||'My forever numbers').slice(0,48);
 renderCurrent();
 status('Loaded your manually entered numbers. Select Lock and save this set to keep it forever.');
});
window.addEventListener('lottolab:data-ready',readArchive);
window.addEventListener('lottolab:data-error',()=>{$('foreverSample').textContent='Archive unavailable · random mode works';});
load();renderCurrent();renderSaved();readArchive();
})();