const {test,expect}=require('@playwright/test');

test('20 precommitted lines show as compact, readable Lotto ticket slips',async({page})=>{
 await page.setViewportSize({width:390,height:844});
 await page.goto('/#picker');
 await expect(page.locator('#pickerCount')).toHaveText('20 of 20 lines locked');
 await expect(page.locator('#pickerLines .lotto-ticket')).toHaveCount(1);
 await expect(page.locator('#pickerLines .fixed-pick-line')).toHaveCount(10);
 expect((await page.locator('#pickerLines .lotto-ticket-rows').first().locator('.fixed-pick-name strong').allTextContents())).toEqual(['A','B','C','D','E','F','G','H','J','K']);
 await page.locator('#pickerExpand').click();
 await expect(page.locator('#pickerLines .lotto-ticket')).toHaveCount(2);
 await expect(page.locator('#pickerLines .lotto-ticket-rows')).toHaveCount(2);
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
 await expect(page.locator('#pickerLines .lotto-ticket')).toHaveCount(2);
 const palette=await page.locator('#pickerLines .lotto-ticket').first().evaluate(el=>{
  const css=n=>getComputedStyle(el.querySelector(n)).backgroundImage;
  return {yellow:getComputedStyle(el).backgroundImage,blue:css('.fixed-pick-numbers .ball'),pink:css('.ticket-power .ball.power')};
 });
 expect(palette.yellow).toContain('255,');
 expect(palette.blue).toContain('radial-gradient');
 expect(palette.pink).toContain('radial-gradient');
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

test('narrow iPhone layout keeps six blue Lotto balls and pink PB in each ticket row',async({page})=>{
 await page.setViewportSize({width:320,height:760});
 await page.goto('/#picker');
 await page.locator('#pickerExpand').click();
 const rows=page.locator('#pickerLines .fixed-pick-line');
 await expect(rows).toHaveCount(20);
 const geometry=await rows.evaluateAll(elements=>elements.map(row=>{
  const bounds=selector=>row.querySelector(selector).getBoundingClientRect();
  const number=bounds('.fixed-pick-numbers');
  const pb=bounds('.ticket-power .ball.power');
  const frame=row.getBoundingClientRect();
  return {numbersBeforePB:number.right<pb.left+1,pbWithin:pb.right<=frame.right+1,overflow:row.scrollWidth>row.clientWidth+1};
 }));
 expect(geometry.every(x=>x.numbersBeforePB&&x.pbWithin&&!x.overflow)).toBe(true);
 await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(321);
});
