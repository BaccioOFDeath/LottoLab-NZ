const {test,expect}=require("@playwright/test");
for(const game of [{name:"Lotto",path:"/index.html"},{name:"Keno",path:"/keno.html"}]){
 test(game.name+" layout QC mobile and desktop",async({page},testInfo)=>{
  await page.goto(game.path,{waitUntil:"domcontentloaded"});
  const body=page.locator("body"),hero=page.locator(".hero");
  await expect(hero).toBeVisible();
  await expect(page.locator(".lab-headline")).toContainText("Decode the Draw.");
  const measured=await page.evaluate(()=>{
   const q=s=>document.querySelector(s),b=document.body,c=window.getComputedStyle,
    head=q(".header-inner"),hero=q(".hero"),copy=q(".hero-copy"),title=q(".lab-headline"),
    button=q(".hero-actions a"),dock=q(".mobile-action-dock")||q(".mobile-dock");
   const rect=e=>{const r=e.getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,h:r.height,bottom:r.bottom}};
   return {viewport:window.innerWidth,scrollWidth:document.documentElement.scrollWidth,header:rect(head),hero:rect(hero),copy:rect(copy),title:rect(title),button:rect(button),dock:dock?rect(dock):null,topFont:c(q(".topline")).fontSize,titleFont:c(title).fontSize,bodyClass:b.className};
  });
  expect(measured.scrollWidth).toBeLessThanOrEqual(measured.viewport+1);
  if(measured.viewport<=720){
   expect(measured.header.h).toBeGreaterThanOrEqual(74);
   expect(measured.header.h).toBeLessThanOrEqual(79);
   expect(measured.hero.h).toBeGreaterThanOrEqual(545);
   expect(measured.hero.h).toBeLessThanOrEqual(710);
   expect(measured.button.h).toBeGreaterThanOrEqual(47);
   expect(measured.button.w).toBeGreaterThanOrEqual(measured.viewport-45);
   expect(measured.dock).not.toBeNull();
   expect(measured.dock.h).toBeGreaterThanOrEqual(65);
  }
  expect(measured.title.w).toBeGreaterThan(200);
  await page.screenshot({path:"test-results/layout-"+game.name.toLowerCase()+"-"+testInfo.project.name+".png",fullPage:false});
 });
}
