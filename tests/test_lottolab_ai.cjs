const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path");
const root=path.resolve(__dirname,"..");
const code=file=>fs.readFileSync(path.join(root,file),"utf8");
const engine=require("../lottolab-research-engine.js");
const create=(draw,date,time,start)=>({draw,date,time,numbers:Array.from({length:20},(_,i)=>(start+i-1)%80+1)});
const keno=[create(101,"2026-10-20","10:00 am",1),create(102,"2026-10-20","1:00 pm",11),create(103,"2026-10-20","3:00 pm",1),create(104,"2026-10-20","6:00 pm",20),create(105,"2026-10-21","3:00 pm",1)];
const lotto=[{draw:200,date:"2026-10-20",numbers:[1,2,3,4,5,6],bonus:7,powerball:4},{draw:201,date:"2026-10-22",numbers:[1,2,3,10,11,12],bonus:4,powerball:5}];
test("schema validation and filtering",()=>{
 assert.equal(engine.normalize(keno,"keno").length,5);
 assert.equal(engine.normalize([...keno,keno[0]],"keno").length,5);
 assert.equal(engine.filter("Best numbers in 3pm draws last six months","keno",keno).rows.length,2);
});
test("grounded Keno top numbers, pairs and exact odds",()=>{
 const context={game:"keno",draws:keno};
 const ranked=engine.answer("Best numbers in 3pm draws last six months",context);
 assert.match(ranked.heading,/Most frequent/);
 assert.match(ranked.body,/2 draws/);
 const pairs=engine.answer("Which pairs occur together most often?",context);
 assert.match(pairs.heading,/pairs/);
 assert.match(pairs.body,/Among 5 draws/);
 const odds=engine.answer("What are the odds of picking 5 numbers?",context);
 assert.match(odds.body,/1 in 1,550/);
});
test("compare different time slots, latest draw and a named number",()=>{
 const ctx={game:"keno",draws:keno};
 assert.match(engine.answer("Compare 10am and 6pm draws",ctx).heading,/comparison/);
 assert.match(engine.answer("Latest Keno results",ctx).body,/105/);
 assert.match(engine.answer("Explain number 4",ctx).body,/appeared/);
});
test("selected ticket & existing model audit use stored data",()=>{
 const ctx={game:"keno",draws:keno,savedTickets:[{name:"Test",numbers:[1,2,3,4,5],stake:1}],
  audit:{walk_forward_evaluated_draws:100,models:{same_time_repeat_hot:{average_hits:2.52,draws:100},random_control:{average_hits:2.5,draws:100}}}};
 assert.match(engine.answer("Analyse my saved ticket",ctx).body,/Numbers: 1, 2, 3, 4, 5/);
 assert.match(engine.answer("Which models have the best accuracy?",ctx).body,/2.520/);
});
test("Lotto response limited to Lotto history, not Keno values",()=>{
 const r=engine.answer("Which Lotto numbers are hottest?",{game:"lotto",draws:lotto});
 assert.match(r.heading,/Lotto/);
 assert.match(r.body,/2 draws/);
 assert.match(engine.answer("Latest winning numbers",{game:"lotto",draws:lotto}).body,/Powerball/);
});
test("JS engines compile",()=>{
 assert.doesNotThrow(()=>new Function(code("lottolab-agent.js")));
 assert.doesNotThrow(()=>new Function(code("lottolab-research-engine.js")));
});
test("on both pages the new assets are wired",()=>{
 for(const p of ["index.html","keno.html"]){
  const html=code(p);
  assert.match(html,/lottolab-agent\.js/);
  assert.match(html,/lottolab-research-engine\.js/);
  assert.match(html,/lottolab-agent\.css/);
 }
});
test("chat opens, answers grounded question and closes in a DOM",async()=>{
 const {JSDOM}=require("jsdom");
 const dom=new JSDOM("<!doctype html><html><head></head><body><section id='results'><div class='section-head'></div></section></body></html>",{url:"https://baccioofdeath.github.io/LottoLab-NZ/keno.html",runScripts:"dangerously",pretendToBeVisual:true});
 try{
 const w=dom.window;
 w.fetch=async url=>({ok:true,json:async()=>url.includes("keno-results.json")?keno:url.includes("keno-model-audit.json")?{models:{}}:url.includes("keno-slot-picks.json")?{slots:[]}:null});
 w.eval(code("lottolab-research-engine.js"));
 w.eval(code("lottolab-agent.js"));
 const launch=w.document.querySelector(".llai-launcher");
 assert.ok(launch);
 launch.click();
 assert.equal(w.document.querySelector(".llai-panel").hidden,false);
 const field=w.document.getElementById("llai-question");
 field.value="What are the hottest numbers?";
 w.document.querySelector(".llai-composer").dispatchEvent(new w.Event("submit",{bubbles:true,cancelable:true}));
 await new Promise(ok=>setTimeout(ok,100));
 const result=w.document.querySelector(".llai-reply");
 assert.ok(result,"expected a live calculated reply");
 assert.match(result.textContent,/Most frequent Keno numbers/);
 assert.match(result.textContent,/Keno results/);
 w.document.querySelector(".llai-close").click();
 assert.equal(w.document.querySelector(".llai-panel").hidden,true);
 }finally{dom.window.close()}
});
