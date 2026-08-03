// ---------- class leveling data ----------
// Standard 5e spell-slot progression tables — these are the same class-table numbers printed in
// every full/half caster's class description, SRD-covered core math rather than proprietary text.
// Third-caster subclasses (Eldritch Knight, Arcane Trickster) and non-casters are left as manual
// slot entry, consistent with this tool's existing "subclass is name-only" honesty about coverage.
const FULL_CASTER_SLOTS = { // Bard, Cleric, Druid, Sorcerer, Wizard — indices are spell levels 1-9
  1:[2,0,0,0,0,0,0,0,0],  2:[3,0,0,0,0,0,0,0,0],  3:[4,2,0,0,0,0,0,0,0],  4:[4,3,0,0,0,0,0,0,0],
  5:[4,3,2,0,0,0,0,0,0],  6:[4,3,3,0,0,0,0,0,0],  7:[4,3,3,1,0,0,0,0,0],  8:[4,3,3,2,0,0,0,0,0],
  9:[4,3,3,3,1,0,0,0,0],  10:[4,3,3,3,2,0,0,0,0], 11:[4,3,3,3,2,1,0,0,0], 12:[4,3,3,3,2,1,0,0,0],
  13:[4,3,3,3,2,1,1,0,0], 14:[4,3,3,3,2,1,1,0,0], 15:[4,3,3,3,2,1,1,1,0], 16:[4,3,3,3,2,1,1,1,0],
  17:[4,3,3,3,2,1,1,1,1], 18:[4,3,3,3,3,1,1,1,1], 19:[4,3,3,3,3,2,1,1,1], 20:[4,3,3,3,3,2,2,1,1]
};
const HALF_CASTER_SLOTS = { // Paladin, Ranger — spellcasting begins at level 2, caps at 5th-level spells
  1:[0,0,0,0,0],  2:[2,0,0,0,0],  3:[3,0,0,0,0],  4:[3,0,0,0,0],  5:[4,2,0,0,0],
  6:[4,2,0,0,0],  7:[4,3,0,0,0],  8:[4,3,0,0,0],  9:[4,3,2,0,0],  10:[4,3,2,0,0],
  11:[4,3,3,0,0], 12:[4,3,3,0,0], 13:[4,3,3,1,0], 14:[4,3,3,1,0], 15:[4,3,3,2,0],
  16:[4,3,3,2,0], 17:[4,3,3,3,1], 18:[4,3,3,3,1], 19:[4,3,3,3,2], 20:[4,3,3,3,2]
};
const WARLOCK_PACT_SLOTS = { // Pact Magic — all slots share a single level, unlike other casters
  1:{count:1,level:1}, 2:{count:2,level:1}, 3:{count:2,level:2}, 4:{count:2,level:2}, 5:{count:2,level:3},
  6:{count:2,level:3}, 7:{count:2,level:4}, 8:{count:2,level:4}, 9:{count:2,level:5}, 10:{count:2,level:5},
  11:{count:3,level:5}, 12:{count:3,level:5}, 13:{count:3,level:5}, 14:{count:3,level:5}, 15:{count:3,level:5},
  16:{count:3,level:5}, 17:{count:4,level:5}, 18:{count:4,level:5}, 19:{count:4,level:5}, 20:{count:4,level:5}
};
const FULL_CASTERS = ['bard','cleric','druid','sorcerer','wizard'];
const HALF_CASTERS = ['paladin','ranger'];

// Ability Score Improvement levels per class — Fighter and Rogue get extra ones beyond the default set.
const ASI_LEVELS = {
  fighter: [4,6,8,12,14,16,19],
  rogue: [4,8,10,12,16,19],
  default: [4,8,12,16,19]
};
function getAsiLevels(classIndex){ return ASI_LEVELS[classIndex] || ASI_LEVELS.default; }

// Standard PHB Character Advancement table — total XP needed to REACH each level (index = level).
// Index 0 is unused so CHARACTER_XP_TABLE[level] reads naturally.
const CHARACTER_XP_TABLE = [
  null, 0, 300, 900, 2700, 6500, 14000, 23000, 34000, 48000, 64000,
  85000, 100000, 120000, 140000, 165000, 195000, 225000, 265000, 305000, 355000
];
// Highest level a given total XP qualifies for (capped at 20).
function levelForXp(xp){
  let lvl = 1;
  for(let l=2; l<=20; l++){ if((xp||0) >= CHARACTER_XP_TABLE[l]) lvl = l; else break; }
  return lvl;
}

