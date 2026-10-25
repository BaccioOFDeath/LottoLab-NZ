/* CSV Research Exports: all tabular data, CSV with Excel-friendly BOM,
 * pure-JavaScript uncompressed ZIP with CRC32 (offline; no tracking libraries).
 */
(()=>{
'use strict';
const anchor=document.getElementById('dataHealth')||document.getElementById('combinations');
if(!anchor)return;
const root=document.createElement('section');root.id='dataExports';root.className='data-exports';root.setAttribute('aria-labelledby','dataExportTitle');
root.innerHTML="<div class=\"export-heading\"><div><p>TAKE YOUR DATA WITH YOU</p><h3 id=\"dataExportTitle\">Download the Lotto data</h3><span>Get proper CSV files for Excel, Google Sheets or your own analysis. No account or sign-in required.</span></div></div>\n<div class=\"export-actions\"><button type=\"button\" id=\"exportDraws\">All stored Lotto draws · CSV</button><button type=\"button\" id=\"exportCombinations\">Number combinations · CSV</button><button type=\"button\" id=\"exportLocations\">Winning locations · CSV</button><button type=\"button\" id=\"exportPicks\">Research picks · CSV</button><button type=\"button\" class=\"export-all-btn\" id=\"exportAll\">Download all datasets · ZIP</button></div>\n<div class=\"export-options\"><label for=\"exportComboSize\">Combination group size<select id=\"exportComboSize\"><option value=\"2\">Pairs · 2 balls</option><option value=\"3\">Triples · 3 balls</option><option value=\"4\">Four balls</option><option value=\"5\">Five balls</option></select></label><label class=\"export-private\"><input id=\"exportLocal\" type=\"checkbox\"><span>Include my locally saved number lines in the ZIP (optional, private)</span></label></div>\n<p id=\"exportStatus\" class=\"export-status\" role=\"status\" aria-live=\"polite\">Exports reflect available stored records, which are not a complete Lotto NZ archive.</p>\n<p class=\"export-disclaimer\">Each CSV includes a header row. The complete ZIP also contains source-coverage notes, audit summaries, frequency tables, all 2–5 number combinations, result history, research selections, model evaluation, draw-rule events and winning-location records. Geographical records are partial sourced reports, not a complete list of ticket purchases.</p>";
anchor.insertAdjacentElement('afterend',root);
const $=id=>document.getElementById(id),DATE=()=>new Date().toISOString().slice(0,10);
const utf8=new TextEncoder();
const BOM='\ufeff';
let active=false;
const toValue=v=>v===null||v===undefined?'':typeof v==='object'?JSON.stringify(v):String(v);
const escapeCell=v=>{let s=toValue(v);if(typeof v==='string'&&/^[\t\r\n ]*[=+@-]/.test(s))s="'"+s;return /[\",\r\n]/.test(s)?'\"'+s.replace(/\"/g,'\"\"')+'\"':s;};
function csv(rows,cols){
 const keys=cols||Object.keys(rows[0]||{});
 return BOM+keys.map(escapeCell).join(',')+'\r\n'+rows.map(row=>keys.map(k=>escapeCell(row[k])).join(',')).join('\r\n')+'\r\n';
}
function save(filename,blob){
 const url=URL.createObjectURL(blob);
 const a=document.createElement('a');a.href=url;a.download=filename;
 document.body.append(a);a.click();a.remove();
 setTimeout(()=>URL.revokeObjectURL(url),3000);
}
function status(t){$('exportStatus').textContent=t;}
function draws(){
 const data=window.lottoLabDraws;
 if(!Array.isArray(data)||!data.length)throw Error('Lotto draw history is not available yet.');
 return data.filter(r=>r&&Array.isArray(r.numbers)&&r.numbers.length===6).sort((a,b)=>a.draw-b.draw);
}
const drawRow=d=>({draw:d.draw,date:d.date,number_1:d.numbers[0],number_2:d.numbers[1],number_3:d.numbers[2],number_4:d.numbers[3],number_5:d.numbers[4],number_6:d.numbers[5],bonus:d.bonus,powerball:d.powerball??'',verification:d.verification??'unknown',source_count:Array.isArray(d.sources)?d.sources.length:0,source_urls:Array.isArray(d.sources)?d.sources.join(' | '):'',source_note:d.source_note||d.notes||'',strike:Array.isArray(d.strike)?d.strike.join(' | '):d.strike??''});
const mainColumns=Object.keys(drawRow({draw:0,date:'',numbers:[1,2,3,4,5,6],bonus:0,powerball:null}));
function combinations(rows,size){
 const map=new Map(),k=size;
 for(const d of rows){
  const nums=[...new Set(d.numbers)].sort((a,b)=>a-b);
  function descend(start,chosen){
   if(chosen.length===k){
    const id=chosen.join('-');
    const record=map.get(id);
    if(record){record.appearances++;record.first_draw=Math.min(record.first_draw,d.draw);record.last_draw=Math.max(record.last_draw,d.draw);}
    else map.set(id,{numbers:[...chosen],appearances:1,first_draw:d.draw,last_draw:d.draw});
    return;
   }
   for(let i=start;i<=nums.length-(k-chosen.length);i++){chosen.push(nums[i]);descend(i+1,chosen);chosen.pop();}
  }descend(0,[]);
 }
 return [...map.values()].sort((a,b)=>b.appearances-a.appearances||a.numbers.join(',').localeCompare(b.numbers.join(','))).map(d=>({
  size:k,number_1:d.numbers[0]??'',number_2:d.numbers[1]??'',number_3:d.numbers[2]??'',number_4:d.numbers[3]??'',number_5:d.numbers[4]??'',draw_count:d.appearances,first_stored_draw:d.first_draw,last_stored_draw:d.last_draw,sample_draws:rows.length
 }));
}
function frequencies(rows){
 const counts=Array(41).fill(0),pair=Array(15).fill(0),pbOld=Array(15).fill(0),pbNew=Array(15).fill(0);
 for(const d of rows){
  for(const n of d.numbers)counts[n]++;
  if(Number.isInteger(d.powerball)&&d.powerball>=1&&d.powerball<=14){
   pair[d.powerball]++;
   if(d.date>='2026-09-16')pbNew[d.powerball]++;
   else pbOld[d.powerball]++;
  }
 }
 return {
  main:counts.slice(1).map((hits,i)=>({number:i+1,appearances:hits,draw_count:rows.length,observed_percent:rows.length?(hits/rows.length*100).toFixed(3):'0'})),
  power:Array.from({length:14},(_,i)=>({number:i+1,all_stored_appearances:pair[i+1],before_sep_2026_appearances:pbOld[i+1],from_sep_2026_appearances:pbNew[i+1]}))
 };
}
async function source(path){
 const result=await fetch('./data/'+path,{cache:'no-store'});
 if(!result.ok)throw Error(path+' returned HTTP '+result.status);
 return result.json();
}
function flatObject(value,prefix='',out=[]){
 if(Array.isArray(value)){if(!value.length)out.push({field:prefix,value:'[]'});else value.forEach((v,i)=>flatObject(v,prefix+'['+i+']',out));}
 else if(value&&typeof value==='object'){for(const [k,v] of Object.entries(value))flatObject(v,prefix?prefix+'.'+k:k,out);}
 else out.push({field:prefix,value:value??''});
 return out;
}
function genericRows(data){
 if(Array.isArray(data))return data.map(item=>item&&typeof item==='object'?Object.fromEntries(Object.entries(item).map(([k,v])=>[k,Array.isArray(v)?v.join(' | '):v&&typeof v==='object'?JSON.stringify(v):v])):{value:item});
 return flatObject(data);
}
function onlyRows(rows){const cols=[...new Set(rows.flatMap(x=>Object.keys(x)))];return csv(rows,cols);}
function loadedLocal(){
 const record=[];
 try{
  for(const [type,key] of [['forever','lottolab:forever-numbers:v1'],['checked','lottolab:checked-lines:v1'],['line_creator','lottolab:user-lines:v1']]){
   const items=JSON.parse(localStorage.getItem(key)||'[]');
   if(!Array.isArray(items))continue;
   for(const item of items){
    if(!Array.isArray(item.numbers))continue;
    record.push({source:type,name:item.name||'',numbers:item.numbers.join(' | '),powerball:item.powerball??'',locked_date:item.lockedDate||'',locked_after_draw:item.lockedAfterDraw??''});
   }
  }
 }catch{}
 return record;
}
function u16(buffer,offset,value){buffer[offset]=value&255;buffer[offset+1]=(value>>>8)&255;}
function u32(buffer,offset,value){u16(buffer,offset,value);u16(buffer,offset+2,value>>>16);}
const crcTable=Array.from({length:256},(_,n)=>{let c=n;for(let k=0;k<8;k++)c=c&1?0xedb88320^(c>>>1):c>>>1;return c>>>0;});
function crc32(buffer){let value=0xffffffff;for(const b of buffer)value=crcTable[(value^b)&255]^(value>>>8);return (value^0xffffffff)>>>0;}
function zip(files){
 let offset=0;const parts=[],end=[];
 for(const file of files){
  const name=utf8.encode(file.name),data=utf8.encode(file.text);
  const crc=crc32(data);
  const local=new Uint8Array(30+name.length);
  u32(local,0,0x04034b50);u16(local,4,20);u16(local,6,0x0800);u16(local,8,0);
  u32(local,14,crc);u32(local,18,data.length);u32(local,22,data.length);u16(local,26,name.length);
  local.set(name,30);parts.push(local,data);
  const central=new Uint8Array(46+name.length);
  u32(central,0,0x02014b50);u16(central,4,20);u16(central,6,20);u16(central,8,0x0800);
  u32(central,16,crc);u32(central,20,data.length);u32(central,24,data.length);u16(central,28,name.length);
  u32(central,42,offset);central.set(name,46);end.push(central);
  offset+=local.length+data.length;
 }
 const centralOffset=offset,centralLength=end.reduce((n,b)=>n+b.length,0);
 const last=new Uint8Array(22);
 u32(last,0,0x06054b50);u16(last,8,files.length);u16(last,10,files.length);
 u32(last,12,centralLength);u32(last,16,centralOffset);
 return new Blob([...parts,...end,last],{type:'application/zip'});
}
function downloadCSV(name,rows){
 save(name,new Blob([onlyRows(rows)],{type:'text/csv;charset=utf-8'}));
 status('Downloaded '+name+' with '+rows.length.toLocaleString('en-NZ')+' rows.');
}
async function action(kind){
 if(active)return;active=true;
 root.querySelectorAll('button').forEach(b=>b.disabled=true);
 status('Preparing '+(kind==='all'?'complete data archive':kind+' CSV')+' from the stored records…');
 try{
  const rows=draws();
  if(kind==='draws')downloadCSV('lottolab-all-stored-draws-'+DATE()+'.csv',rows.map(drawRow));
  else if(kind==='combos')downloadCSV('lottolab-'+$('exportComboSize').value+'-number-combinations-'+DATE()+'.csv',combinations(rows,Number($('exportComboSize').value)));
  else if(kind==='geo'){
   const info=await source('geo-winners.json');
   if(!Array.isArray(info?.records))throw Error('No valid geographic records available.');
   downloadCSV('lottolab-reported-winning-locations-'+DATE()+'.csv',genericRows(info.records));
  }else if(kind==='picks'){
   const items=await source('model-picks.json');
   if(!Array.isArray(items))throw Error('Research picks are unavailable.');
   downloadCSV('lottolab-model-picks-'+DATE()+'.csv',genericRows(items));
  }else if(kind==='all'){
   const files=[{name:'lotto_draw_history.csv',text:csv(rows.map(drawRow),mainColumns)}],stats=frequencies(rows);
   files.push({name:'number_frequencies.csv',text:onlyRows(stats.main)});
   files.push({name:'powerball_frequencies.csv',text:onlyRows(stats.power)});
   const ids=new Set(rows.map(d=>d.draw)),gaps=[];
   if(rows.length){for(let n=rows[0].draw;n<=rows[rows.length-1].draw;n++)if(!ids.has(n))gaps.push({missing_draw:n});}
   files.push({name:'missing_draw_ids.csv',text:csv(gaps,['missing_draw'])});
   for(const k of [2,3,4,5])files.push({name:'historical_combinations_'+k+'_numbers.csv',text:onlyRows(combinations(rows,k))});
   const sources=['model-picks.json','model-performance.json','geo-winners.json','geo-places.json','nz-outline.geojson','draw-context.json','evaluation-summary.json','pre-powerball-staging.json'];
   const summary=[{dataset:'merged Lotto draw records',status:'loaded',records:rows.length,notes:'Partial archive: '+gaps.length+' missing IDs within recorded range.'}],missing=[];
   const data=await Promise.all(sources.map(async path=>{try{return {path,value:await source(path)}}catch(e){return {path,error:e.message}};}));
   for(const entry of data){
    if(entry.error){missing.push(entry.path+': '+entry.error);summary.push({dataset:entry.path,status:'unavailable',records:0,notes:entry.error});continue;}
    let name=entry.path.replace(/\.(?:geojson|json)$/,'').replace(/-/g,'_'),records=[],value=entry.value;
    if(entry.path==='geo-winners.json')records=genericRows(value.records||[]);
    else if(entry.path==='geo-places.json')records=Object.entries(value.places||{}).map(([place,v])=>({place,...v}));
    else if(entry.path==='nz-outline.geojson'){
     records=[];
     const polygons=value.geometry?.type==='MultiPolygon'?value.geometry.coordinates:[value.geometry?.coordinates||[]];
     polygons.forEach((polygon,polygonIndex)=>polygon.forEach((ring,ringIndex)=>ring.forEach((point,pointIndex)=>{
      if(Array.isArray(point)&&point.length>=2)records.push({polygon:polygonIndex,ring:ringIndex,point:pointIndex,longitude:point[0],latitude:point[1],geometry_note:'Simplified national boundary, not store locations'});
     })));
    }
    else if(entry.path==='draw-context.json'){
     files.push({name:'draw_rule_events.csv',text:onlyRows(genericRows(value.events||[]))});
     records=flatObject(value.operations||{});
    }else records=genericRows(value);
    files.push({name:name+'.csv',text:onlyRows(records)});
    summary.push({dataset:entry.path,status:'loaded',records:records.length,notes:entry.path==='geo-winners.json'?'Selected public reports only; NOT all ticket sales.':''});
   }
   if($('exportLocal').checked){
    const privateRows=loadedLocal();
    files.push({name:'my_saved_lines_private.csv',text:csv(privateRows,['source','name','numbers','powerball','locked_date','locked_after_draw'])});
    summary.push({dataset:'my saved lines (local)',status:'loaded',records:privateRows.length,notes:'Explicitly included by the user; never uploaded.'});
   }
   files.push({name:'dataset_coverage_manifest.csv',text:onlyRows(summary)});
   const notes='LottoLab NZ · Downloaded '+new Date().toISOString()+'\nAll values are from the partial stored archives, NOT official live results. Source coverage varies and missing draw IDs are shown in missing_draw_ids.csv.\nMain-ball six-from-40 winning probabilities do not improve from historical frequency or co-occurrence.\nThe geographic data is selected media winner reports; coordinates are not shop-level sales locations.\nA file named my_saved_lines_private.csv is only included if explicitly requested in this browser.\n'+(missing.length?'WARNING: unavailable files:\n'+missing.join('\n'):'All requested source files loaded.');
   files.push({name:'README_data_notes.txt',text:notes});
   save('lottolab-all-available-data-'+DATE()+'.zip',zip(files));
   status('Downloaded '+files.length+' files as a ZIP containing CSV tables.'+(missing.length?' Warning: '+missing.length+' dataset(s) were unavailable and listed in the manifest.':''));
  }
 }catch(e){status('Export could not finish: '+e.message+'. You can retry without clearing your saved numbers.');}
 finally{active=false;root.querySelectorAll('button').forEach(b=>b.disabled=false);}
}
$('exportDraws').addEventListener('click',()=>action('draws'));
$('exportCombinations').addEventListener('click',()=>action('combos'));
$('exportLocations').addEventListener('click',()=>action('geo'));
$('exportPicks').addEventListener('click',()=>action('picks'));
$('exportAll').addEventListener('click',()=>action('all'));
})();