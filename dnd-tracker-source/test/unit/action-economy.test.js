// Covers resetActionEconomy / markTurnActionUsed (js/04-class-leveling-data.js) and their wiring
// into advanceCombatTurn — the "can't accidentally take two turns worth of actions" feature. The
// core guarantee under test: action/bonus-action state only ever changes for whoever the tracker
// currently has "up," and always starts fresh the moment a turn actually begins.
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { loadFlattenedApp } = require('../../test-support/loadApp.js');

let win;
before(() => { win = loadFlattenedApp(); });
after(() => { win.close(); });

function pc(overrides) {
  return Object.assign({
    id: 'pc1', status: 'alive', initiative: 10, actionUsed: false, bonusActionUsed: false,
    abilities: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
  }, overrides);
}
function enemy(overrides) {
  return Object.assign({
    id: 'en1', status: 'alive', initiative: 10, actionUsed: false, bonusActionUsed: false,
    abilities: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
  }, overrides);
}
function combatCampaign() {
  return {
    characters: [pc({ id: 'pc1' })],
    enemies: [enemy({ id: 'en1' }), enemy({ id: 'en2' })],
    combat: {
      round: 1,
      turnIndex: 0,
      order: [
        { id: 'pc1', kind: 'pc', name: 'Hero' },
        { id: 'en1', kind: 'enemy', name: 'Goblin 1' },
        { id: 'en2', kind: 'enemy', name: 'Goblin 2' },
      ],
    },
  };
}

test('resetActionEconomy clears both flags', () => {
  const ref = { actionUsed: true, bonusActionUsed: true };
  win.resetActionEconomy(ref);
  assert.equal(ref.actionUsed, false);
  assert.equal(ref.bonusActionUsed, false);
});

test('resetActionEconomy is a no-op (not a throw) when given no one currently up', () => {
  assert.doesNotThrow(() => win.resetActionEconomy(null));
});

test('markTurnActionUsed marks the action flag for whoever is actually current', () => {
  const camp = combatCampaign(); // turnIndex 0 = pc1's turn
  const pc1 = camp.characters[0];
  win.markTurnActionUsed(camp, pc1, false);
  assert.equal(pc1.actionUsed, true);
  assert.equal(pc1.bonusActionUsed, false);
});

test('markTurnActionUsed with isBonusAction=true marks the bonus action flag instead', () => {
  const camp = combatCampaign();
  const pc1 = camp.characters[0];
  win.markTurnActionUsed(camp, pc1, true);
  assert.equal(pc1.actionUsed, false);
  assert.equal(pc1.bonusActionUsed, true);
});

test('markTurnActionUsed does nothing for an entity whose turn it is not', () => {
  const camp = combatCampaign(); // turnIndex 0 = pc1's turn, not en1's
  const en1 = camp.enemies[0];
  win.markTurnActionUsed(camp, en1, false);
  assert.equal(en1.actionUsed, false, 'en1 is not up, so acting off-turn should not touch its flags');
});

test('markTurnActionUsed does nothing when there is no active combat at all', () => {
  const camp = { characters: [pc()], enemies: [], combat: null };
  win.markTurnActionUsed(camp, camp.characters[0], false);
  assert.equal(camp.characters[0].actionUsed, false);
});

test('advanceCombatTurn resets the new current combatant\'s action economy', () => {
  const camp = combatCampaign();
  camp.characters[0].actionUsed = true;
  camp.characters[0].bonusActionUsed = true;
  win.advanceCombatTurn(camp, 1); // pc1 -> en1
  assert.equal(camp.enemies[0].actionUsed, false, 'en1 is starting a fresh turn');
  assert.equal(camp.characters[0].actionUsed, true, 'pc1 is not currently acting again — its own flags stay as they were until its turn comes back around');
});

test('advanceCombatTurn resets flags again once a full round comes back around to the same combatant', () => {
  const camp = combatCampaign();
  const pc1 = camp.characters[0];
  pc1.actionUsed = true;
  win.advanceCombatTurn(camp, 1); // -> en1
  win.advanceCombatTurn(camp, 1); // -> en2
  win.advanceCombatTurn(camp, 1); // -> pc1 again, round 2
  assert.equal(pc1.actionUsed, false, 'a fresh turn always starts with a clean action economy');
});
