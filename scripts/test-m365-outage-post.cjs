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
    assert.equal(await staticPage.locator('.m365-static-route:visible').count(), 6);
    assert.equal(await staticPage.locator('.m365-factor-grid > li').count(), 4);
    assert.equal(await staticPage.locator('.m365-repair-steps > li').count(), 5);
    assert.equal(await staticPage.locator('.m365-controls:visible,.m365-tabs:visible,[data-m365-replay]:visible,[data-m365-board]:visible').count(), 0);
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
    const source = fs.readFileSync('_posts/2026-11-26-microsoft-365-outage-explained.md', 'utf8').split('---').slice(2).join('---');
    const words = source.match(/\b[\w]+(?:[’-][\w]+)*\b/g).length;
    assert(words < 950, 'Keep article prose around 60% of the original 1,528 words.');
    console.log('PASS: shorter prose, all six user journeys readable without JavaScript, source caveats, no overflow at six widths.');

    const page = await browser.newPage({ viewport: { width: 1280, height: 1000 }, reducedMotion: 'no-preference' });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await localAssets(page);
    // Browser clock exercises the real requestAnimationFrame-driven player,
    // including every stage, without waiting 48 wall-clock seconds per run.
    await page.clock.install({ time: new Date('2026-11-27T12:00:00Z') });
    await page.clock.pauseAt(new Date('2026-11-27T12:00:01Z'));
    await page.goto(article);
    await page.locator('.m365-player.is-enhanced').waitFor();
    assert(await page.locator('[data-m365-board][role="img"][aria-label]').isVisible());
    assert.equal(await page.locator('[role="tab"]').count(), 6);
    assert.equal(await page.locator('[role="tabpanel"]:visible').count(), 1);
    assert.equal(await page.locator('.m365-player').getAttribute('data-inbox'), 'ready');
    assert.equal(await page.locator('[data-m365-play]').isDisabled(), false);

    await page.locator('[data-m365-play]').click();
    assert.equal(await page.locator('[data-m365-play]').getAttribute('aria-pressed'), 'true');
    assert.equal(await page.locator('.m365-player').getAttribute('data-inbox'), 'waiting');
    assert.match(await page.locator('[data-m365-beat-text]').textContent(), /You open Outlook/);
    await page.clock.runFor(900);
    const packet = page.locator('[data-m365-packet="request"]');
    assert.equal(await packet.evaluate(el => getComputedStyle(el).opacity), '1');
    const firstPosition = await packet.evaluate(el => Number(el.style.getPropertyValue('--travel')));
    assert(firstPosition > 0 && firstPosition < 1, 'Request visibly moves before the first stage change.');
    await page.clock.runFor(300);
    assert(await packet.evaluate((el, before) => Number(el.style.getPropertyValue('--travel')) > before, firstPosition));
    assert(parseFloat(await page.locator('[data-m365-progress]').evaluate(el => el.style.width)) > 10);

    await page.locator('[data-m365-play]').click();
    const frozenPosition = await packet.evaluate(el => el.style.getPropertyValue('--travel'));
    const frozenProgress = await page.locator('[data-m365-progress]').evaluate(el => el.style.width);
    await page.clock.runFor(2000);
    assert.equal(await packet.evaluate(el => el.style.getPropertyValue('--travel')), frozenPosition);
    assert.equal(await page.locator('[data-m365-progress]').evaluate(el => el.style.width), frozenProgress);
    assert.equal(await page.locator('[data-m365-play]').textContent(), '▶ Resume');
    await page.locator('[data-m365-play]').click();
    await page.clock.runFor(6500);
    assert.equal(await page.locator('.m365-player').getAttribute('data-inbox'), 'ready');
    await page.clock.runFor(500);
    assert.equal(await page.locator('[data-m365-count]').textContent(), '02 / 06');
    console.log('PASS: Play all starts immediately, request packets move, progress advances, pause freezes everything, resume continues.');

    await page.locator('[data-m365-replay]').click();
    assert.equal(await page.locator('[data-m365-count]').textContent(), '01 / 06');
    for (let i = 0; i < 6; i++) {
      assert.equal(await page.locator(`[data-m365-tab="${i}"]`).getAttribute('aria-selected'), 'true');
      await page.clock.runFor(7600);
      const expectedInbox = [0, 1, 5].includes(i) ? 'ready' : 'waiting';
      assert.equal(await page.locator('.m365-player').getAttribute('data-inbox'), expectedInbox);
      assert.equal(await page.locator('[role="tabpanel"]:visible').count(), 1);
      if ([2, 3, 4].includes(i)) {
        assert(await page.locator('.m365-blocked-route').isVisible());
        assert.equal(await page.locator('[data-m365-packet="mail"]').evaluate(el => getComputedStyle(el).opacity), '0');
      }
      await page.clock.runFor(450);
    }
    assert.equal(await page.locator('[data-m365-play]').getAttribute('aria-pressed'), 'false');
    assert.match(await page.locator('[data-m365-playback-status]').textContent(), /Story complete/);
    assert.match(await page.locator('[data-m365-screen-status]').textContent(), /Inbox loaded/);
    console.log('PASS: all six stages play through to completion; failed requests do not return mail; final repaired route restores the inbox.');

    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.locator('[data-m365-play]').click();
    assert.equal(await page.locator('[data-m365-play]').isDisabled(), false);
    await page.clock.runFor(900);
    assert.equal(await packet.evaluate(el => getComputedStyle(el).display), 'none');
    assert.equal(await page.locator('[data-m365-motion-note]').isVisible(), true);
    await page.clock.runFor(7300);
    assert.equal(await page.locator('[data-m365-count]').textContent(), '02 / 06');
    await page.locator('[data-m365-play]').click();
    await page.locator('[data-m365-next]').click();
    assert.equal(await page.locator('[data-m365-count]').textContent(), '03 / 06');
    await page.locator('[data-m365-prev]').click();
    assert.equal(await page.locator('[data-m365-count]').textContent(), '02 / 06');
    await page.locator('[data-m365-tab="5"]').focus();
    await page.keyboard.press('ArrowRight');
    assert.equal(await page.locator('[data-m365-tab="0"]').getAttribute('aria-selected'), 'true');
    await page.keyboard.press('End');
    assert.equal(await page.locator('[data-m365-tab="5"]').getAttribute('aria-selected'), 'true');
    await page.keyboard.press('Home');
    assert.equal(await page.locator('[data-m365-tab="0"]').getAttribute('aria-selected'), 'true');
    await page.locator('[data-m365-play]').click();
    console.log('PASS: reduced-motion playback is usable without graphics; previous/next and roving keyboard tabs work.');

    for (const theme of ['dev', 'light']) {
      await page.evaluate(theme => { document.documentElement.dataset.theme = theme; }, theme);
      for (const width of [320, 390, 600, 768, 1280, 1920]) {
        await page.setViewportSize({ width, height: 1000 });
        for (let i = 0; i < 6; i++) {
          await page.locator(`[data-m365-tab="${i}"]`).click();
          await page.clock.fastForward(8050);
          await noOverflow(page, theme + ' stage ' + i + ' overflow at ' + width);
          assert(await page.locator('[data-m365-board]').evaluate(el => el.scrollWidth <= el.clientWidth + 1), 'No sideways scrolling inside storyboard.');
        }
      }
    }
    await page.emulateMedia({ media: 'print' });
    assert.equal(await page.locator('[data-m365-scene]:visible').count(), 6);
    assert.equal(await page.locator('.m365-static-route:visible').count(), 6);
    assert.equal(await page.locator('[data-m365-board]:visible').count(), 0);
    await page.emulateMedia({ media: 'screen', reducedMotion: 'reduce' });
    console.log('PASS: responsive user journey in both themes, all stages at six widths, no forced horizontal scrolling, printable story.');

    if (screenshots) {
      fs.mkdirSync(screenshots, { recursive: true });
      for (const width of [1280, 390]) {
        await page.setViewportSize({ width, height: 1000 });
        for (let i = 0; i < 6; i++) {
          await page.locator(`[data-m365-tab="${i}"]`).click();
          await page.clock.fastForward(8050);
          await page.locator('[data-m365-player]').screenshot({ path: path.join(screenshots, `user-stage-${i}-${width}.png`) });
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
