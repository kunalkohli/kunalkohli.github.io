// node scripts/test-design-shortlist.cjs BASE_URL PLAYWRIGHT_MODULE [SCREENSHOT_DIR]
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');
const [base, modulePath, screenshots] = process.argv.slice(2);
if (!base || !modulePath) throw new Error('Supply a base URL and Playwright module path.');
const { chromium } = require(path.resolve(modulePath));

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || undefined });
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1100 }, reducedMotion: 'reduce' });
    const errors = [];
    page.on('pageerror', error => errors.push(String(error)));
    page.on('response', response => { if (response.url().startsWith(base) && response.status() >= 400) errors.push(response.url()); });
    await page.goto(base + '/design-lab/?compare=signal&palette=workbench&theme=light', { waitUntil: 'networkidle' });
    await page.evaluate(() => document.fonts.ready);
    await page.waitForFunction(() => [...document.images].every(image => image.complete && image.naturalWidth > 0));
    assert.equal(await page.locator('.concept-options').isVisible(), false);
    assert.equal(await page.locator('.palette-options').isVisible(), true);
    const layouts = {};
    for (const palette of ['workbench', 'citrus', 'paper']) {
      await page.locator('[data-palette-choice="' + palette + '"]').click();
      assert.equal(await page.locator('html').getAttribute('data-concept'), palette === 'paper' ? 'gazette' : 'signal');
      assert.equal(await page.locator('html').getAttribute('data-palette'), palette);
      assert.equal(await page.locator('[data-palette-choice][aria-pressed="true"]').count(), 1);
      for (const theme of ['light', 'dark']) {
        if (await page.locator('html').getAttribute('data-theme') !== theme) await page.locator('.theme-toggle').click();
        for (const width of [320, 390, 600, 768, 1024, 1440, 1920, 2560]) {
          await page.setViewportSize({ width, height: 1100 });
          for (const view of ['home', 'article']) {
            await page.locator('[data-view-choice="' + view + '"]').click();
            assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, `Overflow ${palette}/${theme}/${width}/${view}`);
            if (palette !== 'paper') {
              const geometry = await page.evaluate(view => {
                const selectors = view === 'home' ? ['.hero', '.hero-copy', '.hero-visual', '.feed-grid', '.story-featured'] : ['.article-header', '.article-copy', '.article-toc', '.article-breakout'];
                return selectors.map(selector => {
                  const element = document.querySelector(selector);
                  const b = element.getBoundingClientRect();
                  return [selector, b.width, b.height, getComputedStyle(element).fontFamily];
                });
              }, view);
              const key = [theme, width, view].join('/');
              if (palette === 'workbench') layouts[key] = geometry;
              else assert.deepEqual(geometry, layouts[key], 'A/B layouts must be identical: ' + key);
            }
            if (view === 'article' && width === 1440) {
              await page.locator('#the-lesson').scrollIntoViewIfNeeded();
              const toc = await page.locator('.article-toc').boundingBox();
              assert.ok(toc.y >= 0 && toc.y < 100, 'Contents sidebar disappeared');
            }
            if (screenshots && (width === 1440 || width === 390)) {
              await page.waitForFunction(() => [...document.images].every(image => image.complete && image.naturalWidth > 0));
              fs.mkdirSync(screenshots, { recursive: true });
              await page.evaluate(() => scrollTo(0, document.getElementById('preview').getBoundingClientRect().top + scrollY));
              await page.screenshot({ path: path.join(screenshots, `shortlist-${palette}-${theme}-${view}-${width}.png`) });
            }
          }
        }
        console.log('PASS shortlist', palette, theme, '8 widths × homepage/article');
      }
    }
    await page.setViewportSize({ width: 390, height: 1000 });
    await page.locator('[data-view-choice="article"]').click();
    await page.waitForFunction(() => !document.querySelector('.toc-disclosure').open);
    await page.locator('.toc-disclosure summary').click();
    await page.locator('.article-toc a[href="#the-lesson"]').click();
    assert.equal(await page.locator('.toc-disclosure').evaluate(el => el.open), false);
    const shared = page.url();
    await page.reload({ waitUntil: 'networkidle' });
    assert.equal(page.url(), shared);
    assert.equal(await page.locator('html').getAttribute('data-palette'), 'paper');
    assert.ok(await page.locator('[data-page="article"]').isVisible());
    assert.deepEqual(errors, []);
    console.log('PASS A/B identical layout, all sticky TOCs, mobile menu, shareable URLs, no page errors');
    await page.close();
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
