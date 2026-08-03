// ---------- app state ----------
let state = {
  campaign: blankCampaign(),
  snapshotIndex: [], // {id, timestamp, label}
  diceLog: [],       // {id, timestamp, label, total, breakdown}
  activeTab: 'party',
  activeCharId: null,
  activeEnemyId: null,
  enemyQty: 1,
  enemySort: 'added', // 'added' | 'initiative'
  battleInitBreakdown: {}, // { [characterOrEnemyId]: "d20 14 +2 dex +5 bonus" } — transient, not persisted, just for display right after rolling
  expandedItemIds: new Set(), // ids of inventory items with their "magic bonuses" panel open — transient UI state, not persisted
  expandedFeatIds: new Set(), // ids of feats with their "grants spells" panel open — transient UI state, not persisted
  spellFilterOff: new Set(), // character indices where "show only my class's spells" has been unchecked — transient UI state, not persisted
  spellClassMap: {}, // { spellIndex: [classIndex,...] } — from embedded srd-spell-classes bundle, which classes can learn/prepare each spell
  levelUpPicker: null, // { charIdx, level, mode:'choose'|'asi'|'feat', asiSplit } — transient, open right after "Level Up" hits an ASI-eligible level
  adv: 'normal', // normal | adv | disadv
  importText: '',
  lastSavedAt: null,
  storageOk: true,
  armedAction: null, // { key: 'action:idOrIdx', armedAt: timestamp } — transient, not persisted; see "destructive-action confirm" below
  srdConditions: null,   // [{index,name,desc}] — all 15, from embedded bundle
  srdSpellIndex: null,   // [{index,name,level,school,...}] — full records, from embedded bundle
  srdEquipmentIndex: null, // [{index,name,cost,weight,summary}] — full records, from embedded bundle
  srdClasses: null,      // [{index,name,hitDie,savingThrows[],spellAbility}]
  srdRaces: null,        // [{index,name,speed,size,abilityBonuses[],languages[],traits[]}]
  srdSubclasses: null,   // [{index,name,classIndex}]
  srdLoading: true
};

function spellStatLine(meta){
  if(!meta) return '';
  const parts = [];
  if(meta.range) parts.push(meta.range);
  if(meta.concentration) parts.push('Concentration');
  if(meta.ritual) parts.push('Ritual');
  if(meta.damageAtSlot){
    const lvls = Object.keys(meta.damageAtSlot).map(Number).sort((a,b)=>a-b);
    const base = lvls[0];
    parts.push(`${meta.damageAtSlot[base]}${meta.damageType?' '+meta.damageType.toLowerCase():''} dmg`);
  } else if(meta.damageAtLevel){
    const lvls = Object.keys(meta.damageAtLevel).map(Number).sort((a,b)=>a-b);
    const base = lvls[0];
    parts.push(`${meta.damageAtLevel[base]}${meta.damageType?' '+meta.damageType.toLowerCase():''} dmg${lvls.length>1?' (scales w/ char. level)':''}`);
  }
  if(meta.saveAbility){
    const eff = meta.saveEffect && meta.saveEffect!=='none' ? ` (${meta.saveEffect} dmg on success)` : '';
    parts.push(`${meta.saveAbility.toUpperCase()} save${eff}`);
  }
  if(meta.areaType && meta.areaSize) parts.push(`${meta.areaSize}-ft ${meta.areaType}`);
  return parts.join(' · ');
}
function abilityMod(score){ return Math.floor((score-10)/2); }

