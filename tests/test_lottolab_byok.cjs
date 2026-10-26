const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path");
const {JSDOM}=require("jsdom");
const root=path.resolve(__dirname,".."),file=p=>fs.readFileSync(path.join(root,p),"utf8");
function setup(){
 const dom=new JSDOM("<!doctype html><html><body><div id='llai-root'><section class='llai-panel'><header class='llai-top'><span id='llai-status'></span><button class='llai-reset'></button></header><div class='llai-messages'></div></section></div></body></html>",{url:"https://baccioofdeath.github.io/LottoLab-NZ/keno.html",runScripts:"dangerously"});
 dom.window.eval(file("lottolab-byok.js"));
 dom.window.LottoLabBYOK.attach();
 return dom;
}
test("BYOK requires explicit consent and does not store keys in localStorage",()=>{
 const d=setup(),w=d.window,api=w.LottoLabBYOK;
 try{
  assert.throws(()=>api.store("openrouter","openai/gpt-5-mini","sk-test-12345678",false),/Acknowledge/);
  assert.equal(api.store("openrouter","openai/gpt-5-mini","sk-test-12345678",true),true);
  assert.equal(api.active(),true);
  assert.equal(w.sessionStorage.getItem("lottolab-ai-personal-key-session"),"sk-test-12345678");
  assert.equal(w.localStorage.getItem("lottolab-ai-personal-settings"),JSON.stringify({provider:"openrouter",model:"openai/gpt-5-mini"}));
  assert.ok(!w.localStorage.getItem("lottolab-ai-personal-settings").includes("sk-test-"));
  api.disconnect();assert.equal(api.active(),false);
 }finally{d.window.close()}
});
test("BYOK only sends request to fixed supported provider over HTTPS and summarizes evidence",async()=>{
 const d=setup(),w=d.window,api=w.LottoLabBYOK;let calls=[];
 try{
  api.store("openrouter","openai/gpt-5-mini","test123456789012345",true);
  w.fetch=async(url,request)=>{calls.push({url,request});return {ok:true,json:async()=>({choices:[{message:{content:"Research insights."}}]})}};
  // The module is evaluated in JSDOM's window and uses its own fetch.
  const result=await api.explain("Analyse frequency",{heading:"Patterns",body:"Model ranks over 1000 draws.",metrics:[{label:"draws",value:"1000"}]},[]);
  assert.equal(result,"Research insights.");assert.equal(calls.length,1);
  assert.equal(calls[0].url,"https://openrouter.ai/api/v1/chat/completions");
  assert.equal(calls[0].request.headers.Authorization,"Bearer test123456789012345");
  assert.equal(calls[0].request.credentials,"omit");
  const request=JSON.parse(calls[0].request.body);
  assert.match(request.messages[request.messages.length-1].content,/1000/);
 }finally{d.window.close()}
});
test("BYOK settings buttons work and key does not appear in HTML",()=>{
 const d=setup(),w=d.window,api=w.LottoLabBYOK;
 try{
  const settings=w.document.querySelector(".llai-settings-toggle");assert.ok(settings);settings.click();
  const panel=w.document.getElementById("llai-byok-panel");assert.equal(panel.hidden,false);
  const input=w.document.getElementById("llai-provider-key");input.value="sk-super-private-456";
  w.document.getElementById("llai-consent").checked=true;
  w.document.getElementById("llai-activate").click();
  assert.equal(api.active(),true);
  assert.equal(input.value,"");
  assert.ok(!panel.innerHTML.includes("sk-super-private-456"));
  w.document.getElementById("llai-disconnect").click();
  assert.equal(api.active(),false);
 }finally{d.window.close()}
});
test("Keno freshness status exists and app logic parses",()=>{
 assert.match(file("keno.html"),/id="kenoResultFreshness"/);
 assert.match(file("keno.js"),/updateKenoFreshness/);
 assert.doesNotThrow(()=>new Function(file("keno.js")));
});
