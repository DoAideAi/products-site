const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const data = require('../build/product-portfolio.json');

async function main() {
  const base = process.argv[2];
  assert(base, 'Provide the release URL');
  const screenshots = process.env.PORTFOLIO_SCREENSHOTS || '/tmp/doaide-portfolio-review';
  fs.mkdirSync(screenshots, { recursive: true });
  const browser = await chromium.launch({ headless: true, channel: 'chrome' });
  try {
    const context = await browser.newContext({ reducedMotion: 'reduce', colorScheme: 'light' });
    // Read-only browser QA: do not send analytics or conversion events.
    await context.route(/analytics\.doaide\.com|google-analytics|googletagmanager|googleadservices|doubleclick/, route => route.abort());
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    for (const width of [1440, 1024, 768, 390, 360]) {
      await page.setViewportSize({ width, height: 900 });
      assert.equal((await page.goto(base, { waitUntil: 'networkidle' })).status(), 200);
      if (await page.getByRole('button', { name: 'Decline', exact: true }).isVisible()) {
        await page.getByRole('button', { name: 'Decline', exact: true }).click();
      }
      assert.match(await page.locator('h1').innerText(), /GST reconciliation/);
      if (width <= 960) await page.locator('#burger').click();
      const nav = width <= 960 ? '#mobile-nav' : '.nav';
      await page.locator(nav).getByRole('link', { name: 'Products', exact: true }).click();
      await page.waitForURL('**/products/');
      assert.equal(await page.locator('.catalog-card').count(), data.products.length);
      assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `Overflow at ${width}`);
      assert.equal(await page.locator('h1').count(), 1);
      assert.equal(await page.locator('link[rel="canonical"]').getAttribute('href'), 'https://doaide.com/products/');
      await page.getByLabel('Search products', { exact: true }).fill('KNOL');
      assert.equal(await page.locator('.catalog-card:visible').count(), 1);
      assert.match(await page.locator('.catalog-card:visible h3').innerText(), /Cortex/);
      await page.getByLabel('Category', { exact: true }).selectOption('tax');
      assert(await page.getByRole('heading', { name: 'No matching products' }).isVisible());
      await page.locator('#empty-reset').click();
      assert.equal(await page.locator('.catalog-card:visible').count(), data.products.length);
      await page.getByLabel('Category', { exact: true }).selectOption('ai');
      assert.equal(await page.locator('.catalog-card:visible').count(), data.products.filter(p => p.category === 'ai').length);
      await page.getByLabel('Search products', { exact: true }).fill('model');
      assert(await page.locator('.catalog-card:visible').count() >= 2);
      await page.locator('#catalog-filters').getByRole('button', { name: 'Clear filters' }).click();
      assert.equal(await page.locator('.catalog-card:visible').count(), data.products.length);
      if (width === 1440 || width === 390) {
        await page.evaluate(() => scrollTo({ top: 0, behavior: 'instant' }));
        await page.screenshot({ path: path.join(screenshots, `portfolio-${width}.png`) });
        await page.locator('#catalog').evaluate(el => el.scrollIntoView({ block: 'start', behavior: 'instant' }));
        await page.screenshot({ path: path.join(screenshots, `catalog-${width}.png`) });
      }
    }
    const ids = await page.locator('[id]').evaluateAll(nodes => nodes.map(n => n.id));
    assert.equal(new Set(ids).size, ids.length, 'Duplicate HTML IDs');
    for (const p of data.products) {
      const card = page.locator(`[id="${p.id}"]`);
      assert.equal(await card.getByRole('link', { name: `View ${p.name} source code`, exact: true }).getAttribute('href'), p.repository);
      assert.equal(await card.getByRole('link', { name: `Visit ${p.name} website`, exact: true }).count(), p.website ? 1 : 0);
    }
    await page.locator('#theme-toggle').click();
    await page.reload({ waitUntil: 'networkidle' });
    assert.equal(await page.locator('html').getAttribute('data-theme'), 'dark');
    await page.locator('#catalog').scrollIntoViewIfNeeded();
    await page.screenshot({ path: path.join(screenshots, 'catalog-dark.png') });
    assert.deepEqual(errors, [], 'JavaScript errors');
    const nojs = await browser.newPage({ javaScriptEnabled: false });
    await nojs.goto(`${base}/products/`);
    assert.equal(await nojs.locator('.catalog-card:visible').count(), data.products.length);
    assert(await nojs.locator('#catalog-filters').isHidden());
    const sitemap = await context.request.get(`${base}/sitemap.xml`);
    assert.match(await sitemap.text(), /https:\/\/doaide\.com\/products\//);
    console.log(`PASS: ${data.products.length} cards, home navigation at five widths, search/category/reset/empty state, source/website links, dark mode, no-JS catalog and sitemap.`);
  } finally { await browser.close(); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