// Renders the target/slot-level/Cast row shown under a spell on the character sheet — shared by a
// character's own known spells (which spend their own spell slots, chosen via castAtLevel — pick a
// level higher than the spell's own to upcast, per standard 5e rules) and item/feat-granted spells
// (which spend their own usesCurrent charge instead and are always cast at their own fixed level).
// bindBase is the dot-path to the spell object itself (e.g. "characters.0.spells.2" or
// "characters.0.inventory.1.grantsSpells.0"); clickAttrs are the extra data-* attributes the
// cast-spell click handler needs to find that same object again.
function renderCastControls(ch, idx, sp, meta, source, bindBase, clickAttrs, aliveEnemies){
  const hasAttack = !!(meta && (meta.saveAbility || meta.damageAtSlot || meta.damageAtLevel));
  const isCantrip = (sp.level||0) === 0;
  const knownLeveled = source==='known' && !isCantrip;

  let canCast = true;
  if(source==='known'){
    if(!isCantrip){ const slot = ch.spellcasting.slots[sp.castAtLevel] || {current:0,max:0}; canCast = slot.current > 0; }
  } else {
    canCast = sp.atWill || (sp.usesCurrent||0) > 0;
  }

  let slotSelect = '';
  if(knownLeveled){
    const availableLevels = [];
    for(let lv=sp.level; lv<=9; lv++){ const s=ch.spellcasting.slots[lv]; if(s && s.max>0) availableLevels.push(lv); }
    slotSelect = availableLevels.length ? `
      <select data-bind="${bindBase}.castAtLevel" data-type="number" style="width:135px;" title="Which slot to spend — pick higher than the spell's own level to upcast">
        ${availableLevels.map(lv=>{ const s=ch.spellcasting.slots[lv]; return `<option value="${lv}" ${Number(sp.castAtLevel)===lv?'selected':''}>Lvl ${lv} slot (${s.current}/${s.max})</option>`; }).join('')}
      </select>` : `<span class="hint" style="margin:0;">No level ${sp.level}+ slots available</span>`;
  }

  if(!hasAttack){
    // No structured damage or save to auto-resolve (a buff/utility spell). Still worth a "spend the
    // slot" button for a character's own leveled spells so tracking stays accurate; granted spells
    // already have their own −1/reset uses control shown alongside them, and cantrips with nothing
    // to spend and nothing to roll get no button at all.
    if(!knownLeveled) return '';
    return `
    <div style="flex-basis:100%;display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-top:2px;">
      ${slotSelect}
      <button class="btn" data-action="cast-spell" data-idx="${idx}" ${clickAttrs} ${canCast?'':'disabled'} title="No automatic attack roll or save for this spell — just spends the slot and logs the cast">Cast (spend slot)</button>
    </div>`;
  }

  const targetOptions = `
    <option value="">— no target (just roll) —</option>
    ${aliveEnemies.map(en=>`<option value="enemy:${en.id}" ${sp.targetKind==='enemy'&&sp.targetId===en.id?'selected':''}>${escapeHtml(en.name)} (AC ${en.ac})</option>`).join('')}
  `;
  return `
    <div style="flex-basis:100%;display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-top:2px;">
      <label class="hint" style="display:inline-flex;align-items:center;gap:4px;margin:0;">Target
        <select data-bind="${bindBase}.__target" data-type="target" style="min-width:150px;">${targetOptions}</select>
      </label>
      ${slotSelect}
      <button class="step-btn" data-action="cast-spell" data-idx="${idx}" ${clickAttrs} ${canCast?'':'disabled'} title="${meta.saveAbility ? 'Rolls the target save, rolls damage, and applies it automatically based on the result' : 'Rolls a spell attack against the target AC and applies damage on a hit'}">🎲 Cast</button>
    </div>`;
}

// A single item can grant a flat bonus to any of these while equipped. This is the one place
// that list of attributes lives — add a key here and it flows through everywhere automatically.
const BONUS_FIELD_DEFS = [
  {key:'ac', label:'AC'},
  {key:'speed', label:'Speed'},
  {key:'initiative', label:'Init.'},
  {key:'str', label:'STR'}, {key:'dex', label:'DEX'}, {key:'con', label:'CON'},
  {key:'int', label:'INT'}, {key:'wis', label:'WIS'}, {key:'cha', label:'CHA'}
];
function blankItemBonuses(){
  const b = {};
  BONUS_FIELD_DEFS.forEach(f=>{ b[f.key] = 0; });
  return b;
}
function ensureItemBonuses(it){
  if(!it.bonuses){
    it.bonuses = blankItemBonuses();
    if(it.initiativeBonus){ it.bonuses.initiative = it.initiativeBonus; } // migrate the old per-item field
  } else {
    BONUS_FIELD_DEFS.forEach(f=>{ if(it.bonuses[f.key]===undefined) it.bonuses[f.key] = 0; });
  }
  delete it.initiativeBonus;
}
function summarizeItemBonuses(bonuses){
  if(!bonuses) return '';
  const parts = [];
  BONUS_FIELD_DEFS.forEach(f=>{
    const v = bonuses[f.key]||0;
    if(!v) return;
    if(f.key==='speed') parts.push(`${fmtMod(v)} ft speed`);
    else if(f.key==='ac') parts.push(`${fmtMod(v)} AC`);
    else if(f.key==='initiative') parts.push(`${fmtMod(v)} initiative`);
    else parts.push(`${fmtMod(v)} ${f.label}`);
  });
  return parts.join(', ');
}
function equippedItemAttrBonus(ch, key){
  return (ch.inventory||[]).reduce((sum,it)=> sum + (it.equipped && it.bonuses ? (it.bonuses[key]||0) : 0), 0);
}
// Numeric weight in lb per single unit of the item (qty multiplies it), used only for the
// Encumbrance display. Backfilled to 0 for items saved before this field existed, and for custom
// items until the player sets it — leaving it at 0 is harmless, it just won't count toward weight.
function ensureItemWeight(it){
  if(it.weight===undefined || it.weight===null || it.weight==='') it.weight = 0;
}

