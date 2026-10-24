/* LottoLab NZ: small, accessible interactions inspired by best-in-class product UX.
   No tracking, engagement traps, heavy animations or third-party JS libraries. */
(()=>{
'use strict';
const $=id=>document.getElementById(id);
const dialog=$('quickNav'),input=$('quickSearch'),results=$('quickCommands');
const toast=$('siteToast'),top=$('backToTop'),progress=$('scrollProgress');
let toastTimer=0,scrollFrame=false;
function announce(message){
 if(!toast)return;
 toast.textContent=message;
 toast.classList.add('visible');
 clearTimeout(toastTimer);
 toastTimer=setTimeout(()=>toast.classList.remove('visible'),2600);
}
window.lottoLabToast=announce;
function openCommands(){
 if(!dialog)return;
 if(typeof dialog.showModal==='function')dialog.showModal();else dialog.setAttribute('open','');
 if(input){input.value='';filterCommands();input.focus();}
}
function closeCommands(){if(!dialog)return;if(typeof dialog.close==='function')dialog.close();else dialog.removeAttribute('open')}
function filterCommands(){
 if(!results||!input)return;
 const q=input.value.trim().toLowerCase();
 let visible=0;
 for(const child of results.querySelectorAll('button[data-jump]')){
   const show=child.textContent.toLowerCase().includes(q);
   child.hidden=!show;if(show)visible++;
 }
 const previous=$('quickNoResults');
 if(previous)previous.remove();
 if(!visible){
  const note=document.createElement('p');note.id='quickNoResults';note.className='muted';
  note.textContent='No matching feature. Try “results”, “lines”, or “history”.';
  results.append(note);
 }
}
input?.addEventListener('input',filterCommands);
$('quickClose')?.addEventListener('click',closeCommands);
$('openQuickNav')?.addEventListener('click',openCommands);
results?.addEventListener('click',event=>{
 const button=event.target.closest('button[data-jump]');
 if(!button)return;
 const section=document.getElementById(button.dataset.jump);
 closeCommands();
 if(section){section.scrollIntoView({behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth',block:'start'});history.replaceState(null,'','#'+section.id);}
});
dialog?.addEventListener('click',event=>{if(event.target===dialog)closeCommands()});
document.addEventListener('keydown',event=>{
 const typing=event.target instanceof HTMLElement&&(event.target.matches('input,textarea,select')||event.target.isContentEditable);
 if((event.metaKey||event.ctrlKey)&&event.key.toLowerCase()==='k'){
  event.preventDefault();dialog?.open?closeCommands():openCommands();return;
 }
 if(!typing&&!event.metaKey&&!event.ctrlKey&&!event.altKey&&event.key==='/'){
  event.preventDefault();openCommands();
 }
 if(dialog?.open&&event.key==='ArrowDown'){
  const first=[...results.querySelectorAll('button[data-jump]')].find(b=>!b.hidden);
  if(document.activeElement===input&&first){event.preventDefault();first.focus();}
 }
});
function updateScroll(){
 if(scrollFrame)return;
 scrollFrame=true;
 requestAnimationFrame(()=>{
  const available=document.documentElement.scrollHeight-window.innerHeight;
  const pct=available>0?Math.max(0,Math.min(1,window.scrollY/available)):0;
  if(progress)progress.style.transform='scaleX('+pct.toFixed(4)+')';
  top?.classList.toggle('visible',window.scrollY>560);
  scrollFrame=false;
 });
}
window.addEventListener('scroll',updateScroll,{passive:true});
window.addEventListener('resize',updateScroll,{passive:true});
updateScroll();
top?.addEventListener('click',()=>window.scrollTo({top:0,behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'}));
const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
if(!reduced&&'IntersectionObserver'in window){
 const sections=[...document.querySelectorAll('.evidence-kpi,.analysis-panel,.result-card,.research-banner')];
 sections.forEach(el=>el.classList.add('reveal-ready'));
 const watcher=new IntersectionObserver(entries=>{
  for(const entry of entries)if(entry.isIntersecting){entry.target.classList.add('reveal-in');watcher.unobserve(entry.target)}
 },{rootMargin:'0px 0px -40px 0px',threshold:0.05});
 sections.forEach(el=>watcher.observe(el));
}
// Visible feedback on actual clipboard operations, not on imagined success.
document.addEventListener('click',e=>{
 const button=e.target.closest('button');
 if(!button)return;
 if(button.id==='pickerCopyAll')setTimeout(()=>{if(button.textContent.includes('Copied'))announce('20 locked ticket lines copied')},80);
 if(button.classList.contains('fixed-copy'))setTimeout(()=>{if(button.textContent.includes('Copied'))announce('Line copied to clipboard')},80);
 if(button.classList.contains('model-copy'))setTimeout(()=>{if(button.textContent.includes('Copied'))announce('Line copied to clipboard')},80);
});
window.addEventListener('lottolab:data-ready',()=>{
 const count=(window.lottoLabDraws||[]).length;
 const hero=document.getElementById('heroDrawCount');
 if(hero)hero.textContent=count.toLocaleString('en-NZ');
});
})();