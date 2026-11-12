// node scripts/test-design-lab.cjs BASE_URL PLAYWRIGHT_MODULE [SCREENSHOT_DIR]
// Set CHROME_PATH to use an installed Chrome instead of Playwright's Chromium.
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');
const [base, modulePath, screenshots] = process.argv.slice(2);
if (!base || !modulePath) throw new Error('Supply a preview base URL and a Playwright module path.');
const { chromium } = require(path.resolve(modulePath));

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || undefined });
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1100 }, reducedMotion: 'reduce' });
    const errors = [];
    page.on('pageerror', error => errors.push(String(error)));
    page.on('response', response => {
      if (response.url().startsWith(base) && response.status() >= 400) errors.push(response.status() + ' ' + response.url());
    });
    await page.goto(base + '/design-lab/?concept=fieldnotes&view=home&theme=light', { waitUntil: 'networkidle' });
    await page.evaluate(() => document.fonts.ready);
    assert.equal(await page.locator('meta[name="robots"]').getAttribute('content'), 'noindex, nofollow');
    assert.deepEqual(await page.locator('[id]').evaluateAll(elements => {
      const ids = elements.map(el => el.id);
      return ids.filter((id, i) => ids.indexOf(id) !== i);
    }), []);

    for (const concept of ['fieldnotes', 'workbench', 'signal']) {
      await page.locator('[data-choice="' + concept + '"]').click();
      assert.equal(await page.locator('html').getAttribute('data-concept'), concept);
      assert.equal(await page.locator('[data-choice][aria-pressed="true"]').count(), 1);
      for (const theme of ['light', 'dark']) {
        if (await page.locator('html').getAttribute('data-theme') !== theme) await page.locator('.theme-toggle').click();
        assert.equal(await page.locator('html').getAttribute('data-theme'), theme);
        for (const width of [320, 390, 600, 768, 1024, 1440, 1920, 2560]) {
          await page.setViewportSize({ width, height: 1100 });
          for (const view of ['home', 'article']) {
            await page.locator('[data-view-choice="' + view + '"]').click();
            assert.equal(await page.locator('[data-page]:visible').count(), 1);
            const overflow = await page.evaluate(() => ({ page: document.documentElement.scrollWidth, viewport: innerWidth }));
            assert.ok(overflow.page <= overflow.viewport, JSON.stringify({ concept, theme, width, view, overflow }));
            assert.equal(await page.locator('[data-view-choice][aria-pressed="true"]').count(), 1);
            if (view === 'article' && width > 760) {
              const copy = await page.locator('.article-copy').first().boundingBox();
              const diagram = await page.locator('.article-breakout').boundingBox();
              assert.ok(copy.width <= 701, 'Reading column is too wide');
              assert.ok(diagram.width >= copy.width - 1, 'Diagram should not be narrower than the prose');
              if (width >= 1440) assert.ok(diagram.width > copy.width, 'Desktop diagram should have more room than the prose');
            }
            if (screenshots && (width === 1440 || width === 390)) {
              fs.mkdirSync(screenshots, { recursive: true });
              await page.locator('#preview').scrollIntoViewIfNeeded();
              await page.screenshot({ path: path.join(screenshots, `${concept}-${theme}-${view}-${width}.png`) });
            }
          }
        }
        console.log('PASS layout', concept, theme, '8 widths, 2 page previews');
      }
    }

    await page.setViewportSize({ width: 1440, height: 1100 });
    await page.locator('[data-view-choice="home"]').click();
    await page.locator('[data-filter="security"]').click();
    assert.equal(await page.locator('[data-story]:visible').count(), 2);
    await page.locator('[data-search]').fill('php');
    assert.equal(await page.locator('[data-story]:visible').count(), 1);
    await page.locator('[data-search]').fill('not-a-story');
    assert.equal(await page.locator('[data-story]:visible').count(), 0);
    assert.ok(await page.locator('.empty-state').isVisible());
    await page.locator('[data-filter="all"]').click();
    await page.locator('[data-search]').fill('');
    assert.equal(await page.locator('[data-story]:visible').count(), 4);
    await page.locator('[data-about]').click();
    assert.ok(await page.locator('dialog').isVisible());
    await page.keyboard.press('Escape');
    assert.equal(await page.locator('dialog').isVisible(), false);
    await page.locator('[data-article-open]').first().click();
    assert.ok(await page.locator('[data-page="article"]').isVisible());
    assert.equal(await page.locator('.chain-play').isVisible(), false, 'Reduced motion should disable autoplay');
    await page.locator('[data-step="3"]').click();
    assert.match(await page.locator('.chain-summary').textContent(), /04 \/.*compromised workstation/);
    await page.locator('#the-lesson').scrollIntoViewIfNeeded();
    await page.waitForFunction(() => parseFloat(document.querySelector('.reading-progress span').style.width) > 0);
    assert.equal(await page.locator('.article-toc [aria-current="location"]').count(), 1);
    const tocBox = await page.locator('.article-toc').boundingBox();
    assert.ok(tocBox.y >= 0 && tocBox.y < 100, 'Desktop contents rail should remain visible while reading');
    await page.setViewportSize({ width: 390, height: 1100 });
    await page.waitForFunction(() => !document.querySelector('.toc-disclosure').open);
    await page.locator('.toc-disclosure summary').click();
    assert.ok(await page.locator('.toc-disclosure').evaluate(el => el.open));
    await page.locator('.article-toc a[href="#attack-path"]').click();
    assert.equal(await page.locator('.toc-disclosure').evaluate(el => el.open), false);
    await page.setViewportSize({ width: 1440, height: 1100 });
    await page.waitForFunction(() => document.querySelector('.toc-disclosure').open);

    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.waitForFunction(() => !document.querySelector('.chain-play').hidden);
    assert.ok(await page.locator('.chain-play').isVisible());
    await page.locator('[data-step="0"]').click();
    await page.locator('.chain-play').click();
    await page.waitForFunction(() => document.querySelector('[data-step="1"]').getAttribute('aria-pressed') === 'true');
    await page.locator('.chain-play').click();
    const step = await page.locator('[data-step][aria-pressed="true"]').getAttribute('data-step');
    await page.waitForTimeout(2600);
    assert.equal(await page.locator('[data-step][aria-pressed="true"]').getAttribute('data-step'), step);
    await page.locator('.theme-toggle').click();
    const preference = await page.locator('html').getAttribute('data-theme');
    const shareURL = page.url();
    await page.reload({ waitUntil: 'networkidle' });
    assert.equal(await page.locator('html').getAttribute('data-theme'), preference);
    assert.equal(await page.locator('html').getAttribute('data-concept'), 'signal');
    assert.ok(await page.locator('[data-page="article"]').isVisible());
    assert.equal(page.url(), shareURL);

    const localLinks = await page.locator('a[href^="/"]').evaluateAll(links => [...new Set(links.map(link => link.getAttribute('href')))]);
    for (const href of localLinks) assert.equal((await page.request.get(base + href)).status(), 200, 'Broken existing-site link ' + href);
    assert.deepEqual(errors, []);
    console.log('PASS filters, search, dialog, article navigation, chain controls, theme persistence, share links, local links, reduced motion, browser errors');

    const fallback = await browser.newPage({ javaScriptEnabled: false, viewport: { width: 390, height: 900 } });
    await fallback.goto(base + '/design-lab/');
    assert.equal(await fallback.locator('[data-story]:visible').count(), 4);
    assert.ok(await fallback.locator('.no-script').isVisible());
    assert.equal(await fallback.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    console.log('PASS readable no-JavaScript homepage');
    await fallback.close();
    await page.close();
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