// Items AND feats can both grant their own free castings of a spell — an item like a Ring of
// Fireball (1 charge/long rest), or a feat like Magic Initiate (2 at-will cantrips + one 1st-level
// spell recharging on a long rest). These live on the item/feat itself, independent of the
// character's normal class spell list (classSpellListFor/state.spellClassMap only governs the
// "Spells known" search above). Item grants only count while the item is equipped; feat grants are
// always active once the feat is taken. Each granted spell is either limited-use (usesCurrent/
// usesMax, recharging on the listed cadence) or, if atWill is true, unlimited — usesCurrent/usesMax
// are ignored in that case.
const RESET_CADENCES = ['long rest','short rest','dawn','other'];
function ensureItemGrantsSpells(it){
  if(!Array.isArray(it.grantsSpells)) it.grantsSpells = [];
}
function ensureFeatGrantsSpells(ft){
  if(!Array.isArray(ft.grantsSpells)) ft.grantsSpells = [];
}
function equippedGrantedSpells(ch){
  // Flattened list of {sourceType:'item',sourceId,sourceName,spell:{...}} for every granted spell on
  // an equipped item, used to surface these alongside the character's normal spells known.
  const out = [];
  (ch.inventory||[]).forEach(it=>{
    ensureItemGrantsSpells(it);
    if(!it.equipped) return;
    it.grantsSpells.forEach(gs=> out.push({ sourceType:'item', sourceId: it.id, sourceName: it.name, spell: gs }));
  });
  return out;
}
function featGrantedSpells(ch){
  // Same idea as equippedGrantedSpells but for feats — always active once taken, no "equipped" gate.
  const out = [];
  (ch.feats||[]).forEach(ft=>{
    ensureFeatGrantsSpells(ft);
    ft.grantsSpells.forEach(gs=> out.push({ sourceType:'feat', sourceId: ft.id, sourceName: ft.name, spell: gs }));
  });
  return out;
}
function allGrantedSpells(ch){ return equippedGrantedSpells(ch).concat(featGrantedSpells(ch)); }
// Same flattened list as allGrantedSpells, but keeps each entry's concrete array indices (as a
// dot-path relative to the character, e.g. "inventory.2.grantsSpells.0") so the cast-target <select>
// can data-bind straight to it instead of needing a separate id-based lookup just for rendering.
function allGrantedSpellsWithPaths(ch){
  const out = [];
  (ch.inventory||[]).forEach((it,ii)=>{
    ensureItemGrantsSpells(it);
    if(!it.equipped) return;
    (it.grantsSpells||[]).forEach((gs,gi)=>{
      out.push({ sourceType:'item', sourceId: it.id, sourceName: it.name, spell: gs, path: `inventory.${ii}.grantsSpells.${gi}` });
    });
  });
  (ch.feats||[]).forEach((ft,fi)=>{
    ensureFeatGrantsSpells(ft);
    (ft.grantsSpells||[]).forEach((gs,gi)=>{
      out.push({ sourceType:'feat', sourceId: ft.id, sourceName: ft.name, spell: gs, path: `feats.${fi}.grantsSpells.${gi}` });
    });
  });
  return out;
}
function resetAllGrantedSpellUses(ch){
  (ch.inventory||[]).forEach(it=>{
    ensureItemGrantsSpells(it);
    it.grantsSpells.forEach(gs=>{ if(!gs.atWill) gs.usesCurrent = gs.usesMax; });
  });
  (ch.feats||[]).forEach(ft=>{
    ensureFeatGrantsSpells(ft);
    ft.grantsSpells.forEach(gs=>{ if(!gs.atWill) gs.usesCurrent = gs.usesMax; });
  });
}
// Cadence-aware version used by the rest buttons — only refreshes granted-spell uses matching the
// given cadence ('long rest' or 'short rest'), leaving 'dawn'/'other' ones alone since those follow
// their own schedule. The manual "reset all" button on the character sheet still uses the
// unconditional version above for a full manual override.
function resetGrantedSpellUsesByCadence(ch, cadence){
  (ch.inventory||[]).forEach(it=>{
    ensureItemGrantsSpells(it);
    it.grantsSpells.forEach(gs=>{ if(!gs.atWill && gs.resetsOn===cadence) gs.usesCurrent = gs.usesMax; });
  });
  (ch.feats||[]).forEach(ft=>{
    ensureFeatGrantsSpells(ft);
    ft.grantsSpells.forEach(gs=>{ if(!gs.atWill && gs.resetsOn===cadence) gs.usesCurrent = gs.usesMax; });
  });
}
// Tops up every currently-tracked spell slot level back to its max — used by rest actions. Doesn't
// recompute max from class+level (that's applySpellSlotsForLevel's job); this just refills what's
// already there, which also works fine for classes/subclasses this tool doesn't auto-track.
function resetSpellSlotsCurrent(ch){
  Object.keys(ch.spellcasting.slots||{}).forEach(lvl=>{
    const slot = ch.spellcasting.slots[lvl];
    if(slot && slot.max) slot.current = slot.max;
  });
}
// A long rest: full HP, half your hit dice back (min 1), every spell slot topped up, long-rest
// granted-spell uses refreshed, one level of exhaustion shaken off, and — since full HP means
// they're conscious again — death saves cleared and "unconscious" flips back to "alive".
function longRestCharacter(ch){
  ch.hp.current = ch.hp.max;
  const halfDice = Math.max(1, Math.floor((ch.hitDice.total||1)/2));
  ch.hitDice.current = Math.min(ch.hitDice.total, (ch.hitDice.current||0) + halfDice);
  resetSpellSlotsCurrent(ch);
  resetGrantedSpellUsesByCadence(ch, 'long rest');
  ensureCharacterExtras(ch);
  ch.deathSaves = { successes:0, failures:0 };
  const exhaustion = (ch.conditions||[]).find(c=>c.conditionIndex==='exhaustion');
  if(exhaustion){
    exhaustion.level = Math.max(0, (exhaustion.level||1) - 1);
    if(exhaustion.level<=0) ch.conditions = ch.conditions.filter(c=>c!==exhaustion);
  }
  if(ch.status==='unconscious') ch.status = 'alive';
}
function equippedItemInitiativeBonus(ch){ return equippedItemAttrBonus(ch, 'initiative'); }
function effectiveAC(ch){ return ch.ac + equippedItemAttrBonus(ch,'ac') + featFlatBonus(ch,'ac'); }
// Applies rolled damage to whoever an attack was aimed at — temp HP absorbs first, then current
// HP, clamped at 0. For a PC target, also clears death saves if the result leaves them above 0
// (mirrors the same reset used everywhere else HP goes up); PCs go unconscious at 0, not dead, per
// standard rules, so status isn't touched here for them. For an enemy target, dropping to 0 HP
// while still marked 'alive' flips it to 'dead' automatically — this is what actually removes them
// from every target dropdown (they're all filtered to status==='alive') and from the combat turn
// order on the next Next/Prev press, so a defeated enemy can't keep absorbing attacks or hold up
// initiative. Returns {died} so the caller can show a "slain" toast instead of a routine damage one.
function applyDamageToTarget(target, kind, amount){
  if(!target || amount<=0) return { died:false };
  let remaining = amount;
  if(target.hp.temp && target.hp.temp>0){
    const absorbed = Math.min(target.hp.temp, remaining);
    target.hp.temp -= absorbed;
    remaining -= absorbed;
  }
  target.hp.current = Math.max(0, target.hp.current - remaining);
  if(kind==='pc' && target.hp.current>0){
    ensureCharacterExtras(target);
    target.deathSaves = { successes:0, failures:0 };
  }
  let died = false;
  if(kind==='enemy' && target.hp.current<=0 && target.status==='alive'){
    target.status = 'dead';
    died = true;
  }
  return { died };
}
// Called right after a killing blow — if the enemy that just died happens to be the one currently
// up in an active combat, there's nothing for a corpse to do on its turn, so push the pointer
// forward automatically instead of leaving the combat bar stuck showing a dead creature's turn
// until the DM notices and clicks Next themselves.
function advanceIfCurrentTurnDied(camp, deadEnemy){
  if(!camp.combat) return;
  const cur = currentCombatRef(camp);
  if(cur && cur.kind==='enemy' && cur.ref.id===deadEnemy.id) advanceCombatTurn(camp, 1);
}
function effectiveSpeed(ch){ return ch.speed + equippedItemAttrBonus(ch,'speed') + featFlatBonus(ch,'speed'); }