function hitDieAverage(dieStr){
  const n = parseInt(String(dieStr||'d8').replace(/[^\d]/g,''),10) || 8;
  return Math.floor(n/2) + 1;
}
function computeLevelUpHpGain(ch){
  const conMod = abilityMod(ch.abilities.con);
  let gain = Math.max(1, hitDieAverage(ch.hitDice.die) + conMod);
  if((ch.feats||[]).some(f=>f.key==='tough')) gain += 2; // Tough: +2 max HP every level, on top of the normal roll
  return gain;
}
function applySpellSlotsForLevel(ch){
  // Auto-fills spell slot maxima (and tops current up to match, like a fresh long rest) from class +
  // level, for the classes whose progression this tool knows. Returns false and leaves slots untouched
  // for classes it doesn't recognize (non-casters, third-casters) — those stay manually editable.
  const classIndex = ch.classIndex;
  if(!classIndex) return false;
  const lvl = Math.max(1, Math.min(20, ch.level||1));
  if(classIndex==='warlock'){
    const w = WARLOCK_PACT_SLOTS[lvl];
    for(let sl=1; sl<=9; sl++){ ch.spellcasting.slots[sl] = {current:0,max:0}; }
    ch.spellcasting.slots[w.level] = { current: w.count, max: w.count };
    return true;
  }
  let table = null;
  if(FULL_CASTERS.includes(classIndex)) table = FULL_CASTER_SLOTS[lvl];
  else if(HALF_CASTERS.includes(classIndex)) table = HALF_CASTER_SLOTS[lvl];
  if(!table) return false;
  table.forEach((max,i)=>{ ch.spellcasting.slots[i+1] = { current: max, max }; });
  for(let sl=table.length+1; sl<=9; sl++){ ch.spellcasting.slots[sl] = {current:0,max:0}; }
  return true;
}

