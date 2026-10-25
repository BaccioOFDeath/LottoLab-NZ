/* LottoLab historical combinations explorer. 6/40 draws, k=2..5;
 * always a descriptive ranking from stored observations, never predictive odds.
 */
(()=>{
'use strict';
const anchor=document.getElementById('numberChecker')||document.getElementById('foreverNumbers');
if(!anchor)return;
const root=document.createElement('section');root.className='combos-section';root.id='combinations';root.setAttribute('aria-labelledby','combosTitle');
root.innerHTML="<div class=\"combos-heading\"><div><p class=\"combos-eyebrow\">PATTERNS FROM REAL DRAWS</p><h3 id=\"combosTitle\">Numbers that came out <em>together</em></h3><p>Find the most frequently drawn pairs, triples, four-number and five-number groups. Counts represent historical co-occurrence, not an increased chance in the next draw.</p></div><span class=\"combos-symbol\" aria-hidden=\"true\">2 · 3 · 4 · 5</span></div>\n<div class=\"combos-toolbar\"><div class=\"combos-tabs\" role=\"group\" aria-label=\"Combination size\"><button type=\"button\" class=\"is-current\" data-combo-size=\"2\" aria-pressed=\"true\">2 numbers</button><button type=\"button\" data-combo-size=\"3\" aria-pressed=\"false\">3 numbers</button><button type=\"button\" data-combo-size=\"4\" aria-pressed=\"false\">4 numbers</button><button type=\"button\" data-combo-size=\"5\" aria-pressed=\"false\">5 numbers</button></div><label for=\"combosSource\">Historical sample<select id=\"combosSource\"><option value=\"all\">All available draws</option><option value=\"verified\">Cross-checked draws only</option><option value=\"recent100\">Last 100 stored draws</option><option value=\"recent500\">Last 500 stored draws</option></select></label></div>\n<div class=\"combos-metrics\"><div><span>Stored draws compared</span><strong id=\"combosSample\">—</strong></div><div><span>Unique combinations observed</span><strong id=\"combosDistinct\">—</strong></div><div><span>Most repeats in the sample</span><strong id=\"combosTopCount\">—</strong></div></div>\n<p class=\"combos-description\" id=\"combosDescription\" aria-live=\"polite\">Loading historical draw records…</p>\n<div class=\"combos-grid\" id=\"combosResults\" aria-live=\"polite\"><p class=\"combos-empty\">Waiting for historical results…</p></div>\n<div class=\"combos-detail\" id=\"combosDetail\"><p>Tap a combination to see the stored draws in which those numbers appeared together.</p></div>\n<p class=\"combos-note\" id=\"combosNote\">Archive coverage is incomplete. Different source filters can produce different rankings. Even a frequently drawn combination has no proven predictive advantage.</p>";anchor.insertAdjacentElement('afterend',root);
const $=id=>document.getElementById(id),two=n=>String(n).padStart(2,'0');
let all=[],size=2,ranking=[],selected='',sampleRows=[],cache=new Map();
const valid=d=>d&&Number.isInteger(d.draw)&&Array.isArray(d.numbers)&&d.numbers.length===6&&new Set(d.numbers).size===6&&d.numbers.every(n=>Number.isInteger(n)&&n>=1&&n<=40);
const comboKey=a=>a.join(',');
function choose(n,k){
 let value=1;for(let i=1;i<=k;i++)value=value*(n-i+1)/i;return value;
}
function sourceRows(){
 const choice=$('combosSource').value;
 const r=choice==='verified'?all.filter(d=>d.verification==='two-source'&&new Set(d.sources||[]).size>=2):all;
 return choice==='recent100'?r.slice(0,100):choice==='recent500'?r.slice(0,500):r;
}
function updateData(){
 const shared=window.lottoLabDraws;
 if(!Array.isArray(shared))return;
 all=shared.filter(valid).sort((a,b)=>b.draw-a.draw);
 cache.clear();render();
}
function aggregate(rows,k){
 const map=new Map();
 for(const draw of rows){
  const n=[...draw.numbers].sort((a,b)=>a-b);
  function scan(start,stack){
   if(stack.length===k){
    const key=comboKey(stack);
    const entry=map.get(key);
    if(entry){entry.count++;entry.latest=Math.max(entry.latest,draw.draw);}
    else map.set(key,{key,numbers:[...stack],count:1,latest:draw.draw});
    return;
   }
   for(let i=start;i<=n.length-(k-stack.length);i++){
    stack.push(n[i]);scan(i+1,stack);stack.pop();
   }
  }
  scan(0,[]);
 }
 return [...map.values()].sort((a,b)=>b.count-a.count||b.latest-a.latest||a.key.localeCompare(b.key));
}
function balls(numbers){
 const wrapper=document.createElement('div');wrapper.className='combos-balls';
 for(const n of numbers){const span=document.createElement('span');span.textContent=two(n);wrapper.append(span);}
 return wrapper;
}
function renderDetail(key){
 const host=$('combosDetail');host.replaceChildren();
 const item=ranking.find(x=>x.key===key);if(!item)return;
 const header=document.createElement('div');header.className='combos-detail-head';
 const title=document.createElement('strong');title.textContent='Draw history for '+item.numbers.map(two).join(' · ');
 const count=document.createElement('span');count.textContent=item.count+' stored draw'+(item.count===1?'':'s');header.append(title,count);host.append(header);
 const relevant=sampleRows.filter(d=>item.numbers.every(n=>d.numbers.includes(n))).sort((a,b)=>b.draw-a.draw);
 const holder=document.createElement('div');holder.className='combos-matches';
 for(const d of relevant.slice(0,20)){
  const row=document.createElement('div');row.className='combos-match';
  const ref=document.createElement('strong');ref.textContent='#'+d.draw;
  const date=document.createElement('small');date.textContent=d.date+' · '+(d.verification==='two-source'?'Cross-checked':'One-source / unverified');
  row.append(ref,balls(d.numbers),date);holder.append(row);
 }host.append(holder);
 if(relevant.length>20){const p=document.createElement('p');p.textContent='Showing 20 of '+relevant.length+' stored draws.';host.append(p);}
}
function render(){
 sampleRows=sourceRows();
 $('combosSample').textContent=String(sampleRows.length);
 const holder=$('combosResults');holder.replaceChildren();
 if(!all.length){
  $('combosDescription').textContent='Historical archive unavailable. Rankings will appear when results load.';
  $('combosDistinct').textContent='—';$('combosTopCount').textContent='—';
  $('combosDetail').textContent='Historical draw records are currently unavailable.';return;
 }
 const key=$('combosSource').value+':'+size+':'+all.length;
 if(!cache.has(key))cache.set(key,aggregate(sampleRows,size));
 ranking=cache.get(key);
 $('combosDistinct').textContent=ranking.length.toLocaleString('en-NZ');
 $('combosTopCount').textContent=ranking.length?String(ranking[0].count):'0';
 const expected=sampleRows.length*choose(6,size)/choose(40,size);
 $('combosDescription').textContent='Showing the 12 most-observed '+size+'-number groups in '+sampleRows.length.toLocaleString('en-NZ')+' stored draws. In an ideal random six-from-40 game, any particular '+size+'-number group would be expected about '+(expected<1?expected.toFixed(2):expected.toFixed(1))+' times in this many draws. This is a reference expectation, not a forecast.';
 if(!ranking.length){holder.textContent='No valid combinations in this sample.';$('combosDetail').textContent='Select another sample.';return;}
 for(const [index,item] of ranking.slice(0,12).entries()){
  const row=document.createElement('button');row.type='button';row.className='combos-item'+(item.key===selected?' is-active':'');
  row.dataset.key=item.key;row.setAttribute('aria-pressed',String(item.key===selected));
  const rank=document.createElement('span');rank.className='combos-rank';rank.textContent=String(index+1).padStart(2,'0');
  const figure=document.createElement('strong');figure.textContent=item.count+'×';
  const label=document.createElement('small');label.textContent=item.count===1?'Seen in 1 stored draw':'Seen in '+item.count+' stored draws';
  row.append(rank,balls(item.numbers),figure,label);holder.append(row);
 }
 if(!ranking.some(x=>x.key===selected))selected=ranking[0].key;
 for(const button of holder.querySelectorAll('button')){button.classList.toggle('is-active',button.dataset.key===selected);button.setAttribute('aria-pressed',String(button.dataset.key===selected));}
 renderDetail(selected);
 $('combosNote').textContent='Partial archive: '+all.filter(d=>d.verification==='two-source'&&new Set(d.sources||[]).size>=2).length+' cross-checked and '+(all.length-all.filter(d=>d.verification==='two-source'&&new Set(d.sources||[]).size>=2).length)+' other stored draws in total. Five-number groups may tie at one recorded appearance. Source gaps and chance variation affect the ranking; no pattern changes the next fair draw’s odds.';
}
root.querySelectorAll('[data-combo-size]').forEach(btn=>btn.addEventListener('click',()=>{
 size=Number(btn.dataset.comboSize);selected='';
 root.querySelectorAll('[data-combo-size]').forEach(b=>{b.classList.toggle('is-current',b===btn);b.setAttribute('aria-pressed',String(b===btn));});
 render();
}));
$('combosSource').addEventListener('change',()=>{selected='';render();});
$('combosResults').addEventListener('click',event=>{
 const btn=event.target.closest('button[data-key]');if(!btn)return;
 selected=btn.dataset.key;
 for(const row of $('combosResults').querySelectorAll('button')){row.classList.toggle('is-active',row===btn);row.setAttribute('aria-pressed',String(row===btn));}
 renderDetail(selected);
});
window.addEventListener('lottolab:data-ready',updateData);
window.addEventListener('lottolab:data-error',()=>{$('combosDescription').textContent='Draw archive unavailable. Rankings cannot be calculated right now.';});
updateData();
})();