function totalInitiativeBonus(entity){
  const manual = entity.initiativeBonus||0;
  const gear = entity.inventory ? equippedItemAttrBonus(entity,'initiative') : 0;
  const feat = featFlatBonus(entity,'initiative');
  return { manual, gear, feat, total: manual + gear + feat };
}
function applyInitiativeRoll(entity){
  const dexMod = abilityMod(entity.abilities.dex);
  const { manual, gear, feat, total: bonus } = totalInitiativeBonus(entity);
  const { d20, detail } = rollD20Mode(entity.initiativeMode||'normal');
  entity.initiative = d20 + dexMod + bonus;
  const parts = [detail];
  if(dexMod) parts.push(fmtMod(dexMod)+' dex');
  if(manual) parts.push(fmtMod(manual)+' bonus');
  if(gear) parts.push(fmtMod(gear)+' gear');
  if(feat) parts.push(fmtMod(feat)+' feat');
  state.battleInitBreakdown[entity.id] = parts.join(' ');
}
function fmtMod(n){ return (n>=0? '+':'') + n; }
function profBonus(level){ return Math.floor((level-1)/4) + 2; }

const ABILITY_KEYS = ['str','dex','con','int','wis','cha'];
const POINT_BUY_COST = {8:0,9:1,10:2,11:3,12:4,13:5,14:7,15:9};
const POINT_BUY_BUDGET = 27;
const SPELL_ABILITY_LABELS = {none:'None', int:'Intelligence', wis:'Wisdom', cha:'Charisma'};

