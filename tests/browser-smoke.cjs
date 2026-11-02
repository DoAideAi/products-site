const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');

async function main() {
  const base = process.argv[2];
  assert(base, 'Provide the hosted release URL');
  const browser = await chromium.launch({ headless: true, channel: 'chrome' });
  try {
    const page = await browser.newPage({ reducedMotion: 'reduce' });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    for (const width of [1440, 390]) {
      await page.setViewportSize({ width, height: 900 });
      const response = await page.goto(base, { waitUntil: 'networkidle' });
      assert.equal(response.status(), 200);
      assert.equal(await page.locator('#products .principle').count(), 3);
      assert.match(await page.locator('h1').innerText(), /GST reconciliation/);
      assert.equal(await page.locator('#free-tools .tool').count(), 3);
      assert(await page.getByRole('link', { name: 'Book a demo', exact: true }).count() > 0);
      assert.equal(await page.getByRole('link', { name: 'See pilot availability' }).getAttribute('href'), 'https://gst.doaide.com/pricing');
      assert.match(await page.locator('#pricing').innerText(), /60 days/);
      assert.match(await page.locator('#pricing').innerText(), /500 invoice uploads/);
      assert.match(await page.locator('.sample').innerText(), /Illustrative example/i);
      const question = page.locator('.faq details').first();
      await question.locator('summary').click();
      assert(await question.evaluate(el => el.open));
      assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'Horizontal overflow');
      await page.evaluate(() => scrollTo({ top: 0, behavior: 'instant' }));
      await page.screenshot({ path: `/tmp/doaide-${width}.png`, fullPage: true });
    }
    for (const route of ['guides/', 'company/', 'demo/']) {
      for (const width of [1440, 390, 360]) {
        await page.setViewportSize({ width, height: 900 });
        const response = await page.goto(`${base}/${route}`, { waitUntil: 'networkidle' });
        assert.equal(response.status(), 200);
        assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${route}: horizontal overflow at ${width}`);
      }
    }
    await page.getByRole('button', { name: 'Open menu' }).click();
    assert.equal(await page.getByRole('button', { name: 'Open menu' }).getAttribute('aria-expanded'), 'true');
    await page.locator('#mobile-nav').getByRole('link', { name: 'Guides' }).click();
    await page.waitForURL('**/guides/');
    await page.goto(`${base}/demo/`, { waitUntil: 'networkidle' });
    await page.getByRole('button', { name: 'Prepare demo request' }).click();
    assert(await page.locator('#request-result').isHidden(), 'Invalid request must not produce a draft');
    await page.getByLabel('Your name').fill('Test Accountant');
    await page.getByLabel('Firm or business').fill('Example & Co');
    await page.getByLabel('Reply email').fill('accountant@example.com');
    await page.getByLabel('Workflow or preferred time').fill('Compare invoices & review discrepancies.');
    await page.getByRole('button', { name: 'Prepare demo request' }).click();
    const request = new URL(await page.getByRole('link', { name: 'Open email app' }).getAttribute('href'));
    assert.equal(request.protocol, 'mailto:');
    assert.equal(request.pathname, 'support@doaide.com');
    assert.match(request.searchParams.get('body'), /Example & Co/);
    assert.match(await page.locator('#request-status').innerText(), /not booked yet/);
    await page.getByLabel('Firm or business').fill('Changed firm');
    assert(await page.locator('#request-result').isHidden(), 'Changing a field must invalidate the old draft');
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.evaluate(() => scrollTo({ top: 0, behavior: 'instant' }));
    await page.screenshot({ path: '/tmp/doaide-demo.png', fullPage: true });
    await page.goto(base, { waitUntil: 'networkidle' });
    await page.getByRole('button', { name: 'Toggle dark mode' }).click();
    const selectedTheme = await page.locator('html').getAttribute('data-theme');
    await page.reload({ waitUntil: 'networkidle' });
    assert.equal(await page.locator('html').getAttribute('data-theme'), selectedTheme);
    await page.screenshot({ path: '/tmp/doaide-theme.png', fullPage: true });
    fs.writeFileSync('/tmp/doaide-rendered-links.json', JSON.stringify(await page.locator('a[href]').evaluateAll(links => [...new Set(links.map(a => a.href))]), null, 2));
    assert.deepEqual(errors, [], 'Browser JavaScript errors');
    await page.goto(`${base}/gst-calculator.html`, { waitUntil: 'networkidle' });
    await page.locator('#amount').fill('1000');
    await page.getByRole('button', { name: '18%', exact: true }).click();
    await page.getByRole('button', { name: 'Calculate GST', exact: true }).click();
    assert.match(await page.locator('#results-grid').innerText(), /1,180/);
    await page.goto(`${base}/emi-calculator.html`, { waitUntil: 'networkidle' });
    await page.getByRole('button', { name: 'Calculate EMI', exact: true }).click();
    assert.match(await page.locator('#emiVal').innerText(), /8,678/);
    await page.locator('#amount').fill('12000');
    await page.locator('#rate').fill('0');
    await page.locator('#tenure').fill('12');
    await page.locator('#tenureType').selectOption('months');
    await page.getByRole('button', { name: 'Calculate EMI', exact: true }).click();
    assert.match(await page.locator('#emiVal').innerText(), /1,000/);
    assert.equal(await page.locator('#intVal').innerText(), '\u20b90');
    assert.equal(await page.locator('#amortBody tr').count(), 12);
    for (const invalid of ['1.5', '361', '0']) {
      await page.locator('#tenure').fill(invalid);
      await page.getByRole('button', { name: 'Calculate EMI', exact: true }).click();
      assert(await page.locator('#loan-error').isVisible());
      assert(!(await page.locator('#resultsCard').isVisible()));
    }
    await page.goto(`${base}/json-formatter.html`, { waitUntil: 'networkidle' });
    await page.locator('#jsonInput').fill('{"test":true}');
    await page.getByRole('button', { name: 'Format', exact: false }).click();
    assert.match(await page.locator('#statusBar').innerText(), /success|valid|formatted/i);
    await page.goto(`${base}/qr-code-generator.html`, { waitUntil: 'networkidle' });
    await page.locator('#btn-generate').click();
    await page.locator('#qr-output.visible').waitFor();
    assert(await page.locator('#qr-image').evaluate(img => img.complete && img.naturalWidth > 0));
    assert.deepEqual(errors, [], 'Tool JavaScript errors');
    console.log('PASS: responsive GST pages, demo draft and validation, menu/theme, FAQ and four retained tool workflows; no JavaScript errors');
  } finally {
    await browser.close();
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
