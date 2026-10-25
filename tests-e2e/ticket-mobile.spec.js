const {test,expect}=require('@playwright/test');

test('20 precommitted lines show as compact, readable Lotto ticket slips',async({page})=>{
 await page.setViewportSize({width:390,height:844});
 await page.goto('/#picker');
 await expect(page.locator('#pickerCount')).toHaveText('20 of 20 lines locked');
 await page.locator('#pickerExpand').click();
 const slips=page.locator('#pickerLines .fixed-pick-line');
 await expect(slips).toHaveCount(20);
 await expect(page.locator('#pickerLines .fixed-pick-numbers .ball')).toHaveCount(120);
 await expect(page.locator('#pickerLines .ticket-power .ball.power')).toHaveCount(20);
 await expect(page.locator('#pickerLines .ticket-bonus')).toHaveCount(20);
 const measurements=await slips.evaluateAll(rows=>rows.map(row=>{
  const rect=row.getBoundingClientRect();
  return {height:rect.height,width:rect.width,overflow:row.scrollWidth>row.clientWidth+1};
 }));
 expect(Math.max(...measurements.map(x=>x.height))).toBeLessThanOrEqual(115);
 expect(measurements.every(x=>!x.overflow)).toBeTruthy();
 await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(391);
});

test('ticket playable numbers and PB are prominent while research-only bonus is optional',async({page})=>{
 await page.setViewportSize({width:390,height:844});
 await page.goto('/#picker');
 const first=page.locator('#pickerLines .fixed-pick-line').first();
 await expect(first.locator('.fixed-pick-numbers .ball')).toHaveCount(6);
 await expect(first.locator('.ticket-power .ball.power')).toHaveCount(1);
 await expect(first.locator('.ticket-bonus')).not.toHaveAttribute('open');
 await expect(first.locator('.ticket-bonus .ball.bonus')).toBeHidden();
 await first.locator('.ticket-bonus > summary').click();
 await expect(first.locator('.ticket-bonus .ball.bonus')).toBeVisible();
 await expect(first.locator('.ticket-bonus .pick-extra-label')).toContainText('RESEARCH ONLY');
 const value=await first.locator('.fixed-pick-numbers .ball').allTextContents();
 const pb=await first.locator('.ticket-power .ball.power').innerText();
 expect(value).toHaveLength(6);expect(pb).toMatch(/^\d\d$/);
});
