// LottoLab NZ suggestion generator: exploratory selections, not prediction.
(function(){
'use strict';
const root=document.getElementById('picker');if(!root)return;
const $=id=>document.getElementById(id);
function randomInt(max){const a=new Uint32Array(1);const bound=Math.floor(4294967296/max)*max;let v;do{crypto.getRandomValues(a);v=a[0]}while(v>=bound);return v%max;}
function shuffled(){const a=Array.from({length:40},(_,i)=>i+1);for(let i=a.length-1;i>0;i--){const j=randomInt(i+1);[a[i],a[j]]=[a[j],a[i]]}return a}
function choose(){const mode=$('pickerMode').value;let pool=shuffled(),line;
if(mode==='balance'){// Constraint selection, NOT a mathematical advantage.
for(let i=0;i<300;i++){const candidate=shuffled().slice(0,6).sort((a,b)=>a-b);const odd=candidate.filter(n=>n%2).length;if(odd===3&&candidate.filter(n=>n<=20).length===3){line=candidate;break}}}
else if(mode==='frequency'){// Educational weighted selection on the available sample only.
const data=window.lottoLabDraws||[];const counts=Array(41).fill(1);data.forEach(d=>d.numbers.forEach(n=>counts[n]++));const picked=[];const available=Array.from({length:40},(_,i)=>i+1);while(picked.length<6){let total=available.reduce((s,n)=>s+counts[n],0);let t=randomInt(total);let ix=0;for(;ix<available.length-1;ix++){t-=counts[available[ix]];if(t<0)break}picked.push(available.splice(ix,1)[0])}line=picked.sort((a,b)=>a-b)}
line=line||pool.slice(0,6).sort((a,b)=>a-b);
const power=randomInt(14)+1;
$('pickerBalls').innerHTML=line.map(n=>'<span class="ball">'+String(n).padStart(2,'0')+'</span>').join('');
$('pickerPower').innerHTML='<span class="ball power">'+String(power).padStart(2,'0')+'</span>';
$('pickerCopy').dataset.value=line.map(n=>String(n).padStart(2,'0')).join(' - ')+' | Powerball '+String(power).padStart(2,'0');
$('pickerStatus').textContent='Generated using '+$('pickerMode').selectedOptions[0].text+(mode==='frequency'?' from '+(window.lottoLabDraws||[]).length+' stored draws.':'')+'. All valid combinations have equal odds in an independent draw.';
}
$('pickerGenerate').addEventListener('click',choose);
$('pickerMode').addEventListener('change',choose);
$('pickerCopy').addEventListener('click',async()=>{const text=$('pickerCopy').dataset.value||'';if(!text)return;try{await navigator.clipboard.writeText(text);$('pickerStatus').textContent='Numbers copied.'}catch(e){$('pickerStatus').textContent='Copy unavailable in this browser. Select the numbers above manually.'}});
choose();
window.addEventListener('lottolab:data-ready',()=>{if($('pickerMode').value==='frequency')choose()});
})();