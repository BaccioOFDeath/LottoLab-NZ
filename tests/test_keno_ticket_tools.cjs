const test=require('node:test'),assert=require('node:assert/strict');
const kit=require('../keno-ticket-tools.js');
test('10-to-5 reduction uses model ranking and restores parked numbers',()=>{
 const original=[57,8,30,12,52,32,6,20,44,53];
 const ranking=Object.fromEntries(original.map((n,i)=>[n,100-i]));
 const five=kit.resize(original,[],5,ranking);
 assert.deepEqual(five.selected,[57,8,30,12,52]);
 assert.deepEqual(five.reserve,[32,6,20,44,53]);
 assert.deepEqual(kit.resize(five.selected,five.reserve,10,ranking).selected,original);
});
test('validates distinct number sets',()=>{
 assert.equal(kit.validNumbers([5,6,7]),true);
 assert.equal(kit.validNumbers([5,5,6]),false);
 assert.equal(kit.validNumbers([81]),false);
});
test('historical odds for exact selected set and slot',()=>{
 const draw=(time,nums)=>({time,numbers:nums});
 const rows=[draw('1:00 pm',Array.from({length:20},(_,i)=>i+1)),
             draw('6:00 pm',Array.from({length:20},(_,i)=>i+21))];
 const result=kit.historicalSet(rows,[2,3],"1:00 pm",{2:10});
 assert.equal(result.all.draws,2);
 assert.equal(result.same.draws,1);
 assert.equal(result.same.fullHits,1);
 assert.equal(result.all.fullHits,1);
});
