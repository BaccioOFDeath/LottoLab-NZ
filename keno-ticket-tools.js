/* Self-contained LottoLab Keno ticket ranking and historical set analysis.
   The ranking is a signal from historical features, not calibrated probabilities. */
(function(root,factory){
 const api=factory();
 if(typeof module!=="undefined"&&module.exports)module.exports=api;
 if(root)root.KenoTicketTools=api;
})(typeof globalThis!=="undefined"?globalThis:null,function(){
'use strict';
function validNumbers(numbers){return Array.isArray(numbers)&&numbers.length>=1&&numbers.length<=10&&new Set(numbers).size===numbers.length&&numbers.every(n=>Number.isInteger(n)&&n>=1&&n<=80)}
function resize(selected,reserve,size,rank={}){
 if(!Number.isInteger(size)||size<1||size>10)throw Error("Invalid pick count");
 const unique=a=>[...new Set((a||[]).filter(n=>Number.isInteger(n)&&n>=1&&n<=80))];
 const kept=unique(selected),parked=unique(reserve).filter(n=>!kept.includes(n));
 const score=n=>Number.isFinite(Number(rank[n]))?Number(rank[n]):0;
 if(kept.length>size){
  const initial=kept.map((n,i)=>({n,i})).sort((a,b)=>score(b.n)-score(a.n)||a.i-b.i);
  const remaining=initial.slice(size).map(x=>x.n);
  return {selected:initial.slice(0,size).map(x=>x.n),reserve:unique([...remaining,...parked]),removed:remaining};
 }
 if(kept.length<size&&parked.length){
  const add=parked.slice(0,size-kept.length);
  return {selected:[...kept,...add],reserve:parked.slice(add.length),restored:add};
 }
 return {selected:kept,reserve:parked,removed:[],restored:[]};
}
function historicalSet(draws,numbers,slot,prizeTable){
 if(!validNumbers(numbers))return null;
 const target=new Set(numbers),size=numbers.length;
 const all={draws:0,anyPrize:0,fullHits:0,totalHits:0,histogram:Array(size+1).fill(0)};
 const same={draws:0,anyPrize:0,fullHits:0,totalHits:0,histogram:Array(size+1).fill(0)};
 for(const r of draws||[]){
  if(!r||!Array.isArray(r.numbers)||r.numbers.length!==20||new Set(r.numbers).size!==20)continue;
  const k=r.numbers.reduce((s,n)=>s+(target.has(n)?1:0),0);
  for(const targetStat of [all,...(slot&&r.time===slot?[same]:[])]){
   targetStat.draws++;targetStat.totalHits+=k;targetStat.histogram[k]++;
   if(k===size)targetStat.fullHits++;
   if(prizeTable&&Number(prizeTable[k])>0)targetStat.anyPrize++;
  }
 }
 return {all,same,slot:slot||null};
}
return Object.freeze({validNumbers,resize,historicalSet});
});
