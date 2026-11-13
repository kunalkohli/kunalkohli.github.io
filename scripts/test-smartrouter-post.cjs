// node scripts/test-smartrouter-post.cjs BASE_URL PLAYWRIGHT_MODULE [SCREENSHOT_DIR]
// CHROME_PATH may point to an installed Chrome. No extra npm install is required.
// Use a byte-range-capable HTTP server for MP4 seeking (the basic Python preview lacks ranges).
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const [base, modulePath, screenshots] = process.argv.slice(2);
if (!base || !modulePath) throw new Error('Supply a preview URL and Playwright module path.');
const { chromium } = require(path.resolve(modulePath));
const article = '/articles/2026-11/smartrouter';
const title = 'I Built an LLM Router to Pick Models Intelligently and Save $$';

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || undefined });
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1100 }, reducedMotion: 'reduce' });
    const errors = [];
    let videoRequests = 0;
    page.on('pageerror', error => errors.push(String(error)));
    page.on('response', response => {
      if (response.url().startsWith(base) && response.status() >= 400) errors.push(response.status() + ' ' + response.url());
    });
    page.on('request', request => {
      if (request.url().endsWith('/video/smartrouter-demo.mp4')) videoRequests++;
    });

    await page.goto(base, { waitUntil: 'networkidle' });
    assert.equal((await page.locator('#latest-title a').innerText()).trim(), title);
    assert.equal(await page.locator('#latest-title a').getAttribute('href'), article);
    const feed = await page.request.get(base + '/feed.xml');
    assert.equal(feed.status(), 200);
    assert.ok((await feed.text()).includes(article), 'The new post must appear in RSS');

    const response = await page.goto(base + article, { waitUntil: 'networkidle' });
    assert.equal(response.status(), 200);
    assert.equal(await page.locator('h1').innerText(), title);
    const brokenContents = await page.locator('.post-toc nav a').evaluateAll(links => links
      .filter(link => !document.getElementById(decodeURIComponent(link.hash.slice(1))))
      .map(link => link.hash));
    assert.deepEqual(brokenContents, []);
    assert.equal(await page.locator('.post-toc nav a').count(), 6, 'The concise article must populate the contents');
    assert.equal(await page.locator('.post-content h3').innerText(), '🖼️ What the routed model built');
    assert.equal(await page.locator('.post-content table').count(), 1, 'Keep only the token-cost table');
    assert.equal(await page.locator('.post-content a[href="https://www.typesafe.ai/"]').count(), 2, 'Link Jev in the workflow and classification section');
    const spacing = await page.locator('.post-content').evaluate(el => {
      const body = getComputedStyle(el);
      const item = getComputedStyle(el.querySelector('li'));
      return { lineHeight: parseFloat(body.lineHeight) / parseFloat(body.fontSize), itemGap: parseFloat(item.marginBottom) / parseFloat(item.fontSize) };
    });
    assert.ok(spacing.lineHeight <= 1.66 && spacing.itemGap <= 0.31, 'Use compact post-scoped spacing');

    const image = page.locator('.post-content img[src$="05-user-sketch.png"]');
    await image.scrollIntoViewIfNeeded();
    await image.evaluate(el => el.decode());
    assert.deepEqual(await image.evaluate(el => [el.naturalWidth, el.naturalHeight]), [2370, 1320]);
    assert.ok((await image.getAttribute('alt')).includes('0.80'));

    const result = page.locator('.post-content img[src$="stock-trends-result.jpg"]');
    await result.scrollIntoViewIfNeeded();
    await result.evaluate(el => el.decode());
    assert.deepEqual(await result.evaluate(el => [el.naturalWidth, el.naturalHeight]), [2000, 870]);
    assert.equal(await result.locator('..').getAttribute('href'), '/img/smartrouter/stock-trends-result.jpg');

    const video = page.locator('.post-content video');
    assert.equal(await video.getAttribute('preload'), 'none');
    assert.equal(await video.getAttribute('autoplay'), null);
    assert.equal(await video.evaluate(el => el.controls && el.playsInline), true);
    assert.ok(await video.getAttribute('aria-label'));
    assert.equal(await page.locator('#' + await video.getAttribute('aria-describedby')).count(), 1);
    assert.equal(await video.locator('source').getAttribute('type'), 'video/mp4');
    assert.ok((await page.locator('.post-content').innerText()).includes('$0.2980 ≈ $0.30'));
    const costSnapshot = await page.request.get(base + '/docs/smartrouter-cost-example.json');
    assert.equal(costSnapshot.status(), 200);
    assert.equal((await costSnapshot.json()).completedBuildRequests, 25);
    const poster = await page.request.get(base + await video.getAttribute('poster'));
    assert.equal(poster.status(), 200);
    assert.equal(videoRequests, 0, 'The recording must not download until the reader requests playback');

    for (const theme of ['light', 'dark']) {
      await page.evaluate(value => document.documentElement.setAttribute('data-theme', value), theme);
      for (const width of [320, 390, 768, 1440, 2560]) {
        await page.setViewportSize({ width, height: 1100 });
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false,
          `Article overflows at ${width}px in ${theme} mode`);
        if (screenshots && [390, 1440].includes(width)) {
          fs.mkdirSync(screenshots, { recursive: true });
          await page.evaluate(() => scrollTo(0, 0));
          await page.screenshot({ path: path.join(screenshots, `smartrouter-${theme}-${width}.png`) });
          await image.screenshot({ path: path.join(screenshots, `smartrouter-diagram-${theme}-${width}.png`) });
        }
      }
    }

    await page.setViewportSize({ width: 1440, height: 1100 });
    const media = await video.evaluate(async el => {
      await new Promise((resolve, reject) => {
        el.addEventListener('loadedmetadata', resolve, { once: true });
        el.addEventListener('error', () => reject(new Error('Video metadata failed to load')), { once: true });
        el.load();
      });
      await el.play();
      el.pause();
      await new Promise((resolve, reject) => {
        el.addEventListener('seeked', resolve, { once: true });
        el.addEventListener('error', () => reject(new Error('Video seek failed')), { once: true });
        el.currentTime = 24;
      });
      return { width: el.videoWidth, height: el.videoHeight, duration: el.duration, time: el.currentTime, error: el.error };
    });
    assert.equal(media.error, null);
    assert.deepEqual([media.width, media.height], [3018, 1578]);
    assert.ok(media.duration > 36 && media.duration < 37);
    assert.ok(Math.abs(media.time - 24) < 0.1, `Seeking must reach the handoff, got ${media.time}s`);
    if (screenshots) {
      await video.scrollIntoViewIfNeeded();
      await video.screenshot({ path: path.join(screenshots, 'smartrouter-video.png') });
    }
    assert.deepEqual(errors, [], 'No local resource or browser errors');

    const noJS = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 390, height: 844 } });
    const fallback = await noJS.newPage();
    await fallback.goto(base + article, { waitUntil: 'domcontentloaded' });
    assert.equal(await fallback.locator('h1').innerText(), title);
    assert.equal(await fallback.locator('video[controls] source').count(), 1);
    assert.equal(await fallback.locator('a[href$="smartrouter-demo.mp4"]').count(), 2);
    assert.equal(await fallback.locator('.post-toc nav a').count(), 6);
    await noJS.close();
    console.log('PASS homepage/RSS, diagram, responsive light/dark layouts, native MP4 playback and seeking, no-autoload, and no-JavaScript fallbacks');
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
