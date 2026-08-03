// Covers rollDiceFormula (js/04-class-leveling-data.js) — the "NdM+K" parser used everywhere damage
// gets rolled. Uses statistical bounds rather than exact values since it's genuinely random, but the
// bounds themselves are exact assertions about the parsing/clamping logic, not vibes.
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { loadFlattenedApp } = require('../../test-support/loadApp.js');

let win;
before(() => { win = loadFlattenedApp(); });
after(() => { win.close(); });

function repeat(fn, n = 200) {
  return Array.from({ length: n }, fn);
}

test('rollDiceFormula: "1d1" always rolls exactly 1', () => {
  for (const result of repeat(() => win.rollDiceFormula('1d1'))) {
    assert.equal(result, 1);
  }
});

test('rollDiceFormula: "3d1+5" always rolls exactly 8 (3 fixed 1s + flat mod)', () => {
  for (const result of repeat(() => win.rollDiceFormula('3d1+5'))) {
    assert.equal(result, 8);
  }
});

test('rollDiceFormula: "2d1-1" applies a negative modifier', () => {
  for (const result of repeat(() => win.rollDiceFormula('2d1-1'))) {
    assert.equal(result, 1);
  }
});

test('rollDiceFormula: "1d6" stays within [1,6] over many rolls and both ends actually occur', () => {
  const results = repeat(() => win.rollDiceFormula('1d6'), 500);
  assert.ok(results.every(r => r >= 1 && r <= 6));
  assert.ok(results.includes(1), 'sanity check the RNG is not stuck — 1 should appear in 500 rolls');
  assert.ok(results.includes(6), 'sanity check the RNG is not stuck — 6 should appear in 500 rolls');
});

test('rollDiceFormula: a large negative modifier is clamped to a minimum total of 1, never 0 or negative', () => {
  for (const result of repeat(() => win.rollDiceFormula('1d4-100'))) {
    assert.equal(result, 1);
  }
});

test('rollDiceFormula: falsy/empty formula returns 0 without throwing', () => {
  assert.equal(win.rollDiceFormula(''), 0);
  assert.equal(win.rollDiceFormula(null), 0);
  assert.equal(win.rollDiceFormula(undefined), 0);
});

test('rollDiceFormula: a plain number string is treated as a flat value, not a dice roll', () => {
  assert.equal(win.rollDiceFormula('7'), 7);
});

test('rollDiceFormula: garbage input falls back to 0 rather than throwing', () => {
  assert.equal(win.rollDiceFormula('not a formula'), 0);
});