// The 18 standard 5e skills, each tied to one ability — used to compute a per-skill modifier
// (ability mod + proficiency bonus if checked) and passive score (10 + modifier) on the character
// sheet. Kept separate from the longer-form SKILLS_REFERENCE table below (which has descriptive
// "uses" text for the Rules tab) since this one only needs the ability key for math.
const SKILL_LIST = [
  {key:'acrobatics', name:'Acrobatics', ability:'dex'},
  {key:'animalHandling', name:'Animal Handling', ability:'wis'},
  {key:'arcana', name:'Arcana', ability:'int'},
  {key:'athletics', name:'Athletics', ability:'str'},
  {key:'deception', name:'Deception', ability:'cha'},
  {key:'history', name:'History', ability:'int'},
  {key:'insight', name:'Insight', ability:'wis'},
  {key:'intimidation', name:'Intimidation', ability:'cha'},
  {key:'investigation', name:'Investigation', ability:'int'},
  {key:'medicine', name:'Medicine', ability:'wis'},
  {key:'nature', name:'Nature', ability:'int'},
  {key:'perception', name:'Perception', ability:'wis'},
  {key:'performance', name:'Performance', ability:'cha'},
  {key:'persuasion', name:'Persuasion', ability:'cha'},
  {key:'religion', name:'Religion', ability:'int'},
  {key:'sleightOfHand', name:'Sleight of Hand', ability:'dex'},
  {key:'stealth', name:'Stealth', ability:'dex'},
  {key:'survival', name:'Survival', ability:'wis'}
];

const ALIGNMENTS = ['Lawful Good','Neutral Good','Chaotic Good','Lawful Neutral','True Neutral','Chaotic Neutral','Lawful Evil','Neutral Evil','Chaotic Evil'];

// Standard PHB "choose N skills" count granted by class at 1st level. Deliberately NOT the whole
// picture — background always adds 2 more fixed skills, and a few races/subclasses add others —
// neither of which this tracker models mechanically (background is freeform text; race traits are
// reference-only). So this powers a soft, informational count on the Skills card, not a hard cap
// like the feat/ASI budget below: being "over" is expected and normal once background is factored
// in, not a mistake to block.
const CLASS_SKILL_COUNT = {
  barbarian:2, bard:3, cleric:2, druid:2, fighter:2, monk:2,
  paladin:2, ranger:3, rogue:4, sorcerer:2, warlock:2, wizard:2
};
function classSkillBudget(ch){
  const base = CLASS_SKILL_COUNT[ch.classIndex] ?? 2;
  const skilledBonus = (ch.feats||[]).filter(f=>f.key==='skilled').length * 3;
  return base + skilledBonus;
}

