/* User-controlled LottoLab-only local storage backup and deletion. No remote sync. */
(()=>{
'use strict';
const anchor=document.getElementById('combinations')||document.getElementById('numberChecker');
if(!anchor)return;
const element=document.createElement('section');element.id='myData';element.className='local-data-card';element.setAttribute('aria-labelledby','localDataTitle');
element.innerHTML="<div class=\"local-data-heading\"><div><p>YOUR DEVICE · YOUR CONTROL</p><h3 id=\"localDataTitle\">My saved numbers & data</h3><span>All personal number sets are stored only in this browser. They are not synced or purchased as tickets.</span></div><span aria-hidden=\"true\" class=\"local-data-shield\">◎</span></div>\n<div class=\"local-data-counts\"><div><strong id=\"localForeverCount\">—</strong><small>Forever sets</small></div><div><strong id=\"localCheckedCount\">—</strong><small>Checked lines</small></div><div><strong id=\"localCreatorCount\">—</strong><small>Creator lines</small></div></div>\n<div class=\"local-data-actions\"><button type=\"button\" id=\"localExport\">Export all saved data</button><button type=\"button\" id=\"localImport\">Restore data backup</button><button type=\"button\" id=\"localClear\">Clear all local data</button><input id=\"localImportFile\" type=\"file\" accept=\".json,application/json\" hidden></div>\n<p id=\"localDataStatus\" class=\"local-data-status\" role=\"status\" aria-live=\"polite\">A backup is recommended before removing saved lines, checked numbers or drafts.</p>\n<p class=\"local-data-footnote\">Clear affects only LottoLab data on this browser, including saved lines and unfinished entries. It cannot delete data on another phone, browser or device. Site settings, public results and model history are not deleted.</p>";anchor.insertAdjacentElement('afterend',element);
const $=id=>document.getElementById(id),PREFIX='lottolab:',BACKUP='LottoLab-local-backup-v1',MAX_BYTES=500000;
function keys(){
 try{const found=[];for(let i=0;i<localStorage.length;i++){const key=localStorage.key(i);if(key&&key.startsWith(PREFIX))found.push(key);}return found.sort();}catch{return [];}
}
function count(key){
 try{const data=JSON.parse(localStorage.getItem(key)||'[]');return Array.isArray(data)?data.length:0;}catch{return 0;}
}
function update(){
 $('localForeverCount').textContent=String(count('lottolab:forever-numbers:v1'));
 $('localCheckedCount').textContent=String(count('lottolab:checked-lines:v1'));
 $('localCreatorCount').textContent=String(count('lottolab:user-lines:v1'));
}
function note(s){$('localDataStatus').textContent=s;}
function download(){
 try{
  const entries={};for(const k of keys())entries[k]=localStorage.getItem(k);
  const payload=JSON.stringify({format:BACKUP,exportedAt:new Date().toISOString(),origin:'LottoLab NZ',entries},null,2);
  const blob=new Blob([payload],{type:'application/json'});
  const url=URL.createObjectURL(blob),a=document.createElement('a');
  a.href=url;a.download='lottolab-my-saved-data.json';document.body.append(a);a.click();a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
  note('Backup exported with '+Object.keys(entries).length+' LottoLab storage entries. Keep it somewhere safe.');
 }catch(e){note('Could not export local data: '+e.message);}
}
async function restore(file){
 if(!file)return;
 try{
  if(file.size>MAX_BYTES)throw Error('Backup is too large');
  const data=JSON.parse(await file.text());
  if(!data||data.format!==BACKUP||typeof data.entries!=='object'||!data.entries||Array.isArray(data.entries))throw Error('Unrecognised LottoLab backup');
  const items=Object.entries(data.entries);
  if(items.length>100||items.some(([k,v])=>!k.startsWith(PREFIX)||k.length>150||typeof v!=='string'||v.length>400000))throw Error('Backup contains unexpected data');
  if(!confirm('Restore '+items.length+' LottoLab storage entries? Saved lines with matching keys on this device will be replaced.'))return;
  for(const [k,v] of items)localStorage.setItem(k,v);
  note('Backup restored. Reloading to show your saved lines.');
  location.reload();
 }catch(e){note('Restore failed: '+e.message);}
 finally{$('localImportFile').value='';}
}
function remove(){
 const all=keys();
 if(!all.length){note('There is no LottoLab local data to clear on this device.');return;}
 if(!confirm('Delete all LottoLab saved number sets, checked lines, drafts and local settings on THIS device? This cannot be undone unless you exported a backup.'))return;
 try{
  for(const k of all)localStorage.removeItem(k);
  note('Removed '+all.length+' LottoLab local entries. Reloading the page.');
  location.reload();
 }catch(e){note('Could not clear every entry: '+e.message);}
}
$('localExport').addEventListener('click',download);
$('localImport').addEventListener('click',()=>$('localImportFile').click());
$('localImportFile').addEventListener('change',e=>restore(e.target.files[0]));
$('localClear').addEventListener('click',remove);
window.addEventListener('storage',update);
window.addEventListener('lottolab:checked-line-added',update);
element.addEventListener('click',event=>{if(event.target.closest('button')?.id!=='localClear')setTimeout(update,0);});
update();
})();