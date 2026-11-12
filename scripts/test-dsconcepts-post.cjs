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
  // This is an additive post PR: do not change older authored posts or the shared design.
  const originals = execFileSync('git', ['ls-tree', '-r', '--name-only', 'origin/master', '--', '_posts', '_layouts', '_includes', 'css', 'js'], { encoding: 'utf8' }).trim().split('\n');
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
    assert.equal(await page.locator('#latest-title a').innerText(), title);
    assert.equal(await page.locator('#latest-title a').getAttribute('href'), articlePath);
    await page.locator('#latest-title a').click();
    assert.equal(await page.locator('h1').innerText(), title);
    assert.equal(await page.locator('.post-content h2').count(), 3);
    assert.match((await page.locator('.post-byline .read-time').innerText()).trim(), /^[1-9]\d* min read$/);
    const prose = await page.locator('.post-content').innerText();
    for (const claim of ['31 stops', '24 stops', 'real-world business situations', 'aggregations', 'ROW_NUMBER', 'open source on GitHub', 'pull request']) {
      assert.ok(prose.includes(claim), `Missing article content: ${claim}`);
    }
    const headings = await page.locator('.post-toc nav a').evaluateAll(links => links.map(link => ({
      target: link.hash, exists: !!document.getElementById(decodeURIComponent(link.hash.slice(1))),
    })));
    assert.equal(headings.length, 3);
    assert.ok(headings.every(heading => heading.exists), 'Contents links must target real headings');

    assert.equal(await page.locator('.post-content img').count(), 0, 'The post should not contain app screenshots');
    for (const url of ['https://dsconcepts.vercel.app/forecasting', 'https://dsconcepts.vercel.app/experimentation', 'https://dsconcepts.vercel.app/sql-practice', 'https://github.com/kunalkohli/stats_learning', 'https://github.com/kunalkohli/stats_learning/issues']) {
      assert.ok(await page.locator(`.post-content a[href="${url}"]`).count(), `Missing destination: ${url}`);
    }

    for (const theme of ['light', 'dark']) {
      await page.waitForFunction(() => !document.querySelector('[data-theme-toggle]').hidden);
      if (await page.locator('html').getAttribute('data-theme') !== theme) await page.locator('[data-theme-toggle]').click();
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
    assert.equal(await staticPage.locator('.post-toc nav a').count(), 3);
    assert.ok((await staticPage.locator('.post-content').innerText()).includes('ROW_NUMBER'));
    await noJs.close();
    assert.deepEqual(errors, []);
    console.log('PASS: existing sources preserved; new latest post, contents, screenshot-free body, links, archive/topics/feed, light/dark, five widths, 110% mobile text, and no-JS reading.');
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