// A small curated set of common PHB feats — descriptions are written fresh in plain language (same
// approach as the monster preset traits above), not reproduced from any sourcebook. Only feats whose
// benefit is unconditional get an automatic numeric bonus wired in (e.g. Alert's flat +5 initiative,
// or a half-feat's +1 ability score); situational combat feats (Great Weapon Master, Sentinel, and
// the like) are tracked for reference so the table remembers you have them, without this tool trying
// to model conditional combat math.
const FEATS = [
  { key:'alert', name:'Alert', desc:"Always ready for danger — never caught flat-footed by a hidden attacker, and hidden attackers gain no edge on you.", bonuses:{initiative:5} },
  { key:'athlete', name:'Athlete', desc:"Peak physical conditioning — standing up costs less movement, climbing no longer costs extra, and a running jump needs only 5 feet of approach.", abilityChoice:{amount:1, options:['str','dex']} },
  { key:'charger', name:'Charger', desc:"A running start turns into a shove or an extra hit — Dash then make one attack or shove as a bonus action." },
  { key:'crossbow-expert', name:'Crossbow Expert', desc:"Fires crossbows fast and up close — no disadvantage at close range, and a bonus-action hand crossbow shot after attacking with a one-handed weapon." },
  { key:'defensive-duelist', name:'Defensive Duelist', desc:"With a finesse weapon in hand, can use a reaction to add the proficiency bonus to AC against one incoming melee hit." },
  { key:'dual-wielder', name:'Dual Wielder', desc:"Better two-weapon fighting — +1 AC while wielding two separate melee weapons, and can dual-wield weapons that aren't Light." },
  { key:'durable', name:'Durable', desc:"Hardy stock — hit dice spent during a rest always recover a solid chunk of HP, never rolling low.", abilityChoice:{amount:1, options:['con']} },
  { key:'great-weapon-master', name:'Great Weapon Master', desc:"Trades accuracy for brutal damage with heavy weapons, and cleaving into a bonus-action attack on a kill or a crit." },
  { key:'healer', name:'Healer', desc:"A healer's kit in hand goes a long way — stabilizes a dying creature to 1 HP, and patches up allies for more than usual." },
  { key:'heavy-armor-master', name:'Heavy Armor Master', desc:"Heavy armor shrugs off some of the sting of nonmagical bludgeoning, piercing, and slashing hits.", abilityChoice:{amount:1, options:['str']} },
  { key:'inspiring-leader', name:'Inspiring Leader', desc:"A short pep talk hands out temporary hit points to the whole party once per rest." },
  { key:'keen-mind', name:'Keen Mind', desc:"A near-perfect internal compass and memory for anything seen or read recently.", abilityChoice:{amount:1, options:['int']} },
  { key:'lucky', name:'Lucky', desc:"A small pool of luck points to reroll an attack, check, or save — your own, or one aimed at you — in your favor." },
  { key:'magic-initiate', name:'Magic Initiate', desc:"Learn the basics of a magic tradition — pick a class (Bard, Cleric, Druid, Sorcerer, Warlock, or Wizard work well; reskin freely for a casual table, e.g. \"Warlock Initiate\"). Use the \"Grants spells\" picker below to add 2 cantrips from that class's list (mark them At Will) and one 1st-level spell from it (1 use, recharging on a long rest, no slot needed)." },
  { key:'mobile', name:'Mobile', desc:"Faster on your feet, ignores difficult terrain when Dashing, and melee attacks don't get a free swing as you disengage from them.", bonuses:{speed:10} },
  { key:'observant', name:'Observant', desc:"Sharp eyes and ears — can read lips and naturally notices details others miss.", abilityChoice:{amount:1, options:['int','wis']} },
  { key:'polearm-master', name:'Polearm Master', desc:"Reach weapons get a bonus-action jab with the butt end, and set up to skewer anything that closes the distance." },
  { key:'resilient', name:'Resilient', desc:"Training in an otherwise weak saving throw — also grants proficiency in that save.", abilityChoice:{amount:1, options:['str','dex','con','int','wis','cha'], grantsSaveProf:true} },
  { key:'savage-attacker', name:'Savage Attacker', desc:"Once per turn, reroll a weapon's damage dice and take whichever result is better." },
  { key:'sentinel', name:'Sentinel', desc:"Punishes enemies for leaving your reach, and locks down whoever you hit with an opportunity attack." },
  { key:'sharpshooter', name:'Sharpshooter', desc:"Ranged attacks ignore cover and long-range penalties, and can trade accuracy for a big damage boost." },
  { key:'shield-master', name:'Shield Master', desc:"A shield becomes a shoving weapon, and adds a bonus to Dexterity saves against effects that would only hurt one side of you." },
  { key:'skilled', name:'Skilled', desc:"Picks up proficiency in three more skills or tools of your choice." },
  { key:'tavern-brawler', name:'Tavern Brawler', desc:"Bar-fight instincts — better unarmed strikes, and can grapple as part of an attack.", abilityChoice:{amount:1, options:['str','con']} },
  { key:'tough', name:'Tough', desc:"Hardier than most — an immediate boost to hit point maximum, and +2 more every time you gain a level from here on.", hpPerLevel:2 },
  { key:'war-caster', name:'War Caster', desc:"Keeps spells up under fire — advantage on concentration saves, and can cast a spell in place of an opportunity attack." }
];
function featFlatBonus(entity, key){
  return (entity && entity.feats ? entity.feats : []).reduce((sum,f)=> sum + ((f.bonuses && f.bonuses[key]) || 0), 0);
}
// Checks for a specific built-in feat by its key (e.g. 'war-caster') — used for feats whose effect
// isn't a flat numeric bonus (those go through featFlatBonus/featAbilityBonus instead) but changes
// how a roll works, like War Caster granting advantage on concentration saves.
function hasFeat(entity, key){
  return (entity && entity.feats ? entity.feats : []).some(f=>f.key===key);
}
function featAbilityBonus(ch, key){
  return (ch.feats||[]).reduce((sum,f)=>{
    if(f.abilityChoice && f.abilityChoice.selected===key) return sum + (f.abilityChoice.amount||0);
    return sum;
  },0);
}
function ensureLevelingFields(ch){
  if(!ch.feats) ch.feats = [];
  if(!ch.asiBonuses) ch.asiBonuses = {str:0,dex:0,con:0,int:0,wis:0,cha:0};
  if(!ch.asiLevelsUsed) ch.asiLevelsUsed = [];
  if(ch.plainAsiPicks===undefined) ch.plainAsiPicks = 0; // guided-flow "just take +2/+1" picks — tracked separately from feats so the two can be added together for the ASI/feat budget without double-counting
}
// How many total ASI-or-feat choices this character has earned by their current level, and how
// many they've spent. "Earned" comes straight from the class's ASI level table; "spent" is feats
// actually on the sheet (however they were added) plus guided-flow "plain ASI" picks — the
// character-sheet's direct ASI-editor boxes (for building an already-leveled character from
// scratch) are a deliberate manual override and aren't counted here, same as point buy doesn't
// second-guess a hand-typed ability score.
function featSlotsEarned(ch){
  return getAsiLevels(ch.classIndex).filter(l=>l<=(ch.level||1)).length;
}
function featSlotsUsed(ch){
  return (ch.feats||[]).length + (ch.plainAsiPicks||0);
}
// Backfills fields added after initial release (skills, death saves, concentration, background/
// alignment/languages) so campaigns saved/exported before these existed still load cleanly.
function ensureCharacterExtras(ch){
  if(!ch.skillProfs){
    ch.skillProfs = {};
    SKILL_LIST.forEach(sk=>{ ch.skillProfs[sk.key] = false; });
  } else {
    SKILL_LIST.forEach(sk=>{ if(ch.skillProfs[sk.key]===undefined) ch.skillProfs[sk.key] = false; });
  }
  if(!ch.deathSaves) ch.deathSaves = { successes:0, failures:0 };
  if(ch.concentratingOn===undefined) ch.concentratingOn = '';
  if(ch.background===undefined) ch.background = '';
  if(ch.alignment===undefined) ch.alignment = '';
  if(ch.languages===undefined) ch.languages = '';
}
function skillModifier(ch, skillDef){
  ensureCharacterExtras(ch);
  const abilMod = abilityMod(ch.abilities[skillDef.ability]);
  return abilMod + (ch.skillProfs[skillDef.key] ? profBonus(ch.level) : 0);
}
function passiveScore(ch, skillDef){ return 10 + skillModifier(ch, skillDef); }

