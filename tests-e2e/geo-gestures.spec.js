const {test,expect}=require('@playwright/test');

async function ready(page){
 await page.goto('/#geo');
 await expect(page.locator('#geoTotal')).not.toHaveText('—');
 await expect(page.locator('#geoScene')).toBeVisible();
}

test('two-finger pinch zooms around fingers, allows two-finger pan and respects map bounds',async({page})=>{
 await ready(page);
 const data=await page.evaluate(()=>{
  const stage=document.getElementById('geoMapStage');
  const rect=stage.getBoundingClientRect(),startX=rect.left+rect.width*.36,startY=rect.top+rect.height*.36;
  function touch(id,x,y){return {identifier:id,target:stage,clientX:x,clientY:y,pageX:x+scrollX,pageY:y+scrollY};}
  function send(type,pts){const ts=pts.map(p=>touch(...p));
   // WebKit intentionally restricts synthetic Touch/TouchEvent constructors.
   // Dispatch equivalent touches on a standard event to validate map handlers
   // while real iPhone hardware testing remains a separate QA step.
   const ev=new Event(type,{bubbles:true,cancelable:true});
   Object.defineProperties(ev,{touches:{value:ts},targetTouches:{value:ts},changedTouches:{value:ts}});
   stage.dispatchEvent(ev);return ev.defaultPrevented;
  }
  const normalComputed=getComputedStyle(stage).touchAction;
  const singleStart=send('touchstart',[[8,startX,startY]]);
  const normalMove=send('touchmove',[[8,startX+7,startY+18]]);
  send('touchend',[]);
  const startPrevented=send('touchstart',[[1,startX-35,startY],[2,startX+35,startY]]);
  const pinchPrevented=send('touchmove',[[1,startX-80,startY-15],[2,startX+80,startY+25]]);
  const afterPinch={zoom:Number(stage.dataset.zoom),css:document.getElementById('geoScene').style.transform};
  const panPrevented=send('touchmove',[[1,startX-55,startY+25],[2,startX+105,startY+65]]);
  const afterPan={zoom:Number(stage.dataset.zoom),css:document.getElementById('geoScene').style.transform};
  send('touchend',[]);
  return {normalComputed,singleStart,normalMove,startPrevented,pinchPrevented,panPrevented,afterPinch,afterPan,windowScale:visualViewport?.scale||1};
 });
 expect(data.normalComputed).toBe('pan-y');
 expect(data.singleStart).toBe(false);
 expect(data.normalMove).toBe(false);
 expect(data.startPrevented).toBe(true);
 expect(data.pinchPrevented).toBe(true);
 expect(data.panPrevented).toBe(true);
 expect(data.afterPinch.zoom).toBeGreaterThan(2);
 expect(data.afterPinch.zoom).toBeLessThanOrEqual(4);
 expect(data.afterPan.css).not.toBe(data.afterPinch.css);
 expect(data.afterPan.zoom).toBeCloseTo(data.afterPinch.zoom,1);
 expect(data.windowScale).toBe(1);
});
test('Move mode supports one-finger dragging only when opted in, and reset restores page scrolling',async({page})=>{
 await ready(page);
 await expect(page.locator('#geoMove')).toHaveAttribute('aria-pressed','false');
 await page.locator('#geoZoomIn').click();
 await expect(page.locator('#geoZoomValue')).toHaveText('1.5×');
 const before=await page.locator('#geoScene').getAttribute('style');
 await page.locator('#geoMove').click();
 await expect(page.locator('#geoMove')).toHaveAttribute('aria-pressed','true');
 await expect(page.locator('#geoGestureHint')).toContainText('drag with one finger');
 const state=await page.evaluate(()=>{
  const stage=document.getElementById('geoMapStage'),rect=stage.getBoundingClientRect();
  const x=rect.left+rect.width/2,y=rect.top+rect.height/2;
  const t=(xx,yy)=>({identifier:9,target:stage,clientX:xx,clientY:yy});
  const event=(type,touches)=>{let ev=new Event(type,{cancelable:true,bubbles:true});
   Object.defineProperties(ev,{touches:{value:touches},targetTouches:{value:touches},changedTouches:{value:touches}});
   stage.dispatchEvent(ev);return ev.defaultPrevented;};
  const a=event('touchstart',[t(x,y)]);
  const b=event('touchmove',[t(x+40,y+22)]);
  const trans=document.getElementById('geoScene').style.transform;
  event('touchend',[]);
  return {a,b,trans,touchAction:getComputedStyle(stage).touchAction};
 });
 expect(state.touchAction).toBe('none');
 expect(state.a).toBe(false);
 expect(state.b).toBe(true);
 expect(state.trans).not.toBe(before);
 await page.locator('#geoMove').click();
 await expect(page.locator('#geoMove')).toHaveAttribute('aria-pressed','false');
 await expect(page.locator('#geoMapStage')).toHaveCSS('touch-action','pan-y');
 await page.locator('#geoZoomReset').click();
 await expect(page.locator('#geoZoomValue')).toHaveText('1.0×');
 await expect(page.locator('#geoScene')).toHaveAttribute('style',/scale\(1\);$/);
 await expect(page.locator('#geoZoomReset')).toBeDisabled();
});
test('pinching never alters source data, location pins, page width or the 20 locked predictions',async({page})=>{
 await page.setViewportSize({width:390,height:844});
 await ready(page);
 const old=await page.locator('#geoTotal').innerText();
 await page.locator('#geoZoomIn').click();
 await page.locator('#geoZoomIn').click();
 await page.locator('#geoZoomIn').click();
 await expect(page.locator('#geoZoomValue')).toHaveText('2.5×');
 const firstPlace=await page.locator('#geoRanking button').first().innerText();
 await page.locator('#geoRanking button').first().click();
 await expect(page.locator('#geoSelectedList a').first()).toBeVisible();
 expect(await page.locator('#geoTotal').innerText()).toBe(old);
 await expect.poll(()=>page.evaluate(()=>Math.max(document.body.scrollWidth,document.documentElement.scrollWidth))).toBeLessThanOrEqual(391);
 await expect(page.locator('#pickerCount')).toHaveText('20 of 20 lines locked');
 await page.locator('#geoZoomReset').click();
 await expect(page.locator('#geoZoomValue')).toHaveText('1.0×');
 expect(firstPlace).toContain('Auckland');
});


