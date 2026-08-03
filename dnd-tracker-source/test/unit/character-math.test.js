// Covers levelForXp and pointBuySpent (js/04-class-leveling-data.js, js/05-app-state.js) — small
// pure lookups, but ones where an off-by-one at a table boundary is exactly the kind of bug that's
// invisible in normal play (a character sits at 299 XP for a session or two) and only shows up when
// someone happens to hit the exact threshold.
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { loadFlattenedApp } = require('../../test-support/loadApp.js');

let win;
before(() => { win = loadFlattenedApp(); });
after(() => { win.close(); });

test('levelForXp: 0 XP is level 1', () => {
  assert.equal(win.levelForXp(0), 1);
});

test('levelForXp: exactly at a table threshold reaches that level, one short does not', () => {
  assert.equal(win.levelForXp(299), 1);
  assert.equal(win.levelForXp(300), 2);
  assert.equal(win.levelForXp(2699), 3);
  assert.equal(win.levelForXp(2700), 4);
});

test('levelForXp: caps at level 20 even with absurd XP', () => {
  assert.equal(win.levelForXp(10_000_000), 20);
});

test('levelForXp: treats missing/undefined XP as 0, not NaN', () => {
  assert.equal(win.levelForXp(undefined), 1);
});

test('pointBuySpent: all-8s (no points spent) costs 0', () => {
  assert.equal(win.pointBuySpent({ str: 8, dex: 8, con: 8, int: 8, wis: 8, cha: 8 }), 0);
});

test('pointBuySpent: matches the standard PHB cost table, including the 14/15 cost jump', () => {
  // 13 costs 5, 14 costs 7 (not 6) — the "every 15/14 costs 2" point-buy quirk that's easy to typo.
  assert.equal(win.pointBuySpent({ str: 13, dex: 8, con: 8, int: 8, wis: 8, cha: 8 }), 5);
  assert.equal(win.pointBuySpent({ str: 14, dex: 8, con: 8, int: 8, wis: 8, cha: 8 }), 7);
  assert.equal(win.pointBuySpent({ str: 15, dex: 8, con: 8, int: 8, wis: 8, cha: 8 }), 9);
});

test('pointBuySpent: a full 15/15/15/8/8/8 spread spends exactly the 27-point budget', () => {
  const spent = win.pointBuySpent({ str: 15, dex: 15, con: 15, int: 8, wis: 8, cha: 8 });
  assert.equal(spent, 27);
});

test('profBonus follows the standard 5e progression breakpoints (levels 1-4, 5-8, 9-12, 13-16, 17-20)', () => {
  assert.equal(win.profBonus(1), 2);
  assert.equal(win.profBonus(4), 2);
  assert.equal(win.profBonus(5), 3);
  assert.equal(win.profBonus(8), 3);
  assert.equal(win.profBonus(9), 4);
  assert.equal(win.profBonus(17), 6);
  assert.equal(win.profBonus(20), 6);
});