// Standard (non-variant) 5e carrying capacity — Strength score x 15 — used only as a visible
// reference against total carried weight. Deliberately informational only (no automatic speed
// penalty applied anywhere) to keep this optional-rule territory out of the DM's hands only if
// they want it there — casual tables can just ignore the bar entirely.
function carryCapacity(ch){ return Math.max(0, (ch.abilities.str||0) * 15); }
function totalCarriedWeight(ch){
  return (ch.inventory||[]).reduce((sum,it)=> sum + (Number(it.weight)||0) * (Number(it.qty)||1), 0);
}
function encumbranceStatus(ch){
  const cap = carryCapacity(ch); // max carrying capacity, Str score x 15
  const weight = totalCarriedWeight(ch);
  let label = 'Unencumbered', color = 'var(--moss)';
  if(cap>0 && weight > cap){ label = 'Over Max Capacity'; color = 'var(--ember)'; }
  else if(cap>0 && weight > cap*(2/3)){ label = 'Heavily Encumbered'; color = 'var(--ember)'; } // >10x Str
  else if(cap>0 && weight > cap/3){ label = 'Encumbered'; color = 'var(--brass)'; } // >5x Str
  return { cap, weight, label, color, pct: cap>0 ? Math.min(100,(weight/cap)*100) : 0 };
}
function addFeatToCharacter(ch, key, sourceLevel){
  ensureLevelingFields(ch);
  let def, custom=false;
  if(key==='__custom'){
    def = { name:'New Feat', desc:'' };
    custom = true;
  } else {
    def = FEATS.find(f=>f.key===key);
  }
  if(!def) return;
  const entry = {
    id: uid('feat'), key: custom?null:def.key, name: def.name, desc: def.desc||'',
    sourceLevel: sourceLevel || ch.level, custom,
    bonuses: def.bonuses ? {...def.bonuses} : null,
    abilityChoice: def.abilityChoice ? {
      options: def.abilityChoice.options, amount: def.abilityChoice.amount,
      grantsSaveProf: !!def.abilityChoice.grantsSaveProf,
      selected: def.abilityChoice.options.length===1 ? def.abilityChoice.options[0] : null
    } : null,
    grantsSpells: []
  };
  ch.feats.push(entry);
  if(entry.abilityChoice && entry.abilityChoice.selected && entry.abilityChoice.grantsSaveProf){
    ch.savingThrowProfs[entry.abilityChoice.selected] = true;
  }
  if(def.hpPerLevel){
    const bump = def.hpPerLevel * Math.max(1, ch.level||1);
    ch.hp.max += bump; ch.hp.current += bump;
    showToast(`${def.name}: +${bump} max HP applied`);
  } else if(!custom){
    showToast(`${def.name} added`);
  }
  return entry;
}

function rollD20Mode(mode){
  const r1 = 1+Math.floor(Math.random()*20);
  if(mode!=='adv' && mode!=='disadv') return { d20:r1, detail:`d20 ${r1}` };
  const r2 = 1+Math.floor(Math.random()*20);
  const chosen = mode==='adv' ? Math.max(r1,r2) : Math.min(r1,r2);
  return { d20:chosen, detail:`d20 ${r1}/${r2}→${chosen}` };
}

function rollDiceFormula(formula){
  // Parses simple "NdM+K" / "NdM-K" / "NdM" strings and rolls them.
  if(!formula) return 0;
  const m = String(formula).trim().match(/^(\d+)d(\d+)([+-]\d+)?$/i);
  if(!m) return Number(formula)||0;
  const n = Number(m[1]), sides = Number(m[2]), mod = m[3]?Number(m[3]):0;
  let total = mod;
  for(let i=0;i<n;i++) total += 1+Math.floor(Math.random()*sides);
  return Math.max(1,total);
}

