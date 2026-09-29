import assert from 'node:assert/strict';
import path from 'node:path';
import test from 'node:test';
import { pathToFileURL } from 'node:url';

const root = path.resolve(import.meta.dirname, '..');
const load = () => import(pathToFileURL(path.join(root, 'scripts', 'ast-impact.mjs')).href);

test('parseListPayload accepts schema v2 and legacy v1 shapes', async () => {
  const impact = await load();
  const v2 = impact.parseListPayload({
    schema_version: 2,
    items: [{ path: 'a.ts' }, { path: 'b.ts' }],
    pagination: { limit: 50, returned: 2, total: 2, truncated: false },
  });
  assert.equal(v2.items.length, 2);
  assert.equal(v2.truncated, false);
  assert.equal(v2.total, 2);

  const truncated = impact.parseListPayload({
    schema_version: 2,
    items: new Array(100).fill({ path: 'x.ts' }),
    pagination: { limit: 100, returned: 100, total: 342, truncated: true },
  });
  assert.equal(truncated.truncated, true, 'callers beyond -l must be visible to the report');

  const v1 = impact.parseListPayload([{ path: 'old.ts' }]);
  assert.equal(v1.items.length, 1);
  assert.equal(v1.truncated, false);
});

test('parseOutline reads json symbols and the text fallback', async () => {
  const impact = await load();
  const fromJson = impact.parseOutline({ symbols: [{ line: 10, name: 'alpha' }, { line: 30, name: 'beta' }] }, '');
  assert.deepEqual(fromJson, [{ line: 10, name: 'alpha' }, { line: 30, name: 'beta' }]);

  const fromText = impact.parseOutline(null, 'Outline of plugin/x.js:\n  :10 alpha [function]\n  :30 beta [constant]\n');
  assert.deepEqual(fromText, [{ line: 10, name: 'alpha' }, { line: 30, name: 'beta' }]);
});

test('parseDiffHunks maps added-line ranges per file', async () => {
  const impact = await load();
  const diff = [
    'diff --git a/a.ts b/a.ts',
    '--- a/a.ts',
    '+++ b/a.ts',
    '@@ -1,2 +10,0 @@',
    '-gone',
    '+++ b/b.ts',
    '@@ -0,0 +42,3 @@',
    '+new',
  ].join('\n');
  const hunks = impact.parseDiffHunks(diff);
  assert.deepEqual(hunks.get('a.ts'), [[10, 0]]);
  assert.deepEqual(hunks.get('b.ts'), [[42, 3]]);
});

test('changedSymbols intersects symbol ranges with hunks only', async () => {
  const impact = await load();
  const symbols = [
    { line: 10, name: 'untouched' },
    { line: 20, name: 'edited' },
    { line: 40, name: 'after' },
  ];
  const touched = impact.changedSymbols(symbols, [[22, 1]]);
  assert.deepEqual(touched, [{ line: 20, name: 'edited' }], 'range = [symbol line, next symbol line)');

  const appended = impact.changedSymbols(symbols, [[99, 1]]);
  assert.deepEqual(appended, [{ line: 40, name: 'after' }], 'last symbol range is open-ended');

  assert.deepEqual(impact.changedSymbols(symbols, [[1, 1]]), []);
});
