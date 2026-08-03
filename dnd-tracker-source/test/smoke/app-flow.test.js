// Black-box smoke test: loads the REAL, unmodified dist/dnd-campaign-tracker.html (run `npm run
// build` first if source has changed — this deliberately does not build for you, so a stale dist
// file fails loudly instead of silently testing old code) and drives it purely through clicks and
// the DOM, the same way a person at the table would. This is the safety net for the app's central,
// highest-traffic workflow — add a character, take damage, spawn an enemy, run initiative and a
// couple of turns — the exact kind of multi-step interaction that a template-literal typo or a
// render() ordering bug tends to break, and that pure unit tests of individual functions can't see.
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { loadBuiltDist } = require('../../test-support/loadApp.js');

let win, document;

before(async () => {
  win = loadBuiltDist();
  document = win.document;
  // loadInitial() (storage read) and loadSrdBundle() (embedded JSON parse) both fire on load and
  // each end in their own render() — give their pending promises/microtasks room to settle before
  // the first interaction, or an early click can land mid-init.
  await new Promise(resolve => win.setTimeout(resolve, 50));
});

after(() => { win.close(); });

function click(el) {
  assert.ok(el, 'expected an element to click, got null');
  el.click();
}

test('starts on the Party tab with no characters yet', () => {
  assert.ok(document.querySelector('.add-char-btn'), 'Add Character button should be present');
  assert.equal(document.querySelectorAll('.char-chip').length, 0);
});

test('Add Character creates a character with the default starting HP', () => {
  click(document.querySelector('[data-action="add-char"]'));
  assert.equal(document.querySelectorAll('.char-chip').length, 1);
  const hpText = document.querySelector('.content').textContent;
  assert.match(hpText, /10\s*\/\s*10/, 'a freshly-added character should start at 10/10 HP (blankCharacter default)');
});

test('the HP down-step button reduces current HP and re-renders it, without touching max HP', () => {
  const dmgBtn = document.querySelector('[data-action="hp-step"][data-amt="-1"]');
  click(dmgBtn);
  click(document.querySelector('[data-action="hp-step"][data-amt="-1"]'));
  click(document.querySelector('[data-action="hp-step"][data-amt="-1"]'));
  const hpText = document.querySelector('.content').textContent;
  assert.match(hpText, /7\s*\/\s*10/, 'three -1 HP clicks from 10/10 should land on 7/10');
});

test('switching to the Enemies tab and spawning a preset adds an enemy to the board', () => {
  click(document.querySelector('[data-action="set-tab"][data-tab="enemies"]'));
  assert.ok(document.getElementById('presetSelect'), 'preset dropdown should be present on the Enemies tab');

  const select = document.getElementById('presetSelect');
  assert.ok(select.options.length > 0, 'expected at least one monster preset to be available');
  select.value = select.options[0].value;

  click(document.querySelector('[data-action="spawn-preset"]'));
  assert.equal(document.querySelectorAll('.enemy-chip, [data-action="select-enemy"]').length, 1,
    'spawning one preset at the default quantity should add exactly one enemy');
});

test('rolling battle initiative and starting combat shows a live combat bar with a named turn', () => {
  click(document.querySelector('[data-action="set-tab"][data-tab="dice"]'));
  click(document.querySelector('[data-action="roll-battle-initiative"]'));
  click(document.querySelector('[data-action="start-combat"]'));

  const bar = document.querySelector('.combat-bar');
  assert.ok(bar, 'combat bar should appear once combat has started');
  assert.match(bar.querySelector('.combat-bar-round').textContent, /Round 1/);
  assert.doesNotMatch(bar.querySelector('.combat-bar-name').textContent, /no active combatants/);
});

test('Next Turn actually advances whose turn it is', () => {
  const before = document.querySelector('.combat-bar-name').textContent;
  click(document.querySelector('[data-action="next-turn"]'));
  const after = document.querySelector('.combat-bar-name').textContent;
  assert.notEqual(before, after, 'with two combatants on the board, advancing the turn should change whose name is shown');
});

test('the combat bar persists across a tab switch (it is rendered outside the tab content)', () => {
  click(document.querySelector('[data-action="set-tab"][data-tab="party"]'));
  assert.ok(document.querySelector('.combat-bar'), 'combat bar should still be visible after switching tabs mid-fight');
});