// Sorted turn order for both the one-shot Battle Initiative display and for starting the
// persistent round/turn tracker — kept as a single source of truth so the two never disagree.
// Returns [{kind:'pc'|'enemy', ref, idx}], sorted by initiative desc, ties broken by DEX modifier.
function computeInitiativeOrder(c){
  const combatants = [
    ...c.characters.filter(ch=>['alive','unconscious'].includes(ch.status)).map(ch=>({ kind:'pc', ref:ch, idx:c.characters.indexOf(ch) })),
    ...c.enemies.filter(en=>en.status==='alive').map(en=>({ kind:'enemy', ref:en, idx:c.enemies.indexOf(en) }))
  ];
  return combatants.sort((a,b)=>{
    const ai = a.ref.initiative, bi = b.ref.initiative;
    if(ai==null && bi==null) return 0;
    if(ai==null) return 1;
    if(bi==null) return -1;
    if(bi!==ai) return bi-ai;
    return abilityMod(b.ref.abilities.dex) - abilityMod(a.ref.abilities.dex);
  });
}
// Looks up the live character/enemy object behind the current turn in an active combat.combat —
// by id rather than array index, so it stays correct even if characters/enemies get reordered.
// Returns null if there's no active combat, or if that combatant no longer exists (e.g. removed).
function currentCombatRef(camp){
  const combat = camp.combat;
  if(!combat || !combat.order || !combat.order.length) return null;
  const entry = combat.order[combat.turnIndex];
  if(!entry) return null;
  const ref = entry.kind==='pc'
    ? (camp.characters||[]).find(x=>x.id===entry.id)
    : (camp.enemies||[]).find(x=>x.id===entry.id);
  return ref ? { id:entry.id, kind:entry.kind, ref } : null;
}
// Resets legendary-action usage for every enemy that has any, at the start of a fresh round.
// A simplification of the RAW "recharges at the start of its own turn" for a casual table — close
// enough, and a manual Reset button on each enemy covers the rest.
function onNewCombatRound(camp){
  (camp.enemies||[]).forEach(en=>{ if((en.legendaryActionsMax||0) > 0) en.legendaryActionsUsed = 0; });
}
// Action/bonus action refresh at the start of THIS combatant's own turn (not tied to round
// boundaries — see advanceCombatTurn and start-combat, the only two places a turn actually begins).
function resetActionEconomy(ref){
  if(!ref) return;
  ref.actionUsed = false;
  ref.bonusActionUsed = false;
}
// Moves the turn pointer forward (dir=1) or back (dir=-1), rolling over into the next/previous
// round at the ends of the order. Skips past any combatant that's been removed since combat
// started (currentCombatRef returns null for them) and past any enemy that's since died or fled
// (a corpse doesn't get a turn) — bounded so it can't loop forever if the whole order has gone
// stale or the fight's already over. PCs are never skipped this way, even unconscious ones, since
// they still have death saves to roll on their turn.
function advanceCombatTurn(camp, dir){
  const combat = camp.combat;
  if(!combat || !combat.order.length) return;
  const n = combat.order.length;
  let guard = 0;
  let cur;
  do {
    combat.turnIndex += dir;
    if(combat.turnIndex >= n){ combat.turnIndex = 0; combat.round += 1; onNewCombatRound(camp); }
    if(combat.turnIndex < 0){ combat.turnIndex = n-1; combat.round = Math.max(1, combat.round-1); }
    guard++;
    cur = currentCombatRef(camp);
  } while((!cur || (cur.kind==='enemy' && cur.ref.status!=='alive')) && guard <= n+1);
  if(cur) resetActionEconomy(cur.ref);
}
// Only tracks action economy for whoever the combat tracker currently has "up" — an attack/cast
// made outside anyone's active turn (no combat running, or off-turn) doesn't touch these flags at
// all, since there's no turn for it to be accidentally-double-spent against.
function markTurnActionUsed(camp, entity, isBonusAction){
  const cur = currentCombatRef(camp);
  if(!cur || cur.ref !== entity) return;
  if(isBonusAction) entity.bonusActionUsed = true; else entity.actionUsed = true;
}

function enemyFromPreset(preset, label){
  const e = blankEnemy(label || preset.name);
  e.presetKey = preset.key;
  e.groupLabel = preset.name;
  e.role = preset.name;
  e.cr = preset.cr;
  e.xp = preset.xp;
  e.ac = preset.ac;
  e.speed = preset.speed;
  e.abilities = { ...preset.abilities };
  const rolled = rollDiceFormula(preset.hitDice);
  e.hp.max = rolled; e.hp.current = rolled;
  e.attacks = (preset.attacks||[]).map(a=>({ id: uid('atk'), name:a.name, toHit:a.toHit, damage:a.damage, damageType:a.damageType||'', notes:a.notes||'', recharge:null, rechargeAvailable:true }));
  e.traits = (preset.traits||[]).map(t=>({ id: uid('trait'), name:t.name, desc:t.desc||'' }));
  return e;
}

