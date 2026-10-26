const {test,expect}=require('@playwright/test');
test('Lotto chat opens and answers from its archive',async({page})=>{
 await page.goto('/index.html',{waitUntil:'domcontentloaded'});
 const open=page.locator('#llai-root .llai-launcher');
 await expect(open).toBeVisible({timeout:12000});
 await open.click();
 await expect(page.locator('#llai-root .llai-panel')).toBeVisible();
 await page.locator('#llai-question').fill('What are the hottest Lotto numbers in the last 100 draws?');
 await page.locator('#llai-root .llai-send').click();
 const reply=page.locator('#llai-root .llai-reply').last();
 await expect(reply).toContainText('Most frequent Lotto numbers',{timeout:30000});
 await expect(reply).toContainText('Lotto results');
 await page.locator('#llai-root .llai-close').click();
 await expect(page.locator('#llai-root .llai-panel')).toBeHidden();
});
test('Keno assistant handles 3pm questions and context',async({page})=>{
 await page.goto('/keno.html',{waitUntil:'domcontentloaded'});
 const open=page.locator('#llai-root .llai-launcher');
 await expect(open).toBeVisible({timeout:12000});
 await open.click();
 await page.locator('#llai-question').fill('Best Keno numbers in 3pm draws last six months');
 await page.locator('#llai-root .llai-send').click();
 const answer=page.locator('#llai-root .llai-reply').last();
 await expect(answer).toContainText('Most frequent Keno numbers',{timeout:30000});
 await expect(answer).toContainText('3:00 pm');
 await expect(answer.locator('.llai-bar-row')).toHaveCount(8);
 await page.locator('#llai-root .llai-close').click();
 await expect(page.locator('#llai-root .llai-launcher')).toBeVisible();
});
