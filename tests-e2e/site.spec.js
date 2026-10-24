const entries=require('../data/draws.json');
const verified=entries.filter(r=>r.verification==='two-source'&&new Set(r.sources||[]).size>=2).length;
const report=require('../data/model-performance.json');
const {test,expect}=require('@playwright/test');
test('latest results and scorecard load from validated data',async({page})=>{
 await page.goto('/');
 await expect(page.locator('#latestDraw')).toContainText(String(entries[0].draw));
 await expect(page.locator('#drawCount')).toHaveText(String(entries.length));
 await expect(page.locator('#modelVerified')).toHaveText(String(report.verified_draw_count));
 await expect(page.locator('#modelBacktests')).toHaveText(String(report.backtest_draws));
 await expect(page.locator('#modelLiveDraws')).toHaveText(/^\d+$/);
 await expect(page.locator('#frequencyGrid button')).toHaveCount(40);
 await expect(page.locator('#modelAdaptive .model-balls .ball')).toHaveCount(6);
 await expect(page.locator('#modelRandom .model-balls .ball')).toHaveCount(6);
 await expect(page.locator('#modelLedgerRows tr')).not.toHaveCount(0);
 await expect(page.locator('#modelLedgerRows')).toContainText('Awaiting result');
 await expect(page.locator('#pickerCount')).toContainText('20 of 20');
 await expect(page.locator('#pickerLines .fixed-pick-line')).toHaveCount(4);
});
test('20 predictions stay immutable with four-line preview and expansion',async({page})=>{
 await page.goto('/');
 await expect(page.locator('#pickerCount')).toHaveText('20 of 20 lines locked');
 await expect(page.locator('#pickerGenerate')).toHaveCount(0);
 await expect(page.locator('#pickerLines .fixed-pick-line')).toHaveCount(4);
 const preview=await page.locator('#pickerLines').innerText();
 const expand=page.locator('#pickerExpand');
 await expect(expand).toHaveAttribute('aria-expanded','false');
 await expand.click();
 await expect(page.locator('#pickerLines .fixed-pick-line')).toHaveCount(20);
 await expect(expand).toHaveAttribute('aria-expanded','true');
 await expand.click();
 await expect(page.locator('#pickerLines .fixed-pick-line')).toHaveCount(4);
 await page.locator('#pickerMode').selectOption('adaptive_frequency_v1');
 await expect(page.locator('#pickerLines .fixed-pick-line')).toHaveCount(4);
 await expand.click();
 await expect(page.locator('#pickerLines .fixed-pick-line')).toHaveCount(10);
 await page.locator('#pickerMode').selectOption('random_baseline_v1');
 await expect(page.locator('#pickerLines .fixed-pick-line')).toHaveCount(4);
 await expand.click();
 await expect(page.locator('#pickerLines .fixed-pick-line')).toHaveCount(10);
 await page.locator('#pickerMode').selectOption('all');
 await expect(page.locator('#pickerCopyAll')).toBeEnabled();
 const copy=page.locator('#pickerLines .fixed-pick-line').first().locator('button');
 await expect(copy).toBeEnabled();
 await page.reload();
 await expect(page.locator('#pickerLines .fixed-pick-line')).toHaveCount(4);
 expect(await page.locator('#pickerLines').innerText()).toEqual(preview);
});
test('archive search filters and inspect number frequencies',async({page})=>{
 await page.goto('/');
 await page.locator('#searchDraws').fill('2620');
 await expect(page.locator('#archiveCount')).toContainText('1 of 1');
 await page.locator('#searchDraws').fill('');
 await page.locator('#weekdayFilter').selectOption('3');
 await expect(page.locator('#archiveCount')).toContainText('matching records');
 await page.locator('#weekdayFilter').selectOption('all');
 await page.locator('#orderFilter').selectOption('oldest');
 await page.locator('#showMore').click();
 await expect(page.locator('#archiveCount')).toContainText(Math.min(entries.length,37)+' of '+entries.length);
 await page.locator('#frequencyGrid button[data-number="7"]').click();
 await expect(page.locator('#numberDetail')).toContainText('Number 7 appeared');
});
test('mobile navigation and touch targets at 390 pixels',async({page})=>{
 await page.setViewportSize({width:390,height:844});
 await page.goto('/');
 const menu=page.locator('#menuToggle');
 await expect(menu).toBeVisible();
 await expect(page.locator('#mobileNav')).toBeHidden();
 await menu.click();
 await expect(page.locator('#mobileNav')).toBeVisible();
 await page.locator('#mobileNav a[href="#predictions"]').click();
 await expect(page.locator('#mobileNav')).toBeHidden();
 await expect(page.locator('#modelVerified')).toHaveText(String(verified));
});
test('like-for-like rule-era analysis changes main statistics and Powerball pools',async({page})=>{
 await page.goto('/');
 const recent=entries.filter(d=>d.date>='2026-09-16').length;
 const older=entries.filter(d=>d.date<'2026-09-13').length;
 await expect(page.locator('#ruleFilter')).toBeVisible();
 await expect(page.locator('#equipmentFilter')).toBeDisabled();
 await expect(page.locator('#ballSetFilter')).toBeDisabled();
 await expect(page.locator('#operatorFilter')).toBeDisabled();
 await expect(page.locator('#equipmentCoverage')).toContainText('0 of ');
 await page.locator('#ruleFilter').selectOption('pb14');
 await expect(page.locator('#drawCount')).toHaveText(String(recent));
 await expect(page.locator('#powerPeriod')).toHaveValue('current');
 await expect(page.locator('#powerRule')).toContainText('PB 1–14');
 await page.locator('#ruleFilter').selectOption('pb10');
 await expect(page.locator('#drawCount')).toHaveText(String(older));
 await expect(page.locator('#powerPeriod')).toHaveValue('previous');
 await expect(page.locator('#powerRule')).toContainText('PB 1–10');
 const published=await page.locator('#pickerLines').innerText();
 await page.locator('#ruleFilter').selectOption('all');
 await expect(page.locator('#drawCount')).toHaveText(String(entries.length));
 expect(await page.locator('#pickerLines').innerText()).toEqual(published);
 await page.locator('.context-history summary').click();
 await expect(page.locator('#contextTimeline')).toContainText('Powerball number pool expanded');
});


