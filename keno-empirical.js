/* LottoLab empirical Keno draw audit, independent of published provider odds.
   Observational frequency is not a probability forecast. Never tune a line on
   the same historical records and then advertise its observed hits as proof. */
(function(root,factory){
 const api=factory();
 if(typeof module!=='undefined'&&module.exports)module.exports=api;
 if(root)root.KenoEmpirical=api;
})(typeof globalThis!=='undefined'?globalThis:null,function(){
 'use strict';
 const BASELINE=[4,12,20,28,36,44,52,60,68,76];
 function wilson(wins,total,z=1.95996398454){
   if(!Number.isInteger(total)||total<=0)return {lower:0,upper:1};
   const p=wins/total,z2=z*z,den=1+z2/total;
   const mid=(p+z2/(2*total))/den;
   const delta=z*Math.sqrt(p*(1-p)/total+z2/(4*total*total))/den;
   return {lower:Math.max(0,mid-delta),upper:Math.min(1,mid+delta)};
 }
 function evaluate(draws,picks,size,paytable){
   if(!Number.isInteger(size)||size<1||size>10)throw Error('Keno selection size must be 1–10');
   if(!paytable||typeof paytable!=='object')throw Error('Prize tiers required');
   const accepted=Array.isArray(picks)&&picks.length===size&&new Set(picks).size===size&&
     picks.every(v=>Number.isInteger(v)&&v>=1&&v<=80);
   const numbers=accepted?picks.slice():BASELINE.slice(0,size);
   const pickSet=new Set(numbers),histogram=Array(size+1).fill(0);
   let valid=0,totalHits=0,wins=0;
   for(const record of draws||[]){
     if(!record||!Array.isArray(record.numbers)||record.numbers.length!==20||
       new Set(record.numbers).size!==20||record.numbers.some(n=>!Number.isInteger(n)||n<1||n>80))continue;
     valid++;
     const matched=record.numbers.reduce((sum,n)=>sum+(pickSet.has(n)?1:0),0);
     histogram[matched]++;totalHits+=matched;
     if(Number(paytable[matched])>0)wins++;
   }
   const observed=valid?wins/valid:null,ci=wilson(wins,valid);
   return {
     numbers,method:accepted?'chosen-retrospective':'fixed-reference',draws:valid,
     wins,observedPrizeRate:observed,observedOdds:observed>0?1/observed:null,
     averageMatches:valid?totalHits/valid:null,expectedMatches:size/4,
     interval95:valid?ci:null,matchCounts:histogram,
     warning:accepted?'Your chosen line is checked retrospectively. If chosen using these same records, results are biased and not predictive.':
     'Fixed reference numbers are not optimised to this draw history. Even a reference result is subject to sampling variation.'
   };
 }
 return Object.freeze({BASELINE,wilson,evaluate});
});
