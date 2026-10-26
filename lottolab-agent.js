/* LottoLab floating research chat. No browser-exposed AI key.
   Data calculations remain deterministic; optional server model only explains evidence. */
(function(){
"use strict";
const $=sel=>document.querySelector(sel),game=/\/keno\.html(?:$|\?)/.test(location.pathname+location.search)?"keno":"lotto";
const root=document.createElement("div");root.id="llai-root";root.className="llai";
root.innerHTML='<button type="button" class="llai-launcher" aria-label="Ask LottoLab Research Assistant" aria-expanded="false"><span class="llai-spark" aria-hidden="true">✦</span><span>Ask LottoLab AI</span></button><section class="llai-panel" role="dialog" aria-label="LottoLab AI research assistant" aria-modal="false" hidden><header class="llai-top"><span class="llai-avatar" aria-hidden="true">✦</span><span class="llai-heading"><strong>LottoLab AI</strong><small id="llai-status">Live-data research assistant</small></span><button type="button" class="llai-reset" title="Clear this conversation" aria-label="Clear conversation">↺</button><button type="button" class="llai-close" title="Close chat" aria-label="Close assistant">×</button></header><div class="llai-messages" role="log" aria-live="polite" aria-relevant="additions"><div class="llai-welcome"><div class="llai-star" aria-hidden="true">✦</div><h2>Ask the Numbers.</h2><p>Explore real LottoLab draw history, number patterns, time-of-day effects, model testing and your tickets.</p><div class="llai-prompts"></div></div></div><form class="llai-composer"><label class="llai-label" for="llai-question">Your research question</label><textarea id="llai-question" rows="2" maxlength="500" placeholder="Which numbers appear together most often?" aria-label="Ask a LottoLab research question"></textarea><div class="llai-bottom"><small>Based on stored draw data · No guaranteed predictions</small><button type="submit" class="llai-send" aria-label="Ask question">Send ↗</button></div></form></section>';
document.body.append(root);
const launch=$(".llai-launcher"),panel=$(".llai-panel"),log=$(".llai-messages"),status=$("#llai-status"),input=$("#llai-question");
let opened=false,busy=false,dataPromise=null,ctx=null,apiEndpoint="",history=[];
const canned=game==="keno"?["Top numbers in the last 100 draws","Best numbers in the 3pm draws last six months","Which Keno numbers appear together most?","Which models performed best?","Analyse my saved ticket","Suggest three tickets for the next draw"]:
 ["Most common Lotto numbers","Which Lotto pairs appear together?","Which models have performed best?","Show the latest results","What are the odds of matching six numbers?"];
function chip(question,container){
 const b=document.createElement("button");b.type="button";b.textContent=question;b.className="llai-chip";
 b.addEventListener("click",()=>{open();submit(question)});container.append(b);
}
const prompts=$(".llai-prompts");canned.slice(0,4).forEach(x=>chip(x,prompts));
const message=(role,text)=>{
 const el=document.createElement("div");el.className="llai-message llai-"+role;el.textContent=text;log.append(el);log.scrollTop=log.scrollHeight;return el;
};
function responseCard(result){
 const wrap=document.createElement("div");wrap.className="llai-reply";
 const head=document.createElement("strong");head.className="llai-answer-title";head.textContent=result.heading||"Research results";wrap.append(head);
 const p=document.createElement("p");p.className="llai-answer-body";p.textContent=result.body||"No details found.";wrap.append(p);
 if(result.metrics&&result.metrics.length){
  const metrics=document.createElement("div");metrics.className="llai-metrics";
  for(const item of result.metrics.slice(0,6)){
   const d=document.createElement("div"),name=document.createElement("small"),value=document.createElement("b");
   name.textContent=item.label;value.textContent=item.value;d.append(name,value);metrics.append(d);
  }wrap.append(metrics);
 }
 if(result.bars?.length){
  const chart=document.createElement("div");chart.className="llai-bars";
  const max=Math.max(...result.bars.map(x=>Number(x.value)||0),1);
  result.bars.slice(0,8).forEach(item=>{
   const row=document.createElement("div"),label=document.createElement("span"),bar=document.createElement("div"),fill=document.createElement("i"),count=document.createElement("small");
   row.className="llai-bar-row";label.textContent=item.label;bar.className="llai-bar";fill.style.width=(100*Number(item.value||0)/max)+"%";bar.append(fill);count.textContent=Number(item.value).toLocaleString("en-NZ",{maximumFractionDigits:3});
   row.append(label,bar,count);chart.append(row);
  });wrap.append(chart);
 }
 if(result.sources?.length){
  const cite=document.createElement("div");cite.className="llai-evidence";
  const mark=document.createElement("span");mark.textContent="Sources:";cite.append(mark);
  result.sources.slice(0,3).forEach(x=>{const a=document.createElement("a");a.textContent=x.title;a.href=x.url;a.target="_blank";a.rel="noopener noreferrer";cite.append(a)});
  wrap.append(cite);
 }
 if(result.actions?.length){const chips=document.createElement("div");chips.className="llai-followups";result.actions.slice(0,3).forEach(x=>chip(x,chips));wrap.append(chips)}
 log.append(wrap);log.scrollTop=log.scrollHeight;
}
function open(){
 panel.hidden=false;opened=true;launch.setAttribute("aria-expanded","true");
 root.classList.add("is-open");launch.hidden=true;
 input.focus({preventScroll:true});
}
function close(){
 opened=false;panel.hidden=true;root.classList.remove("is-open");launch.hidden=false;launch.setAttribute("aria-expanded","false");launch.focus({preventScroll:true});
}
launch.addEventListener("click",open);$(".llai-close").addEventListener("click",close);
$(".llai-reset").addEventListener("click",()=>{
 history=[];log.replaceChildren();const welcome=document.createElement("div");welcome.className="llai-welcome";
 const h=document.createElement("h2");h.textContent="Fresh research chat";const p=document.createElement("p");p.textContent="Ask something new about the LottoLab results.";welcome.append(h,p);
 const c=document.createElement("div");c.className="llai-prompts";canned.slice(0,4).forEach(x=>chip(x,c));welcome.append(c);log.append(welcome);input.focus();
});
document.addEventListener("keydown",ev=>{if(ev.key==="Escape"&&opened)close()});
function fetchJson(path,required){
 return fetch(path,{cache:"no-store"}).then(r=>{if(!r.ok)throw Error("HTTP "+r.status+" for "+path);return r.json()}).catch(err=>{if(required)throw err;return null});
}
function savedTickets(){
 if(game!=="keno")return [];
 try{const v=JSON.parse(localStorage.getItem("lottolab-keno-saved-v2")||"[]");return Array.isArray(v)?v.slice(0,30):[]}catch{return []}
}
async function load(){
 if(ctx)return ctx;
 if(dataPromise)return dataPromise;
 status.textContent="Loading "+game.toUpperCase()+" history…";
 dataPromise=(async()=>{
 const base=game==="keno"?"./data/keno-results.json":"./data/draws.json";
 const optional=game==="keno"?["./data/keno-model-audit.json","./data/keno-slot-picks.json"]:["./data/legacy-draws.json","./data/model-performance.json","./data/model-picks.json"];
 const tasks=await Promise.allSettled([fetchJson(base,true),...optional.map(x=>fetchJson(x,false)),fetchJson("./lottolab-ai-config.json",false)]);
 if(tasks[0].status!=="fulfilled")throw new Error("Draw history unavailable right now");
 const got=i=>tasks[i]?.status==="fulfilled"?tasks[i].value:null;
 const first=got(0);if(!Array.isArray(first))throw Error("Unexpected draw file");
 ctx={game,draws:game==="lotto"?first.concat(Array.isArray(got(1))?got(1):[]):first,
  audit:game==="keno"?got(1):null,slots:game==="keno"?got(2):null,
  performance:game==="lotto"?got(2):null,picks:game==="lotto"?got(3):null,savedTickets:savedTickets()};
 const conf=got(4);if(conf&&typeof conf.endpoint==="string"&&/^https:\/\/[\w.-]+(?:\/[\w./?-]*)?$/.test(conf.endpoint)&&conf.endpoint.length<300)apiEndpoint=conf.endpoint;
 status.textContent=apiEndpoint?"AI explanations · verified research":"Verified research calculations";
 return ctx;
 })().catch(e=>{dataPromise=null;status.textContent="Data unavailable";throw e});
 return dataPromise;
}
async function improveText(q,evidence){
 if(!apiEndpoint)return null;
 const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),11000);
 try{
  const r=await fetch(apiEndpoint,{method:"POST",mode:"cors",headers:{"Content-Type":"application/json"},body:JSON.stringify({game,question:q,evidence:{heading:evidence.heading,body:evidence.body,metrics:evidence.metrics?.slice(0,6)||[],sources:evidence.sources||[]},thread:history.slice(-6)}),signal:controller.signal});
  if(!r.ok)return null;const body=await r.json();return typeof body.answer==="string"&&body.answer.length<2600?body.answer:null;
 }catch{return null}finally{clearTimeout(timeout)}
}
async function submit(raw){
 const q=String(raw||"").trim().slice(0,500);if(!q||busy)return;
 const welcome=$(".llai-welcome");if(welcome)welcome.remove();
 input.value="";open();busy=true;$(".llai-send").disabled=true;message("user",q);
 const loading=message("loading","Analysing draw history…");
 try{
  const data=await load();data.savedTickets=savedTickets();
  const result=window.LottoLabResearch.answer(q,data);
  const generative=await improveText(q,result);
  loading.remove();
  if(generative){result.body=generative;result.heading=result.heading||"AI research explanation"}
  responseCard(result);
  history.push({role:"user",content:q},{role:"assistant",content:result.heading+": "+result.body.slice(0,500)});
  if(history.length>12)history=history.slice(-12);
 }catch(err){loading.remove();message("error","I couldn't load the research data. Please try again. "+String(err.message||err).slice(0,150))}
 finally{busy=false;$(".llai-send").disabled=false;input.focus({preventScroll:true})}
}
$(".llai-composer").addEventListener("submit",ev=>{ev.preventDefault();submit(input.value)});
input.addEventListener("keydown",ev=>{if(ev.key==="Enter"&&!ev.shiftKey){ev.preventDefault();submit(input.value)}});
function contextButton(label,question,container){
 if(!container||container.querySelector(":scope > .llai-context"))return;
 const b=document.createElement("button");b.type="button";b.className="llai-context";b.textContent="✦ "+label;
 b.onclick=()=>{open();submit(question)};container.append(b);
}
function attachContext(){
 if(game==="keno"){
  contextButton("Ask AI about these results","Analyse the latest Keno draw and which of its numbers have been historically frequent.",$("#results .section-head"));
  contextButton("Ask AI about model performance","Which Keno models perform best in historical backtests?",$("#accuracy .section-head"));
  const cards=$("#suggestedLines");if(cards){
   const decorate=()=>{cards.querySelectorAll(".prediction-card").forEach(card=>{
    const title=card.querySelector("h3")?.textContent||"this model";
    contextButton("Ask AI", "Explain the historical reasoning and backtest evidence for the Keno "+title+" model.",card);
   })};
   decorate();const observer=new MutationObserver(decorate);observer.observe(cards,{childList:true,subtree:false});
  }
 }else{
  contextButton("Ask AI about Lotto","What numbers are most frequent in the last 100 Lotto draws?",document.querySelector(".hero-actions")||document.querySelector("#results"));
  contextButton("Ask AI about these results","Analyse the most recent Lotto draw and compare its numbers with historical frequency.",document.querySelector("#results .section-title"));
 }
}
document.addEventListener("DOMContentLoaded",attachContext,{once:true});
if(document.readyState!=="loading")attachContext();
window.LottoLabAI=Object.freeze({openWithQuestion:q=>{open();if(q)submit(q)},open:open,close:close});
})();