test('hotspot numbers, badges and glow shrink instead of exploding at high zoom',async({page})=>{
 await page.setViewportSize({width:390,height:844});
 await ready(page);
 const pin=page.locator('#geoPins .geo-pin').first();
 await expect(pin).toBeVisible();
 const before=await pin.evaluate(el=>({
  width:el.getBoundingClientRect().width,
  font:getComputedStyle(el.querySelector('.geo-pin-dot')).fontSize,
  opacity:getComputedStyle(el).opacity
 }));
 for(let i=0;i<6;i++)await page.locator('#geoZoomIn').click();
 await expect(page.locator('#geoZoomValue')).toHaveText('4.0×');
 const after=await pin.evaluate(el=>({
  width:el.getBoundingClientRect().width,
  compensation:getComputedStyle(document.getElementById('geoPins')).getPropertyValue('--geo-pin-compensation'),
  label:getComputedStyle(document.getElementById('geoPins')).getPropertyValue('--geo-label-compensation'),
  font:getComputedStyle(el.querySelector('.geo-pin-dot')).fontSize
 }));
 expect(after.width).toBeLessThan(before.width*.78);
 expect(after.width).toBeGreaterThan(before.width*.5);
 expect(Number(after.compensation)).toBeLessThan(.25);
 expect(Number(after.label)).toBeGreaterThan(1);
 await expect.poll(()=>page.evaluate(()=>Math.max(document.body.scrollWidth,document.documentElement.scrollWidth))).toBeLessThanOrEqual(391);
 await page.locator('#geoZoomReset').click();
 const reset=await pin.evaluate(el=>el.getBoundingClientRect().width);
 expect(reset).toBeCloseTo(before.width,0);
});
