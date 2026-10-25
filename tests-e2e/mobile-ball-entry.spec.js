const {test,expect}=require('@playwright/test');
const data=require('../data/draws.json');
const newest=data[0];
async function openQuick(page){
 await page.setViewportSize({width:390,height:844});
 await page.goto('/');
 await page.locator('#ticketChecker > summary').click();
}
test('iPhone-sized quick checker accepts one number in each ball with numeric keypad',async({page})=>{
 await openQuick(page);
 await expect(page.locator('#quickCheckForm .ball-entry-field')).toHaveCount(6);
 const inputs=page.locator('#quickCheckForm .ball-entry-field');
 await expect(inputs.nth(0)).toHaveAttribute('inputmode','numeric');
 await inputs.nth(0).fill('25');
 await expect(inputs.nth(1)).toBeFocused();
 await inputs.nth(1).fill('4');
 await inputs.nth(2).click();
 await inputs.nth(2).fill('7');
 await inputs.nth(3).fill('12');
 await inputs.nth(4).fill('33');
 await inputs.nth(5).fill('40');
 await expect(page.locator('#checkNumbers')).toHaveValue('25 04 07 12 33 40');
 await page.locator('.quick-check-button').click();
 await expect(page.locator('#checkerStatus')).toContainText('main numbers matched');
 await expect(page.locator('#checkerSavedCount')).toHaveText('1 line');
 await page.reload();
 await page.locator('#ticketChecker > summary').click();
 await expect(page.locator('#quickCheckForm .ball-entry-field').nth(0)).toHaveValue('25');
 await expect(page.locator('#quickCheckForm .ball-entry-field').nth(1)).toHaveValue('04');
 await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(391);
});
test('pasting a complete line into optional input updates individual balls and checks exact latest result',async({page})=>{
 await openQuick(page);
 await page.locator('#ticketChecker .ball-entry-paste summary').click();
 await page.locator('#checkNumbers').fill(newest.numbers.join(', '));
 await expect(page.locator('#quickCheckForm .ball-entry-field')).toHaveCount(6);
 const numbers=await page.locator('#quickCheckForm .ball-entry-field').evaluateAll(els=>els.map(e=>Number(e.value)));
 expect(numbers).toEqual(newest.numbers);
 await page.locator('#checkPowerball').fill(String(newest.powerball));
 await page.locator('.quick-check-button').click();
 await expect(page.locator('#checkerStatus')).toContainText('6 of 6 main numbers matched');
 await expect(page.locator('#checkerStatus')).toContainText('not a ticket or prize verification');
});
test('historical checker has six editable balls with local saved lines restored',async({page})=>{
 await page.setViewportSize({width:390,height:844});
 await page.goto('/#numberChecker');
 await page.locator('#deepResearch').evaluate(el=>el.open=true);
 const balls=page.locator('#numberChecker .ball-entry-field');
 await expect(balls).toHaveCount(6);
 for(let i=0;i<6;i++)await balls.nth(i).fill(String(newest.numbers[i]));
 await page.locator('#checkerSearch').click();
 await expect(page.locator('#checkerResults .checker-summary')).toContainText('Exact six appeared');
 await expect(page.locator('#checkerSavedCount')).toHaveText('1 line');
 await page.reload();
 await page.locator('#deepResearch').evaluate(el=>el.open=true);
 await expect(balls.nth(0)).toHaveValue(String(newest.numbers[0]).padStart(2,'0'));
 await page.locator('#checkerSaved button[data-action="load"]').click();
 await expect(page.locator('#checkerNumbers')).toHaveValue(newest.numbers.map(n=>String(n).padStart(2,'0')).join(' '));
});
test('six-ball entry rejects repeated numbers without losing manually entered values',async({page})=>{
 await openQuick(page);
 const balls=page.locator('#quickCheckForm .ball-entry-field');
 for(let i=0;i<6;i++)await balls.nth(i).fill(String(i===5?5:i+1));
 await expect(balls.nth(5)).toHaveClass(/is-error/);
 await page.locator('.quick-check-button').click();
 await expect(page.locator('#checkerStatus')).toContainText('six DIFFERENT Lotto numbers');
 await balls.nth(5).fill('6');
 await expect(balls.nth(5)).not.toHaveClass(/is-error/);
});
