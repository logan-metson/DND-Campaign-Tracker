// Black-box test of the actual thing this feature promises: make a change in the real shipped app,
// and confirm it lands in real localStorage exactly as a subsequent load would need it — including
// the "closed the browser mid-session" case, which is the whole reason autosave exists in the first
// place (see js/08-autosave-and-confirm.js's opening comment).
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { loadBuiltDist } = require('../../test-support/loadApp.js');

const STORAGE_KEY = 'dnd-tracker:campaign:current';

let win, document;

before(async () => {
  win = loadBuiltDist();
  document = win.document;
  await new Promise(resolve => win.setTimeout(resolve, 50));
});

after(() => { win.close(); });

test('nothing is persisted yet on a fresh load with no changes made', () => {
  assert.equal(win.localStorage.getItem(STORAGE_KEY), null);
});

test('adding a character autosaves to real localStorage within the debounce window', async () => {
  document.querySelector('[data-action="add-char"]').click();

  // Autosave debounces 1.5s after the last change (js/08-autosave-and-confirm.js) — wait past that
  // rather than asserting immediately, so this test would actually fail if the debounce broke.
  await new Promise(resolve => win.setTimeout(resolve, 1700));

  const raw = win.localStorage.getItem(STORAGE_KEY);
  assert.ok(raw, 'expected the campaign to be autosaved to localStorage');
  const saved = JSON.parse(raw);
  assert.equal(saved.characters.length, 1);
  assert.equal(saved.characters[0].name, 'New Adventurer');
});

test('the "storage unavailable" warning is gone once a save has actually succeeded', () => {
  const indicatorText = document.querySelector('.saved-indicator').textContent;
  assert.doesNotMatch(indicatorText, /storage unavailable/);
  assert.doesNotMatch(indicatorText, /never/);
});

test('a change is flushed to localStorage immediately on pagehide, without waiting for the debounce', async () => {
  document.querySelector('[data-action="add-char"]').click(); // second character, still within debounce of the first
  const beforeCount = JSON.parse(win.localStorage.getItem(STORAGE_KEY)).characters.length;
  assert.equal(beforeCount, 1, 'sanity check: the second add should not have autosaved yet');

  win.dispatchEvent(new win.Event('pagehide'));
  // runAutosave itself is async (it awaits safeSet), so give its promise chain one microtask tick
  // to resolve, but crucially NOT the full 1.5s debounce window this test is trying to prove it skips.
  await new Promise(resolve => win.setTimeout(resolve, 0));

  const afterCount = JSON.parse(win.localStorage.getItem(STORAGE_KEY)).characters.length;
  assert.equal(afterCount, 2, 'pagehide should flush the pending change immediately, simulating the browser being closed mid-session');
});
