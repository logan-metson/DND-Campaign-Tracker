// ---- Party-side attack/cast helpers (mirrors the enemy-attack pattern above, aimed the other way) ----

// Persists per-spell casting state — which enemy it's currently aimed at, and (for a character's
// own prepared/known spells only, not item/feat-granted ones) which slot level to spend. Shared
// shape works for both Character.spells entries and the grantsSpells entries on items/feats, since
// both carry {level,...} already; granted spells just never get a slot picker shown for them since
// they draw on their own usesCurrent/usesMax charge instead of the character's spell slots.
function ensureSpellCastFields(sp){
  if(sp.targetKind===undefined) sp.targetKind = null; // 'enemy' | null
  if(sp.targetId===undefined) sp.targetId = null;
  if(sp.castAtLevel===undefined) sp.castAtLevel = sp.level || 0; // 0 for cantrips (no slot to pick)
}
// Persists per-weapon-item attack state — which ability it rolls with ('auto' resolves finesse/
// ranged/melee from the parsed weapon tags below), whether the character is proficient with it
// (assumed true — a casual table's PCs are almost always using gear they're built around), and
// which enemy it's currently aimed at.
function ensureItemAtkFields(it){
  if(it.atkAbility===undefined) it.atkAbility = 'auto'; // 'auto' | 'str' | 'dex'
  if(it.atkProficient===undefined) it.atkProficient = true;
  if(it.targetKind===undefined) it.targetKind = null; // 'enemy' | null
  if(it.targetId===undefined) it.targetId = null;
}
// Best-effort read of a rollable weapon attack out of an inventory item's freeform tags string —
// works for SRD-picked weapons (tags auto-filled as "Weapon · 1d8 Slashing · Versatile, Monk · ...")
// and for any custom/homebrew item as long as the player typed something with an "NdM" dice pattern
// in it somewhere. Returns null (no Attack button shown) if no dice pattern is found at all, so
// non-weapon gear (a torch, a rope) never gets mistaken for something you can swing.
function parseWeaponFromTags(tags){
  if(!tags) return null;
  const diceMatch = tags.match(/(\d+d\d+(?:\s*[+-]\s*\d+)?)/i);
  if(!diceMatch) return null;
  const typeMatch = tags.match(/\d+d\d+(?:\s*[+-]\s*\d+)?\s+(\w+)/i);
  const lower = tags.toLowerCase();
  return {
    damage: diceMatch[1].replace(/\s+/g,''),
    damageType: typeMatch ? typeMatch[1] : '',
    isFinesse: /finesse/.test(lower),
    isRanged: /ammunition/.test(lower) // true ranged weapons (bows, crossbows, slings) — thrown-only weapons still use STR unless also Finesse, per RAW
  };
}
// Which ability score this weapon attack rolls with — an explicit override on the item wins;
// otherwise Finesse weapons use whichever of STR/DEX is higher, true ranged weapons use DEX, and
// everything else defaults to STR.
function weaponAbilityKey(ch, it, parsed){
  if(it.atkAbility==='str' || it.atkAbility==='dex') return it.atkAbility;
  if(parsed.isFinesse) return abilityMod(ch.abilities.dex) > abilityMod(ch.abilities.str) ? 'dex' : 'str';
  if(parsed.isRanged) return 'dex';
  return 'str';
}
function weaponAttackBonus(ch, it, abilityKey){
  return abilityMod(ch.abilities[abilityKey]) + (it.atkProficient ? profBonus(ch.level) : 0);
}
// The to-hit/damage/target row shown under an equipped weapon — shared between the character's
// Inventory list (js/10) and the Battle Console (js/14a), so there's exactly one place that computes
// the attack bonus and builds the Attack button, never two copies to drift apart. Returns '' for a
// non-equipped or non-weapon item (no Attack row to show).
function renderWeaponAttackRow(ch, idx, it, i, aliveEnemies){
  const weaponInfo = it.equipped ? parseWeaponFromTags(it.tags) : null;
  if(!weaponInfo) return '';
  const base = `characters.${idx}`;
  const abilityKey = weaponAbilityKey(ch, it, weaponInfo);
  const bonus = weaponAttackBonus(ch, it, abilityKey);
  const targetOptions = `
    <option value="">— no target (just roll) —</option>
    ${aliveEnemies.map(en=>`<option value="enemy:${en.id}" ${it.targetKind==='enemy'&&it.targetId===en.id?'selected':''}>${escapeHtml(en.name)} (AC ${en.ac})</option>`).join('')}
  `;
  return `
  <div style="flex-basis:100%;display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-top:2px;background:var(--panel);border:1px dashed var(--line);border-radius:6px;padding:6px;">
    <span class="hint" style="margin:0;font-family:var(--font-mono);">${escapeHtml(weaponInfo.damage)}${weaponInfo.damageType?' '+escapeHtml(weaponInfo.damageType):''} · ${fmtMod(bonus)} to hit</span>
    <select data-bind="${base}.inventory.${i}.atkAbility" data-type="text" style="width:130px;" title="Which ability this attack rolls with">
      <option value="auto" ${it.atkAbility==='auto'?'selected':''}>Auto (${weaponInfo.isFinesse?'finesse':(weaponInfo.isRanged?'DEX':'STR')})</option>
      <option value="str" ${it.atkAbility==='str'?'selected':''}>STR</option>
      <option value="dex" ${it.atkAbility==='dex'?'selected':''}>DEX</option>
    </select>
    <label class="hint" style="display:inline-flex;align-items:center;gap:4px;margin:0;">
      <input type="checkbox" data-bind="${base}.inventory.${i}.atkProficient" data-type="checkbox" ${it.atkProficient?'checked':''} style="width:auto;"> proficient
    </label>
    <label class="hint" style="display:inline-flex;align-items:center;gap:4px;margin:0;">Target
      <select data-bind="${base}.inventory.${i}.__target" data-type="target" style="min-width:150px;">${targetOptions}</select>
    </label>
    <button class="step-btn" data-action="roll-weapon-attack" data-idx="${idx}" data-item="${i}" title="Rolls to hit and, on a hit, damage — applies it automatically if a target is picked">🎲 Attack</button>
  </div>`;
}
// A spell attack's to-hit bonus and save DC both use the same proficiency-bonus + spellcasting-
// ability-modifier math — 'none' means the character has no spellcasting ability set yet.
function spellAttackBonus(ch){
  if(ch.spellcasting.ability==='none') return null;
  return profBonus(ch.level) + abilityMod(ch.abilities[ch.spellcasting.ability]);
}
function spellSaveDC(ch){
  if(ch.spellcasting.ability==='none') return null;
  return 8 + profBonus(ch.level) + abilityMod(ch.abilities[ch.spellcasting.ability]);
}
// Reads the correct damage dice for the level a spell is actually being cast at — upcast-aware for
// leveled spells (damageAtSlot is keyed by slot level, already precomputed in the SRD bundle for
// every valid upcast, e.g. fireball's 8d6 at 3rd climbing to 14d6 at 9th), and character-level-aware
// for cantrips (damageAtLevel scales with the caster's level, not a slot). Returns null if the spell
// has no structured damage at all (buffs, utility spells) — those still cost a slot to cast, but
// there's nothing to roll.
function spellDamageForCast(meta, castLevel, chLevel){
  if(!meta) return null;
  if(meta.damageAtSlot){
    const lvls = Object.keys(meta.damageAtSlot).map(Number).sort((a,b)=>a-b);
    let use = lvls[0];
    lvls.forEach(lv=>{ if(lv<=castLevel) use = lv; });
    return meta.damageAtSlot[use];
  }
  if(meta.damageAtLevel){
    const lvls = Object.keys(meta.damageAtLevel).map(Number).sort((a,b)=>a-b);
    let use = lvls[0];
    lvls.forEach(lv=>{ if(lv<=chLevel) use = lv; });
    return meta.damageAtLevel[use];
  }
  return null;
}
function ensureCombatFields(entity){
  if(entity.initiative===undefined) entity.initiative = null;
  if(entity.initiativeBonus===undefined) entity.initiativeBonus = 0;
  if(entity.initiativeMode===undefined) entity.initiativeMode = 'normal';
  if(entity.surprised===undefined) entity.surprised = false;
  if(entity.actionUsed===undefined) entity.actionUsed = false;
  if(entity.bonusActionUsed===undefined) entity.bonusActionUsed = false;
  if(entity.inventory){
    entity.inventory.forEach(ensureItemBonuses);
    entity.inventory.forEach(ensureItemGrantsSpells);
    entity.inventory.forEach(ensureItemWeight);
    entity.inventory.forEach(ensureItemAtkFields); // characters only — weapon-attack target/ability/proficiency fields
  }
  if(entity.baseAbilities){
    ensureLevelingFields(entity); // characters only — enemies have no leveling fields
    ensureCharacterExtras(entity); // skills, death saves, concentration, background/alignment/languages
    (entity.spells||[]).forEach(ensureSpellCastFields); // cast-target/slot fields on known spells
    allGrantedSpells(entity).forEach(({spell})=>ensureSpellCastFields(spell)); // ...and on item/feat-granted spells
  }
  if(entity.attacks){
    entity.attacks.forEach(ensureAttackFields);
    ensureLegendaryFields(entity); // enemies only — characters have no attacks array
    if(entity.xpAwarded===undefined) entity.xpAwarded = false;
    if(entity.saveBonus===undefined) entity.saveBonus = 0;
  }
}
function normalizeCampaign(camp){
  if(!camp.enemies) camp.enemies = [];
  if(camp.combat===undefined) camp.combat = null;
  if(!camp.partyInventory) camp.partyInventory = [];
  if(!camp.npcs) camp.npcs = [];
  if(!camp.sessions) camp.sessions = [];
  camp.partyInventory.forEach(ensureItemWeight);
  camp.npcs.forEach(ensureNpcFields);
  (camp.characters||[]).forEach(ensureCombatFields);
  (camp.enemies||[]).forEach(ensureCombatFields);
  return camp;
}

