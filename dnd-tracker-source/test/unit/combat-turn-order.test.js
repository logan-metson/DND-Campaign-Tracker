// Covers computeInitiativeOrder / currentCombatRef / advanceCombatTurn (js/04-class-leveling-data.js)
// and applyDamageToTarget / advanceIfCurrentTurnDied (js/05-app-state.js) — the combat turn-order
// state machine, which the project README flags as deliberately id-based (not index-based) so it
// survives combatants being added/removed mid-fight. These tests exist to catch a regression in
// that specific guarantee, not just to exercise the code.
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { loadFlattenedApp } = require('../../test-support/loadApp.js');

// Arrays returned by app functions belong to the jsdom window's realm, not this file's — strict
// deepEqual treats same-shape arrays from different realms as unequal, so results get rehomed via
// the bare (Node-realm) Array.from before comparing against a plain literal.
let win;
before(() => { win = loadFlattenedApp(); });
after(() => { win.close(); });

function pc(overrides) {
  return Object.assign({
    id: 'pc1', status: 'alive', initiative: 10,
    abilities: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
  }, overrides);
}
function enemy(overrides) {
  return Object.assign({
    id: 'en1', status: 'alive', initiative: 10,
    abilities: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
  }, overrides);
}

test('computeInitiativeOrder sorts descending by initiative', () => {
  const camp = {
    characters: [pc({ id: 'a', initiative: 5 }), pc({ id: 'b', initiative: 20 })],
    enemies: [enemy({ id: 'c', initiative: 12 })],
  };
  const order = Array.from(win.computeInitiativeOrder(camp), x => x.ref.id);
  assert.deepEqual(order, ['b', 'c', 'a']);
});

test('computeInitiativeOrder breaks ties by DEX modifier, higher first', () => {
  const camp = {
    characters: [
      pc({ id: 'low-dex', initiative: 10, abilities: { ...pc().abilities, dex: 8 } }),
      pc({ id: 'high-dex', initiative: 10, abilities: { ...pc().abilities, dex: 18 } }),
    ],
    enemies: [],
  };
  const order = Array.from(win.computeInitiativeOrder(camp), x => x.ref.id);
  assert.deepEqual(order, ['high-dex', 'low-dex']);
});

test('computeInitiativeOrder excludes dead enemies and fully-dead PCs, but keeps unconscious PCs', () => {
  const camp = {
    characters: [
      pc({ id: 'alive-pc', status: 'alive' }),
      pc({ id: 'unconscious-pc', status: 'unconscious' }),
      pc({ id: 'dead-pc', status: 'dead' }),
    ],
    enemies: [
      enemy({ id: 'alive-enemy', status: 'alive' }),
      enemy({ id: 'dead-enemy', status: 'dead' }),
      enemy({ id: 'fled-enemy', status: 'fled' }),
    ],
  };
  const ids = win.computeInitiativeOrder(camp).map(x => x.ref.id);
  assert.deepEqual(new Set(ids), new Set(['alive-pc', 'unconscious-pc', 'alive-enemy']));
});

test('computeInitiativeOrder sorts entities with no initiative rolled to the back', () => {
  const camp = {
    characters: [pc({ id: 'rolled', initiative: 5 }), pc({ id: 'not-rolled', initiative: null })],
    enemies: [],
  };
  const order = Array.from(win.computeInitiativeOrder(camp), x => x.ref.id);
  assert.deepEqual(order, ['rolled', 'not-rolled']);
});

function combatCampaign() {
  const chars = [pc({ id: 'pc1' })];
  const enemies = [enemy({ id: 'en1' }), enemy({ id: 'en2' })];
  return {
    characters: chars,
    enemies: enemies,
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

test('advanceCombatTurn moves forward through the order and rolls over to a new round', () => {
  const camp = combatCampaign();
  win.advanceCombatTurn(camp, 1);
  assert.equal(camp.combat.turnIndex, 1);
  win.advanceCombatTurn(camp, 1);
  assert.equal(camp.combat.turnIndex, 2);
  win.advanceCombatTurn(camp, 1); // wraps past the end
  assert.equal(camp.combat.turnIndex, 0);
  assert.equal(camp.combat.round, 2);
});

test('advanceCombatTurn skips a dead enemy but never skips a PC, even unconscious', () => {
  const camp = combatCampaign();
  camp.enemies[0].status = 'dead'; // en1, next in order after pc1
  win.advanceCombatTurn(camp, 1);
  assert.equal(win.currentCombatRef(camp).id, 'en2', 'should skip past the dead en1 straight to en2');

  const camp2 = combatCampaign();
  camp2.characters[0].status = 'unconscious';
  camp2.combat.turnIndex = 2; // on en2, about to wrap to pc1
  win.advanceCombatTurn(camp2, 1);
  assert.equal(win.currentCombatRef(camp2).id, 'pc1', 'unconscious PCs still get a turn (death saves)');
});

test('advanceCombatTurn is resilient when a combatant is removed mid-fight (id-based, not index-based)', () => {
  const camp = combatCampaign();
  camp.enemies = camp.enemies.filter(e => e.id !== 'en1'); // en1 removed entirely, order still references it
  win.advanceCombatTurn(camp, 1); // from pc1 towards en1, which no longer exists
  assert.equal(win.currentCombatRef(camp).id, 'en2', 'should skip past the now-missing en1 to en2');
});

test('applyDamageToTarget absorbs with temp HP before current HP', () => {
  const target = { hp: { current: 10, max: 10, temp: 5 }, status: 'alive' };
  const result = win.applyDamageToTarget(target, 'enemy', 3);
  assert.equal(target.hp.temp, 2);
  assert.equal(target.hp.current, 10);
  assert.equal(result.died, false);
});

test('applyDamageToTarget clamps current HP at 0 and flags an enemy as dead exactly once', () => {
  const target = { hp: { current: 5, max: 20, temp: 0 }, status: 'alive' };
  const result = win.applyDamageToTarget(target, 'enemy', 999);
  assert.equal(target.hp.current, 0);
  assert.equal(target.status, 'dead');
  assert.equal(result.died, true);
});

test('applyDamageToTarget never flips a PC to dead status (unconscious rules, not enemy rules)', () => {
  const target = { hp: { current: 5, max: 20, temp: 0 }, status: 'alive', deathSaves: { successes: 0, failures: 0 } };
  win.applyDamageToTarget(target, 'pc', 999);
  assert.equal(target.hp.current, 0);
  assert.equal(target.status, 'alive', 'PCs go to 0 HP, not a dead status, per standard 5e rules');
});

test('advanceIfCurrentTurnDied auto-skips a corpse only if it was actually the current turn', () => {
  const camp = combatCampaign(); // turnIndex 0 = pc1's turn
  win.advanceIfCurrentTurnDied(camp, camp.enemies[0]); // en1 dying isn't the current turn
  assert.equal(camp.combat.turnIndex, 0, 'should not advance — en1 was not up');

  camp.combat.turnIndex = 1; // now it IS en1's turn
  camp.enemies[0].status = 'dead';
  win.advanceIfCurrentTurnDied(camp, camp.enemies[0]);
  assert.equal(camp.combat.turnIndex, 2, 'should advance past the dead current-turn enemy');
});
