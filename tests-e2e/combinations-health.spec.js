
async function revealResearchForLegacyChecks(page){
 await page.evaluate(()=>{
  const vault=document.getElementById('deepResearch');vault.open=true;
  const score=document.getElementById('performanceDetails');if(score)score.open=true;
  // Existing functional tests exercise every module together. Separately,
  // clean-layout.spec.js validates the real collapsed visitor experience.
  for(const panel of document.querySelectorAll('.clean-panel'))panel.hidden=false;
  for(const disclosure of [...document.querySelectorAll('.clean-tool')]){
   const body=disclosure.querySelector('.clean-tool-body');
   if(body)disclosure.replaceWith(...body.children);
  }
 });
}

const {test,expect}=require('@playwright/test');
async function openLab(page,url='/'){
 await page.goto(url);
 await revealResearchForLegacyChecks(page);
 await expect(page.locator('#dataHealth')).toBeVisible();
 await expect(page.locator('#combinations')).toBeVisible();
}
test('all four combination sizes show historical evidence and source counts',async({page})=>{
 await openLab(page);
 await expect(page.locator('#combosSample')).not.toHaveText('—');
 const count=await page.evaluate(()=>window.lottoLabDraws.length);
 await expect(page.locator('#combosSample')).toHaveText(String(count));
 for(const size of [2,3,4,5]){
  await page.locator('[data-combo-size="'+size+'"]').click();
  await expect(page.locator('#combosResults button')).toHaveCount(12);
  await expect(page.locator('#combosResults button').first().locator('.combos-balls span')).toHaveCount(size);
  await page.locator('#combosResults button').first().click();
  await expect(page.locator('#combosDetail .combos-match').first()).toBeVisible();
  const n=Number(await page.locator('#combosTopCount').innerText());
  expect(n).toBeGreaterThan(0);
 }
 await page.locator('#combosSource').selectOption('verified');
 const verified=await page.evaluate(()=>window.lottoLabDraws.filter(d=>d.verification==='two-source'&&new Set(d.sources||[]).size>=2).length);
 await expect(page.locator('#combosSample')).toHaveText(String(verified));
 await expect(page.locator('#combosNote')).toContainText('Partial archive');
});
test('site audit shows section-specific load states and honest archive coverage',async({page})=>{
 await openLab(page);
 await expect(page.locator('#healthRows .health-row')).toHaveCount(15);
 const count=await page.evaluate(()=>window.lottoLabDraws.length);
 await expect(page.locator('#healthDraws')).toHaveText(count.toLocaleString('en-NZ'));
 await expect(page.locator('#healthSummary')).toContainText('PARTIAL archive');
 await expect(page.locator('#healthRows')).toContainText('Geo Lab winning locations');
 await expect(page.locator('#healthRows')).toContainText('Prediction scorecard');
 await expect(page.locator('#healthRows')).toContainText('Number Universe');
 await page.locator('#healthRefresh').click();
 await expect(page.locator('#healthDate')).toContainText('Last checked:');
});
test('local data manager exports, clears and never touches unrelated website storage',async({page})=>{
 await openLab(page);
 await page.evaluate(()=>{
  localStorage.setItem('lottolab:forever-numbers:v1',JSON.stringify([{numbers:[1,2,3,4,5,6],powerball:7}]));
  localStorage.setItem('lottolab:checked-lines:v1',JSON.stringify([{numbers:[1,3,5,7,9,11]}]));
  localStorage.setItem('a-different-app:keep','safe');
 });
 await page.locator('#healthRefresh').click();
 await page.reload();
 await revealResearchForLegacyChecks(page);
 await expect(page.locator('#localForeverCount')).toHaveText('1');
 await expect(page.locator('#localCheckedCount')).toHaveText('1');
 const capture=page.waitForEvent('download');
 await page.locator('#localExport').click();
 const download=await capture;
 expect(download.suggestedFilename()).toBe('lottolab-my-saved-data.json');
 page.once('dialog',dialog=>dialog.accept());
 await page.locator('#localClear').click();
 await expect.poll(()=>page.evaluate(()=>Object.keys(localStorage).filter(x=>x.startsWith('lottolab:')).length)).toBe(0);
 expect(await page.evaluate(()=>localStorage.getItem('a-different-app:keep'))).toBe('safe');
 await expect(page.locator('#localForeverCount')).toHaveText('0');
});
test('new advanced tools fit narrow mobile screens without sideways overflow',async({page})=>{
 await page.setViewportSize({width:390,height:844});
 await openLab(page,'/#combinations');
 for(const selector of ['#combinations','#myData','#dataHealth']){
  await expect(page.locator(selector)).toBeVisible();
 }
 await page.locator('[data-combo-size="5"]').click();
 await expect(page.locator('#combosResults button')).toHaveCount(12);
 await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(391);
});
test('source-file outage becomes visible in the audit instead of a blank section',async({page})=>{
 await page.route('**/data/geo-winners.json',route=>route.fulfill({status:503,body:'unavailable'}));
 await openLab(page);
 await expect(page.locator('#healthRows')).toContainText('Map source files unavailable');
 await expect(page.locator('#healthRows .health-failed')).not.toHaveCount(0);
});
