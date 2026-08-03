// Covers normalizeCampaign / ensureCombatFields / ensureItemBonuses (js/06-party-attack-helpers.js,
// js/05-app-state.js) — the lazy-migration guards that let old saved campaigns keep working as
// fields get added. CLAUDE.md calls this pattern out explicitly: "every new field/schema change
// needs a backward-compatibility guard ... never break existing saved campaigns." These tests feed
// in intentionally old/incomplete shapes (as if loaded from a campaign saved before a field existed)
// and assert the guards backfill them correctly, so a future refactor of this pattern gets caught
// here instead of silently corrupting someone's real save.
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { loadFlattenedApp } = require('../../test-support/loadApp.js');

let win;
before(() => { win = loadFlattenedApp(); });
after(() => { win.close(); });

test('normalizeCampaign backfills missing top-level arrays on an old-shape campaign', () => {
  const camp = { characters: [] }; // as if saved before enemies/partyInventory/npcs/sessions existed
  const result = win.normalizeCampaign(camp);
  // .length checks rather than deepEqual([]) — the backfilled arrays belong to the jsdom window's
  // realm, and strict deepEqual treats them as unequal to a same-shape literal from this realm.
  assert.equal(result.enemies.length, 0);
  assert.equal(result.combat, null);
  assert.equal(result.partyInventory.length, 0);
  assert.equal(result.npcs.length, 0);
  assert.equal(result.sessions.length, 0);
});

test('normalizeCampaign does not clobber existing data in already-present fields', () => {
  const camp = {
    characters: [],
    enemies: [{ id: 'goblin1', attacks: [] }],
    combat: { round: 3, turnIndex: 1, order: [] },
  };
  const result = win.normalizeCampaign(camp);
  assert.equal(result.enemies.length, 1);
  assert.equal(result.enemies[0].id, 'goblin1');
  assert.equal(result.combat.round, 3, 'an active combat in progress should survive normalization untouched');
});

test('ensureCombatFields backfills initiative fields on a bare character', () => {
  const ch = { baseAbilities: { str: 10 } }; // duck-typed as a PC via baseAbilities
  win.ensureCombatFields(ch);
  assert.equal(ch.initiative, null);
  assert.equal(ch.initiativeBonus, 0);
  assert.equal(ch.initiativeMode, 'normal');
  assert.equal(ch.surprised, false);
});

test('ensureCombatFields backfills enemy-only fields (xpAwarded, saveBonus) via the attacks[] duck-type, not on characters', () => {
  const en = { attacks: [] };
  win.ensureCombatFields(en);
  assert.equal(en.xpAwarded, false);
  assert.equal(en.saveBonus, 0);

  const ch = { baseAbilities: { str: 10 } };
  win.ensureCombatFields(ch);
  assert.equal(ch.xpAwarded, undefined, 'characters have no attacks array, so enemy-only fields should not appear');
});

test('ensureCombatFields does not overwrite an initiative value that is already set', () => {
  const ch = { baseAbilities: { str: 10 }, initiative: 17 };
  win.ensureCombatFields(ch);
  assert.equal(ch.initiative, 17);
});

test('ensureItemBonuses migrates the legacy flat initiativeBonus field into bonuses.initiative and removes the old field', () => {
  const item = { name: 'Boots of Haste', initiativeBonus: 3 };
  win.ensureItemBonuses(item);
  assert.equal(item.bonuses.initiative, 3);
  assert.equal(item.initiativeBonus, undefined);
});

test('ensureItemBonuses gives a plain item (no legacy field) a full zeroed bonuses object', () => {
  const item = { name: 'Rusty Dagger' };
  win.ensureItemBonuses(item);
  assert.equal(item.bonuses.ac, 0);
  assert.equal(item.bonuses.initiative, 0);
  assert.equal(item.bonuses.str, 0);
});

test('ensureItemBonuses backfills a newly-added bonus key on an item that already has a partial bonuses object', () => {
  // Simulates a save from before a new BONUS_FIELD_DEFS key (e.g. 'cha') was added.
  const item = { bonuses: { ac: 2, speed: 0, initiative: 0, str: 0, dex: 0, con: 0, int: 0, wis: 0 } };
  win.ensureItemBonuses(item);
  assert.equal(item.bonuses.ac, 2, 'pre-existing bonus values must survive');
  assert.equal(item.bonuses.cha, 0, 'a bonus key added after this item was saved should backfill to 0');
});
