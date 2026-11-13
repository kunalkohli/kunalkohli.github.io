// node scripts/test-smartrouter-cost.cjs
// Offline arithmetic check: no model calls and no access to private session data.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const snapshot = JSON.parse(fs.readFileSync(path.join(root, 'docs/smartrouter-cost-example.json'), 'utf8'));
const post = fs.readFileSync(path.join(root, '_posts/2026-11-11-smartrouter.md'), 'utf8');
const t = snapshot.totals;
const r = snapshot.solStandardUSDPerMillionTokens;
const output = t.output + t.reasoning;
const allInput = t.input + t.cache.read + t.cache.write;
const cached = (t.input * r.input + t.cache.read * r.cachedInputRead + t.cache.write * r.cacheWrite + output * r.outputIncludingReasoning) / 1e6;
const uncached = (allInput * r.input + output * r.outputIncludingReasoning) / 1e6;

assert.equal(snapshot.completedBuildRequests, 25);
assert.equal(snapshot.lastRequestContextTokens, 26928);
assert.equal(snapshot.reportedBuildCostUSD, 0);
assert.equal(allInput + output, 498070);
assert.equal(output, 18420);
assert.ok(Math.abs(cached - snapshot.sameUsageSolEstimateUSD) < 1e-12);
assert.ok(Math.abs(uncached - snapshot.sameUsageAllInputUncachedSolEstimateUSD) < 1e-12);
for (const value of ['$0.2980 ≈ $0.30', '498,070', '34,658', '444,992', '18,420']) {
  assert.ok(post.includes(value), 'Published post must match the snapshot: ' + value);
}
assert.ok(post.includes('same token usage and cache split'));
assert.ok(post.includes('GLM build cost $0'));
assert.ok(snapshot.description.includes('Not a measured Sol execution'));
assert.ok(snapshot.assumptions.some(value => value.includes('Astra planning') && value.includes('Jev classification')));
console.log(`PASS cost arithmetic: $${cached.toFixed(7)} cache-aware; $${uncached.toFixed(4)} all-input-uncached; actual GLM build $0`);
