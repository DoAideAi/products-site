const { chromium } = require('playwright');
const assert = require('node:assert/strict');

(async () => {
  const base = process.argv[2];
  assert(base, 'Provide the release URL');
  const browser = await chromium.launch({ headless: true, channel: 'chrome' });
  try {
    const context = await browser.newContext({ reducedMotion: 'reduce', colorScheme: 'light' });
    // No analytics or advertising requests during QA.
    await context.route(/analytics\.doaide\.com|googletagmanager\.com|googleadservices\.com/, route => route.abort());
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    for (const width of [1440, 900, 390, 360]) {
      await page.setViewportSize({ width, height: 1000 });
      assert.equal((await page.goto(`${base}/blog.html`, { waitUntil: 'networkidle' })).status(), 200);
      if (await page.getByRole('button', { name: 'Decline', exact: true }).isVisible()) await page.getByRole('button', { name: 'Decline', exact: true }).click();
      assert(await page.getByRole('searchbox', { name: 'Search articles' }).isVisible());
      assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `Blog overflow at ${width}`);
      if (width === 1440 || width === 390) await page.screenshot({ path: `/tmp/doaide-gst-blog-${width}.png`, fullPage: true });
    }
    await page.getByRole('button', { name: 'Reconciliation', exact: true }).click();
    assert.equal(await page.locator('#blog-count').innerText(), '2 articles');
    await page.getByRole('searchbox').fill('GSTR2B');
    assert.equal(await page.locator('#blog-count').innerText(), '1 article');
    assert.match(await page.locator('[data-blog-article]:visible h3').innerText(), /mismatches/);
    await page.getByRole('searchbox').fill('not-a-real-topic');
    assert(await page.getByRole('heading', { name: 'No articles found.' }).isVisible());
    await page.getByRole('button', { name: 'Clear search and filters' }).click();
    assert.equal(await page.getByRole('searchbox').inputValue(), '');
    assert.equal(await page.locator('#blog-count').innerText(), '7 articles');
    assert(await page.getByRole('searchbox').evaluate(el => el === document.activeElement));
    const returns = page.getByRole('button', { name: 'Returns', exact: true });
    await returns.focus();
    await page.keyboard.press('Enter');
    assert.equal(await returns.getAttribute('aria-pressed'), 'true');
    assert.equal(await page.locator('[data-blog-article]:visible').count(), 2);
    await page.getByRole('button', { name: 'All topics', exact: true }).click();
    const links = await page.locator('[data-blog-article] h3 a').evaluateAll(nodes => nodes.map(node => node.href));
    for (const link of links) assert.equal((await context.request.get(link)).status(), 200, link);
    await page.getByRole('link', { name: 'Read the checklist', exact: false }).first().click();
    assert.match(page.url(), /gstr-2b-mismatch-review-checklist/);
    assert.equal(await page.locator('h1').count(), 1);
    for (const width of [1440, 390, 360]) {
      await page.setViewportSize({ width, height: 1000 });
      assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `Article overflow at ${width}`);
    }
    await page.getByRole('navigation', { name: 'Article contents' }).getByRole('link', { name: 'Prepare the handoff' }).click();
    assert(page.url().endsWith('#handoff'));
    await page.getByRole('link', { name: 'Back to the GST blog', exact: false }).click();
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.getByRole('button', { name: 'Toggle dark mode' }).click();
    assert.equal(await page.locator('html').getAttribute('data-theme'), 'dark');
    await page.reload({ waitUntil: 'networkidle' });
    assert.equal(await page.locator('html').getAttribute('data-theme'), 'dark');
    await page.screenshot({ path: '/tmp/doaide-gst-blog-dark.png', fullPage: true });
    await page.goto(base, { waitUntil: 'networkidle' });
    assert(await page.locator('#gst-blog').isVisible());
    await page.setViewportSize({ width: 390, height: 900 });
    await page.getByRole('button', { name: 'Open menu' }).click();
    await page.locator('#mobile-nav').getByRole('link', { name: 'Blog', exact: true }).click();
    assert.match(page.url(), /\/blog(?:\.html)?$/);
    const noJS = await browser.newContext({ javaScriptEnabled: false });
    const fallback = await noJS.newPage();
    await fallback.goto(`${base}/blog.html`);
    assert.equal(await fallback.locator('[data-blog-article]:visible').count(), 7);
    assert(await fallback.getByRole('link', { name: 'Read the checklist', exact: false }).first().isVisible());
    assert(!(await fallback.getByRole('searchbox').isVisible()));
    assert.deepEqual(errors, []);
    console.log('PASS: blog filtering, search, empty/reset state, keyboard, article links, mobile navigation, themes and no-JavaScript content.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exit(1); });