function pointBuySpent(baseAbilities){
  return ABILITY_KEYS.reduce((sum,k)=> sum + (POINT_BUY_COST[baseAbilities[k]] ?? 0), 0);
}
function ensureAbilityBonusChoice(ch){
  if(!ch.abilityBonusChoice) ch.abilityBonusChoice = { plus2: null, plus1: null };
}
function bonusFromChoice(ch, key){
  ensureAbilityBonusChoice(ch);
  const { plus2, plus1 } = ch.abilityBonusChoice;
  let b = 0;
  if(plus2 === key) b += 2;
  if(plus1 === key && plus1 !== plus2) b += 1;
  return b;
}
function ensureBaseAbilities(ch){
  if(!ch.baseAbilities){
    ch.baseAbilities = {};
    ABILITY_KEYS.forEach(k=>{
      const existing = (ch.abilities && ch.abilities[k]) ? ch.abilities[k] : 8;
      ch.baseAbilities[k] = Math.max(8, Math.min(15, existing));
    });
  }
}
function recomputeEffectiveAbilities(ch){
  ensureBaseAbilities(ch);
  ensureAbilityBonusChoice(ch);
  ensureLevelingFields(ch);
  if(!ch.abilities) ch.abilities = {};
  ABILITY_KEYS.forEach(k=>{
    const itemBonus = equippedItemAttrBonus(ch, k);
    const asiBonus = ch.asiBonuses[k] || 0;
    const featBonus = featAbilityBonus(ch, k);
    ch.abilities[k] = Math.min(20, ch.baseAbilities[k] + bonusFromChoice(ch,k) + asiBonus + featBonus + itemBonus);
  });
}
function syncAllAbilities(){
  (state.campaign.characters||[]).forEach(recomputeEffectiveAbilities);
}
function timeAgo(ts){
  if(!ts) return 'never';
  const s = Math.floor((Date.now()-ts)/1000);
  if(s<10) return 'just now';
  if(s<60) return s+'s ago';
  const m = Math.floor(s/60); if(m<60) return m+'m ago';
  const h = Math.floor(m/60); if(h<24) return h+'h ago';
  const d = Math.floor(h/24); return d+'d ago';
}
function fmtDate(ts){
  const d = new Date(ts);
  return d.toLocaleString(undefined,{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'});
}

function showToast(msg){
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(t._timer);
  t._timer = setTimeout(()=>t.classList.remove('show'), 2200);
}

function getPath(obj, path){
  return path.split('.').reduce((o,k)=> (o==null?undefined:o[k]), obj);
}
function setPath(obj, path, value){
  const keys = path.split('.');
  let cur = obj;
  for(let i=0;i<keys.length-1;i++){
    if(cur[keys[i]]==null || typeof cur[keys[i]]!=='object') cur[keys[i]] = {};
    cur = cur[keys[i]];
  }
  cur[keys[keys.length-1]] = value;
}

function ensureAttackFields(atk){
  if(atk.recharge===undefined) atk.recharge = null;
  if(atk.rechargeAvailable===undefined) atk.rechargeAvailable = true;
  if(atk.attackType===undefined) atk.attackType = 'attack'; // 'attack' (roll vs AC) | 'save' (target rolls a saving throw)
  if(atk.saveAbility===undefined) atk.saveAbility = 'dex';
  if(atk.saveDC===undefined) atk.saveDC = 13;
  if(atk.saveEffect===undefined) atk.saveEffect = 'half'; // 'half' | 'none' | 'other' — what a successful save does to the damage
  if(atk.targetKind===undefined) atk.targetKind = null; // 'pc' | 'npc' | null — who this attack is currently aimed at; persists between rolls
  if(atk.targetId===undefined) atk.targetId = null;
}
function ensureLegendaryFields(en){
  if(en.legendaryActionsMax===undefined) en.legendaryActionsMax = 0;
  if(en.legendaryActionsUsed===undefined) en.legendaryActionsUsed = 0;
  if(!Array.isArray(en.legendaryActions)) en.legendaryActions = [];
  if(en.lairAction===undefined) en.lairAction = '';
}

