// node scripts/test-dsconcepts-post.cjs BASE_URL PLAYWRIGHT_MODULE [SCREENSHOT_DIR]
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const [base, modulePath, screenshots] = process.argv.slice(2);
if (!base || !modulePath) throw new Error('Supply a preview URL and Playwright module path.');
const { chromium } = require(path.resolve(modulePath));
const articlePath = '/articles/2026-11/dsconcepts-learning-journeys';
const title = 'DSConcepts: Learn Data Science with Examples';

(async () => {
  // Additive post: the authored DSConcepts post and its art must survive later design work.
  // The shared layout evolves in design PRs and is covered by scripts/test-site-revamp.cjs.
  const originals = ['_posts/2026-11-11-dsconcepts-learning-journeys.md', '_includes/post-art.html'];
  for (const file of originals) {
    assert.ok(fs.readFileSync(file).equals(execFileSync('git', ['show', `origin/master:${file}`])), `Existing source changed: ${file}`);
  }
  const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || undefined });
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' });
    const errors = [];
    page.on('pageerror', error => errors.push(String(error)));
    page.on('response', response => {
      if (response.url().startsWith(base) && response.status() >= 400) errors.push(`${response.status()} ${response.url()}`);
    });

    await page.goto(base, { waitUntil: 'domcontentloaded' });
    const firstEntry = page.locator('.feed .entry').first();
    assert.equal(await firstEntry.getAttribute('href'), articlePath, 'Newest story leads the feed');
    assert.equal((await firstEntry.locator('h3').innerText()).replace('↗', '').trim(), title);
    await firstEntry.click();
    assert.equal(await page.locator('h1').innerText(), title);
    assert.equal(await page.locator('.post-content h2').count(), 3);
    const readTime = (await page.locator('.art-meta .read-time').innerText()).trim();
    assert.match(readTime, /^[1-9]\d* min read$/);
    assert.ok(parseInt(readTime, 10) >= 3, 'The post should have at least three minutes of reading content');
    const prose = await page.locator('.post-content').innerText();
    for (const claim of ['31 stops', '24 stops', 'real-world business situations', 'aggregations', 'ROW_NUMBER', 'open source on GitHub', 'pull request']) {
      assert.ok(prose.includes(claim), `Missing article content: ${claim}`);
    }
    const headings = await page.locator('.post-content h2').evaluateAll(hs => hs.map(h => ({ id: h.id, text: h.textContent.trim() })));
    assert.equal(headings.length, 3);
    assert.ok(headings.every(heading => heading.id), 'Section headings carry anchor ids for deep links');

    const image = page.locator('.post-content img');
    assert.equal(await image.count(), 1, 'Include only the requested homepage overview screenshot');
    assert.equal(await image.getAttribute('src'), '/img/dsconcepts/homepage.jpg');
    await image.scrollIntoViewIfNeeded();
    await image.evaluate(img => img.decode());
    assert.ok((await image.getAttribute('alt')).length > 40);
    assert.ok(await image.evaluate(img => img.naturalWidth === Number(img.getAttribute('width')) && img.naturalHeight === Number(img.getAttribute('height'))));
    for (const url of ['https://dsconcepts.vercel.app/forecasting', 'https://dsconcepts.vercel.app/experimentation', 'https://dsconcepts.vercel.app/sql-practice', 'https://github.com/kunalkohli/stats_learning', 'https://github.com/kunalkohli/stats_learning/issues']) {
      assert.ok(await page.locator(`.post-content a[href="${url}"]`).count(), `Missing destination: ${url}`);
    }

    for (const theme of ['dev', 'dark', 'light']) {
      if (await page.locator('html').getAttribute('data-theme') !== theme) await page.locator(`[data-theme-opt="${theme}"]`).click();
      for (const width of [320, 390, 768, 1440, 2560]) {
        await page.setViewportSize({ width, height: 1000 });
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, `Article overflow: ${theme}/${width}`);
      }
      await page.locator('[data-text-step="+"]').click();
      await page.locator('[data-text-step="+"]').click();
      await page.setViewportSize({ width: 390, height: 844 });
      assert.equal(await page.locator('[data-text-label]').innerText(), '110%');
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, `Large-text mobile overflow: ${theme}`);
      await page.locator('[data-text-step="-"]').click();
      await page.locator('[data-text-step="-"]').click();
      if (screenshots) {
        fs.mkdirSync(screenshots, { recursive: true });
        for (const width of [390, 1440]) {
          await page.setViewportSize({ width, height: 1000 });
          await page.evaluate(() => scrollTo(0, 0));
          await page.screenshot({ path: path.join(screenshots, `dsconcepts-${theme}-${width}.png`), fullPage: true });
        }
      }
    }

    for (const route of ['/categories/', '/archive/', '/feed.xml']) {
      const response = await page.goto(base + route, { waitUntil: 'domcontentloaded' });
      assert.equal(response.status(), 200);
      assert.ok((await response.text()).includes(articlePath), `New post missing from ${route}`);
    }
    const noJs = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 390, height: 844 } });
    const staticPage = await noJs.newPage();
    await staticPage.goto(base + articlePath, { waitUntil: 'domcontentloaded' });
    assert.equal(await staticPage.locator('h1').innerText(), title);
    assert.equal(await staticPage.locator('.post-content h2').count(), 3);
    assert.ok((await staticPage.locator('.post-content').innerText()).includes('ROW_NUMBER'));
    await noJs.close();
    assert.deepEqual(errors, []);
    console.log('PASS: dsconcepts post preserved (newest story leads the feed); mono meta, section anchors, screenshot, links, archive/topics/feed, dev/dark/light, five widths, 110% mobile text, and no-JS reading.');
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
