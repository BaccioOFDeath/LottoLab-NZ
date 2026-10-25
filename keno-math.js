/* Official Lotto NZ Keno Game Design No. 5, effective 23 October 2025.
   Reference https://assets.mylotto.co.nz/assets/uploads/5e779b5e-bf65-11f0-a522-3ad4acd14bcf.pdf
   All outcomes assume a fair 20-out-of-80 draw.
   This mathematical module never changes its odds based on recent outcomes. */
(function(root,factory){
  const api=factory();
  if(typeof module!=='undefined' && module.exports)module.exports=api;
  if(root)root.KenoMath=api;
})(typeof globalThis!=='undefined'?globalThis:null,function(){
'use strict';
const TABLE = {
  1:{1:2},
  2:{2:10},
  3:{2:2,3:20},
  4:{3:3,4:150},
  5:{3:2,4:20,5:300},
  6:{3:2,4:3,5:40,6:1000},
  7:{4:2,5:4,6:500,7:4000},
  8:{4:2,5:4,6:100,7:500,8:10000},
  9:{4:2,5:3,6:10,7:200,8:2000,9:50000},
  10:{0:3,5:2,6:5,7:50,8:500,9:20000,10:250000}
};
const STAKES=[1,2,3,4,5,10,20,50,100];
const MULTIPLIERS=[{value:1.5,oneIn:1.9},{value:2,oneIn:3},{value:3,oneIn:12.3},{value:5,oneIn:21.5},{value:10,oneIn:86}];
function choose(n,k){
  if(!Number.isInteger(n)||!Number.isInteger(k)||k<0||k>n)return 0;
  k=Math.min(k,n-k);let value=1;
  for(let i=1;i<=k;i++)value=value*(n-i+1)/i;
  return value;
}
function probability(size,matches){
  if(!Number.isInteger(size)||size<1||size>10||!Number.isInteger(matches)||matches<0||matches>size)return 0;
  return choose(20,matches)*choose(60,size-matches)/choose(80,size);
}
function getStats(size,stake=1,multiplier=false){
  if(!Number.isInteger(size)||size<1||size>10)throw Error('Select 1 to 10 numbers');
  if(!STAKES.includes(stake))throw Error('Invalid stake for Lotto NZ Keno');
  const winMap=TABLE[size],cost=stake*(multiplier?2:1);
  const normalized= MULTIPLIERS.map(x=>1/x.oneIn);
  const total=normalized.reduce((a,b)=>a+b,0);
  const avgMultiplier=MULTIPLIERS.reduce((s,x,i)=>s+x.value*normalized[i]/total,0);
  const rows=Array.from({length:size+1},(_,h)=>({
    matches:h,
    probability:probability(size,h),
    basePrize:winMap[h]||0,
    payout:(winMap[h]||0)*stake,
    // For multiplier play, payout shown as an illustrative *average* conditional on winning.
    estimatedMultiplierPayout:(winMap[h]||0)*stake*avgMultiplier
  }));
  const anyPrize=rows.reduce((s,r)=>s+(r.basePrize? r.probability:0),0);
  const expectedStandard=rows.reduce((s,r)=>s+r.probability*r.payout,0);
  const expectedPayout=multiplier?expectedStandard*avgMultiplier:expectedStandard;
  return {
    size,stake,multiplier,cost,
    expectedHits:size/4,
    probabilityOfAnyPrize:anyPrize,
    oddsOfAnyPrize:1/anyPrize,
    probabilityAllMatched:probability(size,size),
    oddsAllMatched:1/probability(size,size),
    expectedPayout,expectedNet:expectedPayout-cost,
    returnToPlayer:expectedPayout/cost,
    multiplierWeightedAverage:avgMultiplier,
    source:'Lotto NZ Keno Game Design No. 5, effective 2025-10-23',
    caveat:'Expected values assume official fixed payouts and approximate multiplier probabilities; high-tier prize liability cap can reduce payouts.',
    rows
  };
}
return Object.freeze({TABLE,STAKES,MULTIPLIERS,choose,probability,getStats});
});
