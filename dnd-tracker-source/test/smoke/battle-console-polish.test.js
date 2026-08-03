// Covers the follow-up fixes from real playtesting feedback on the Battle Console:
//   - Cast/attack buttons that can't actually go through (out of slots/uses, not recharged) now
//     always fire and explain why via a toast, instead of being a real `disabled` HTML button that
//     silently swallows the click.
//   - Known spells with SRD damage/save data show a compact stat line in the console.
//   - A party+enemy HP quick-reference strip is always visible on the Dice Roller tab.
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
function toastText() {
  return document.getElementById('toast').textContent;
}

test('set up a character with a spellcasting ability, an unfunded custom spell, and a goblin', () => {
  click(document.querySelector('[data-action="add-char"]'));
  setField('[data-bind="characters.0.spellcasting.ability"]', 'int');
  click(document.querySelector('[data-action="add-custom-spell"]'));
  setField('[data-bind="characters.0.initiative"]', 20); // acts first, deterministic turn order

  click(document.querySelector('[data-action="set-tab"][data-tab="enemies"]'));
  const select = document.getElementById('presetSelect');
  select.value = 'goblin';
  click(document.querySelector('[data-action="spawn-preset"]'));
  setField('[data-bind="enemies.0.initiative"]', 5);
  // Give the goblin's first attack a recharge requirement that starts unavailable, so its Attack
  // button is in the "blocked" state this test needs.
  setField('[data-bind="enemies.0.attacks.0.recharge"]', '5');
  const rechargeInput = document.querySelector('[data-bind="enemies.0.attacks.0.recharge"]');
  assert.equal(rechargeInput.value, '5');

  click(document.querySelector('[data-action="set-tab"][data-tab="dice"]'));
  click(document.querySelector('[data-action="start-combat"]'));
});

test('casting a spell with no spell slots shows an explanatory toast instead of doing nothing', () => {
  const castBtn = document.querySelector('.card[style*="border-color:var(--brass)"] [data-action="cast-spell"]');
  assert.ok(castBtn, 'cast button should be present (and NOT a real disabled button) even at 0/0 slots');
  assert.equal(castBtn.disabled, false, 'the button must not be a real disabled element, or the click below would not even fire');
  click(castBtn);
  assert.match(toastText(), /no level 1 slots remaining/i);
});

test('a known SRD spell with damage shows a compact stat line in the console', () => {
  click(document.querySelector('[data-action="set-tab"][data-tab="party"]'));
  const search = document.querySelector('[data-spell-search="0"]');
  setField('[data-spell-search="0"]', 'Fire Bolt');
  search.dispatchEvent(new win.Event('input', { bubbles: true }));
  const result = document.querySelector('#spellResults-0 .search-result[data-spell-index="fire-bolt"]');
  click(result);
  click(document.querySelector('[data-action="set-tab"][data-tab="dice"]'));

  const consoleCard = document.querySelector('.card[style*="border-color:var(--brass)"]');
  const spellRow = Array.from(consoleCard.querySelectorAll('.spell-row')).find(r => r.textContent.includes('Fire Bolt'));
  assert.ok(spellRow, 'Fire Bolt should appear in the console spell list');
  assert.match(spellRow.textContent, /fire dmg/i, 'the compact stat line (damage/save info) should be visible without having to cast first');
});

test('an unrecharged enemy attack shows an explanatory toast instead of doing nothing, once it is up', () => {
  click(document.querySelector('[data-action="next-turn"]')); // -> goblin's turn
  // Setting the recharge threshold (in the setup test) also resets rechargeAvailable to true --
  // that's existing, correct behavior (a build tweak, not "the attack just got used"). So fire the
  // attack once for real first to actually consume the recharge before testing the blocked state.
  click(document.querySelector('.card[style*="border-color:var(--brass)"] [data-action="roll-attack"][data-atk="0"]'));

  const atkBtn = document.querySelector('.card[style*="border-color:var(--brass)"] [data-action="roll-attack"][data-atk="0"]');
  assert.equal(atkBtn.disabled, false, 'the recharge-blocked attack must still be clickable');
  click(atkBtn);
  assert.match(toastText(), /hasn.t recharged/i);
});

test('the party/enemy HP strip is visible on the Dice Roller tab and reflects real state', () => {
  const strip = Array.from(document.querySelectorAll('.card')).find(c => c.querySelector('h3')?.textContent.includes('Party & Enemy HP'));
  assert.ok(strip, 'HP quick-reference card should be present');
  const chips = strip.querySelectorAll('.char-chip');
  assert.equal(chips.length, 2, 'one chip for the character, one for the goblin');
  assert.match(strip.textContent, /New Adventurer/);
  assert.match(strip.textContent, /Goblin/);
});

test('clicking a chip in the HP strip jumps to that combatant\'s full sheet', () => {
  const strip = Array.from(document.querySelectorAll('.card')).find(c => c.querySelector('h3')?.textContent.includes('Party & Enemy HP'));
  const goblinChip = Array.from(strip.querySelectorAll('[data-action="jump-to-enemy"]')).find(c => c.textContent.includes('Goblin'));
  click(goblinChip);
  const activeTabBtn = document.querySelector('[data-action="set-tab"].active');
  assert.equal(activeTabBtn.dataset.tab, 'enemies');
  assert.ok(document.querySelector('.enemy-chip.active'), 'the goblin should now be the selected/active enemy on its tab');
});
