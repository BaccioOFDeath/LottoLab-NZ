/* Reliable anchored section landings for iOS Safari and in-page navigation.
   The sticky header height is measured rather than guessed; jumps are immediate
   to prevent a previous section occupying the target viewport mid-animation. */
(()=>{
 'use strict';
 const targets=new Set(['home','results','picker','lineCreator','predictions','deepResearch','archive','geo','insights','evidence','numberWorld','universe','powerChartPanel']);
 const header=()=>document.querySelector('.header');
 const deepLab=()=>document.getElementById('deepResearch');
 let jumpId=0;
 function jumpTo(id){
  const destination=document.getElementById(id);
  if(!destination)return false;
  const lab=deepLab();
  if(lab&&(id==='deepResearch'||lab.contains(destination)))lab.open=true;
  const seq=++jumpId;
  requestAnimationFrame(()=>requestAnimationFrame(()=>{
   if(seq!==jumpId)return;
   const headerHeight=header()?.getBoundingClientRect().height||0;
   const top=Math.max(0,window.scrollY+destination.getBoundingClientRect().top-headerHeight-27);
   window.scrollTo({top,behavior:'instant'});
  }));
  return true;
 }
 window.lottoLabJumpTo=jumpTo;
 document.addEventListener('click',event=>{
  const link=event.target.closest('a[href^="#"]');
  if(!link||link.hasAttribute('data-open-details'))return;
  const hash=link.getAttribute('href').slice(1);
  const id=decodeURIComponent(hash);
  if(!targets.has(id)||!document.getElementById(id))return;
  event.preventDefault();
  if(location.hash!=='#'+hash)history.pushState(null,'','#'+hash);
  jumpTo(id);
 });
 window.addEventListener('hashchange',()=>{
  const id=decodeURIComponent(location.hash.slice(1));
  if(targets.has(id))jumpTo(id);
 });
 window.addEventListener('load',()=>{
  const id=decodeURIComponent(location.hash.slice(1));
  if(targets.has(id))jumpTo(id);
 });
})();