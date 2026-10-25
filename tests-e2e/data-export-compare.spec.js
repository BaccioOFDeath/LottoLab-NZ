const {test,expect}=require('@playwright/test');
const fs=require('fs');
async function start(page){
 await page.goto('/');
 await page.locator('#deepResearch').evaluate(el=>el.open=true);
 await expect(page.locator('#dataExports')).toBeVisible();
}
test('download a complete history CSV with correct columns and stored 1987 first results',async({page})=>{
 await start(page);
 const waiting=page.waitForEvent('download');
 await page.locator('#exportDraws').click();
 const file=await waiting;expect(file.suggestedFilename()).toMatch(/^lottolab-all-stored-draws-\d{4}-\d\d-\d\d\.csv$/);
 const csv=fs.readFileSync(await file.path(),'utf8');
 expect(csv).toContain('draw,date,number_1,number_2,number_3');
 expect(csv).toContain('1987-08-01');
 expect(csv).toContain('2026-10-24');
 await expect(page.locator('#exportStatus')).toContainText('Downloaded');
});
test('CSV exports for each combinations size and geolocation/picks have downloadable data',async({page})=>{
 await start(page);
 for(const n of [2,3,4,5]){
  await page.locator('#exportComboSize').selectOption(String(n));
  const received=page.waitForEvent('download');
  await page.locator('#exportCombinations').click();
  const file=await received;
  expect(file.suggestedFilename()).toContain(n+'-number-combinations');
  const text=fs.readFileSync(await file.path(),'utf8');
  expect(text).toContain('number_1,number_2');
  expect(text).toContain('draw_count');
 }
 for(const [id,term] of [['exportLocations','source_url'],['exportPicks','target_date']]){
  const waiting=page.waitForEvent('download');
  await page.locator('#'+id).click();
  const file=await waiting;
  expect(fs.readFileSync(await file.path(),'utf8')).toContain(term);
 }
});
test('all-data ZIP contains CSV series and manifests, user data is optional',async({page})=>{
 await start(page);
 const waiting=page.waitForEvent('download');
 await page.locator('#exportAll').click();
 const download=await waiting;
 expect(download.suggestedFilename()).toMatch(/\.zip$/);
 const bytes=fs.readFileSync(await download.path());
 expect(bytes.readUInt32LE(0)).toBe(0x04034b50);
 const content=bytes.toString('latin1');
 for(const filename of ['lotto_draw_history.csv','historical_combinations_5_numbers.csv','dataset_coverage_manifest.csv','geo_winners.csv','model_picks.csv','README_data_notes.txt'])
  expect(content).toContain(filename);
 expect(content).not.toContain('my_saved_lines_private.csv');
 await page.locator('#exportLocal').check();
 const withPrivate=page.waitForEvent('download');
 await page.locator('#exportAll').click();
 const privateZip=await withPrivate;
 expect(fs.readFileSync(await privateZip.path()).toString('latin1')).toContain('my_saved_lines_private.csv');
});
test('quick compare always reports incomplete and duplicate balls; successful check is saved',async({page})=>{
 await page.setViewportSize({width:390,height:844});
 await page.goto('/');
 await page.locator('#ticketChecker > summary').click();
 await page.locator('.quick-check-button').click();
 await expect(page.locator('#checkerStatus')).toContainText('Enter all six Lotto balls');
 const balls=page.locator('#quickCheckForm .ball-entry-field');
 for(let i=0;i<6;i++)await balls.nth(i).fill(String(i===5?5:i+1));
 await page.locator('.quick-check-button').click();
 await expect(page.locator('#checkerStatus')).toContainText('DIFFERENT');
 await balls.nth(5).fill('6');
 await page.locator('.quick-check-button').click();
 await expect(page.locator('#checkerStatus')).toContainText('Stored draw #');
 await expect(page.locator('#checkerStatus')).toContainText('numbers comparison only');
 await page.locator('#deepResearch').evaluate(el=>el.open=true);
 await expect(page.locator('#checkerSavedCount')).toHaveText('1 line');
});