test('civil NZ draw dates stay correct after midnight UTC conversions',async({page})=>{
 await page.goto('/');
 // The stored result is Saturday 24 Oct, NOT Sunday 25 Oct in New Zealand.
 const latest=entries[0];
 const label=new Date(latest.date+'T12:00:00Z').toLocaleDateString('en-NZ',{timeZone:'UTC',weekday:'long',day:'numeric',month:'long',year:'numeric'});
 await expect(page.locator('#latestDate')).toHaveText(label);
 await expect(page.locator('#lastUpdated')).toContainText(label);
});
test('Evidence Lab responds to every rule-era filter and reports audit coverage',async({page})=>{
 await page.goto('/');
 await expect(page.locator('#evidenceDraws')).toHaveText(String(entries.length));
 await expect(page.locator('#evidenceExpected')).toHaveText((entries.length*6/40).toFixed(2));
 await expect(page.locator('#evidenceVerified')).toHaveText(verified+'/'+entries.length);
 await expect(page.locator('#evidenceDeviations .deviation-row')).toHaveCount(8);
 await expect(page.locator('#coverageRange')).toHaveText('#'+entries[entries.length-1].draw+'–#'+entries[0].draw);
 await expect(page.locator('#coverageInside')).toContainText(' / ');
 await expect(page.locator('#coverageEquipment')).toHaveText('0 / '+entries.length);
 await expect(page.locator('#coverageNote')).toContainText('1987–present');
 await page.locator('#ruleFilter').selectOption('pb14');
 const n14=entries.filter(x=>x.date>='2026-09-16').length;
 await expect(page.locator('#evidenceDraws')).toHaveText(String(n14));
 await expect(page.locator('#evidenceExpected')).toHaveText((n14*.15).toFixed(2));
 await page.locator('#ruleFilter').selectOption('pb10');
 const n10=entries.filter(x=>x.date<'2026-09-13').length;
 await expect(page.locator('#evidenceDraws')).toHaveText(String(n10));
 await page.locator('#ruleFilter').selectOption('all');
 await expect(page.locator('#evidenceDraws')).toHaveText(String(entries.length));
});
test('fixed 20-line portfolio is transparent, complete and stable',async({page})=>{
 await page.goto('/');
 const picks=require('../data/model-picks.json');
 const target=require('../data/model-performance.json').upcoming_date;
 const future=picks.filter(p=>p.target_date===target);
 const distinct=new Set(future.flatMap(p=>p.numbers)).size;
 await expect(page.locator('#portfolioStatus')).toHaveText('20 lines verified');
 await expect(page.locator('#portfolioUnique')).toHaveText('20 / 20');
 await expect(page.locator('#portfolioCoverage')).toHaveText(distinct+' / 40');
 await expect(page.locator('#portfolioNumberGrid')).toHaveCount(0);
 await expect(page.locator('#portfolioBars .portfolio-number')).toHaveCount(40);
 await expect(page.locator('#portfolioLocked')).toHaveText('20 / 20');
 const original=await page.locator('#portfolioCoverage').innerText();
 await page.locator('#windowFilter').selectOption('10');
 await expect(page.locator('#evidenceDraws')).toHaveText('10');
 await expect(page.locator('#portfolioCoverage')).toHaveText(original);
 await page.reload();
 await expect(page.locator('#portfolioCoverage')).toHaveText(original);
});


