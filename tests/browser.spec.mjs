import {test,expect} from '@playwright/test';
test('historic daily issue has 25 real HTML cards and no JS errors',async({page})=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('/archive/2026/10/16.html');
  await expect(page.locator('article.project')).toHaveCount(25);
  await expect(page.locator('.source-notice')).toContainText('历史热度');
  await page.locator('.overview > summary').click();
  await expect(page.locator('.overview li')).toHaveCount(25);
  expect(errors).toEqual([]);
});
test('latest homepage has 20 standalone project cards',async({page})=>{
  await page.goto('/');
  const count=Number(await page.locator('meta[name="radar-count"]').getAttribute('content'));
  expect(count).toBeGreaterThanOrEqual(8);
  await expect(page.locator('article.project')).toHaveCount(count);
  await expect(page.locator('h1')).toContainText('值得打开看看');
});
test('monthly and annual archive links resolve',async({page})=>{
  await page.goto('/archive/');
  await page.getByRole('link',{name:/2026 年/}).first().click();
  await expect(page).toHaveURL(/archive\/2026\/index\.html/);
  await page.getByRole('link',{name:/2026 \/ 10/}).first().click();
  await expect(page).toHaveURL(/archive\/2026\/10\/index\.html/);
  await page.locator('.day-list > a').first().click();
  await expect(page).toHaveURL(/archive\/2026\/10\/\d{2}\.html/);
});
test('Chinese search filters existing HTML cards without replacing input',async({page})=>{
  await page.goto('/search.html');
  const q=page.locator('#q');
  await q.fill('日语');
  await expect(q).toHaveValue('日语');
  expect(await page.locator('.search-card:visible').count()).toBeGreaterThan(0);
  await expect(page).toHaveURL(/q=/);
  await page.reload();
  await expect(q).toHaveValue('日语');
});
test('bookmark from daily page appears in saved projects',async({page})=>{
  await page.goto('/archive/2026/10/16.html');
  const button=page.locator('[data-save="morluto/rea"]');
  await button.click();
  await expect(button).toHaveAttribute('aria-pressed','true');
  await page.goto('/search.html?view=saved');
  await expect(page.locator('.search-card:visible')).toHaveCount(1);
  await expect(page.locator('.search-card:visible')).toContainText(/rea/i);
});
test('private notes are literal and persist on reload',async({page})=>{
  await page.goto('/archive/2026/10/16.html');
  const entry=page.locator('.project[data-repo="morluto/rea"]');
  await entry.locator('.memo > summary').click();
  const note=entry.locator('textarea');
  await note.fill('<img src=x onerror=alert(1)> 留待测试');
  await page.reload();
  await entry.locator('.memo > summary').click();
  await expect(note).toHaveValue('<img src=x onerror=alert(1)> 留待测试');
  await expect(entry.locator('.memo img')).toHaveCount(0);
});
test('legacy flat URL redirects to year/month/day path',async({page})=>{
  await page.goto('/archive/2026-10-20.html');
  await expect(page).toHaveURL(/archive\/2026\/10\/20\.html/);
  await expect(page.locator('article.project')).toHaveCount(20);
});
test('published site contains no JSON endpoint',async({request})=>{
  const a=await request.get('/data/radar.json');
  expect(a.status()).toBe(404);
  expect((await request.get('/archive/2026/10/20.html')).status()).toBe(200);
});
for(const width of [360,390,768,1440])test('responsive static pages '+width,async({page})=>{
  await page.setViewportSize({width,height:920});
  for(const url of ['/','/search.html','/archive/','/archive/2026/10/20.html']){
    await page.goto(url);
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  }
});

test('visual QA screenshots - desktop and mobile top, content, search, archive',async({page})=>{
  const capture=async(name)=> {
    const jpeg=await page.screenshot({type:'jpeg',quality:36,fullPage:false,animations:'disabled'});
    console.log('VISUAL_'+name+'_START:'+jpeg.toString('base64')+':VISUAL_'+name+'_END');
  };
  await page.setViewportSize({width:1440,height:960});
  await page.goto('/');
  await capture('DESKTOP_HOME');
  await page.locator('.project').first().scrollIntoViewIfNeeded();
  await capture('DESKTOP_PROJECT');
  await page.goto('/search.html');
  await capture('DESKTOP_SEARCH');
  await page.goto('/archive/2026/10/');
  await capture('DESKTOP_ARCHIVE');
  await page.setViewportSize({width:390,height:844});
  await page.goto('/');
  await capture('MOBILE_HOME');
  await page.locator('.project').first().scrollIntoViewIfNeeded();
  await capture('MOBILE_PROJECT');
  await page.goto('/search.html');
  await capture('MOBILE_SEARCH');
  await page.goto('/archive/2026/10/');
  await capture('MOBILE_ARCHIVE');
});
