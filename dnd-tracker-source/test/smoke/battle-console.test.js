// Black-box test of the Battle Console (js/14a-render-battle-console.js) against the real shipped
// app: a compact, single-place view of whoever's turn it currently is, shown on the Dice Roller tab
// once combat starts. Every action here dispatches the SAME handlers as the Party/Enemies tabs
// (roll-weapon-attack, cast-spell, roll-attack, hp-step/enemy-hp-step) — this test exists to catch a
// regression in that wiring, not to re-test attack/damage math already covered elsewhere.
//
// Initiative is set directly via the bound inputs instead of using "Roll Battle Initiative," so turn
// order is deterministic (the character always goes first) rather than depending on a random roll.
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { loadBuiltDist } = require('../../test-support/loadApp.js');

let win, document;

before(async () => {
  win = loadBuiltDist();
  document = win.document;
  await new Promise(resolve => win.setTimeout(resolve, 50));
});

after(() => { win.close(); });

function click(el) {
  assert.ok(el, 'expected an element to click, got null');
  el.click();
}
function setField(selector, value) {
  const el = document.querySelector(selector);
  assert.ok(el, `expected to find ${selector}`);
  if (el.type === 'checkbox') el.checked = value; else el.value = value;
  el.dispatchEvent(new win.Event('change', { bubbles: true }));
}

test('set up one character with an equipped weapon and one enemy, both with fixed initiative', () => {
  click(document.querySelector('[data-action="add-char"]'));
  click(document.querySelector('[data-action="add-custom-item"]'));
  setField('[data-bind="characters.0.inventory.0.name"]', 'Longsword');
  setField('[data-bind="characters.0.inventory.0.tags"]', 'Weapon · 1d8 Slashing · Martial');
  setField('[data-bind="characters.0.inventory.0.equipped"]', true);
  setField('[data-bind="characters.0.initiative"]', 20);
  assert.ok(document.querySelector('[data-action="roll-weapon-attack"][data-idx="0"][data-item="0"]'),
    'the extracted renderWeaponAttackRow should still render an Attack row on the Party tab');

  click(document.querySelector('[data-action="set-tab"][data-tab="enemies"]'));
  const select = document.getElementById('presetSelect');
  select.value = 'goblin';
  click(document.querySelector('[data-action="spawn-preset"]'));
  setField('[data-bind="enemies.0.initiative"]', 5);
});

test('no battle console outside of active combat', () => {
  click(document.querySelector('[data-action="set-tab"][data-tab="dice"]'));
  assert.equal(document.querySelector('.card[style*="border-color:var(--brass)"]'), null);
});

test('starting combat shows the console for the character (higher fixed initiative goes first)', () => {
  click(document.querySelector('[data-action="start-combat"]'));
  const heading = document.querySelector('.card[style*="border-color:var(--brass)"] h3');
  assert.ok(heading, 'battle console card should appear once combat starts');
  assert.match(heading.textContent, /turn.*party/i);
  const actionChip = document.querySelector('[data-action="toggle-current-action"]');
  assert.match(actionChip.textContent, /available/);
});

test('attacking from the console marks the Action used, and the same weapon row still works from here', () => {
  const consoleAttackBtn = document.querySelector('.card[style*="border-color:var(--brass)"] [data-action="roll-weapon-attack"]');
  click(consoleAttackBtn);
  const actionChip = document.querySelector('[data-action="toggle-current-action"]');
  assert.match(actionChip.textContent, /✓ used/);
});

test('the manual toggle is a real escape hatch — clicking Action again flips it back', () => {
  click(document.querySelector('[data-action="toggle-current-action"]'));
  assert.match(document.querySelector('[data-action="toggle-current-action"]').textContent, /available/);
});

test('advancing the turn shows the enemy, with a freshly-reset action economy', () => {
  click(document.querySelector('[data-action="next-turn"]'));
  const heading = document.querySelector('.card[style*="border-color:var(--brass)"] h3');
  assert.match(heading.textContent, /Goblin.*turn.*enemy/i);
  const actionChip = document.querySelector('[data-action="toggle-current-action"]');
  assert.match(actionChip.textContent, /available/, 'a new turn should never inherit a used flag from someone else');
});

test('an enemy attack from the console marks its Action used too', () => {
  const atkBtn = document.querySelector('.card[style*="border-color:var(--brass)"] [data-action="roll-attack"]');
  click(atkBtn);
  const actionChip = document.querySelector('[data-action="toggle-current-action"]');
  assert.match(actionChip.textContent, /✓ used/);
});

test('a full round back around resets the action economy again (not just a one-time reset)', () => {
  click(document.querySelector('[data-action="next-turn"]')); // -> back to the character, round 2
  const heading = document.querySelector('.card[style*="border-color:var(--brass)"] h3');
  assert.match(heading.textContent, /New Adventurer.*turn.*party.*round 2/i);
  const actionChip = document.querySelector('[data-action="toggle-current-action"]');
  assert.match(actionChip.textContent, /available/);
});

test('HP stepped from the console is the same state shown on the Enemies tab (no separate copy of the data)', () => {
  click(document.querySelector('[data-action="next-turn"]')); // -> goblin's turn again
  // Goblin presets roll their own HP from hit dice on spawn, so it's not a fixed number — read the
  // actual value rather than assuming one.
  const hpBefore = Number(document.querySelector('.card[style*="border-color:var(--brass)"] .hp-row strong').textContent.split('/')[0]);
  const dmgBtn = document.querySelector('.card[style*="border-color:var(--brass)"] [data-action="enemy-hp-step"][data-amt="-1"]');
  click(dmgBtn);
  click(document.querySelector('[data-action="set-tab"][data-tab="enemies"]'));
  const hpInput = document.querySelector('[data-bind="enemies.0.hp.current"]');
  assert.equal(Number(hpInput.value), hpBefore - 1, 'the same HP change made from the console should be visible on the Enemies tab, same shared state.campaign');
});
