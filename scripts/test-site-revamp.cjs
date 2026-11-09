// node scripts/test-site-revamp.cjs BASE_URL PLAYWRIGHT_MODULE [SCREENSHOT_DIR]
// CHROME_PATH may point to an installed Chrome.
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');
const { execFileSync } = require('node:child_process');
const [base, modulePath, screenshots] = process.argv.slice(2);
if (!base || !modulePath) throw new Error('Supply a preview URL and Playwright module path.');
const { chromium } = require(path.resolve(modulePath));

(async () => {
  const preserved = execFileSync('git', ['diff', 'origin/master', '--', '_posts', '_includes/binance-attack-animation.html', 'css/binance-attack.css', 'js/binance-attack.js'], { encoding: 'utf8' });
  assert.equal(preserved, '', 'Authored posts and original attack animation must not change');
  const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || undefined });
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1100 }, colorScheme: 'light', reducedMotion: 'reduce' });
    const errors = [];
    page.on('pageerror', error => errors.push(String(error)));
    page.on('response', response => {
      if (response.url().startsWith(base) && response.status() >= 400) errors.push(response.status() + ' ' + response.url());
    });
    await page.goto(base, { waitUntil: 'networkidle' });
    await page.evaluate(() => document.fonts.ready);
    const posts = await page.locator('.story h2 a').evaluateAll(links => links.map(link => ({ title: link.textContent.trim(), url: link.getAttribute('href') })));
    assert.equal(posts.length, fs.readdirSync('_posts').filter(name => name.endsWith('.md')).length);
    assert.equal(await page.locator('#latest-title').innerText(), posts[0].title);
    assert.equal(await page.locator('#latest-title a').getAttribute('href'), posts[0].url);
    assert.equal(await page.locator('.latest-story').getAttribute('data-latest-post'), posts[0].url);
    assert.equal(await page.locator('.latest-meta .read-time').innerText(), '4 min read');
    await page.locator('[data-filter="security"]').click();
    assert.equal(await page.locator('[data-story]:visible').count(), 2);
    await page.locator('[data-search]').fill('binance');
    assert.equal(await page.locator('[data-story]:visible').count(), 1);
    await page.locator('[data-search]').fill('not-a-story');
    assert.ok(await page.locator('[data-empty-state]').isVisible());
    await page.locator('[data-search]').fill('');
    await page.locator('[data-filter="all"]').click();
    await page.locator('[data-theme-toggle]').click();
    assert.equal(await page.locator('html').getAttribute('data-theme'), 'dark');
    await page.reload({ waitUntil: 'networkidle' });
    assert.equal(await page.locator('html').getAttribute('data-theme'), 'dark');
    assert.equal(await page.locator('[data-text-label]').innerText(), '90%');
    await page.locator('[data-text-step="+"]').click();
    assert.equal(await page.locator('[data-text-label]').innerText(), '100%');
    assert.equal(await page.evaluate(() => document.documentElement.style.zoom), '1');
    await page.reload({ waitUntil: 'networkidle' });
    assert.equal(await page.locator('[data-text-label]').innerText(), '100%');
    const raised = await page.locator('.latest-story h1').evaluate(el => el.getBoundingClientRect().height);
    await page.locator('[data-text-step="+"]').click();
    const bigger = await page.locator('.latest-story h1').evaluate(el => el.getBoundingClientRect().height);
    assert.ok(bigger > raised * 1.05, 'The larger setting must visibly enlarge text');
    assert.equal(await page.locator('[data-text-step="+"]').isDisabled(), true, '110% is the maximum');
    for (let step = 0; step < 4; step++) await page.locator('[data-text-step="-"]').click();
    assert.equal(await page.locator('[data-text-label]').innerText(), '70%');
    assert.equal(await page.locator('[data-text-step="-"]').isDisabled(), true, '70% is the minimum');
    await page.locator('[data-text-step="+"]').click();
    console.log('PASS latest published hero, all-post index, filtering/search, persisted theme and text-size control');

    for (const size of ['0.7', '1.1']) {
      for (const target of ['/', posts[0].url]) {
        await page.goto(base + target, { waitUntil: 'domcontentloaded' });
        await page.waitForFunction(() => !document.querySelector('[data-theme-toggle]').hidden);
        await page.evaluate(value => { document.documentElement.style.zoom = value; }, size);
        for (const width of [320, 768, 1440]) {
          await page.setViewportSize({ width, height: 1100 });
          assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, `Overflow at zoom ${size}: ${target} / ${width}`);
        }
      }
    }
    await page.setViewportSize({ width: 1440, height: 1100 });
    console.log('PASS no overflow at 70% and 110% text sizes across home and article');

    const pages = [{ title: 'home', url: '/' }, ...posts, { title: 'topics', url: '/categories/' }, { title: 'archive', url: '/archive/' }, { title: 'about', url: '/resume/' }, { title: 'tags', url: '/tags/' }];
    for (const entry of pages) {
      // Older posts embed remote images; those must not hold up local layout checks.
      const response = await page.goto(base + entry.url, { waitUntil: 'domcontentloaded' });
      await page.waitForFunction(() => !document.querySelector('[data-theme-toggle]').hidden);
      assert.equal(response.status(), 200, 'Broken page: ' + entry.url);
      await page.evaluate(() => document.fonts.ready);
      assert.equal(await page.locator('main').count(), 1);
      assert.equal(await page.locator('h1').count(), 1, 'Expected one page heading: ' + entry.url);
      const duplicates = await page.locator('[id]').evaluateAll(elements => {
        const ids = elements.map(el => el.id);
        return ids.filter((id, i) => ids.indexOf(id) !== i);
      });
      assert.deepEqual(duplicates, [], entry.url + ' has duplicate IDs');
      const brokenContents = await page.locator('.post-toc nav a').evaluateAll(links => links.filter(link => !document.getElementById(decodeURIComponent(link.hash.slice(1)))).map(link => link.hash));
      assert.deepEqual(brokenContents, [], 'Broken contents links: ' + entry.url);
      for (const theme of ['light', 'dark']) {
        if (await page.locator('html').getAttribute('data-theme') !== theme) await page.locator('[data-theme-toggle]').click();
        for (const width of [320, 390, 768, 1024, 1440, 1920, 2560]) {
          await page.setViewportSize({ width, height: 1100 });
          const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
          assert.equal(overflow, false, `Overflow: ${entry.url} / ${theme} / ${width}`);
          const copyWidths = await page.locator('.post-content > p').evaluateAll(ps => ps.map(p => p.getBoundingClientRect().width));
          const zoom = await page.evaluate(() => parseFloat(getComputedStyle(document.documentElement).zoom) || 1);
          assert.ok(copyWidths.every(w => w <= 761 * zoom), 'Prose exceeds its reading width');
          if (entry.url === '/' && theme === 'light' && width === 1440) {
            const onOrbit = await page.evaluate(() => {
              const svg = document.querySelector('.art-security svg');
              if (!svg) return false;
              const rect = svg.querySelector('.orbit-dot').getBoundingClientRect();
              const point = new DOMPoint(rect.x + rect.width / 2, rect.y + rect.height / 2).matrixTransform(svg.getScreenCTM().inverse());
              const dx = point.x - 240, dy = point.y - 150;
              const c = Math.cos(Math.PI / 6), s = Math.sin(Math.PI / 6);
              const ux = dx * c + dy * s, uy = -dx * s + dy * c;
              return Math.abs((ux / 145) ** 2 + (uy / 85) ** 2 - 1) < 0.03;
            });
            assert.ok(onOrbit, 'Cover-art dot must ride the drawn orbit ellipse');
          }
          if (screenshots && (width === 1440 || width === 390) && [posts[0].url, '/'].includes(entry.url)) {
            fs.mkdirSync(screenshots, { recursive: true });
            await page.evaluate(() => scrollTo(0, 0));
            await page.screenshot({ path: path.join(screenshots, `${entry.url === '/' ? 'home' : 'binance'}-${theme}-${width}.png`) });
          }
        }
      }
      console.log('PASS page/light+dark/seven widths', entry.url);
    }

    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto(base + posts[0].url, { waitUntil: 'networkidle' });
    assert.equal(await page.locator('[data-attack-stage]').count(), 6);
    assert.equal(await page.locator('[data-attack-scene]').count(), 6);
    for (let i = 0; i < 6; i++) {
      const tab = page.locator('[data-attack-stage="' + i + '"]');
      await tab.click();
      assert.equal(await tab.getAttribute('aria-selected'), 'true');
      assert.equal(await page.locator('.attack-scene.is-active').count(), 1);
      assert.equal(await page.locator('[data-attack-tldr]').innerText(), await tab.getAttribute('data-tldr'));
      assert.ok(await page.locator('.attack-scene.is-active .scene-svg').isVisible());
    }
    await page.locator('[data-attack-stage="0"]').focus();
    await page.keyboard.press('ArrowRight');
    assert.equal(await page.locator('[data-attack-stage="1"]').getAttribute('aria-selected'), 'true');
    await page.locator('#the-breach').scrollIntoViewIfNeeded();
    await page.waitForTimeout(150);
    const toc = await page.locator('.post-toc').boundingBox();
    assert.ok(toc.y >= 0 && toc.y < 100, 'Contents sidebar is not sticky');
    assert.equal(await page.locator('.post-toc [aria-current="location"]').count(), 1);
    await page.setViewportSize({ width: 390, height: 900 });
    await page.waitForFunction(() => !document.querySelector('.toc-disclosure').open);
    await page.locator('.toc-disclosure summary').click();
    await page.locator('.post-toc a[href="#lessons-for-everyone"]').click();
    assert.equal(await page.locator('.toc-disclosure').evaluate(el => el.open), false);
    assert.ok(await page.locator('[data-reading-progress]').evaluate(el => parseFloat(el.style.width) > 0));
    console.log('PASS original six animated scenes, stage TL;DR, keyboard controls, persistent/mobile contents and reading progress');

    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.locator('.mermaid[data-processed="true"] svg').waitFor({ timeout: 30000 });
    const firstNode = page.locator('.mermaid g.node').first();
    assert.ok(await firstNode.locator('br').count() >= 1 || await firstNode.locator('tspan').count() >= 2, 'Authored multiline labels must be retained');
    const mermaidId = await page.locator('.mermaid svg').getAttribute('id');
    await page.locator('[data-theme-toggle]').click();
    await page.waitForFunction(previous => document.querySelector('.mermaid svg')?.id !== previous && document.querySelector('.mermaid')?.dataset.processed === 'true', mermaidId);
    assert.ok(await page.locator('.mermaid svg').isVisible());
    console.log('PASS Mermaid rendering and theme re-render');

    const local = new Set();
    for (const entry of [{ url: '/' }, { url: '/archive/' }, { url: '/categories/' }, { url: '/resume/' }]) {
      await page.goto(base + entry.url, { waitUntil: 'networkidle' });
      (await page.locator('a[href^="/"]').evaluateAll(links => links.map(a => a.getAttribute('href').split('#')[0]))).forEach(href => local.add(href));
    }
    for (const href of local) assert.equal((await page.request.get(base + href)).status(), 200, 'Broken internal URL: ' + href);
    for (const legacy of ['/archive.html', '/tags.html']) assert.equal((await page.request.get(base + legacy)).status(), 200);
    assert.deepEqual(errors, []);
    console.log('PASS internal links, legacy aliases and no page script/local asset errors');

    const fallback = await browser.newPage({ javaScriptEnabled: false, viewport: { width: 390, height: 900 } });
    await fallback.goto(base + posts[0].url, { waitUntil: 'networkidle' });
    assert.equal(await fallback.locator('.attack-scene:visible').count(), 6);
    assert.equal(await fallback.locator('.post-toc nav a').count(), 7);
    assert.equal(await fallback.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    await fallback.goto(base, { waitUntil: 'networkidle' });
    assert.equal(await fallback.locator('[data-story]:visible').count(), posts.length);
    console.log('PASS no-JavaScript article contents, original animation fallback and full post index');
    await fallback.close();
    const blockedStorage = await browser.newPage({ colorScheme: 'dark' });
    await blockedStorage.addInitScript(() => {
      Object.defineProperty(window, 'localStorage', { get() { throw new Error('Storage blocked'); } });
    });
    await blockedStorage.goto(base, { waitUntil: 'domcontentloaded' });
    await blockedStorage.waitForFunction(() => !document.querySelector('[data-theme-toggle]').hidden);
    assert.equal(await blockedStorage.locator('html').getAttribute('data-theme'), 'dark');
    await blockedStorage.locator('[data-theme-toggle]').click();
    assert.equal(await blockedStorage.locator('html').getAttribute('data-theme'), 'light');
    console.log('PASS OS default and working theme control with localStorage blocked');
    await blockedStorage.close();
    await page.close();
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
