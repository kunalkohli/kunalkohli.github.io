// node scripts/test-php-locker-post.cjs BUILT_SITE PLAYWRIGHT_MODULE [SCREENSHOT_DIR]
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const [site, playwright, screenshots] = process.argv.slice(2);
if (!site || !playwright) throw new Error('Supply the built site and Playwright module paths.');
const { chromium } = require(path.resolve(playwright));

(async () => {
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ javaScriptEnabled: false, reducedMotion: 'reduce' });
    // All assets are local: this check does not need analytics, fonts, or a server.
    await page.route('**/*', route => {
      const url = new URL(route.request().url());
      if (url.origin !== 'http://blog.test') return route.fulfill({ status: 204, body: '' });
      const file = path.resolve(site, '.' + decodeURIComponent(url.pathname));
      if (!file.startsWith(path.resolve(site) + path.sep) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
        return route.fulfill({ status: 404, body: '' });
      }
      const contentType = { '.html': 'text/html', '.css': 'text/css', '.js': 'application/javascript' }[path.extname(file)] || 'application/octet-stream';
      return route.fulfill({ contentType, body: fs.readFileSync(file) });
    });
    await page.goto('http://blog.test/articles/2026-10/php-vulnerabilities-locker-room.html');
    assert.equal(await page.locator('#post.php-locker-post').count(), 1);
    assert.equal(await page.locator('.php-explainer table').count(), 2);
    assert.deepEqual(await page.locator('.php-story-panels').evaluateAll(lists => lists.map(list => list.children.length)), [3, 4, 4]);
    assert.equal(await page.locator('.php-story-panel svg[role="img"][aria-label]').count(), 11);
    assert.equal(await page.locator('.php-story-panel ellipse').count(), 4);
    assert.equal(await page.locator('.php-technical-notes').count(), 2);
    assert.equal(await page.locator('.php-technical-notes[open]').count(), 0);
    for (const id of ['unfinished', 'stale']) {
      const figure = page.locator('figure[aria-labelledby="php-caption-' + id + '"]');
      assert.equal(await figure.evaluate(el => el.previousElementSibling.tagName), 'OL');
      assert.equal(await figure.evaluate(el => el.previousElementSibling.children.length), 4);
      assert(!/\(PHP:|CVE-/.test(await figure.evaluate(el => el.previousElementSibling.textContent)));
    }
    const duplicates = await page.locator('[id]').evaluateAll(elements => {
      const ids = elements.map(el => el.id);
      return ids.filter((id, index) => ids.indexOf(id) !== index);
    });
    assert.deepEqual(duplicates, []);

    for (const width of [320, 390, 600, 768, 1280, 1920, 3440]) {
      await page.setViewportSize({ width, height: 1000 });
      assert(await page.locator('#post').evaluate(el => el.getBoundingClientRect().width <= 720.1), 'Reading column exceeds 720px');
      assert(!await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), 'Overflow at ' + width);
      assert.equal(await page.locator('.php-story-panel svg:visible').count(), 11);
      assert.equal(await page.locator('.php-diagram-technical svg:visible').count(), 0);
      assert(await page.locator('.php-explainer th, .php-explainer td').evaluateAll(cells => cells.every(cell => {
        const style = getComputedStyle(cell);
        return ['Top', 'Right', 'Bottom', 'Left'].every(side => style['border' + side + 'Width'] === '1px' && style['border' + side + 'Style'] === 'solid');
      })), 'Missing table borders at ' + width);
      for (const notes of await page.locator('.php-technical-notes').all()) {
        await notes.locator('summary').click();
        assert.equal(await notes.locator('svg:visible').count(), 1);
        assert.equal(await notes.locator('ol li').count(), 4);
        assert((await notes.innerText()).includes('CVE-2026-'));
        assert(await notes.locator('svg:visible').evaluate((el, max) => el.getBoundingClientRect().width <= max + 0.1, width <= 600 ? 280 : 640));
        assert(!await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), 'Expanded notes overflow at ' + width);
        await notes.locator('summary').click();
      }
    }

    // Keyboard access works without JavaScript, too.
    const summary = page.locator('.php-technical-notes summary').first();
    await summary.focus();
    await page.keyboard.press('Enter');
    assert.equal(await page.locator('.php-technical-notes[open]').count(), 1);
    await page.keyboard.press('Enter');
    if (screenshots) {
      fs.mkdirSync(screenshots, { recursive: true });
      for (const width of [1280, 390]) {
        await page.setViewportSize({ width, height: 1000 });
        for (const id of ['normal', 'unfinished', 'stale']) {
          await page.locator('figure[aria-labelledby="php-caption-' + id + '"]').screenshot({ path: path.join(screenshots, id + '-' + width + '.png') });
        }
      }
    }
    await page.goto('http://blog.test/articles/2020-01/welcome-to-jekyll.html');
    assert.equal(await page.locator('#post').count(), 1);
    assert.equal(await page.locator('#post').getAttribute('class'), null);
    assert.equal(await page.locator('link[href*="php-locker-post.css"]').count(), 0);
    console.log('PASS: three illustrated strips, eight short walkthrough steps, accessible technical disclosures, boxed tables, unique IDs, 720px reading column, and no overflow at 320–3440px without JavaScript.');
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
