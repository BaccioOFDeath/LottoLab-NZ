const test=require('node:test');
const assert=require('node:assert/strict');
const empirical=require('../keno-empirical.js');
const keno=require('../keno-math.js');
function draw(numbers){return {date:'2026-10-01',draw:'1',numbers};}
test('counts historical payout-tier matches independently of provider odds',()=>{
 const draws=[draw(Array.from({length:20},(_,i)=>i+1)),draw(Array.from({length:20},(_,i)=>i+21))];
 const data=empirical.evaluate(draws,[1],1,keno.TABLE[1]);
 assert.equal(data.method,'chosen-retrospective');
 assert.equal(data.draws,2);
 assert.equal(data.wins,1);
 assert.equal(data.observedPrizeRate,.5);
 assert.equal(data.averageMatches,.5);
});
test('fixed reference is used until selection length matches the pick count',()=>{
 const rows=[draw(Array.from({length:20},(_,i)=>i+1))];
 const data=empirical.evaluate(rows,[],4,keno.TABLE[4]);
 assert.equal(data.method,'fixed-reference');
 assert.deepEqual(data.numbers,[4,12,20,28]);
});
test('zero historical wins are reported as no observations, never impossible',()=>{
 const rows=[draw(Array.from({length:20},(_,i)=>i+61))];
 const data=empirical.evaluate(rows,[1,2,3,4,5,6,7,8,9,10],10,keno.TABLE[10]);
 assert.equal(data.wins,0);
 assert.equal(data.observedOdds,null);
 assert.equal(data.observedPrizeRate,0);
 assert.ok(data.interval95.upper>0);
});
test('all pick sizes produce matching histograms and bounded confidence limits',()=>{
 const rows=[draw(Array.from({length:20},(_,i)=>i+1))];
 for(let k=1;k<=10;k++){
  const data=empirical.evaluate(rows,[],k,keno.TABLE[k]);
  assert.equal(data.matchCounts.length,k+1);
  assert.equal(data.matchCounts.reduce((a,b)=>a+b,0),data.draws);
  assert.ok(data.interval95.lower<=data.observedPrizeRate+1e-9);
  assert.ok(data.interval95.upper>=data.observedPrizeRate-1e-9);
 }
});
