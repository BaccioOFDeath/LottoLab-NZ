const test=require('node:test'),assert=require('node:assert/strict');
const {JSDOM}=require('jsdom'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const file=(x)=>fs.readFileSync(path.join(root,x),'utf8');
function initialize(savedEntries={}){
 const dom=new JSDOM(file('keno.html'),{url:'https://baccioofdeath.github.io/LottoLab-NZ/keno.html',
  runScripts:'dangerously',pretendToBeVisual:true});
 const w=dom.window;
 w.scrollTo=()=>{};w.HTMLElement.prototype.scrollIntoView=()=>{};
 w.setInterval=()=>0;w.requestAnimationFrame=cb=>cb();
 for(const [k,v] of Object.entries(savedEntries))w.localStorage.setItem(k,v);
 w.fetch=async url=>{
  let name=String(url).split('?')[0].replace(/^\.\//,'');
  if(name.startsWith('http'))return {ok:false,status:404};
  try{const data=JSON.parse(file(name));return {ok:true,json:async()=>data}}
  catch(e){return {ok:false,status:404,json:async()=>[]}}
 };
 for(const p of ['keno-math.js','keno-empirical.js','keno-ticket-tools.js','keno.js'])w.eval(file(p));
 return dom;
}
async function settle(){await new Promise(resolve=>setTimeout(resolve,200));}
test('real Keno page: draw picker, save, shrink, restore and odds',async()=>{
 const dom=initialize(),w=dom.window;
 try{
  await settle();
  const $=id=>w.document.getElementById(id);
  assert.equal($('suggestedLines').querySelectorAll('.prediction-card').length,6);
  assert.ok($('slotChoice').querySelector('option[value="27913"]'));
  assert.ok($('slotChoice').querySelector('option[value="27914"]'));
  assert.ok($('slotChoice').querySelector('option[value="27915"]'));
  $('slotChoice').value='27914';$('slotChoice').dispatchEvent(new w.Event('change',{bubbles:true}));
  assert.match($('picksDate').textContent,/3:00 pm/);
  const card=$('suggestedLines').querySelector('.prediction-card');
  card.querySelector('.save-prediction').click();
  assert.equal($('savedTicketList').querySelectorAll('.saved-line').length,1);
  card.querySelector('.use-ticket').click();
  assert.equal($('builder').querySelectorAll('.ball.selected').length,10);
  const complete=$('selection').textContent;
  assert.match($('selectedOdds').textContent,/exact chance/i);
  assert.match($('selectedOdds').textContent,/Historical|archive/i);
  const five=[...$('pickCountPills').querySelectorAll('button')].find(b=>b.value==='5');
  five.click();assert.equal($('builder').querySelectorAll('.ball.selected').length,5);
  assert.match($('reductionMessage').textContent,/parked/i);
  [...$('pickCountPills').querySelectorAll('button')].find(b=>b.value==='10').click();
  assert.equal($('builder').querySelectorAll('.ball.selected').length,10);
  assert.equal($('selection').textContent,complete);
  $('oddsStake').value='5';$('oddsStake').dispatchEvent(new w.Event('change',{bubbles:true}));
  assert.match($('oddsCost').textContent,/\$5\.00/);
  $('saveLine').click();
  assert.equal($('savedTicketList').querySelectorAll('.saved-line').length,2);
  const payload={
   'lottolab-keno-saved-v2':w.localStorage.getItem('lottolab-keno-saved-v2'),
   'lottolab-keno-draft-v2':w.localStorage.getItem('lottolab-keno-draft-v2')};
  dom.window.close();
  const next=initialize(payload);
  try{await settle();assert.equal(next.window.document.querySelectorAll('.saved-line').length,2);
   assert.equal(next.window.document.querySelectorAll('#builder .ball.selected').length,10)}
  finally{next.window.close()}
 }finally{try{dom.window.close()}catch{}}
});
