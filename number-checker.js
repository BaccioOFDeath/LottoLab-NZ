/* LottoLab historical numbers checker: descriptive comparisons, not a ticket verifier. */
(()=>{
'use strict';
const anchor=document.getElementById('foreverNumbers');if(!anchor)return;
const section=document.createElement('section');section.id='numberChecker';section.className='history-checker';section.setAttribute('aria-labelledby','checkerTitle');
section.innerHTML="<div class=\"checker-intro\"><p class=\"checker-kicker\">SEARCH YOUR NUMBERS</p><h3 id=\"checkerTitle\">Have my numbers <em>come up before?</em></h3><p>Paste any six Lotto numbers to see exact and near matches from the stored archive. Your entered lines stay on this device.</p></div>\n<div class=\"checker-layout\"><div class=\"checker-input-card\">\n<label for=\"checkerNumbers\">Your six Lotto numbers</label><input id=\"checkerNumbers\" type=\"text\" maxlength=\"90\" autocomplete=\"off\" spellcheck=\"false\" placeholder=\"04 11 18 23 32 39\">\n<p>Enter six different numbers from 1–40, separated by spaces, commas or hyphens.</p>\n<div class=\"checker-fields\"><label for=\"checkerPB\">Powerball (optional)<select id=\"checkerPB\"><option value=\"\">No Powerball</option></select></label><label for=\"checkerName\">Save as<input id=\"checkerName\" type=\"text\" maxlength=\"48\" value=\"My Lotto line\" autocomplete=\"off\"></label></div>\n<div class=\"checker-actions\"><button type=\"button\" id=\"checkerSearch\">Check my numbers</button><button type=\"button\" id=\"checkerSave\">Save line</button><button type=\"button\" id=\"checkerForever\">Make forever numbers</button></div>\n<p class=\"checker-feedback\" id=\"checkerFeedback\" role=\"status\" aria-live=\"polite\">Your draft is remembered automatically on this device.</p>\n</div><div class=\"checker-results\" id=\"checkerResults\" aria-live=\"polite\"><strong>Historical matches appear here</strong><p>This is research, not a check of official tickets or prize eligibility.</p></div></div>\n<div class=\"checker-bottom\"><div class=\"checker-bottom-title\"><strong>My locally saved lines</strong><span id=\"checkerSavedCount\">0 lines</span></div><div class=\"checker-saved\" id=\"checkerSaved\"><p>No saved lines yet.</p></div>\n<div class=\"checker-backup\"><button type=\"button\" id=\"checkerExport\">Export saved lines</button><button type=\"button\" id=\"checkerImport\">Import saved lines</button><input type=\"file\" id=\"checkerImportFile\" accept=\".json,application/json\" hidden></div></div>\n<p class=\"checker-disclaimer\" id=\"checkerCoverage\">The historical archive is incomplete. No match does not establish that a combination was never drawn. Historical matches are not official winnings or ticket validation.</p>";
anchor.insertAdjacentElement('afterend',section);
const $=id=>document.getElementById(id),SAVE='lottolab:checked-lines:v1',DRAFT='lottolab:checker-draft:v1',MAX=50;
const two=n=>String(n).padStart(2,'0');let rows=[],history=[];
for(let n=1;n<=14;n++){const o=document.createElement('option');o.value=String(n);o.textContent=two(n);$('checkerPB').append(o);}
function parse(value){
 const raw=value.trim();if(!raw)return {error:'Enter your six numbers first.'};
 if(!/^[\d,\s;|\/-]+$/.test(raw))return {error:'Use six numbers separated by spaces, commas or hyphens; enter Powerball separately.'};
 const tokens=raw.split(/[\s,;|\/-]+/).filter(Boolean);
 if(tokens.length!==6)return {error:'Enter exactly six Lotto numbers.'};
 const numbers=tokens.map(Number);
 if(numbers.some(n=>!Number.isInteger(n)||n<1||n>40))return {error:'Main numbers must be between 1 and 40.'};
 if(new Set(numbers).size!==6)return {error:'All six numbers must be different.'};
 return {numbers:numbers.sort((a,b)=>a-b)};
}
function current(){
 const v=parse($('checkerNumbers').value);if(v.error)return v;
 const pb=$('checkerPB').value;
 return {...v,powerball:pb===''?null:Number(pb),name:$('checkerName').value.trim().slice(0,48)||'My Lotto line'};
}
function validate(value){
 if(!value||!Array.isArray(value.numbers)||value.numbers.length!==6)return null;
 const n=value.numbers.map(Number);
 if(n.some(x=>!Number.isInteger(x)||x<1||x>40)||new Set(n).size!==6)return null;
 const pb=value.powerball===null||value.powerball===''||value.powerball===undefined?null:Number(value.powerball);
 if(pb!==null&&(!Number.isInteger(pb)||pb<1||pb>14))return null;
 return {numbers:n.sort((a,b)=>a-b),powerball:pb,name:typeof value.name==='string'?value.name.slice(0,48)||'My Lotto line':'My Lotto line'};
}
const key=v=>v.numbers.join(',')+'|'+(v.powerball??'');
function feedback(t){$('checkerFeedback').textContent=t;}
function storeDraft(){try{localStorage.setItem(DRAFT,JSON.stringify({numbers:$('checkerNumbers').value,powerball:$('checkerPB').value,name:$('checkerName').value}));}catch{}}
function restore(){
 try{const v=JSON.parse(localStorage.getItem(SAVE)||'[]');history=Array.isArray(v)?v.map(validate).filter(Boolean).slice(0,MAX):[];}catch{history=[];}
 try{const d=JSON.parse(localStorage.getItem(DRAFT)||'{}');if(typeof d.numbers==='string')$('checkerNumbers').value=d.numbers.slice(0,90);if(/^(|[1-9]|1[0-4])$/.test(String(d.powerball??'')))$('checkerPB').value=String(d.powerball??'');if(typeof d.name==='string')$('checkerName').value=d.name.slice(0,48);}catch{}
}
function addSaved(v,silent=false){
 const line=validate(v);if(!line)return false;
 const next=[line,...history.filter(x=>key(x)!==key(line))].slice(0,MAX);
 try{localStorage.setItem(SAVE,JSON.stringify(next));}catch{feedback('Browser storage is blocked; numbers could not be saved.');return false;}
 history=next;renderSaved();if(!silent)feedback('Saved locally: '+line.numbers.map(two).join(' '));
 return true;
}
function renderSaved(){
 $('checkerSavedCount').textContent=history.length+' line'+(history.length===1?'':'s');
 const box=$('checkerSaved');box.replaceChildren();
 if(!history.length){const p=document.createElement('p');p.textContent='No saved lines yet.';box.append(p);return;}
 for(const [i,v] of history.entries()){
  const row=document.createElement('div');row.className='checker-saved-line';
  const info=document.createElement('div'),name=document.createElement('strong'),numbers=document.createElement('small');
  name.textContent=v.name;numbers.textContent=v.numbers.map(two).join(' ')+' | PB '+(v.powerball===null?'—':two(v.powerball));info.append(name,numbers);
  const actions=document.createElement('div');
  for(const [action,title] of [['load','Load'],['delete','Delete']]){
   const b=document.createElement('button');b.type='button';b.dataset.action=action;b.dataset.index=String(i);b.textContent=title;b.setAttribute('aria-label',title+' '+v.name);actions.append(b);
  }
  row.append(info,actions);box.append(row);
 }
}
function coverage(){
 const note=$('checkerCoverage');
 if(!rows.length){note.textContent='Archive unavailable: you can still save and export lines. This is not an official ticket checker.';return;}
 const dates=rows.map(x=>x.date).sort();
 note.textContent='Checked against '+rows.length.toLocaleString('en-NZ')+' stored results dated '+dates[0]+' to '+dates[dates.length-1]+'. The archive has gaps and is incomplete. No matching record does not prove a line has never appeared. No ticket or prize validation is provided.';
}
function loadArchive(){
 const a=window.lottoLabDraws;if(!Array.isArray(a))return;
 rows=a.filter(d=>Number.isInteger(d?.draw)&&/^\d{4}-\d{2}-\d{2}$/.test(d.date)&&Array.isArray(d.numbers)&&d.numbers.length===6&&new Set(d.numbers).size===6&&d.numbers.every(n=>Number.isInteger(n)&&n>=1&&n<=40)).sort((a,b)=>b.draw-a.draw);
 coverage();const v=current();if(!v.error)compare(v,false);
}
function compare(line,autoSave){
 const box=$('checkerResults');box.replaceChildren();
 const title=document.createElement('strong');title.textContent='Your numbers: '+line.numbers.map(two).join('  ');box.append(title);
 if(!rows.length){const p=document.createElement('p');p.textContent='No archive data loaded. You can still save this line locally.';box.append(p);feedback('Archive unavailable; try again later.');return;}
 const counts=Array(7).fill(0),matches=[];let pbCount=0,fullPB=0;
 for(const d of rows){
  const hits=line.numbers.filter(n=>d.numbers.includes(n)).length;counts[hits]++;
  const pb=line.powerball!==null&&Number.isInteger(d.powerball)&&d.powerball===line.powerball;
  if(pb)pbCount++;if(pb&&hits===6)fullPB++;
  if(hits>=4)matches.push({d,hits,pb});
 }
 const headline=document.createElement('p');headline.className='checker-summary';
 headline.textContent=counts[6]?'Exact six appeared in '+counts[6]+' stored draw(s).':'No exact six-number match in '+rows.length.toLocaleString('en-NZ')+' available draws.';
 box.append(headline);
 const stats=document.createElement('div');stats.className='checker-stat-grid';
 for(const n of [6,5,4,3]){
  const cell=document.createElement('div'),count=document.createElement('strong'),label=document.createElement('small');count.textContent=String(counts[n]);label.textContent=n+'/6 matches';cell.append(count,label);stats.append(cell);
 }box.append(stats);
 const pb=document.createElement('p');pb.className='checker-pb-note';
 pb.textContent=line.powerball===null?'Choose a Powerball to compare it too.':'Powerball '+two(line.powerball)+' alone matched '+pbCount+' stored draws. All six plus Powerball matched '+fullPB+'. Powerball rules have changed historically.';box.append(pb);
 const sub=document.createElement('h4');sub.textContent='Closest recorded draws';box.append(sub);
 if(!matches.length){const p=document.createElement('p');p.textContent='No stored draw matched four or more main numbers.';box.append(p);}
 else{
  matches.sort((a,b)=>b.hits-a.hits||Number(b.pb)-Number(a.pb)||b.d.draw-a.d.draw);
  const list=document.createElement('div');list.className='checker-match-list';
  for(const m of matches.slice(0,12)){
   const item=document.createElement('div');item.className='checker-match';
   const label=document.createElement('span');label.textContent=m.hits+'/6'+(m.pb?' + PB':'');
   const values=document.createElement('span');values.textContent=m.d.numbers.map(two).join(' · ');
   const date=document.createElement('small');date.textContent='Draw #'+m.d.draw+' · '+m.d.date;
   item.append(label,values,date);list.append(item);
  }box.append(list);
  if(matches.length>12){const p=document.createElement('p');p.textContent='Showing 12 closest of '+matches.length+' draws with four or more matches.';box.append(p);}
 }
 if(autoSave){if(addSaved(line,true))feedback('Compared '+rows.length+' stored draws and saved this line locally.');}
}
function check(){
 const v=current();if(v.error){feedback(v.error);return;}compare(v,true);
}
function useForever(){
 const v=current();if(v.error){feedback(v.error);return;}
 if(v.powerball===null){feedback('Select a Powerball before locking this as a Forever Numbers line.');return;}
 window.dispatchEvent(new CustomEvent('lottolab:forever-from-checker',{detail:v}));
 addSaved(v,true);feedback('Sent to Forever Numbers. Select Lock and save there.');
 if(window.lottoLabJumpTo)window.lottoLabJumpTo('foreverNumbers');
}
function exportBackup(){
 const blob=new Blob([JSON.stringify({format:'LottoLab-Checked-v1',lines:history},null,2)],{type:'application/json'});
 const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='lottolab-checked-lines.json';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
 feedback('Backup exported. Keep a copy before changing devices.');
}
async function importBackup(file){
 if(!file)return;
 try{
  if(file.size>150000)throw Error('File too large');
  const value=JSON.parse(await file.text());
  if(value?.format!=='LottoLab-Checked-v1'||!Array.isArray(value.lines)||value.lines.length>MAX)throw Error('Invalid checked-lines backup');
  const incoming=value.lines.map(validate);if(incoming.some(x=>!x))throw Error('Backup contains invalid numbers');
  let added=0;for(const v of incoming){if(!history.some(h=>key(h)===key(v))){if(addSaved(v,true))added++;}}
  feedback('Imported '+added+' new lines.');
 }catch(e){feedback('Import failed: '+e.message);}finally{$('checkerImportFile').value='';}
}
$('checkerSearch').addEventListener('click',check);
$('checkerSave').addEventListener('click',()=>{const v=current();if(v.error){feedback(v.error);return;}addSaved(v);});
$('checkerForever').addEventListener('click',useForever);
for(const id of ['checkerNumbers','checkerPB','checkerName']){ $(id).addEventListener('input',storeDraft);$(id).addEventListener('change',storeDraft); }
$('checkerSaved').addEventListener('click',e=>{
 const b=e.target.closest('button[data-action]');if(!b)return;
 const idx=Number(b.dataset.index),v=history[idx];if(!v)return;
 if(b.dataset.action==='load'){
  $('checkerNumbers').value=v.numbers.map(two).join(' ');$('checkerPB').value=v.powerball===null?'':String(v.powerball);$('checkerName').value=v.name;storeDraft();compare(v,false);feedback('Loaded saved line.');
 }else{
  const next=history.filter((_,i)=>i!==idx);
  try{localStorage.setItem(SAVE,JSON.stringify(next));history=next;renderSaved();feedback('Deleted saved line.');}catch{feedback('Browser storage blocked; could not delete.');}
 }
});
$('checkerExport').addEventListener('click',exportBackup);
$('checkerImport').addEventListener('click',()=>$('checkerImportFile').click());
$('checkerImportFile').addEventListener('change',e=>importBackup(e.target.files[0]));
window.addEventListener('lottolab:data-ready',loadArchive);window.addEventListener('lottolab:data-error',coverage);
restore();renderSaved();loadArchive();const draft=current();if(!draft.error&&rows.length)compare(draft,false);
})();