const SCHEMA_DOC = "CampaignState { campaignName, sessionNumber, inGameDate, partyGold, worldNotes, questLog:[{id,title,status:'active'|'completed'|'failed',notes}], characters:[Character], enemies:[Enemy], combat: null|{round,turnIndex,order:[{id,kind:'pc'|'enemy',name}]} (the tracker's persistent turn/round pointer — order is a snapshot taken when combat started, turnIndex points into it, null means no fight is currently active), partyInventory:[{id,index (SRD equipment index or null),name,qty,tags,weight}] (shared loot not yet claimed by any one character — moved into a character's personal inventory via the 'Give to' control, which drops the bonuses/grantsSpells fields since those only matter once actually equipped), npcs:[{id,name,role (freeform relationship/occupation),disposition:'friendly'|'neutral'|'wary'|'ally',hasCombatStats (bool — whether hp/ac below are relevant),hp:{current,max},ac,saveBonus (flat generic bonus used when an enemy's save-based attack targets this NPC — NPCs don't track per-ability scores, so this is one approximate number rather than six precise saving throws),notes}] (non-adversarial roster — hirelings, contacts, animal companions — kept separate from the adversarial Enemies list), sessions:[{id,number,date,recap}] (session-by-session recap log, distinct from the always-current Quest Log and World Notes), updatedAt }\n" +
"Character { id, name, playerName, background (freeform, e.g. 'Folk Hero'), alignment (one of the 9 standard alignments, or '' if unspecified), languages (freeform comma-separated string, auto-seeded from race when picked but freely editable), race, raceIndex (SRD race index or null if custom), class, classIndex (SRD class index or null if custom), subclass (name only — see note below), level, xp, hp:{current,max,temp}, ac (base AC before equipped-item/feat bonuses; effective AC = ac + sum of equipped items' bonuses.ac + feat bonuses.ac), speed (base walking speed in feet before equipped-item/feat bonuses; effective speed = speed + equipped items' bonuses.speed + feat bonuses.speed), hitDice:{total,current,die}, baseAbilities:{str,dex,con,int,wis,cha} (point-buy base scores, 8-15 each, 27-point budget), abilityBonusChoice:{plus2,plus1} (free-choice ability bonus, Tasha's 'Customizing Your Origin' variant — plus2/plus1 hold an ability key each, e.g. {plus2:'cha',plus1:'int'}, independent of race; either can be null), asiBonuses:{str,dex,con,int,wis,cha} (flat increases from 'Ability Score Improvement' choices made at level-up — separate from race and feats so each source of a bonus stays visible), asiLevelsUsed:[level,...] (character levels at which an ASI-or-feat choice has already been made via the tracker's Level Up button, so the same level isn't offered twice), feats:[{id,key (index into the tracker's built-in feat list, or null if homebrew),name,desc,sourceLevel,bonuses:{ac,speed,initiative,str,dex,con,int,wis,cha}|null (flat always-on bonuses this feat grants, summed into the character's stats automatically), abilityChoice:{options:[ability keys],amount,grantsSaveProf:bool,selected:ability key or null}|null (half-feats that bump one chosen ability score, e.g. Resilient — 'selected' is the player's choice and also flows into abilities and, if grantsSaveProf, into savingThrowProfs), custom:bool,grantsSpells:[{id,index (SRD spell index or null if custom),name,level,school,usesCurrent,usesMax,resetsOn:'long rest'|'short rest'|'dawn'|'other',atWill:bool}] (free castings this feat itself grants — e.g. Magic Initiate's 2 cantrips, marked atWill:true so usesCurrent/usesMax are ignored, plus one 1st-level spell with usesMax:1, resetsOn:'long rest'; always active once the feat is taken, no equip requirement — surfaced in the character's spell list alongside item-granted spells)}], abilities:{str,dex,con,int,wis,cha} (effective/derived — baseAbilities + abilityBonusChoice + asiBonuses + feats' ability bonuses + equipped items' bonuses.<ability>, capped at 20; don't hand-edit, it's recomputed), savingThrowProfs:{str,dex,con,int,wis,cha:bool}, skillProfs:{acrobatics,animalHandling,arcana,athletics,deception,history,insight,intimidation,investigation,medicine,nature,perception,performance,persuasion,religion,sleightOfHand,stealth,survival:bool} (proficiency only — the tracker computes each skill's modifier as ability mod + proficiency bonus if true, and passive score as 10 + that modifier; neither is stored, both are derived), concentratingOn (freeform name of the spell currently being concentrated on, or '' if none — not mechanically enforced, just tracked so a DM chat knows what's active), spellcasting:{ability, slots:{'1':{current,max}, ..., '9':{current,max}} (auto-filled by class+level for Bard/Cleric/Druid/Sorcerer/Wizard, Paladin/Ranger, and Warlock's Pact Magic; other classes/subclasses need manual entry)}, spells:[{id,index (5e SRD spell index, e.g. 'fireball', or null if homebrew),name,level,school,prepared:bool,targetKind:'enemy'|null and targetId (who this spell is currently aimed at, persisted between casts),castAtLevel (slot level to spend when cast — defaults to the spell's own level, 0 for cantrips; can be raised to any level the character has slots for, to upcast)}] (the tracker's Cast button, shown when the spell has SRD damage or a saving throw, spends the chosen slot, rolls a spell attack or the target's save as appropriate, and applies damage — upcast damage is read from the SRD's own per-slot-level numbers when present), inventory:[{id,index (5e SRD equipment index or null if custom),name,qty,equipped:bool,tags (freeform: category/damage/AC/properties summary, cost included as text),weight (number, lb per single unit — qty multiplies it; auto-parsed from SRD data when picked, defaults to 0 for custom items until set, used only for the Encumbrance display),bonuses:{ac,speed,initiative,str,dex,con,int,wis,cha} (all numbers, default 0 — flat bonuses this item grants while equipped, e.g. a ring of protection is bonuses.ac:1; automatically summed into the character's effective AC/speed/abilities/initiative whenever equipped is true, ignored otherwise), atkAbility:'auto'|'str'|'dex' and atkProficient:bool and targetKind:'enemy'|null and targetId (only relevant while equipped and the tags contain a parseable 'NdM' weapon-damage pattern — the tracker's Attack button then rolls to-hit and damage against the chosen enemy; 'auto' resolves to a Finesse weapon's better of STR/DEX, DEX for true ranged weapons, STR otherwise), grantsSpells:[{id,index (SRD spell index or null if custom),name,level,school,usesCurrent,usesMax,resetsOn:'long rest'|'short rest'|'dawn'|'other',atWill:bool,targetKind:'enemy'|null,targetId}] (free castings the item itself grants regardless of the wearer's class/spell list, e.g. a Ring of Fireball with usesMax:1, resetsOn:'long rest' — only surfaced in the character's spell list while equipped is true; usesCurrent decrements on use and is restored to usesMax by the tracker's reset control; atWill:true means unlimited uses and usesCurrent/usesMax are ignored)}], gold, conditions:[{id,conditionIndex (one of the 15 SRD conditions e.g. 'poisoned','exhaustion', or 'custom'),name,duration (freeform, e.g. '3 rounds'),level (1-6, only used for exhaustion)}], status:'alive'|'unconscious'|'dead'|'ghost'|'other', statusNote, initiative (number or null — this fight's rolled initiative total), initiativeBonus (manual catch-all number for class features NOT tied to a feat or inventory item — feat bonuses like Alert's +5 are tracked per-feat instead and summed in automatically), initiativeMode ('normal'|'adv'|'disadv' — whether the initiative d20 is rolled with advantage/disadvantage, e.g. a Barbarian's Feral Instinct), surprised (bool — true if this combatant is caught unaware at the start of the current fight and so skips actions/reactions on their first turn), notes }\n" +
"Enemy { id, name, presetKey (key into the tracker's built-in monster preset list, e.g. 'goblin', or null if custom/unique), groupLabel (shared label for a batch spawned together, e.g. 'Goblin'), role (freeform — used to reskin one instance of a group, e.g. 'Ranger' or 'Spellcaster' on one goblin out of six), cr (challenge rating as a string, e.g. '1/4'), xp, xpAwarded (bool — whether this enemy's XP has already been folded into an Award XP action, so the same kill isn't counted twice), ac, hp:{current,max}, speed, abilities:{str,dex,con,int,wis,cha}, saveBonus (flat bonus added on top of ability mod when this enemy rolls a saving throw against a party member's spell — proficient saves, magic resistance flavor, etc.; 0 for a plain ability-mod-only save), attacks:[{id,name,toHit (attack bonus, integer),damage (dice string e.g. '1d6+2'),damageType,notes,recharge (number 1-6 or null — null means at-will; e.g. 6 for 'recharge 6', 5 for 'recharge 5-6'),rechargeAvailable (bool — whether this attack can currently be used, only meaningful when recharge isn't null),attackType:'attack'|'save' (whether this resolves as a roll vs the target's AC, or the target rolling a saving throw — most spell attacks are 'save'),saveAbility (one of str/dex/con/int/wis/cha, only used when attackType is 'save'),saveDC (number, only used when attackType is 'save'),saveEffect:'half'|'none'|'other' (what a successful save does to the rolled damage — half, none, or something described in notes that isn't auto-applied),targetKind:'pc'|'npc'|null and targetId (who this attack is currently aimed at, persisted between rolls — the tracker's Attack/Cast button resolves hit-vs-AC or the save automatically against this target and applies the resulting damage to their hp, temp HP absorbing first; leaving target null just rolls the numbers without touching anyone's HP)}], traits:[{id,name,desc}], legendaryActionsMax (legendary actions available per round; 0 means none), legendaryActionsUsed (spent so far this round), legendaryActions:[{id,name,desc,cost (how many legendary actions it spends, default 1)}], lairAction (freeform reference note, not mechanically tracked — triggers on initiative count 20 per standard rules), conditions: same shape as Character.conditions, initiative (number or null), initiativeBonus (manual catch-all number for traits/magic items affecting initiative), initiativeMode ('normal'|'adv'|'disadv'), surprised (bool — true if caught unaware at the start of the fight), status:'alive'|'dead'|'fled'|'other', notes }\n" +
"Race, class, conditions, spells, and equipment are drawn from the open D&D 5e SRD where possible, identified by their SRD index, so exact rules text/mechanics can be looked up rather than guessed. Subclass is name-only (official PHB subclass names for easy selection) — no mechanical SRD data backs it beyond the one example per class the SRD itself defines, so treat subclass features as table knowledge, not something this tool tracks mechanically. Enemy presets are a small curated set of common SRD monster stat blocks bundled with the tool for quickly spawning mook groups; anything not on that list (bosses, uniques, homebrew monsters) is built as a custom Enemy with presetKey:null.";

