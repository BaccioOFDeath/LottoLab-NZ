const test=require('node:test');
const assert=require('node:assert/strict');
const math=require('../keno-math.js');
test('all 1-10 pick-size distributions sum to 1',()=>{
 for(let n=1;n<=10;n++){
  const sum=Array.from({length:n+1},(_,h)=>math.probability(n,h)).reduce((a,b)=>a+b,0);
  assert.ok(Math.abs(sum-1)<1e-10, 'pick size '+n+' summed to '+sum);
 }
});
test('known Lotto NZ exact odds and $1 payouts',()=>{
 const one=math.getStats(1,1,false);
 assert.ok(Math.abs(one.probabilityOfAnyPrize-.25)<1e-12);
 assert.equal(one.rows[1].payout,2);
 const ten=math.getStats(10,1,false);
 assert.equal(ten.rows[0].payout,3);
 assert.equal(ten.rows[10].payout,250000);
 assert.ok(ten.oddsAllMatched>8900000&&ten.oddsAllMatched<8930000);
 assert.ok(ten.oddsOfAnyPrize>8.8&&ten.oddsOfAnyPrize<9.2);
});
test('changing stakes scales payouts, not winning probability',()=>{
 const a=math.getStats(7,1,false),b=math.getStats(7,100,false);
 assert.equal(a.probabilityOfAnyPrize,b.probabilityOfAnyPrize);
 assert.equal(a.probabilityAllMatched,b.probabilityAllMatched);
 assert.equal(a.expectedPayout*100,b.expectedPayout);
 assert.equal(b.cost,100);
});
test('multiplier doubles cost but leaves drawn-number probabilities fixed',()=>{
 const standard=math.getStats(10,5,false),mult=math.getStats(10,5,true);
 assert.equal(mult.cost,standard.cost*2);
 assert.equal(mult.probabilityAllMatched,standard.probabilityAllMatched);
 assert.equal(mult.probabilityOfAnyPrize,standard.probabilityOfAnyPrize);
});
test('reject invalid Keno selections and stakes',()=>{
 assert.throws(()=>math.getStats(0,1));
 assert.throws(()=>math.getStats(11,1));
 assert.throws(()=>math.getStats(5,1.5));
});
