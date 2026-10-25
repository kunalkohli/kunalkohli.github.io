// Rebuild the post's SVGs with Archify 3.2.0. No runtime/CDN dependency is added.
// node scripts/build-php-locker-diagrams.mjs ARCHIFY_PACKAGE PLAYWRIGHT_MODULE WORK_DIRECTORY
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
const [archify, playwrightModule, work] = process.argv.slice(2);
if (!archify || !playwrightModule || !work) throw new Error('Supply Archify, Playwright, and a temporary working directory.');
const require = createRequire(import.meta.url);
const { chromium } = require(path.resolve(playwrightModule));
const definitions = {
  'unfinished-analogy': {
    title: 'Bug 1: the locker-room attendant trusts an unfinished record',
    lanes: ['Preparing a storage task', 'Clearing up after failure'],
    nodes: [
      ['Tricky request', 'Visitor pressures workspace'],
      ['Space runs out', 'Record setup stops halfway'],
      ['Half-built record', 'Some fields were never filled'],
      ['Cleanup trusts it', 'Unfinished data used as valid', true]
    ]
  },
  'unfinished-technical': {
    title: 'CVE-2026-109618: out-of-memory failure and unsafe cleanup',
    lanes: ['Request initialization', 'Failed request cleanup'],
    nodes: [
      ['Crafted request', 'Attacker pressures memory'],
      ['Out of memory', 'Initialization is interrupted'],
      ['Incomplete data', 'Internal fields are unfinished'],
      ['Unsafe cleanup', 'Incomplete data used as valid', true]
    ]
  },
  'stale-analogy': {
    title: 'Bug 2: a released locker and an outdated location slip',
    lanes: ['First visitor', 'Later visitor, same attendant'],
    nodes: [
      ['First task fails', 'An unexpected error ends it'],
      ['Locker freed', 'Old location slip survives', true],
      ['Locker reused', 'Different belongings may fill A'],
      ['Old slip followed', 'May retrieve wrong belongings', true]
    ]
  },
  'stale-technical': {
    title: 'CVE-2026-109619: freed memory and a stale reference',
    lanes: ['First request', 'Later request, same worker'],
    nodes: [
      ['Fatal error', 'The first request ends'],
      ['Memory freed', 'An old reference survives', true],
      ['Memory reused', 'Other data may occupy A'],
      ['Stale state used', 'Unsafe access via old reference', true]
    ]
  }
};
fs.mkdirSync(work, { recursive: true });
fs.mkdirSync('_includes/php-lockers', { recursive: true });
fs.mkdirSync('img/php-lockers/source', { recursive: true });
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
try {
  for (const [name, definition] of Object.entries(definitions)) for (const mobile of [false, true]) {
    const key = name + (mobile ? '-mobile' : '');
    const output = path.resolve(work, key + '.html');
    const nodes = definition.nodes.map(([label, sublabel, failure], i) => ({
      id: 'step-' + i, lane: mobile ? 'story' : i < 2 ? 'first' : 'second',
      col: mobile ? 0 : [0, 1, 1, 0][i],
      type: failure ? 'security' : 'backend', label, sublabel,
      width: 170, icon: failure ? 'failure' : 'none',
      ...(failure ? { tag: 'FAILURE POINT' } : {}),
      ...(mobile ? { yOffset: (i - 1.5) * 108 } : {})
    }));
    const candidate = {
      schema_version: 2, diagram_type: 'workflow',
      meta: { title: definition.title, locale: 'en', quality_profile: 'showcase',
        output: 'img/php-lockers/source/' + key + '.html', legend: { mode: 'hidden' } },
      lanes: mobile ? [{ id: 'story', label: 'The complete flow' }] : [
        { id: 'first', label: definition.lanes[0] }, { id: 'second', label: definition.lanes[1] }
      ], nodes,
      edges: [0, 1, 2].map(i => ({ id: 'transition-' + i, from: 'step-' + i, to: 'step-' + (i + 1),
        ...(mobile || i === 1 ? { fromSide: 'bottom', toSide: 'top' } : {}),
        ...(definition.nodes[i + 1][2] ? { variant: 'security', role: 'error' } : {}) }))
    };
    const input = 'img/php-lockers/source/' + key + '.json';
    fs.writeFileSync(input, JSON.stringify(candidate, null, 2) + '\n');
    const args = [path.resolve(archify, 'bin/archify.mjs'), 'finalize', 'workflow', input, output, '--quality', 'showcase', '--json'];
    if (fs.existsSync(output)) args.push('--out-dir', path.join(work, 'review-' + Date.now()));
    let receipt;
    try { receipt = JSON.parse(execFileSync(process.execPath, args, { encoding: 'utf8', maxBuffer: 4 * 1024 * 1024 })); }
    catch (error) { console.error(error.stdout?.toString() || error.message); throw error; }
    if (!receipt.ok) throw new Error('Archify checks failed: ' + key);
    // Read the canonical SVG before viewer scripts add motion and hit-target paths.
    const native = fs.readFileSync(output, 'utf8');
    const svgSource = native.match(/<svg\b[^>]*data-layout-contract[\s\S]*?<\/svg>/)?.[0];
    if (!svgSource) throw new Error('Missing canonical Archify SVG: ' + key);
    await page.setContent('<html><body>' + svgSource + '</body></html>');
    const svg = await page.evaluate(({ prefix, title }) => {
      const svg = document.querySelector('svg');
      svg.querySelectorAll('style, rect[fill="url(#grid)"], [data-graph-role="structural-frame"]').forEach(el => el.remove());
      svg.querySelectorAll('[data-node-id]').forEach(el => {
        el.removeAttribute('tabindex'); el.removeAttribute('role'); el.removeAttribute('aria-pressed');
        el.setAttribute('aria-label', el.getAttribute('aria-label').replace(/^Focus /, ''));
      });
      svg.removeAttribute('data-node-ui'); svg.removeAttribute('data-animation');
      svg.querySelectorAll('[data-animate]').forEach(el => el.removeAttribute('data-animate'));
      // Static exported images do not pretend that nodes are buttons.
      const description = svg.querySelector('desc');
      description.textContent = 'Read ' + (prefix.endsWith('-mobile') ? 'top to bottom' : 'across the top row, down, then back across the bottom row') + '. All four steps are visible. Highlighted nodes identify the failure. ' + title;
      if (prefix.endsWith('-mobile')) {
        // Align the decorative lane heading with the vertical node stack. Leaving
        // the native full-canvas heading at x=54 would shrink phone text needlessly.
        const left = Math.min(...[...svg.querySelectorAll('[data-node-id] > .c-mask')].map(el => Number(el.getAttribute('x'))));
        svg.querySelectorAll('text').forEach(el => {
          if (!el.closest('[data-node-id]') && !el.closest('[data-edge-from]')) el.setAttribute('x', left);
        });
      }
      const box = svg.getBBox();
      svg.setAttribute('viewBox', [box.x - 12, box.y - 12, box.width + 24, box.height + 24].join(' '));
      // Includes for both topics and both views share a page: namespace every ID.
      const ids = new Map([...svg.querySelectorAll('[id]')].map(el => [el.id, prefix + '-' + el.id]));
      svg.querySelectorAll('*').forEach(el => {
        for (const attribute of [...el.attributes]) {
          let value = attribute.value;
          if (attribute.name === 'id') value = ids.get(value) || value;
          else for (const [oldId, newId] of ids) value = value.replaceAll('url(#' + oldId + ')', 'url(#' + newId + ')');
          el.setAttribute(attribute.name, value);
        }
      });
      svg.setAttribute('aria-labelledby', prefix + '-archify-diagram-title ' + prefix + '-archify-diagram-description');
      return svg.outerHTML;
    }, { prefix: 'php-' + key, title: definition.title });
    fs.writeFileSync('_includes/php-lockers/' + key + '.svg', '<!-- Generated with Archify 3.2.0; see img/php-lockers/README.md and LICENSE-Archify.txt. -->\n' + svg.replace(/[ \t]+$/gm, '') + '\n');
    console.log('PASS ' + key);
  }
} finally { await browser.close(); }