// A lighter, enemy-only schema for the "Quick Add from JSON" flow — deliberately smaller than the
// full Enemy shape documented in SCHEMA_DOC above, since asking an AI DM chat for a fast batch of
// mid-session mooks shouldn't require re-explaining legendary actions, recharge mechanics, etc.
// every field here maps directly onto blankEnemy(); anything omitted just falls back to the default.
const ENEMY_IMPORT_SCHEMA_DOC = "Return ONLY a JSON array (no prose, no markdown code fences, no commentary) of enemy objects matching this shape — every field is optional except name, missing fields fall back to sensible defaults:\n" +
"[{ name (string), groupLabel (string, e.g. 'Cultists' — shared tag for a batch), role (string, e.g. 'Leader'), cr (string, e.g. '1/4' or '2'), xp (number), ac (number), hp (either a plain number for max=current, or {current,max}), speed (number, feet), abilities:{str,dex,con,int,wis,cha} (numbers, default 10 each), saveBonus (number, default 0), attacks:[{name,toHit (number),damage (dice string e.g. '1d6+2'),damageType,notes,recharge (number 1-6 or omit for at-will)}], traits:[{name,desc}], legendaryActionsMax (number, omit or 0 for none), legendaryActions:[{name,desc,cost}], lairAction (string), notes (string) }]\n" +
"Keep stat blocks roughly balanced for the requested challenge/CR using normal 5e monster-building guidelines. Match the tone/theme requested.";

