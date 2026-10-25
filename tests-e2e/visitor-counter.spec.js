const { test, expect } = require('@playwright/test');

test('footer has a compact public page-view badge without obstructing mobile layout',async ({page})=>{
  await page.route('https://visitor-badge.one9x.com/**', route=>route.fulfill({
    status:200,contentType:'image/svg+xml',
    body:'<svg xmlns="http://www.w3.org/2000/svg" width="128" height="22"><rect width="128" height="22" fill="#6950c3"/><text x="8" y="15" fill="#fff" font-size="12">Site visits 1</text></svg>'
  }));
  await page.setViewportSize({width:390,height:844});
  await page.goto('/');
  const counter=page.locator('footer .visitor-counter img');
  await expect(counter).toHaveCount(1);
  await expect(counter).toHaveAttribute('src',/visitor-badge\.one9x\.com\/badge\?page_id=lottolab-nz-site-views-20261025/);
  await expect(counter).toHaveAttribute('referrerpolicy','no-referrer');
  await expect(counter).toHaveJSProperty('complete',true);
  const bounds=await counter.boundingBox();
  expect(bounds.width).toBeGreaterThan(60);
  expect(bounds.width).toBeLessThan(180);
  await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(391);
});
