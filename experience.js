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
 if(section){history.replaceState(null,'','#'+section.id);if(typeof window.lottoLabJumpTo==='function')window.lottoLabJumpTo(section.id);else requestAnimationFrame(()=>section.scrollIntoView({block:'start'}));}
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

// Touch-reactive finger sparks and tactile ball feedback.
// One short burst per touch, no scroll interception, haptics, or jackpot theatrics.
const savedMotion=window.matchMedia('(prefers-reduced-motion: reduce)').matches||
 !!(navigator.connection&&navigator.connection.saveData);
const touchLayer=document.createElement('div');
touchLayer.className='lotto-touch-layer';
touchLayer.setAttribute('aria-hidden','true');
document.body.append(touchLayer);
let touchEffects=0;
window.lottoLabTouchEffects=()=>touchEffects;
function touchPulse(e){
 if(e.pointerType!=='touch'&&e.pointerType!=='pen')return;
 if(savedMotion||window.lottoLabMotionEnabled===false||document.hidden)return;
 if(touchLayer.children.length>20){
  for(const older of [...touchLayer.children].slice(0,5))older.remove();
 }
 const element=e.target instanceof Element?e.target:null;
 const colored=element?.closest('.ball');
 const tint=colored?.classList.contains('bonus')?'#ffd373':colored?.classList.contains('power')?'#ff76b4':'#c99bff';
 const ring=document.createElement('i');
 ring.className='touch-ring';
 ring.style.left=e.clientX+'px';
 ring.style.top=e.clientY+'px';
 ring.style.setProperty('--ring-color',tint);
 touchLayer.append(ring);
 ring.addEventListener('animationend',()=>ring.remove(),{once:true});
 touchEffects++;
 for(let i=0;i<3;i++){
  const point=document.createElement('i');
  point.className='touch-mote';
  point.style.left=e.clientX+'px';point.style.top=e.clientY+'px';
  point.style.setProperty('--ring-color',tint);
  const direction=(i*2*Math.PI/3)+(e.clientX%23)/23;
  point.style.setProperty('--dx',Math.round(Math.cos(direction)*27)+'px');
  point.style.setProperty('--dy',Math.round(Math.sin(direction)*27)+'px');
  touchLayer.append(point);
  point.addEventListener('animationend',()=>point.remove(),{once:true});
 }
 if(colored){
  colored.classList.remove('tap-pop');
  void colored.offsetWidth;
  colored.classList.add('tap-pop');
  colored.addEventListener('animationend',()=>colored.classList.remove('tap-pop'),{once:true});
 }
}
document.addEventListener('pointerdown',touchPulse,{passive:true});
// Each winning main ball has a meaningful touch action: inspect its recorded history.
$('mainBalls')?.addEventListener('click',event=>{
 const button=event.target.closest('button[data-inspect]');
 if(!button)return;
 const n=Number(button.dataset.inspect),selector=$('universeNumberPicker'),section=$('universe');
 if(!selector||!section||!Number.isInteger(n))return;
 selector.value=String(n);
 selector.dispatchEvent(new Event('change',{bubbles:true}));
 const lab=$('deepResearch');if(lab&&lab.contains(section))lab.open=true;
 requestAnimationFrame(()=>section.scrollIntoView({behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches||window.lottoLabMotionEnabled===false?'instant':'smooth',block:'start'}));
 announce('Exploring the history of Lotto number '+n);
});


// Open the optional Powerball chart before navigating to it.
document.addEventListener('click',event=>{
 const a=event.target.closest('a[data-open-details]');
 if(!a)return;
 const detail=document.getElementById(a.dataset.openDetails),destination=document.getElementById(a.hash.slice(1));
 if(!detail||!destination)return;
 event.preventDefault();
 detail.open=true;
 const lab=$('deepResearch');if(lab&&lab.contains(destination))lab.open=true;
 history.replaceState(null,'',a.hash);
 requestAnimationFrame(()=>destination.scrollIntoView({behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth',block:'start'}));
});

})();