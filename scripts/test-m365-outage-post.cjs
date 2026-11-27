// node scripts/test-m365-outage-post.cjs BUILT_SITE PLAYWRIGHT_MODULE [SCREENSHOT_DIR]
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const [site, playwright, screenshots] = process.argv.slice(2);
if (!site || !playwright) throw new Error('Supply the built site and Playwright module paths.');
const { chromium } = require(path.resolve(playwright));
const article = 'http://blog.test/articles/2026-11/microsoft-365-outage-explained.html';

async function localAssets(page) {
  await page.route('**/*', route => {
    const url = new URL(route.request().url());
    if (url.origin !== 'http://blog.test') return route.fulfill({ status: 204, body: '' });
    const relative = url.pathname === '/' ? '/index.html' : decodeURIComponent(url.pathname);
    const file = path.resolve(site, '.' + relative);
    if (!file.startsWith(path.resolve(site) + path.sep) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
      return route.fulfill({ status: 404, body: '' });
    }
    const contentType = { '.html': 'text/html', '.css': 'text/css', '.js': 'application/javascript' }[path.extname(file)] || 'application/octet-stream';
    return route.fulfill({ contentType, body: fs.readFileSync(file) });
  });
}

async function noOverflow(page, label) {
  assert(!await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), label);
}

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || undefined });
  try {
    const staticPage = await browser.newPage({ javaScriptEnabled: false, reducedMotion: 'reduce' });
    await localAssets(staticPage);
    await staticPage.goto(article);
    assert.equal(await staticPage.locator('.m365-figure').count(), 3);
    assert.equal(await staticPage.locator('[data-m365-scene]:visible').count(), 6);
    assert.equal(await staticPage.locator('.m365-figure svg[role="img"][aria-labelledby]').count(), 6);
    assert.equal(await staticPage.locator('.m365-factor-grid > li').count(), 4);
    assert.equal(await staticPage.locator('.m365-repair-steps > li').count(), 5);
    assert.equal(await staticPage.locator('.m365-controls:visible,.m365-tabs:visible,[data-m365-replay]:visible').count(), 0);
    assert.equal(await staticPage.locator('figure > figcaption').count(), 3);
    const prose = (await staticPage.locator('.post-content').innerText()).replace(/’/g, "'");
    for (const fact of ['23 hours, 50 minutes', 'inactive for more than 30 days', 'not a defect affecting ordinary Windows', 'the report\'s targets, not claims', 'not at the instant of failover']) {
      assert(prose.includes(fact), 'Missing factual qualification: ' + fact);
    }
    const duplicates = await staticPage.locator('[id]').evaluateAll(elements => {
      const ids = elements.map(el => el.id);
      return ids.filter((id, index) => ids.indexOf(id) !== index);
    });
    assert.deepEqual(duplicates, []);
    for (const width of [320, 390, 600, 768, 1280, 1920]) {
      await staticPage.setViewportSize({ width, height: 1000 });
      await noOverflow(staticPage, 'No-script overflow at ' + width);
      assert.equal(await staticPage.locator('[data-m365-scene]:visible').count(), 6);
    }
    const canvas = staticPage.locator('.m365-canvas').first();
    await staticPage.setViewportSize({ width: 390, height: 1000 });
    assert(await canvas.evaluate(el => el.scrollWidth > el.clientWidth), 'Diagram should scroll internally on phones');
    await canvas.evaluate(el => { el.scrollLeft = el.scrollWidth; });
    assert(await canvas.evaluate(el => el.scrollLeft > 0));
    console.log('PASS: all diagrams readable without JavaScript, semantic captions and labels, source caveats, mobile internal scrolling.');

    const page = await browser.newPage({ viewport: { width: 1280, height: 1000 }, reducedMotion: 'reduce' });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await localAssets(page);
    await page.goto(article);
    await page.locator('.m365-player.is-enhanced').waitFor();
    assert.equal(await page.locator('[role="tab"]').count(), 6);
    assert.equal(await page.locator('[role="tabpanel"]:visible').count(), 1);
    assert(await page.locator('[data-m365-play]').isDisabled());
    for (let i = 0; i < 6; i++) {
      await page.locator(`[data-m365-tab="${i}"]`).click();
      assert.equal(await page.locator(`[data-m365-tab="${i}"]`).getAttribute('aria-selected'), 'true');
      assert(await page.locator(`#m365-scene-${i}`).isVisible());
      assert.equal(await page.locator('[role="tabpanel"]:visible').count(), 1);
      assert.equal(await page.locator('[data-m365-count]').textContent(), `0${i + 1} / 06`);
    }
    await page.locator('[data-m365-tab="5"]').focus();
    await page.keyboard.press('ArrowRight');
    assert.equal(await page.locator('[data-m365-tab="0"]').getAttribute('aria-selected'), 'true');
    await page.keyboard.press('End');
    assert.equal(await page.locator('[data-m365-tab="5"]').getAttribute('aria-selected'), 'true');
    await page.keyboard.press('Home');
    assert.equal(await page.locator('[data-m365-tab="0"]').getAttribute('aria-selected'), 'true');
    assert.equal(await page.locator('.m365-player').evaluate(el => el.getAnimations({ subtree: true }).length), 0);
    console.log('PASS: all stages, roving keyboard tabs, accessible panels, manual navigation with reduced motion.');

    for (const theme of ['dev', 'light']) {
      await page.evaluate(theme => { document.documentElement.dataset.theme = theme; }, theme);
      for (const width of [320, 390, 768, 1280, 1920]) {
        await page.setViewportSize({ width, height: 1000 });
        await noOverflow(page, theme + ' enhanced overflow at ' + width);
      }
    }
    await page.emulateMedia({ media: 'print' });
    assert.equal(await page.locator('[data-m365-scene]:visible').count(), 6);
    await page.emulateMedia({ media: 'screen', reducedMotion: 'no-preference' });
    await page.waitForFunction(() => !document.querySelector('[data-m365-play]').disabled);
    await page.locator('[data-m365-play]').click();
    assert.equal(await page.locator('[data-m365-play]').getAttribute('aria-pressed'), 'true');
    await page.waitForFunction(() => document.querySelector('[data-m365-tab="1"]').getAttribute('aria-selected') === 'true', null, { timeout: 9000 });
    await page.locator('[data-m365-play]').click();
    assert.equal(await page.locator('[data-m365-play]').getAttribute('aria-pressed'), 'false');
    assert(await page.locator('.m365-player').evaluate(el => el.classList.contains('is-paused')));
    await page.locator('[data-m365-replay]').click();
    assert.equal(await page.locator('[data-m365-count]').textContent(), '01 / 06');
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.waitForFunction(() => document.querySelector('[data-m365-play]').disabled);
    assert.equal(await page.locator('[data-m365-play]').getAttribute('aria-pressed'), 'false');
    assert.equal(await page.locator('.m365-player').evaluate(el => el.getAnimations({ subtree: true }).length), 0);
    console.log('PASS: dark/light themes, print fallback, timed playback, pause/replay, live reduced-motion changes.');

    if (screenshots) {
      fs.mkdirSync(screenshots, { recursive: true });
      for (const theme of ['dev', 'light']) {
        await page.evaluate(theme => { document.documentElement.dataset.theme = theme; }, theme);
        for (const width of [1280, 390]) {
          await page.setViewportSize({ width, height: 1000 });
          await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
          await page.screenshot({ path: path.join(screenshots, `article-${theme}-${width}.png`) });
          for (let i = 0; i < 6; i++) {
            await page.locator(`[data-m365-tab="${i}"]`).click();
            await page.locator('[data-m365-player]').screenshot({ path: path.join(screenshots, `stage-${i}-${theme}-${width}.png`) });
          }
          await page.locator('.m365-factors').screenshot({ path: path.join(screenshots, `factors-${theme}-${width}.png`) });
          await page.locator('.m365-recovery').screenshot({ path: path.join(screenshots, `recovery-${theme}-${width}.png`) });
        }
      }
    }
    await page.goto('http://blog.test/');
    assert.equal(await page.locator('.feed a[href="/articles/2026-11/microsoft-365-outage-explained"]').count(), 1);
    assert.equal(await page.locator('link[href*="m365-outage.css"],script[src*="m365-outage.js"]').count(), 0);
    await page.goto('http://blog.test/articles/2026-11/binance-incident.html');
    assert.equal(await page.locator('[data-attack-player]').count(), 1);
    assert.equal(await page.locator('link[href*="m365-outage.css"],script[src*="m365-outage.js"]').count(), 0);
    assert.deepEqual(errors, []);
    console.log('PASS: homepage discovery, article-only assets, existing Binance player unchanged, no JavaScript errors.');
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
