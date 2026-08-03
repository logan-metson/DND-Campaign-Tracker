// Covers safeGet/safeSet/safeDelete/safeList (js/00-bootstrap-storage.js) — the localStorage-backed
// persistence layer. This is the highest-stakes code in the app (losing a campaign is a real problem
// for the person running it), so these hit the real jsdom localStorage implementation directly
// rather than mocking it, and check both directions: that our functions write what a raw
// localStorage read expects, and that they correctly read back what a raw localStorage write left
// behind — so a bug in either the key-prefixing or the read/write logic itself would show up here.
const { test, before, beforeEach, after } = require('node:test');
const assert = require('node:assert/strict');
const { loadFlattenedApp } = require('../../test-support/loadApp.js');

let win;
before(() => { win = loadFlattenedApp(); });
after(() => { win.close(); });
beforeEach(() => { win.localStorage.clear(); });

test('safeSet writes to real localStorage under a prefixed key, not the raw key', async () => {
  await win.safeSet('campaign:current', '{"hello":"world"}');
  assert.equal(win.localStorage.getItem('campaign:current'), null, 'the raw unprefixed key should not exist');
  assert.equal(win.localStorage.getItem('dnd-tracker:campaign:current'), '{"hello":"world"}');
});

test('safeGet reads back exactly what safeSet wrote', async () => {
  await win.safeSet('campaign:current', '{"a":1}');
  const result = await win.safeGet('campaign:current');
  assert.equal(result, '{"a":1}');
});

test('safeGet returns null for a key that was never set', async () => {
  const result = await win.safeGet('nope-never-set');
  assert.equal(result, null);
});

test('safeGet correctly reads a value that was written directly via the real localStorage API (not through safeSet)', async () => {
  win.localStorage.setItem('dnd-tracker:some-key', 'raw value');
  const result = await win.safeGet('some-key');
  assert.equal(result, 'raw value');
});

test('safeDelete removes only the targeted key, leaving other keys untouched', async () => {
  await win.safeSet('campaign:current', 'keep-me-not');
  await win.safeSet('campaign:snapshot-index', 'keep-me');
  await win.safeDelete('campaign:current');
  assert.equal(await win.safeGet('campaign:current'), null);
  assert.equal(await win.safeGet('campaign:snapshot-index'), 'keep-me');
});

test('safeList returns unprefixed keys matching a prefix, and excludes non-matching ones', async () => {
  await win.safeSet('campaign:snap:abc', '{}');
  await win.safeSet('campaign:snap:def', '{}');
  await win.safeSet('campaign:current', '{}'); // should NOT show up under the 'campaign:snap:' prefix
  const keys = Array.from(await win.safeList('campaign:snap:'));
  assert.deepEqual(keys.sort(), ['campaign:snap:abc', 'campaign:snap:def']);
});

// jsdom's Storage is a spec-compliant legacy platform object: plain assignment to one of its methods
// (e.g. `localStorage.setItem = fn`) is silently ignored rather than actually overriding it, so a
// mock has to fully replace the `window.localStorage` property itself via defineProperty.
function withMockStorage(mockStorage, fn) {
  const original = Object.getOwnPropertyDescriptor(win, 'localStorage');
  Object.defineProperty(win, 'localStorage', { configurable: true, value: mockStorage });
  return Promise.resolve(fn()).finally(() => {
    Object.defineProperty(win, 'localStorage', original);
  });
}

test('safeSet returns false (not a throw) when the underlying write fails, e.g. quota exceeded', async () => {
  await withMockStorage({
    setItem() { throw new Error('QuotaExceededError'); },
  }, async () => {
    const ok = await win.safeSet('campaign:current', 'x'.repeat(10));
    assert.equal(ok, false);
  });
});

test('safeGet returns null (not a throw) when the underlying read fails', async () => {
  await withMockStorage({
    getItem() { throw new Error('storage disabled'); },
  }, async () => {
    const result = await win.safeGet('campaign:current');
    assert.equal(result, null);
  });
});

test('after a mocked failure is removed, real storage is unaffected and still works', async () => {
  await win.safeSet('campaign:current', 'still works');
  assert.equal(await win.safeGet('campaign:current'), 'still works');
});