test('Evidence Lab remains usable at iPhone-width 390px without page overflow',async({page})=>{
 await page.setViewportSize({width:390,height:844});
 await page.goto('/#evidence');
 await expect(page.locator('#evidenceTitle')).toBeVisible();
 await expect(page.locator('#evidenceDraws')).toHaveText(String(entries.length));
 await expect(page.locator('#evidenceDeviations .deviation-row')).toHaveCount(8);
 await expect(page.locator('#portfolioBars .portfolio-number')).toHaveCount(40);
 await expect(page.locator('#portfolioUnique')).toHaveText('20 / 20');
 await page.locator('#menuToggle').click();
 await expect(page.locator('#mobileNav a[href="#evidence"]')).toBeVisible();
 const size=await page.evaluate(()=>({viewport:window.innerWidth,doc:document.documentElement.scrollWidth,body:document.body.scrollWidth}));
 expect(size.viewport).toBe(390);
 expect(Math.max(size.doc,size.body)).toBeLessThanOrEqual(391);
});

test('bonus and Powerball are real color-coded balls, not unplayable ticket choices',async({page})=>{
 await page.goto('/#picker');
 await expect(page.locator('#pickerCount')).toHaveText('20 of 20 lines locked');
 await page.locator('#pickerExpand').click();
 await expect(page.locator('#pickerLines .fixed-pick-line')).toHaveCount(20);
 await expect(page.locator('#pickerLines .ball.bonus')).toHaveCount(20);
 await expect(page.locator('#pickerLines .ball.power')).toHaveCount(20);
 await expect(page.locator('#pickerLines .pick-extra-label').first()).toContainText('RESEARCH ONLY');
 const picks=require('../data/model-picks.json');
 const first=picks.find(p=>p.model==='adaptive_frequency_v1'&&(p.line_number||1)===1);
 const line=page.locator('#pickerLines .fixed-pick-line').first();
 await expect(line.locator('.ball.bonus')).toHaveText(String(first.bonus_prediction).padStart(2,'0'));
 await expect(line.locator('.ball.power')).toHaveText(String(first.powerball).padStart(2,'0'));
 expect(first.numbers).not.toContain(first.bonus_prediction);
 expect(first.bonus_is_ticket_selection).toBe(false);
 expect(first.bonus_prediction_created_at).toBeTruthy();
 await expect(page.locator('.picker-disclaimer')).toContainText('cannot be selected');
 await expect(page.locator('#pickerShare')).toBeVisible();
 await expect(page.locator('#pickerGenerate')).toHaveCount(0);
});
test('premium quick search and navigation work on mobile and keyboard',async({page})=>{
 await page.setViewportSize({width:390,height:844});
 await page.goto('/');
 await page.locator('#openQuickNav').click();
 await expect(page.locator('#quickNav')).toBeVisible();
 await page.locator('#quickSearch').fill('evidence');
 await expect(page.locator('#quickCommands button[data-jump="evidence"]')).toBeVisible();
 await expect(page.locator('#quickCommands button[data-jump="archive"]')).toBeHidden();
 await page.locator('#quickCommands button[data-jump="evidence"]').click();
 await expect(page.locator('#quickNav')).not.toBeVisible();
 await expect(page).toHaveURL(/#evidence/);
 await page.keyboard.press('Control+k');
 await expect(page.locator('#quickNav')).toBeVisible();
 await page.keyboard.press('Escape');
 await expect(page.locator('#quickNav')).not.toBeVisible();
 const sizes=await page.evaluate(()=>({doc:document.documentElement.scrollWidth,viewport:innerWidth}));
 expect(sizes.doc).toBeLessThanOrEqual(sizes.viewport+1);
 await page.evaluate(()=>scrollTo(0,650));
 await expect(page.locator('#backToTop')).toHaveClass(/visible/);
 await page.locator('#backToTop').click();
 await expect.poll(()=>page.evaluate(()=>scrollY)).toBeLessThan(15);
});


test('Number Universe inspects actual frequency and follows rule-era filters',async({page})=>{
 await page.goto('/#universe');
 await expect(page.locator('#universeTitle')).toContainText('The Number Universe');
 await expect(page.locator('#universeNumberPicker option')).toHaveCount(41);
 await expect(page.locator('#universeCanvas')).toBeVisible();
 await expect.poll(()=>page.evaluate(()=>document.getElementById('universeCanvas').width)).toBeGreaterThan(0);
 await expect(page.locator('#universeDataStatus')).toContainText(entries.length+' draws');
 await page.locator('#universeNumberPicker').selectOption('17');
 const count17=entries.filter(d=>d.numbers.includes(17)).length;
 await expect(page.locator('#universeSelectedTitle')).toHaveText('Number 17');
 await expect(page.locator('#universeHits')).toHaveText(String(count17));
 await expect(page.locator('#universeSample')).toHaveText(String(entries.length));
 await expect(page.locator('#universeRate')).toHaveText((count17/entries.length*100).toFixed(1)+'%');
 await page.locator('#universeConnections').click();
 await expect(page.locator('#universeConnections')).toHaveAttribute('aria-pressed','true');
 await page.locator('#universeMotion').click();
 await expect(page.locator('#universeMotion')).toHaveAttribute('aria-pressed','false');
 await expect(page.locator('html')).toHaveClass(/motion-off/);
 await page.locator('#universeMotion').click();
 await expect(page.locator('#universeMotion')).toHaveAttribute('aria-pressed','true');
 await page.locator('#ruleFilter').selectOption('pb14');
 const narrowed=entries.filter(d=>d.date>='2026-09-16');
 await expect(page.locator('#universeSample')).toHaveText(String(narrowed.length));
 await expect(page.locator('#universeHits')).toHaveText(String(narrowed.filter(d=>d.numbers.includes(17)).length));
 await page.locator('#universeReset').click();
 await expect(page.locator('#universeSelectedTitle')).toHaveText('Your universe awaits');
 await expect(page.locator('#universeConnections')).toHaveAttribute('aria-pressed','false');
});
test('winning result ball taps open the matching historical number inspector',async({page})=>{
 await page.goto('/');
 const first=entries[0].numbers[0];
 const winning=page.locator('#mainBalls .result-number-button').first();
 await expect(winning).toHaveAttribute('data-inspect',String(first));
 await winning.click();
 await expect(page.locator('#universeSelectedTitle')).toHaveText('Number '+first);
 await expect(page.locator('#universeNumberPicker')).toHaveValue(String(first));
});
test('real mobile touch makes a transient ripple, no blocked scrolling, and never rerolls predictions',async({browser})=>{
 const context=await browser.newContext({baseURL:'http://127.0.0.1:4173',hasTouch:true,isMobile:true,deviceScaleFactor:2,viewport:{width:390,height:844}});
 try{
  const page=await context.newPage();
  await page.goto('/#universe');
  await expect(page.locator('#universeCanvas')).toBeVisible();
  await page.locator('#pickerExpand').click();
  await expect(page.locator('#pickerLines .fixed-pick-line')).toHaveCount(20);
  const original=await page.locator('#pickerLines').innerText();
  const before=await page.evaluate(()=>window.lottoLabTouchEffects());
  await page.locator('#universeCanvas').scrollIntoViewIfNeeded();
  const bounds=await page.locator('#universeCanvas').boundingBox();
  await page.touchscreen.tap(bounds.x+22,bounds.y+33);
  await expect.poll(()=>page.evaluate(()=>window.lottoLabTouchEffects())).toBeGreaterThan(before);
  await expect(page.locator('#universeSelectedTitle')).toContainText('Number ');
  await expect.poll(()=>page.evaluate(()=>Math.max(document.documentElement.scrollWidth,document.body.scrollWidth))).toBeLessThanOrEqual(391);
  await page.locator('#universeMotion').click();
  await expect(page.locator('#universeMotion')).toHaveAttribute('aria-pressed','false');
  const disabledCount=await page.evaluate(()=>window.lottoLabTouchEffects());
  const newBounds=await page.locator('#universeCanvas').boundingBox();
  await page.touchscreen.tap(newBounds.x+40,newBounds.y+35);
  expect(await page.evaluate(()=>window.lottoLabTouchEffects())).toBe(disabledCount);
  expect(await page.locator('#pickerLines').innerText()).toBe(original);
 }finally{await context.close()}
});
test('reduced-motion mode keeps the Number Universe readable without forced animation',async({page})=>{
 await page.emulateMedia({reducedMotion:'reduce'});
 await page.goto('/#universe');
 await expect(page.locator('#universeTitle')).toBeVisible();
 await expect(page.locator('#universeMotion')).toHaveAttribute('aria-pressed','false');
 await page.locator('#universeNumberPicker').selectOption('28');
 await expect(page.locator('#universeSelectedTitle')).toHaveText('Number 28');
 await expect(page.locator('#universeHits')).toHaveText(String(entries.filter(d=>d.numbers.includes(28)).length));
});


test('Powerball and Strike arrows are real accessible controls with useful destinations',async({page})=>{
 await page.goto('/');
 const power=page.locator('#powerballGuide'),strike=page.locator('#strikeGuide');
 await expect(power).not.toHaveAttribute('open');
 await expect(strike).not.toHaveAttribute('open');
 await page.locator('#powerballGuide summary').click();
 await expect(power).toHaveAttribute('open','');
 await expect(power).toContainText('expanded to 14');
 await expect(page.locator('#labDeepDive')).not.toHaveAttribute('open');
 await page.locator('#powerballGuide a[data-open-details="labDeepDive"]').click();
 await expect(page.locator('#labDeepDive')).toHaveAttribute('open','');
 await expect(page.locator('#powerChartPanel')).toBeVisible();
 await expect(page).toHaveURL(/#powerChartPanel$/);
 await page.locator('#strikeGuide summary').click();
 await expect(strike).toHaveAttribute('open','');
 await expect(strike).toContainText('first four balls in the order drawn');
 await expect(strike).toContainText('does not yet verify their order');
 const official=page.locator('#strikeGuide a[href*="how-to-play"]');
 await expect(official).toHaveAttribute('href','https://mylotto.co.nz/lotto/how-to-play');
 await expect(official).toHaveAttribute('target','_blank');
 await page.locator('#strikeGuide summary').click();
 await expect(strike).not.toHaveAttribute('open');
});
test('advanced research is optional and accessible, with visible primary filters',async({page})=>{
 await page.setViewportSize({width:390,height:844});
 await page.goto('/');
 await expect(page.locator('#ruleFilter')).toBeVisible();
 await expect(page.locator('#advancedFilters')).not.toHaveAttribute('open');
 await expect(page.locator('#evidenceDeep')).not.toHaveAttribute('open');
 await expect(page.locator('.model-compare')).not.toHaveAttribute('open');
 await page.locator('#advancedFilters summary').click();
 await expect(page.locator('#advancedFilters')).toHaveAttribute('open','');
 await expect(page.locator('#equipmentFilter')).toBeDisabled();
 await expect(page.locator('#ballSetFilter')).toBeDisabled();
 await expect(page.locator('#operatorFilter')).toBeDisabled();
 await page.locator('#evidenceDeep summary').click();
 await expect(page.locator('#evidenceDeep')).toHaveAttribute('open','');
 await expect(page.locator('#evidenceVerdict')).toContainText(/No individual number|depart from/);
 await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(391);
});
test('all in-page links resolve, and visible buttons have user-perceivable names',async({page})=>{
 await page.goto('/');
 const audit=await page.evaluate(()=>{
  const allIds=new Map(),duplicates=[];
  for(const el of document.querySelectorAll('[id]')){
   const key=el.id;allIds.set(key,(allIds.get(key)||0)+1);
  }
  for(const [key,count] of allIds)if(count>1)duplicates.push(key);
  const missing=[...document.querySelectorAll('a[href^="#"]')].filter(a=>a.getAttribute('href').length>1&&!document.getElementById(decodeURIComponent(a.hash.slice(1)))).map(a=>a.getAttribute('href'));
  const unnamed=[...document.querySelectorAll('button')].filter(b=>!b.textContent.trim()&&!b.getAttribute('aria-label')&&!b.getAttribute('title')).map(b=>b.outerHTML.slice(0,90));
  return {duplicates,missing,unnamed};
 });
 expect(audit).toEqual({duplicates:[],missing:[],unnamed:[]});
});
test('archive export downloads a valid CSV rather than a dead button',async({page})=>{
 await page.goto('/');
 await expect(page.locator('#archiveCount')).toContainText('matching records');
 const downloadPromise=page.waitForEvent('download');
 await page.locator('#exportCsv').click();
 const download=await downloadPromise;
 expect(download.suggestedFilename()).toBe('lottolab-nz-draws.csv');
});
test('Powerball and Strike guides work by keyboard in narrow viewport',async({page})=>{
 await page.setViewportSize({width:390,height:844});
 await page.goto('/');
 await page.locator('#powerballGuide summary').focus();
 await page.keyboard.press('Enter');
 await expect(page.locator('#powerballGuide')).toHaveAttribute('open','');
 await page.locator('#strikeGuide summary').focus();
 await page.keyboard.press('Space');
 await expect(page.locator('#strikeGuide')).toHaveAttribute('open','');
 await expect.poll(()=>page.evaluate(()=>Math.max(document.documentElement.scrollWidth,document.body.scrollWidth))).toBeLessThanOrEqual(391);
});
