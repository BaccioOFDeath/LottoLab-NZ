const {test,expect}=require('@playwright/test');
test('first visit is compact: results, next draw and scorecard; tools behind one Explore panel',async({page})=>{
 await page.setViewportSize({width:390,height:844});
 await page.goto('/');
 await expect(page.locator('#deepResearch')).not.toHaveAttribute('open');
 await expect(page.locator('#results')).toBeVisible();
 await expect(page.locator('#picker')).toBeVisible();
 await expect(page.locator('#focus-proof')).toHaveCount(0);
 await expect(page.locator('#focusScored')).toBeVisible();
 await expect(page.locator('#lineCreator')).toBeHidden();
 await expect(page.locator('#foreverNumbers')).toBeHidden();
 await expect(page.locator('#dataExports')).toBeHidden();
 await expect(page.locator('#cleanCategoryNav button')).toHaveCount(4);
 await expect(page.locator('.home-priority')).toBeHidden();
 await page.locator('#deepResearch > summary').click();
 await expect(page.locator('#deepResearch')).toHaveAttribute('open','');
 await expect(page.locator('.clean-panel:not([hidden]) .clean-tool')).toHaveCount(3);
 await expect(page.locator('#foreverNumbers')).toBeHidden();
 await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(391);
});
test('opening an advanced tool reveals only that tool and switching categories hides others',async({page})=>{
 await page.goto('/');
 await page.locator('#deepResearch > summary').click();
 await page.locator('.clean-tool[data-tool="foreverNumbers"] > summary').click();
 await expect(page.locator('#foreverNumbers')).toBeVisible();
 await expect(page.locator('#numberChecker')).toBeHidden();
 await page.locator('#cleanFind').fill('CSV');
 await expect(page.locator('#tool-data')).toBeVisible();
 await page.locator('#tool-data').click();
 await page.locator('.clean-tool[data-tool="dataExports"] > summary').click();
 await expect(page.locator('#dataExports')).toBeVisible();
 await expect(page.locator('#foreverNumbers')).toBeHidden();
 await page.locator('#cleanFind').fill('');
 await expect(page.locator('.clean-tool[data-tool="dataExports"]')).toBeVisible();
});
test('every deep link automatically selects its category and opens its tool',async({page})=>{
 const targets=[['lineCreator','numbers'],['combinations','history'],['archive','history'],['geo','visuals'],['numberWorld','visuals'],['dataExports','data'],['myData','data']];
 for(const [target,category] of targets){
  await page.goto('/#'+target);
  await expect(page.locator('#deepResearch')).toHaveAttribute('open','');
  await expect(page.locator('#tool-'+category)).toHaveAttribute('aria-pressed','true');
  await expect(page.locator('#'+target)).toBeVisible();
 }
});
test('mobile menu groups retain real navigable links to hidden research tools',async({page})=>{
 await page.setViewportSize({width:390,height:844});
 await page.goto('/');
 await page.locator('#menuToggle').click();
 await expect(page.locator('#mobileNav')).toBeVisible();
 await page.locator('.mobile-menu-group summary').first().click();
 await page.locator('#mobileNav a[href="#foreverNumbers"]').click();
 await expect(page.locator('#mobileNav')).toBeHidden();
 await expect(page.locator('#foreverNumbers')).toBeVisible();
 await expect(page.locator('#tool-numbers')).toHaveAttribute('aria-pressed','true');
 await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(391);
});
test('model details are accessible only when expanded; core scorecard never hides',async({page})=>{
 await page.goto('/');
 await expect(page.locator('#focusScored')).toBeVisible();
 await expect(page.locator('#modelVerified')).toBeHidden();
 await page.locator('#performanceDetails > summary').click();
 await expect(page.locator('#modelVerified')).toBeVisible();
});
