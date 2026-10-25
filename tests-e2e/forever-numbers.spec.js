const {test,expect}=require('@playwright/test');

async function openLab(page){
 await page.goto('/');
 await page.locator('#deepResearch').evaluate(el=>el.open=true);
 await expect(page.locator('#foreverNumbers')).toBeVisible();
}
test('Forever Numbers generates six unique Lotto balls, locks locally and survives reload',async({page})=>{
 await openLab(page);
 await expect(page.locator('#foreverBalls .forever-blank')).toHaveCount(6);
 await page.locator('#foreverGenerate').click();
 await expect(page.locator('#foreverBalls .forever-ball')).toHaveCount(6);
 await expect(page.locator('#foreverPB')).not.toHaveText('—');
 const balls=await page.locator('#foreverBalls .forever-ball').allTextContents();
 expect(new Set(balls).size).toBe(6);
 await page.locator('#foreverName').fill('Saturday forever');
 await page.locator('#foreverLock').click();
 await expect(page.locator('#foreverCount')).toHaveText('1');
 await expect(page.locator('#foreverSaved')).toContainText('Saturday forever');
 await page.reload();
 await page.locator('#deepResearch').evaluate(el=>el.open=true);
 await expect(page.locator('#foreverCount')).toHaveText('1');
 await expect(page.locator('#foreverSaved')).toContainText('Saturday forever');
 await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(1280);
});
test('Number checker compares exact and partial matching draws and saves checked lines',async({page})=>{
 await openLab(page);
 const dataset=require('../data/draws.json');
 const line=dataset[0];
 await page.locator('#numberChecker .ball-entry-paste summary').click();
 await page.locator('#checkerNumbers').fill(line.numbers.join(', '));
 await page.locator('#checkerPB').selectOption(String(line.powerball));
 await page.locator('#checkerName').fill('A known draw');
 await page.locator('#checkerSearch').click();
 await expect(page.locator('#checkerResults .checker-summary')).toContainText('Exact six appeared');
 await expect(page.locator('#checkerResults')).toContainText('Draw #'+line.draw);
 await expect(page.locator('#checkerSavedCount')).toHaveText('1 line');
 await page.reload();
 await page.locator('#deepResearch').evaluate(el=>el.open=true);
 await expect(page.locator('#checkerNumbers')).toHaveValue(line.numbers.join(', '));
 await expect(page.locator('#checkerSavedCount')).toHaveText('1 line');
 await page.locator('#checkerForever').click();
 await expect(page.locator('#foreverBalls .forever-ball')).toHaveCount(6);
 await page.locator('#foreverLock').click();
 await expect(page.locator('#foreverCount')).toHaveText('1');
});
test('Number checker validates invalid lines and works without the archive',async({page})=>{
 await page.route('**/data/draws.json',route=>route.fulfill({status:503,body:'unavailable'}));
 await page.route('**/data/legacy-draws.json',route=>route.fulfill({status:503,body:'unavailable'}));
 await openLab(page);
 await page.locator('#numberChecker .ball-entry-paste summary').click();
 await page.locator('#checkerNumbers').fill('1 2 3 4 5 5');
 await page.locator('#checkerSearch').click();
 await expect(page.locator('#checkerFeedback')).toContainText('different');
 await page.locator('#checkerNumbers').fill('1 2 3 4 5 6');
 await page.locator('#checkerSave').click();
 await expect(page.locator('#checkerSavedCount')).toHaveText('1 line');
 await page.locator('#foreverMode').selectOption('random');
 await page.locator('#foreverGenerate').click();
 await expect(page.locator('#foreverBalls .forever-ball')).toHaveCount(6);
});
