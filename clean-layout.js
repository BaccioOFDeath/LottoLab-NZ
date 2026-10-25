/* LottoLab clean layout. Move live elements rather than recreating modules. */
(()=>{
'use strict';
const $=id=>document.getElementById(id),vault=$('deepResearch'),content=vault?.querySelector('.research-vault-content');
if(!content)return;
const categories=[
 ['numbers','My numbers','Build, check and save your lines','◉'],
 ['history','Results & patterns','Draw history and statistics','▤'],
 ['visuals','Maps & interactive','Explore numbers and winner locations','◎'],
 ['data','Data & settings','CSV downloads, backup and audit','↓']
];
const definitions=[
 ['lineCreator','numbers','Create my Lotto line','Pick six balls with historical pairing information'],
 ['foreverNumbers','numbers','My Forever Numbers','Save and track favourite number sets'],
 ['numberChecker','numbers','Have my numbers appeared before?','Check matches against the stored archive'],
 ['archive','history','Browse historical draws','Search by date or draw ID','archive'],
 ['combinations','history','Most common combinations','Pairs, triples, four- and five-number groups'],
 ['insights','history','Number statistics','Frequency and comparable draw periods','insights'],
 ['evidence','history','Evidence and model research','Statistical tests and transparent methodology'],
 ['geo','visuals','Winning-location map','Heatmaps and source-backed locations'],
 ['numberWorld','visuals','Interactive number world','Explore a spatial 40-ball visualisation'],
 ['universe','visuals','Number Universe','Touch-responsive number relationships'],
 ['myData','data','Saved numbers and local data','Backup, restore or clear browser storage'],
 ['dataExports','data','Download data as CSV','Individual CSV files and a complete ZIP'],
 ['dataHealth','data','Data quality and coverage','Review source loads and missing records']
];
const hub=document.createElement('div');hub.className='clean-hub';hub.id='toolHub';
hub.innerHTML='<div class="clean-hub-heading"><span class="clean-kicker">EXPLORE WHEN YOU WANT TO</span><h3>Explore LottoLab</h3><p>Your favourite tools are here. Pick a category, then open only what you need.</p></div><div class="clean-find"><label for="cleanFind">Find a tool</label><input id="cleanFind" type="search" placeholder="Search numbers, map, CSV, history…" autocomplete="off"></div><div id="cleanCategoryNav" class="clean-categories" role="group" aria-label="Explore categories"></div><div id="cleanPanels" class="clean-panels"></div><p class="clean-hub-note">Historical data is incomplete and past patterns do not improve the odds of a fair draw.</p>';
const nav=hub.querySelector('#cleanCategoryNav'),panels=hub.querySelector('#cleanPanels');
const paneMap=new Map(),buttonMap=new Map(),tools=new Map();
for(const [key,title,hint,icon] of categories){
 const btn=document.createElement('button');btn.type='button';btn.className='clean-category';
 btn.id='tool-'+key;btn.dataset.category=key;btn.setAttribute('aria-pressed','false');btn.setAttribute('aria-controls','cleanPanel-'+key);
 const symbol=document.createElement('span');symbol.className='clean-category-icon';symbol.textContent=icon;symbol.setAttribute('aria-hidden','true');
 const label=document.createElement('span');label.className='clean-category-copy';
 const strong=document.createElement('strong');strong.textContent=title;const small=document.createElement('small');small.textContent=hint;label.append(strong,small);
 const arrow=document.createElement('span');arrow.textContent='›';arrow.setAttribute('aria-hidden','true');
 btn.append(symbol,label,arrow);nav.append(btn);buttonMap.set(key,btn);
 const panel=document.createElement('div');panel.id='cleanPanel-'+key;panel.className='clean-panel';panel.hidden=true;panels.append(panel);paneMap.set(key,panel);
}
function roots(id,type){
 const node=$(id);if(!node)return [];
 if(type==='archive')return [node,node.nextElementSibling,node.nextElementSibling?.nextElementSibling].filter(Boolean);
 if(type==='insights'){
  const children=[];let p=node;
  while(p&&p!==$('evidence')){const next=p.nextElementSibling;children.push(p);p=next;}
  return children;
 }
 return [node];
}
for(const [id,category,title,description,type] of definitions){
 const elements=roots(id,type);
 if(!elements.length)continue;
 const disclosure=document.createElement('details');disclosure.className='clean-tool';disclosure.dataset.tool=id;
 const summary=document.createElement('summary');
 const mark=document.createElement('span');mark.className='clean-tool-mark';mark.setAttribute('aria-hidden','true');mark.textContent=category==='numbers'?'✦':category==='history'?'▦':category==='visuals'?'◎':'↓';
 const caption=document.createElement('span');caption.className='clean-tool-caption';
 const heading=document.createElement('strong');heading.textContent=title;const sub=document.createElement('small');sub.textContent=description;caption.append(heading,sub);
 const arrow=document.createElement('span');arrow.className='clean-chevron';arrow.textContent='⌄';arrow.setAttribute('aria-hidden','true');
 summary.append(mark,caption,arrow);
 const body=document.createElement('div');body.className='clean-tool-body';
 for(const element of elements)body.append(element);
 disclosure.append(summary,body);paneMap.get(category).append(disclosure);
 tools.set(id,{category,title,description,disclosure});
 disclosure.addEventListener('toggle',()=>{
  if(disclosure.open){
   for(const other of paneMap.get(category).querySelectorAll('.clean-tool[open]'))if(other!==disclosure)other.open=false;
   requestAnimationFrame(()=>window.dispatchEvent(new Event('resize')));
  }
 });
}
const leftovers=[...content.children];
if(leftovers.length){
 const extra=document.createElement('details');extra.className='clean-tool';
 const summary=document.createElement('summary');summary.textContent='Additional research';
 const body=document.createElement('div');body.className='clean-tool-body';
 for(const element of leftovers)body.append(element);
 extra.append(summary,body);paneMap.get('history').append(extra);
}
content.append(hub);
let active='numbers';
function select(category){
 if(!paneMap.has(category))return false;active=category;
 for(const [key,pane] of paneMap){
  pane.hidden=key!==category;buttonMap.get(key).classList.toggle('is-active',key===category);
  buttonMap.get(key).setAttribute('aria-pressed',String(key===category));
 }
 return true;
}
function show(id){
 if(id==='deepResearch'||id==='toolHub'){vault.open=true;return true;}
 if(id.startsWith('tool-')){if(!select(id.slice(5)))return false;vault.open=true;return true;}
 const element=$(id);if(!element)return false;
 const panel=element.closest('.clean-panel'),tool=element.closest('.clean-tool');
 if(!panel||!tool)return false;
 vault.open=true;
 if(hub.querySelector('#cleanFind').value){hub.querySelector('#cleanFind').value='';filter('');}
 select(panel.id.replace('cleanPanel-',''));tool.open=true;
 for(let parent=element.parentElement;parent&&parent!==tool;parent=parent.parentElement)if(parent.tagName==='DETAILS')parent.open=true;
 return true;
}
window.lottoLabShowTool=show;
function filter(value){
 const q=value.toLowerCase().trim();let first='';
 for(const [id,item] of tools){
  const match=!q||(id+' '+item.title+' '+item.description+' '+item.category).toLowerCase().includes(q);
  item.disclosure.hidden=!match;
  if(match&&!first)first=item.category;
 }
 for(const [key,pane] of paneMap)buttonMap.get(key).hidden=!Array.from(pane.querySelectorAll('.clean-tool')).some(el=>!el.hidden);
 if(q&&first&&!paneMap.get(active).querySelector('.clean-tool:not([hidden])'))select(first);
 let empty=hub.querySelector('.clean-no-results');if(empty)empty.remove();
 if(q&&!first){empty=document.createElement('p');empty.className='clean-no-results';empty.textContent='No matching tools. Try "numbers", "history" or "CSV".';panels.append(empty);}
}
hub.querySelector('#cleanFind').addEventListener('input',e=>filter(e.target.value));
for(const [key,btn] of buttonMap)btn.addEventListener('click',()=>select(key));
select('numbers');
const score=$('predictions'),proof=score?.querySelector('.focus-proof');
if(score&&proof){
 const details=document.createElement('details');details.id='performanceDetails';details.className='clean-performance';
 const summary=document.createElement('summary');summary.textContent='Detailed model performance and audit history';
 const body=document.createElement('div');body.className='clean-performance-body';
 let next=proof.nextElementSibling;
 while(next&&next.id!=='modelError'){const following=next.nextElementSibling;body.append(next);next=following;}
 details.append(summary,body);proof.insertAdjacentElement('afterend',details);
}
const initial=decodeURIComponent(location.hash.slice(1));if(initial)show(initial);
vault.addEventListener('toggle',()=>{if(vault.open)requestAnimationFrame(()=>window.dispatchEvent(new Event('resize')));});
})();