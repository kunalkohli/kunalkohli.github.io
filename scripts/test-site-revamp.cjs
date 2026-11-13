// node scripts/test-site-revamp.cjs BASE_URL PLAYWRIGHT_MODULE [SCREENSHOT_DIR]
// CHROME_PATH may point to an installed Chrome.
// Suite for the tpuf-style layout: dev/light themes (dev default), tight feed
// homepage, framed article sheet, topics side rail, original attack animation.
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');
const { execFileSync } = require('node:child_process');
const [base, modulePath, screenshots] = process.argv.slice(2);
if (!base || !modulePath) throw new Error('Supply a preview URL and Playwright module path.');
const { chromium } = require(path.resolve(modulePath));

const THEMES = ['dev', 'light'];

(async () => {
  // Authored posts and the original attack animation are preserved, with one
  // deliberate exception: the DSConcepts post's SQL-lab section was restructured
  // into bullets (its content is guarded by scripts/test-dsconcepts-post.cjs).
  const changedAuthored = execFileSync('git', ['diff', 'origin/master', '--name-only', '--', '_posts', '_includes/binance-attack-animation.html', 'css/binance-attack.css', 'js/binance-attack.js'], { encoding: 'utf8' }).trim().split('\n').filter(name => name && name !== '_posts/2026-11-11-dsconcepts-learning-journeys.md');
  assert.deepEqual(changedAuthored, [], 'Authored posts (except the DSConcepts bullets edit) and the original attack animation must not change');
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
    const postCount = fs.readdirSync('_posts').filter(name => name.endsWith('.md')).length;

    // Dev is the default theme on a fresh visitor with no saved preference.
    assert.equal(await page.locator('html').getAttribute('data-theme'), 'dev', 'Default theme must be dev');
    assert.equal(await page.locator('[data-theme-opt="dev"]').getAttribute('aria-pressed'), 'true', 'dev button is active by default');

    // Top strip promotes the newest story; the feed lists every story, newest first.
    const latestUrl = await page.locator('.strip').getAttribute('href');
    assert.ok((await page.locator('.strip').innerText()).startsWith('LATEST:'), 'Homepage strip promotes the latest story');
    const entries = await page.locator('.feed .entry').evaluateAll(links => links.map(link => ({
      url: link.getAttribute('href'),
      title: link.querySelector('h3').textContent.replace('↗', '').trim(),
      date: link.querySelector('time').getAttribute('datetime')
    })));
    assert.equal(entries.length, postCount, 'Feed must list every published story');
    assert.equal(latestUrl, entries[0].url, 'Strip and first entry point at the same newest story');
    const dates = entries.map(entry => new Date(entry.date).getTime());
    assert.ok(dates.every((d, i) => i === 0 || d <= dates[i - 1]), 'Feed is sorted newest first');
    assert.equal(await page.locator('#writing-title').innerText(), 'Writing.');
    assert.equal(await page.locator('.latest-story, .prior-band, .story').count(), 0, 'Hero and prior-band are replaced by the feed');
    assert.ok((await page.locator('.entry .meta').first().innerText()).includes('min read'), 'Entries carry mono meta with read time');
    const articleUrls = entries.map(entry => entry.url);

    // Theme switch: dev <-> light persists across reloads; dark is gone.
    await page.locator('[data-theme-opt="light"]').click();
    assert.equal(await page.locator('html').getAttribute('data-theme'), 'light');
    await page.reload({ waitUntil: 'networkidle' });
    assert.equal(await page.locator('html').getAttribute('data-theme'), 'light', 'Theme choice persists');
    await page.locator('[data-theme-opt="dev"]').click();
    assert.equal(await page.locator('html').getAttribute('data-theme'), 'dev');
    assert.equal(await page.locator('[data-theme-opt="dark"]').count(), 0, 'Dark theme option is removed');

    // Text-size control (kept from the previous design).
    assert.equal(await page.locator('[data-text-label]').innerText(), '90%');
    await page.locator('[data-text-step="+"]').click();
    assert.equal(await page.locator('[data-text-label]').innerText(), '100%');
    assert.equal(await page.evaluate(() => document.documentElement.style.zoom), '1');
    await page.reload({ waitUntil: 'networkidle' });
    assert.equal(await page.locator('[data-text-label]').innerText(), '100%');
    const raised = await page.locator('.display').evaluate(el => el.getBoundingClientRect().height);
    await page.locator('[data-text-step="+"]').click();
    const bigger = await page.locator('.display').evaluate(el => el.getBoundingClientRect().height);
    assert.ok(bigger > raised * 1.05, 'The larger setting must visibly enlarge text');
    assert.equal(await page.locator('[data-text-step="+"]').isDisabled(), true, '110% is the maximum');
    for (let step = 0; step < 4; step++) await page.locator('[data-text-step="-"]').click();
    assert.equal(await page.locator('[data-text-label]').innerText(), '70%');
    assert.equal(await page.locator('[data-text-step="-"]').isDisabled(), true, '70% is the minimum');
    await page.locator('[data-text-step="+"]').click();
    console.log('PASS tight feed homepage (every story, newest first), dev default, dev/light theme persistence, text-size control');

    for (const size of ['0.7', '1.1']) {
      for (const target of ['/', articleUrls[0]]) {
        await page.goto(base + target, { waitUntil: 'domcontentloaded' });
        await page.waitForFunction(() => document.querySelector('.theme-switch button[aria-pressed="true"]') !== null);
        await page.evaluate(value => { document.documentElement.style.zoom = value; }, size);
        for (const width of [320, 768, 1440]) {
          await page.setViewportSize({ width, height: 1100 });
          assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, `Overflow at zoom ${size}: ${target} / ${width}`);
        }
      }
    }
    await page.setViewportSize({ width: 1440, height: 1100 });
    console.log('PASS no overflow at 70% and 110% text sizes across home and article');

    const pages = [{ title: 'home', url: '/' }, ...articleUrls.map(url => ({ title: 'article', url })), { title: 'topics', url: '/categories/' }, { title: 'archive', url: '/archive/' }, { title: 'about', url: '/resume/' }, { title: 'tags', url: '/tags/' }];
    for (const entry of pages) {
      // Older posts embed remote images; those must not hold up local layout checks.
      const response = await page.goto(base + entry.url, { waitUntil: 'domcontentloaded' });
      await page.waitForFunction(() => document.querySelector('.theme-switch button[aria-pressed="true"]') !== null);
      assert.equal(response.status(), 200, 'Broken page: ' + entry.url);
      await page.evaluate(() => document.fonts.ready);
      assert.equal(await page.locator('main').count(), 1);
      assert.equal(await page.locator('h1').count(), 1, 'Expected one page heading: ' + entry.url);
      const duplicates = await page.locator('[id]').evaluateAll(elements => {
        const ids = elements.map(el => el.id);
        return ids.filter((id, i) => ids.indexOf(id) !== i);
      });
      assert.deepEqual(duplicates, [], entry.url + ' has duplicate IDs');
      for (const theme of THEMES) {
        if (await page.locator('html').getAttribute('data-theme') !== theme) await page.locator(`[data-theme-opt="${theme}"]`).click();
        for (const width of [320, 390, 768, 1024, 1440, 1920, 2560]) {
          await page.setViewportSize({ width, height: 1100 });
          const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
          assert.equal(overflow, false, `Overflow: ${entry.url} / ${theme} / ${width}`);
          const copyChecks = await page.locator('.post-content > p').evaluateAll(ps => ps.map(p => {
            const shell = p.closest('#post').getBoundingClientRect();
            const r = p.getBoundingClientRect();
            return { w: r.width, cap: shell.width - (r.left - shell.left) };
          }));
          assert.ok(copyChecks.every(x => x.w <= x.cap + 1), 'Prose exceeds its column');
          if (screenshots && (width === 1440 || width === 390) && ['/', articleUrls[0]].includes(entry.url) && theme === 'dev') {
            fs.mkdirSync(screenshots, { recursive: true });
            await page.evaluate(() => scrollTo(0, 0));
            await page.screenshot({ path: path.join(screenshots, `${entry.url === '/' ? 'home' : 'binance'}-${width}.png`) });
          }
        }
      }
      console.log('PASS page/dev+light/seven widths', entry.url);
    }

    // Cover-art SVG still rides its drawn orbit (article feature art).
    await page.setViewportSize({ width: 1440, height: 1100 });
    for (const url of articleUrls) {
      await page.goto(base + url, { waitUntil: 'networkidle' });
      const onOrbit = await page.evaluate(() => {
        const svg = document.querySelector('.art-security svg');
        const dot = svg && svg.querySelector('.orbit-dot');
        if (!dot) return true; // no orbit art on this story
        const rect = dot.getBoundingClientRect();
        const point = new DOMPoint(rect.x + rect.width / 2, rect.y + rect.height / 2).matrixTransform(svg.getScreenCTM().inverse());
        const dx = point.x - 240, dy = point.y - 150;
        const c = Math.cos(Math.PI / 6), s = Math.sin(Math.PI / 6);
        const ux = dx * c + dy * s, uy = -dx * s + dy * c;
        return Math.abs((ux / 145) ** 2 + (uy / 85) ** 2 - 1) < 0.03;
      });
      assert.ok(onOrbit, 'Cover-art dot must ride the drawn orbit ellipse: ' + url);
    }
    console.log('PASS cover-art orbit on story pages');

    // Topics side rail (structure kept from the previous design, reskinned).
    const categoryNames = new Set();
    for (const name of fs.readdirSync('_posts').filter(name => name.endsWith('.md'))) {
      const frontMatter = fs.readFileSync(path.join('_posts', name), 'utf8').slice(0, 2000);
      const match = frontMatter.match(/^categories:\s*\[(.*?)\]/m);
      if (match) for (const part of match[1].split(',')) { const value = part.trim(); if (value) categoryNames.add(value); }
    }
    await page.setViewportSize({ width: 1440, height: 1100 });
    await page.goto(base + '/categories/', { waitUntil: 'networkidle' });
    assert.equal(await page.locator('[data-topic-rail] li a').count(), categoryNames.size, 'One rail thread per category');
    assert.equal((await page.locator('[data-topic-rail] .rt').innerText()).trim(), `THREADS · ${categoryNames.size}`);
    const activeTopic = await page.locator('[data-topic-rail] a[aria-current="true"]').getAttribute('data-topic');
    const newestPostFile = fs.readdirSync('_posts').filter(name => name.endsWith('.md')).sort().pop();
    const newestMatch = fs.readFileSync(path.join('_posts', newestPostFile), 'utf8').match(/^categories:\s*\[(.*?)\]/m);
    assert.equal(activeTopic, newestMatch[1].split(',')[0].trim(), "Default open thread is the latest post's first category");
    assert.equal(await page.locator('[data-topic-panel]:visible').count(), 1, 'Exactly one thread is open by default');
    const otherTopic = [...categoryNames].find(name => name !== activeTopic);
    await page.locator(`[data-topic-rail] a[data-topic="${otherTopic}"]`).click();
    assert.ok(await page.locator(`[data-topic-panel="${otherTopic}"]`).isVisible());
    assert.equal(await page.locator('[data-topic-panel]:visible').count(), 1, 'Swapping threads keeps a single open panel');
    assert.equal(await page.locator(`[data-topic-panel="${activeTopic}"]`).isVisible(), false);
    console.log('PASS topics side rail: thread per category, default open = latest post category, single-panel swap');

    // Original attack animation: six stages, TL;DR sync, keyboard control.
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto(base + articleUrls.find(url => url.includes('binance')), { waitUntil: 'networkidle' });
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
    assert.ok(await page.locator('.sheet-x').isVisible(), 'Article sheet has its × close corner');
    assert.ok((await page.locator('.sheet-x').getAttribute('href')).startsWith('/'), '× returns to the writing list');
    assert.ok(await page.locator('.sheet-dots').isVisible(), 'Perforated rail hugs the article edge');
    assert.ok(await page.locator('.crumbs').isVisible(), 'Mono breadcrumb above the title');
    // Left "on this page" rail: sections listed, scrollspy follows, hides when narrow.
    const tocLinks = page.locator('.toc li a');
    const tocCount = await tocLinks.count();
    assert.ok(tocCount >= 2, 'Article shows a left contents rail with its sections');
    await tocLinks.nth(1).click();
    let marked = false;
    for (let i = 0; i < 10 && !marked; i++) {
      marked = (await tocLinks.nth(1).getAttribute('aria-current')) === 'true';
      if (!marked) await page.waitForTimeout(200);
    }
    assert.ok(marked, 'Scrollspy marks the section you jumped to');
    assert.equal(await tocLinks.nth(0).getAttribute('aria-current'), null, 'Earlier section is no longer marked');
    await page.setViewportSize({ width: 1150, height: 1000 });
    assert.equal(await page.locator('.toc').isVisible(), false, 'Contents rail hides below 1200px');
    await page.setViewportSize({ width: 1440, height: 1000 });
    console.log('PASS original six animated scenes, stage TL;DR, keyboard controls, article sheet frame');

    // Mermaid rendering and theme re-render.
    await page.locator('.mermaid[data-processed="true"] svg').waitFor({ timeout: 30000 });
    const firstNode = page.locator('.mermaid g.node').first();
    assert.ok(await firstNode.locator('br').count() >= 1 || await firstNode.locator('tspan').count() >= 2, 'Authored multiline labels must be retained');
    const mermaidId = await page.locator('.mermaid svg').getAttribute('id');
    await page.locator('[data-theme-opt="light"]').click();
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
    await fallback.goto(base + articleUrls.find(url => url.includes('binance')), { waitUntil: 'networkidle' });
    assert.equal(await fallback.locator('.attack-scene:visible').count(), 6);
    assert.equal(await fallback.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    await fallback.goto(base, { waitUntil: 'networkidle' });
    assert.equal(await fallback.locator('.feed .entry:visible').count(), postCount, 'No-JS: the feed still lists every story');
    await fallback.goto(base + '/categories/', { waitUntil: 'networkidle' });
    assert.equal(await fallback.locator('[data-topic-panel]:visible').count(), categoryNames.size, 'No-JS: every thread stays readable on the topics page');
    console.log('PASS no-JavaScript article animation fallback, feed and topics rail');
    await fallback.close();

    const blockedStorage = await browser.newPage({ colorScheme: 'dark' });
    await blockedStorage.addInitScript(() => {
      Object.defineProperty(window, 'localStorage', { get() { throw new Error('Storage blocked'); } });
    });
    await blockedStorage.goto(base, { waitUntil: 'domcontentloaded' });
    await blockedStorage.waitForFunction(() => document.querySelector('[data-theme-opt][aria-pressed="true"]') !== null);
    assert.equal(await blockedStorage.locator('html').getAttribute('data-theme'), 'dev', 'localStorage blocked still defaults to dev');
    await blockedStorage.locator('[data-theme-opt="light"]').click();
    assert.equal(await blockedStorage.locator('html').getAttribute('data-theme'), 'light');
    await blockedStorage.locator('[data-theme-opt="dev"]').click();
    assert.equal(await blockedStorage.locator('html').getAttribute('data-theme'), 'dev');
    console.log('PASS dev default and working theme control with localStorage blocked');
    await blockedStorage.close();
    await page.close();
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