// Builds a full tracker Enemy from one loosely-shaped object out of that JSON array (or hand-written
// JSON in the same shape) — fills every field blankEnemy() expects, then runs it through the same
// ensureCombatFields() normalization real enemies get, so nothing downstream (attack rolls, legendary
// action UI, etc.) has to special-case an imported enemy.
function enemyFromImportObject(obj, indexInBatch){
  obj = obj && typeof obj==='object' ? obj : {};
  const en = blankEnemy(obj.name ? String(obj.name) : `Imported Enemy ${indexInBatch+1}`);
  if(obj.groupLabel!=null) en.groupLabel = String(obj.groupLabel);
  if(obj.role!=null) en.role = String(obj.role);
  if(obj.cr!=null) en.cr = String(obj.cr);
  if(obj.xp!=null) en.xp = Number(obj.xp)||0;
  if(obj.ac!=null) en.ac = Number(obj.ac)||10;
  if(obj.speed!=null) en.speed = Number(obj.speed)||30;
  if(obj.hp!=null){
    if(typeof obj.hp==='number'){
      const max = Math.max(1, Math.round(obj.hp)||1);
      en.hp = { current: max, max };
    } else if(typeof obj.hp==='object'){
      const max = Math.max(1, Math.round(Number(obj.hp.max ?? obj.hp.current ?? 10))||10);
      const current = obj.hp.current!=null ? Math.max(0, Math.min(max, Math.round(Number(obj.hp.current))||0)) : max;
      en.hp = { current, max };
    }
  }
  if(obj.abilities && typeof obj.abilities==='object'){
    ABILITY_KEYS.forEach(k=>{ if(obj.abilities[k]!=null) en.abilities[k] = Number(obj.abilities[k]) || 10; });
  }
  if(obj.saveBonus!=null) en.saveBonus = Number(obj.saveBonus)||0;
  if(Array.isArray(obj.attacks)){
    en.attacks = obj.attacks.map(a=>{
      a = a && typeof a==='object' ? a : {};
      const rechargeNum = a.recharge!=null && a.recharge!=='' ? Math.max(1, Math.min(6, Math.round(Number(a.recharge))||6)) : null;
      return { id: uid('atk'), name: a.name?String(a.name):'', toHit: Number(a.toHit)||0, damage: a.damage?String(a.damage):'', damageType: a.damageType?String(a.damageType):'', notes: a.notes?String(a.notes):'', recharge: rechargeNum, rechargeAvailable: true };
    });
  }
  if(Array.isArray(obj.traits)){
    en.traits = obj.traits.map(t=>{ t = t && typeof t==='object' ? t : {}; return { id: uid('trait'), name: t.name?String(t.name):'', desc: t.desc?String(t.desc):'' }; });
  }
  if(obj.legendaryActionsMax!=null) en.legendaryActionsMax = Math.max(0, Number(obj.legendaryActionsMax)||0);
  if(Array.isArray(obj.legendaryActions)){
    en.legendaryActions = obj.legendaryActions.map(la=>{ la = la && typeof la==='object' ? la : {}; return { id: uid('leg'), name: la.name?String(la.name):'', desc: la.desc?String(la.desc):'', cost: Math.max(1, Number(la.cost)||1) }; });
  }
  if(obj.lairAction!=null) en.lairAction = String(obj.lairAction);
  if(obj.notes!=null) en.notes = String(obj.notes);
  ensureCombatFields(en);
  return en;
}

