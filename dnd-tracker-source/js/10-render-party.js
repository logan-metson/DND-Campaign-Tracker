// ---- Party tab ----
function renderParty(){
  const c = state.campaign;
  if(!state.activeCharId && c.characters.length) state.activeCharId = c.characters[0].id;
  const curTurn = c.combat ? currentCombatRef(c) : null;
  const chips = c.characters.map(ch=>{
    const isCurrent = curTurn && curTurn.kind==='pc' && curTurn.id===ch.id;
    return `<div class="char-chip status-${ch.status} ${ch.id===state.activeCharId?'active':''}" data-action="select-char" data-id="${ch.id}">
      <span>${escapeHtml(ch.name)}</span>
      <span class="hp-tag">${ch.hp.current}/${ch.hp.max}${ch.hp.temp?('+'+ch.hp.temp):''}</span>
      ${ch.initiative!=null ? `<span class="init-tag">init ${ch.initiative}</span>` : ''}
      ${ch.surprised ? `<span class="init-tag" title="Surprised — no turn until round 2">😮</span>` : ''}
      ${isCurrent ? `<span class="init-tag" style="background:var(--brass);color:#1a1e27;" title="Current turn">▶ turn</span>` : ''}
    </div>`;
  }).join('');

  const active = c.characters.find(ch=>ch.id===state.activeCharId);

  const partyInvRows = (c.partyInventory||[]).map((it,i)=>{
    ensureItemWeight(it);
    const giveOptions = c.characters.map(ch=>`<option value="${ch.id}">${escapeHtml(ch.name)}</option>`).join('');
    return `<div class="item-row" style="flex-wrap:wrap;">
      ${it.index ? `<span style="flex:2;">${escapeHtml(it.name)}</span>`
                 : `<input type="text" data-bind="partyInventory.${i}.name" data-type="text" value="${escapeAttr(it.name)}" placeholder="Item name" style="flex:2;">`}
      <input type="number" data-bind="partyInventory.${i}.qty" data-type="number" value="${it.qty}" title="Qty" style="width:50px;">
      <input type="number" min="0" step="0.1" data-bind="partyInventory.${i}.weight" data-type="number" value="${it.weight||0}" style="width:56px;" title="Weight in lb">
      <input type="text" class="tags-input" data-bind="partyInventory.${i}.tags" data-type="text" value="${escapeAttr(it.tags||'')}" placeholder="tags / notes">
      ${c.characters.length ? `
      <select id="giveSelect-${i}" style="width:120px;">${giveOptions}</select>
      <button class="btn" data-action="give-party-item" data-item="${i}">Give to</button>` : ''}
      <button class="remove-btn" data-action="remove-party-item" data-item="${i}">✕</button>
    </div>`;
  }).join('');

  return `
    <div class="card">
      <h3>Party Gold: <span style="font-family:var(--font-mono);color:var(--brass)">${c.partyGold} gp</span></h3>
      <div class="field" style="max-width:160px;">
        <label>Adjust party gold</label>
        <input type="number" data-bind="partyGold" data-type="number" value="${c.partyGold}">
      </div>
      <div class="row" style="align-items:center;margin-top:8px;">
        <div class="col" style="flex:none;">
          <button class="btn primary" data-action="long-rest-party" ${c.characters.length?'':'disabled'}>🌙 Long Rest (Whole Party)</button>
        </div>
        <div class="col hint" style="flex:1;min-width:200px;">Restores full HP, refills spell slots, recovers half your hit dice (min 1), refreshes long-rest item/feat uses, and knocks off a level of exhaustion — for everyone currently alive or unconscious.</div>
      </div>
      <div class="hint" style="margin-top:8px;">
        ${renderSrdStatus()}
      </div>
    </div>
    <div class="card">
      <h3>Shared Party Loot</h3>
      <div class="hint" style="margin-bottom:8px;">For anything that isn't any one character's yet — a wagon, an unclaimed magic item, a quest object. "Give to" moves it into that character's personal Inventory (as a plain item; re-add any magic bonuses there once it's claimed).</div>
      ${partyInvRows || '<div class="empty-note">No shared loot yet.</div>'}
      <div class="search-box">
        <input type="text" class="search-input" placeholder="${state.srdEquipmentIndex? 'Search SRD equipment to add…' : 'Loading SRD equipment library…'}" data-party-equip-search="1" ${state.srdEquipmentIndex?'':'disabled'}>
        <div class="search-results" id="partyEquipResults"></div>
      </div>
      <button class="small-add" data-action="add-custom-party-item">+ Add custom item / loot</button>
    </div>
    <div class="char-chips">
      ${chips}
      <button class="add-char-btn" data-action="add-char">+ Add Character</button>
    </div>
    ${active ? renderCharacterSheet(active, c.characters.indexOf(active)) : '<div class="empty-note">No characters yet — add one above.</div>'}
  `;
}

function renderLevelUpPicker(ch, idx){
  const picker = state.levelUpPicker;
  if(!picker || picker.charIdx !== idx) return '';
  const mode = picker.mode || 'choose';
  const asiLevelsFor = getAsiLevels(ch.classIndex);
  const isAsiLevel = asiLevelsFor.includes(picker.level);
  let body = '';
  if(mode==='choose'){
    body = `<div class="row">
      <button class="btn primary" data-action="levelup-mode" data-mode="asi">Ability Score Improvement</button>
      <button class="btn primary" data-action="levelup-mode" data-mode="feat">Choose a Feat instead</button>
      <button class="btn" data-action="skip-levelup-choice">Skip (forfeit this one)</button>
    </div>`;
  } else if(mode==='asi'){
    const split = !!picker.asiSplit;
    body = `
      <div class="row" style="margin-bottom:8px;">
        <button class="btn ${!split?'active':''}" data-action="levelup-asi-split" data-split="0">+2 to one ability</button>
        <button class="btn ${split?'active':''}" data-action="levelup-asi-split" data-split="1">+1 to two abilities</button>
      </div>
      <div class="row">
        <div class="col" style="max-width:160px;">
          <label>${split?'First ability':'Ability'}</label>
          <select id="asiSelectA">
            <option value="">choose…</option>
            ${ABILITY_KEYS.map(a=>`<option value="${a}">${a.toUpperCase()}</option>`).join('')}
          </select>
        </div>
        ${split? `<div class="col" style="max-width:160px;">
          <label>Second ability</label>
          <select id="asiSelectB">
            <option value="">choose…</option>
            ${ABILITY_KEYS.map(a=>`<option value="${a}">${a.toUpperCase()}</option>`).join('')}
          </select>
        </div>` : ''}
      </div>
      <div class="row" style="margin-top:10px;">
        <button class="btn primary" data-action="confirm-asi">Confirm</button>
        <button class="btn" data-action="levelup-mode" data-mode="choose">← Back</button>
      </div>`;
  } else if(mode==='feat'){
    body = `
      <div class="search-box" style="margin-top:0;">
        <input type="text" class="search-input" placeholder="Search feats…" data-levelup-feat-search="1">
        <div class="search-results" id="levelupFeatResults"></div>
      </div>
      <div class="hint" style="margin-top:8px;">Picking a feat here adds it to the Feats card below. If it lets you choose which ability it boosts, pick that afterward down there.</div>
      <div class="row" style="margin-top:8px;">
        <button class="btn" data-action="levelup-mode" data-mode="choose">← Back</button>
      </div>`;
  }
  return `<div class="card" style="border-color:var(--brass);background:var(--panel-2);">
    <h3>🎉 Level ${picker.level}${ch.class?' '+escapeHtml(ch.class):''}</h3>
    ${isAsiLevel ? `<div class="hint" style="margin-bottom:8px;">This level grants an Ability Score Improvement — take the standard +2/+1 split, or trade it for a feat.</div>` : `<div class="hint" style="margin-bottom:8px;">Not normally an ASI level for this class — but nothing's stopping a homebrew bonus feat if the table wants one.</div>`}
    ${body}
  </div>`;
}

// Only shown once a character is actually down (0 HP, not dead/ghost) — stays out of the way
// otherwise. Clicking a pip sets the count to that position, or back down by one if it's already
// there, so mistakes are easy to correct without needing a separate undo.
function renderDeathSaves(ch, idx, base){
  ensureCharacterExtras(ch);
  if(ch.hp.current > 0 || ch.status==='dead' || ch.status==='ghost') return '';
  const ds = ch.deathSaves;
  const stabilized = ds.successes>=3;
  const pip = (filled, action, i)=>`<span data-action="${action}" data-idx="${idx}" data-pos="${i}" style="cursor:pointer;font-size:22px;line-height:1;margin-right:4px;color:${filled?'inherit':'var(--line)'};">●</span>`;
  const succPips = [0,1,2].map(i=>pip(i<ds.successes,'toggle-death-success',i)).join('');
  const failPips = [0,1,2].map(i=>pip(i<ds.failures,'toggle-death-failure',i)).join('');
  return `<div class="card" style="border-color:var(--ember);">
    <h3 style="color:var(--ember);">💀 Death Saving Throws</h3>
    <div class="row" style="align-items:center;">
      <div class="col"><label>Successes</label><div style="color:var(--moss);">${succPips}</div></div>
      <div class="col"><label>Failures</label><div style="color:var(--ember);">${failPips}</div></div>
      <div class="col" style="flex:none;">
        <button class="btn primary" data-action="roll-death-save" data-idx="${idx}" ${stabilized?'disabled':''} style="margin-top:16px;">🎲 Roll Death Save</button>
      </div>
    </div>
    ${stabilized ? `<div class="hint" style="color:var(--moss);margin-top:6px;">Stable at 0 HP — no further death saves needed unless they take damage again.</div>` : ''}
    <div class="hint" style="margin-top:6px;">At 0 HP, roll a plain d20 (no modifiers): 10+ is a success, below 10 a failure. A natural 1 counts as two failures; a natural 20 brings them back to 1 HP immediately and ends this. Three successes stabilizes them; three failures and they die. Any HP regained resets this automatically.</div>
  </div>`;
}

// A freeform text field (with autocomplete from the character's own known spells, but not
// restricted to them — magic items and homebrew effects can cause concentration too) plus a small
// calculator for the "does it break?" roll, since that comes up constantly once someone's up
// front tanking hits while a caster holds Bless or Spirit Guardians.
function renderConcentrationBlock(ch, idx, base){
  ensureCharacterExtras(ch);
  const options = (ch.spells||[]).map(sp=>`<option value="${escapeAttr(sp.name)}">`).join('');
  const warCaster = hasFeat(ch, 'war-caster');
  return `<div class="field" style="background:var(--panel-2);border:1px dashed var(--line);border-radius:6px;padding:8px;margin-bottom:10px;">
    <label>Concentrating on</label>
    <div class="row" style="align-items:center;">
      <div class="col">
        <input type="text" list="concSpells-${idx}" data-bind="${base}.concentratingOn" data-type="text" value="${escapeAttr(ch.concentratingOn||'')}" placeholder="e.g. Bless — leave blank if not concentrating">
        <datalist id="concSpells-${idx}">${options}</datalist>
      </div>
      ${ch.concentratingOn ? `<div class="col" style="flex:none;"><button class="btn" data-action="clear-concentration" data-idx="${idx}">Clear</button></div>` : ''}
    </div>
    <div class="hint" style="margin:6px 0 4px 0;">Concentration check: whenever this character takes damage while concentrating, make a CON save — DC is 10 or half the damage taken, whichever is higher.${warCaster ? ' <strong style="color:var(--brass);">War Caster: this check rolls with advantage, applied automatically below.</strong>' : ''}</div>
    <div class="row" style="align-items:flex-end;">
      <div class="col" style="max-width:120px;"><label>Damage taken</label><input type="number" min="0" id="concDamage-${idx}" value="0"></div>
      <div class="col" style="max-width:200px;"><button class="btn" data-action="roll-concentration-check" data-idx="${idx}" style="width:100%;">🎲 Check Concentration</button></div>
    </div>
  </div>`;
}

function renderSkillsCard(ch, idx, base){
  ensureCharacterExtras(ch);
  const rows = SKILL_LIST.map(sk=>{
    const mod = skillModifier(ch, sk);
    const passive = passiveScore(ch, sk);
    return `<div class="ref-row" style="align-items:center;flex-wrap:nowrap;">
      <label style="display:inline-flex;align-items:center;gap:6px;text-transform:none;font-size:12px;flex:1;min-width:150px;margin-bottom:0;">
        <input type="checkbox" data-bind="${base}.skillProfs.${sk.key}" data-type="checkbox" ${ch.skillProfs[sk.key]?'checked':''} style="width:auto;">
        ${escapeHtml(sk.name)} <span class="hint" style="display:inline;">(${sk.ability.toUpperCase()})</span>
      </label>
      <span style="flex:0 0 46px;font-family:var(--font-mono);color:var(--brass);text-align:right;">${fmtMod(mod)}</span>
      <span class="hint" style="flex:0 0 92px;text-align:right;">passive ${passive}</span>
    </div>`;
  }).join('');
  const used = SKILL_LIST.filter(sk=>ch.skillProfs[sk.key]).length;
  const budget = classSkillBudget(ch);
  const over = used > budget;
  return `<div class="card">
    <h3>Skills</h3>
    <div class="hint" style="margin-bottom:6px;">Check a skill this character is proficient in — modifier and passive score (10 + modifier) update automatically from abilities and proficiency bonus. <strong style="color:${over?'var(--moss)':'var(--brass)'};">${used} / ${budget}</strong> marked, based on ${escapeHtml(ch.class||'this class')}'s starting count${budget>(CLASS_SKILL_COUNT[ch.classIndex]??2) ? ' (+3 from Skilled)' : ''}. Background always adds 2 more on top of this (not tracked here), so running over is normal — this is just a reference count, not a hard limit.</div>
    ${rows}
  </div>`;
}

function renderCharacterSheet(ch, idx){
  const base = `characters.${idx}`;
  const hpPct = Math.max(0, Math.min(100, (ch.hp.current/Math.max(1,ch.hp.max))*100));
  const hpColor = hpPct<25?'var(--ember)':(hpPct<60?'var(--brass)':'var(--moss)');
  const abilities = ['str','dex','con','int','wis','cha'];
  const raceMeta = ch.raceIndex ? (state.srdRaces||[]).find(r=>r.index===ch.raceIndex) : null;
  const classMeta = ch.classIndex ? (state.srdClasses||[]).find(cl=>cl.index===ch.classIndex) : null;

  ensureLevelingFields(ch);
  const aliveEnemies = (state.campaign.enemies||[]).filter(en=>en.status==='alive');
  const featInitBonus = featFlatBonus(ch,'initiative');
  const featAcBonus = featFlatBonus(ch,'ac');
  const featSpeedBonus = featFlatBonus(ch,'speed');

  ensureAbilityBonusChoice(ch);
  const bonusChoice = ch.abilityBonusChoice;
  const abilityBoxes = abilities.map(a=>{
    const raceBonus = bonusFromChoice(ch, a);
    const asiBonus = ch.asiBonuses[a] || 0;
    const featBonus = featAbilityBonus(ch, a);
    const itemBonus = equippedItemAttrBonus(ch, a);
    const eff = ch.abilities[a];
    const bonusParts = [];
    if(raceBonus) bonusParts.push(`+${raceBonus}`);
    if(asiBonus) bonusParts.push(`+${asiBonus} ASI`);
    if(featBonus) bonusParts.push(`+${featBonus} feat`);
    if(itemBonus) bonusParts.push(`+${itemBonus} gear`);
    return `<div class="ability-box">
      <label>${a.toUpperCase()}</label>
      <input type="number" min="8" max="15" data-bind="${base}.baseAbilities.${a}" data-type="baseability" value="${ch.baseAbilities[a]}">
      <div class="hint" style="margin:3px 0;">${bonusParts.length? bonusParts.join(' ')+' → ' : ''}<strong style="color:var(--brass);">${eff}</strong></div>
      <div class="ability-mod">${fmtMod(abilityMod(eff))}</div>
    </div>`;
  }).join('');
  const asiEditors = abilities.map(a=>`
    <div style="width:64px;">
      <label style="font-size:10px;">${a.toUpperCase()}</label>
      <input type="number" min="0" data-bind="${base}.asiBonuses.${a}" data-type="number" value="${ch.asiBonuses[a]||0}" style="width:100%;">
    </div>`).join('');
  const abilityBonusPicker = `
    <div class="row" style="margin:8px 0 4px 0;">
      <div class="col">
        <label>+2 bonus to</label>
        <select data-bind="${base}.abilityBonusChoice.plus2" data-type="abilitybonus">
          <option value="">— none —</option>
          ${abilities.map(a=>`<option value="${a}" ${bonusChoice.plus2===a?'selected':''} ${bonusChoice.plus1===a?'disabled':''}>${a.toUpperCase()}</option>`).join('')}
        </select>
      </div>
      <div class="col">
        <label>+1 bonus to (different ability)</label>
        <select data-bind="${base}.abilityBonusChoice.plus1" data-type="abilitybonus">
          <option value="">— none —</option>
          ${abilities.map(a=>`<option value="${a}" ${bonusChoice.plus1===a?'selected':''} ${bonusChoice.plus2===a?'disabled':''}>${a.toUpperCase()}</option>`).join('')}
        </select>
      </div>
    </div>
    <div class="hint" style="margin-bottom:8px;">Free-choice ability bonus — pick whichever abilities fit your character concept, no matter your race. Strong tiefling? Go for it.</div>`;

  const saveChecks = abilities.map(a=>{
    return `<label style="display:inline-flex;align-items:center;gap:4px;text-transform:none;font-size:11px;margin-right:8px;">
      <input type="checkbox" data-bind="${base}.savingThrowProfs.${a}" data-type="checkbox" ${ch.savingThrowProfs[a]?'checked':''} style="width:auto;">
      ${a.toUpperCase()}
    </label>`;
  }).join('');

  const slotLevels = [1,2,3,4,5,6,7,8,9];
  const slotBoxes = slotLevels.map(lv=>{
    const s = ch.spellcasting.slots[lv] || {current:0,max:0};
    return `<div class="slot-box">
      <label>Lvl ${lv}</label>
      <div class="slot-inputs">
        <input type="number" data-bind="${base}.spellcasting.slots.${lv}.current" data-type="number" value="${s.current}"> /
        <input type="number" data-bind="${base}.spellcasting.slots.${lv}.max" data-type="number" value="${s.max}">
      </div>
    </div>`;
  }).join('');

  const spellRows = ch.spells.map((sp,i)=>{
    ensureSpellCastFields(sp);
    const meta = sp.index ? (state.srdSpellIndex||[]).find(s=>s.index===sp.index) : null;
    const statLine = spellStatLine(meta);
    const descText = meta ? (meta.desc + (meta.higherLevel ? ' At higher levels: ' + meta.higherLevel : '')) : '';
    return `
    <div class="spell-row" style="flex-wrap:wrap;">
      ${sp.index ? `<span style="flex:2;">${escapeHtml(sp.name)} <span class="hint" style="display:inline;">Lv${sp.level} · ${escapeHtml(sp.school||'')}</span></span>`
                 : `<input type="text" data-bind="${base}.spells.${i}.name" data-type="text" value="${escapeAttr(sp.name)}" placeholder="Spell name" style="flex:2;">`}
      ${sp.index ? '' : `<input type="number" data-bind="${base}.spells.${i}.level" data-type="number" value="${sp.level}" style="width:44px;" title="Level">`}
      <label style="display:inline-flex;align-items:center;gap:4px;text-transform:none;font-size:11px;">
        <input type="checkbox" data-bind="${base}.spells.${i}.prepared" data-type="checkbox" ${sp.prepared?'checked':''} style="width:auto;"> prepared
      </label>
      <button class="remove-btn" data-action="remove-spell" data-idx="${idx}" data-item="${i}">✕</button>
      ${statLine ? `<div class="hint" style="flex-basis:100%;color:var(--brass-dim);font-family:var(--font-mono);">${escapeHtml(statLine)}</div>` : ''}
      ${descText ? `<details style="flex-basis:100%;"><summary class="hint" style="cursor:pointer;">What it does</summary><div class="hint" style="margin-top:4px;line-height:1.5;">${escapeHtml(descText)}</div></details>` : ''}
      ${renderCastControls(ch, idx, sp, meta, 'known', `${base}.spells.${i}`, `data-source="known" data-spell-idx="${i}"`, aliveEnemies)}
    </div>`;
  }).join('');

  const grantedSpellRows = allGrantedSpellsWithPaths(ch).map(({sourceType,sourceId,sourceName,spell:gs,path})=>{
    ensureSpellCastFields(gs);
    const meta = gs.index ? (state.srdSpellIndex||[]).find(s=>s.index===gs.index) : null;
    const statLine = spellStatLine(meta);
    const descText = meta ? (meta.desc + (meta.higherLevel ? ' At higher levels: ' + meta.higherLevel : '')) : '';
    const icon = sourceType==='feat' ? '⭐' : '🔮';
    const sourceLabel = sourceType==='feat' ? 'feat' : 'item';
    const usesDisplay = gs.atWill
      ? `<span class="hint" style="font-family:var(--font-mono);">at will</span>`
      : `<span style="display:inline-flex;align-items:center;gap:4px;">
          <button class="remove-btn" data-action="use-granted-spell" data-source-type="${sourceType}" data-source-id="${sourceId}" data-spell-id="${gs.id}" title="Use a charge" ${gs.usesCurrent<=0?'disabled':''}>−1</button>
          <span class="hint" style="font-family:var(--font-mono);">${gs.usesCurrent}/${gs.usesMax} uses</span>
          <button class="remove-btn" data-action="reset-granted-spell" data-source-type="${sourceType}" data-source-id="${sourceId}" data-spell-id="${gs.id}" title="Reset to max">↻</button>
        </span>`;
    return `
    <div class="spell-row" style="flex-wrap:wrap;background:var(--panel);border:1px dashed var(--line);">
      <span style="flex:2;">${icon} ${escapeHtml(gs.name)} <span class="hint" style="display:inline;">Lv${gs.level} · ${escapeHtml(gs.school||'')}</span></span>
      <span class="hint" style="font-family:var(--font-mono);">from ${sourceLabel}: ${escapeHtml(sourceName||sourceLabel)}</span>
      ${usesDisplay}
      ${statLine ? `<div class="hint" style="flex-basis:100%;color:var(--brass-dim);font-family:var(--font-mono);">${escapeHtml(statLine)}</div>` : ''}
      ${descText ? `<details style="flex-basis:100%;"><summary class="hint" style="cursor:pointer;">What it does</summary><div class="hint" style="margin-top:4px;line-height:1.5;">${escapeHtml(descText)}</div></details>` : ''}
      ${renderCastControls(ch, idx, gs, meta, sourceType, `${base}.${path}`, `data-source="${sourceType}" data-source-id="${sourceId}" data-spell-id="${gs.id}"`, aliveEnemies)}
    </div>`;
  }).join('');

  const classListIdx = classSpellListFor(ch);
  const filterOff = state.spellFilterOff.has(idx);

  const invRows = ch.inventory.map((it,i)=>{
    ensureItemBonuses(it);
    ensureItemGrantsSpells(it);
    ensureItemWeight(it);
    ensureItemAtkFields(it);
    const isExpanded = state.expandedItemIds.has(it.id);
    const summary = summarizeItemBonuses(it.bonuses);
    const weaponInfo = it.equipped ? parseWeaponFromTags(it.tags) : null;
    let weaponAttackBlock = '';
    if(weaponInfo){
      const abilityKey = weaponAbilityKey(ch, it, weaponInfo);
      const bonus = weaponAttackBonus(ch, it, abilityKey);
      const targetOptions = `
        <option value="">— no target (just roll) —</option>
        ${aliveEnemies.map(en=>`<option value="enemy:${en.id}" ${it.targetKind==='enemy'&&it.targetId===en.id?'selected':''}>${escapeHtml(en.name)} (AC ${en.ac})</option>`).join('')}
      `;
      weaponAttackBlock = `
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
    const bonusFields = BONUS_FIELD_DEFS.map(f=>`
      <div style="width:56px;">
        <label style="font-size:10px;">${f.label}</label>
        <input type="number" data-bind="${base}.inventory.${i}.bonuses.${f.key}" data-type="number" value="${it.bonuses[f.key]||0}" style="width:100%;">
      </div>`).join('');
    const grantRows = it.grantsSpells.map((gs,gi)=>`
      <div class="item-row" style="flex-wrap:wrap;">
        ${gs.index ? `<span style="flex:1;min-width:100px;">${escapeHtml(gs.name)} <span class="hint" style="display:inline;">Lv${gs.level}</span></span>`
                   : `<input type="text" data-bind="${base}.inventory.${i}.grantsSpells.${gi}.name" data-type="text" value="${escapeAttr(gs.name)}" placeholder="Spell name" style="flex:1;min-width:100px;">`}
        <label style="display:inline-flex;align-items:center;gap:4px;text-transform:none;font-size:11px;">
          <input type="checkbox" data-bind="${base}.inventory.${i}.grantsSpells.${gi}.atWill" data-type="checkbox" ${gs.atWill?'checked':''} style="width:auto;"> at will
        </label>
        ${gs.atWill ? '' : `
        <input type="number" data-bind="${base}.inventory.${i}.grantsSpells.${gi}.usesMax" data-type="number" value="${gs.usesMax}" style="width:44px;" title="Max uses">
        <select data-bind="${base}.inventory.${i}.grantsSpells.${gi}.resetsOn" data-type="text" style="width:100px;">
          ${RESET_CADENCES.map(r=>`<option value="${r}" ${gs.resetsOn===r?'selected':''}>${r}</option>`).join('')}
        </select>`}
        <button class="remove-btn" data-action="remove-granted-spell-def" data-idx="${idx}" data-item="${i}" data-grant="${gi}">✕</button>
      </div>`).join('');
    return `
    <div class="item-row" style="flex-wrap:wrap;">
      ${it.index ? `<span style="flex:2;">${escapeHtml(it.name)}</span>`
                 : `<input type="text" data-bind="${base}.inventory.${i}.name" data-type="text" value="${escapeAttr(it.name)}" placeholder="Item name" style="flex:2;">`}
      <input type="number" data-bind="${base}.inventory.${i}.qty" data-type="number" value="${it.qty}" title="Qty">
      <input type="number" min="0" step="0.1" data-bind="${base}.inventory.${i}.weight" data-type="number" value="${it.weight||0}" style="width:56px;" title="Weight in lb, per item — used for the Encumbrance total below">
      <label style="display:inline-flex;align-items:center;gap:4px;text-transform:none;font-size:11px;">
        <input type="checkbox" data-bind="${base}.inventory.${i}.equipped" data-type="checkbox" ${it.equipped?'checked':''} style="width:auto;"> equipped
      </label>
      <input type="text" class="tags-input" data-bind="${base}.inventory.${i}.tags" data-type="text" value="${escapeAttr(it.tags||'')}" placeholder="tags / notes">
      <button class="remove-btn" data-action="remove-item" data-idx="${idx}" data-item="${i}">✕</button>
      ${weaponAttackBlock}
      <button class="small-add" data-action="toggle-item-bonuses" data-item-id="${it.id}" style="width:100%;text-align:left;margin-top:2px;">
        ${isExpanded?'▾':'▸'} Magic bonuses while equipped${summary?' — '+escapeHtml(summary):''}${it.grantsSpells.length?` · grants ${it.grantsSpells.length} spell${it.grantsSpells.length>1?'s':''}`:''}
      </button>
      ${isExpanded ? `
        <div style="flex-basis:100%;display:flex;gap:8px;flex-wrap:wrap;background:var(--panel);border:1px dashed var(--line);border-radius:6px;padding:8px;margin-top:2px;">
          ${bonusFields}
        </div>
        <div class="hint" style="flex-basis:100%;">Only counts toward the character's stats while "equipped" is checked above. Leave everything at 0 for ordinary, non-magical gear.</div>
        <div style="flex-basis:100%;background:var(--panel);border:1px dashed var(--line);border-radius:6px;padding:8px;margin-top:6px;">
          <label>Grants free casting(s) of a spell (e.g. Ring of Fireball — 1 use/long rest)</label>
          ${grantRows}
          <div class="search-box" style="margin-top:4px;">
            <input type="text" class="search-input" placeholder="${state.srdSpellIndex? 'Search any spell to grant…' : 'Loading SRD spell library…'}" data-grant-spell-search="${idx}:${i}" ${state.srdSpellIndex?'':'disabled'}>
            <div class="search-results" id="grantResults-${idx}-${i}"></div>
          </div>
          <button class="small-add" data-action="add-custom-granted-spell" data-idx="${idx}" data-item="${i}">+ Custom / homebrew granted spell</button>
          <div class="hint" style="flex-basis:100%;">This spell isn't limited to the character's class list — the item works regardless. It only shows up in "Spells known" below while "equipped" is checked.</div>
        </div>
      ` : ''}
    </div>`;
  }).join('');

  const conditionRows = (ch.conditions||[]).map((cnd,i)=>{
    const meta = (state.srdConditions||[]).find(x=>x.index===cnd.conditionIndex);
    const desc = meta ? meta.desc : '';
    return `<div class="item-row" style="flex-wrap:wrap;">
      <strong style="flex:1;min-width:100px;">${cnd.custom ? `<input type="text" data-bind="${base}.conditions.${i}.name" data-type="text" value="${escapeAttr(cnd.name)}" style="width:100%;">` : escapeHtml(cnd.name)}</strong>
      ${cnd.conditionIndex==='exhaustion' ? `<input type="number" min="1" max="6" data-bind="${base}.conditions.${i}.level" data-type="number" value="${cnd.level||1}" style="width:44px;" title="Exhaustion level">` : ''}
      <input type="text" data-bind="${base}.conditions.${i}.duration" data-type="text" value="${escapeAttr(cnd.duration||'')}" placeholder="duration (e.g. 3 rounds)" style="flex:1;min-width:100px;">
      <button class="remove-btn" data-action="remove-condition" data-idx="${idx}" data-item="${i}">✕</button>
      ${desc ? `<div class="hint" style="flex-basis:100%;">${escapeHtml(desc.slice(0,180))}${desc.length>180?'…':''}</div>` : ''}
    </div>`;
  }).join('');
  const conditionOptions = (state.srdConditions||[]).map(cn=>`<option value="${cn.index}">${escapeHtml(cn.name)}</option>`).join('');

  const featRows = (ch.feats||[]).map((ft,i)=>{
    ensureFeatGrantsSpells(ft);
    const needsChoice = ft.abilityChoice && ft.abilityChoice.options.length>1;
    const abilityDisplay = ft.abilityChoice ? (
      needsChoice ? `<select data-bind="${base}.feats.${i}.abilityChoice.selected" data-type="featability" style="width:100px;">
          <option value="">choose ability…</option>
          ${ft.abilityChoice.options.map(o=>`<option value="${o}" ${ft.abilityChoice.selected===o?'selected':''}>${o.toUpperCase()} +${ft.abilityChoice.amount}</option>`).join('')}
        </select>`
      : `<span class="hint" style="font-family:var(--font-mono);">${ft.abilityChoice.selected.toUpperCase()} +${ft.abilityChoice.amount}</span>`
    ) : '';
    const isExpanded = state.expandedFeatIds.has(ft.id);
    const featGrantRows = ft.grantsSpells.map((gs,gi)=>`
      <div class="item-row" style="flex-wrap:wrap;">
        ${gs.index ? `<span style="flex:1;min-width:100px;">${escapeHtml(gs.name)} <span class="hint" style="display:inline;">Lv${gs.level}</span></span>`
                   : `<input type="text" data-bind="${base}.feats.${i}.grantsSpells.${gi}.name" data-type="text" value="${escapeAttr(gs.name)}" placeholder="Spell name" style="flex:1;min-width:100px;">`}
        <label style="display:inline-flex;align-items:center;gap:4px;text-transform:none;font-size:11px;">
          <input type="checkbox" data-bind="${base}.feats.${i}.grantsSpells.${gi}.atWill" data-type="checkbox" ${gs.atWill?'checked':''} style="width:auto;"> at will
        </label>
        ${gs.atWill ? '' : `
        <input type="number" data-bind="${base}.feats.${i}.grantsSpells.${gi}.usesMax" data-type="number" value="${gs.usesMax}" style="width:44px;" title="Max uses">
        <select data-bind="${base}.feats.${i}.grantsSpells.${gi}.resetsOn" data-type="text" style="width:100px;">
          ${RESET_CADENCES.map(r=>`<option value="${r}" ${gs.resetsOn===r?'selected':''}>${r}</option>`).join('')}
        </select>`}
        <button class="remove-btn" data-action="remove-granted-spell-def-feat" data-idx="${idx}" data-item="${i}" data-grant="${gi}">✕</button>
      </div>`).join('');
    return `<div class="item-row" style="flex-wrap:wrap;align-items:flex-start;">
      ${ft.custom ? `<input type="text" data-bind="${base}.feats.${i}.name" data-type="text" value="${escapeAttr(ft.name)}" placeholder="Feat name" style="flex:2;min-width:120px;">`
                 : `<strong style="flex:2;min-width:120px;">${escapeHtml(ft.name)}</strong>`}
      <span class="hint" style="font-family:var(--font-mono);">from Lv${ft.sourceLevel||1}</span>
      ${abilityDisplay}
      <button class="remove-btn" data-action="remove-feat" data-idx="${idx}" data-item="${i}">✕</button>
      ${ft.custom ? `<textarea data-bind="${base}.feats.${i}.desc" data-type="text" placeholder="What it does..." style="flex-basis:100%;min-height:44px;">${escapeHtml(ft.desc||'')}</textarea>`
                 : (ft.desc ? `<div class="hint" style="flex-basis:100%;">${escapeHtml(ft.desc)}</div>` : '')}
      ${needsChoice && !ft.abilityChoice.selected ? `<div class="hint" style="flex-basis:100%;color:var(--brass-dim);">Pick which ability this feat boosts above.</div>` : ''}
      <button class="small-add" data-action="toggle-feat-spells" data-feat-id="${ft.id}" style="width:100%;text-align:left;margin-top:2px;">
        ${isExpanded?'▾':'▸'} Grants spells${ft.grantsSpells.length?` — ${ft.grantsSpells.length} spell${ft.grantsSpells.length>1?'s':''}`:''}
      </button>
      ${isExpanded ? `
        <div style="flex-basis:100%;background:var(--panel);border:1px dashed var(--line);border-radius:6px;padding:8px;margin-top:2px;">
          <label>Free casting(s) this feat grants (e.g. Magic Initiate's cantrips and 1st-level spell)</label>
          ${featGrantRows}
          <div class="search-box" style="margin-top:4px;">
            <input type="text" class="search-input" placeholder="${state.srdSpellIndex? 'Search any spell to grant…' : 'Loading SRD spell library…'}" data-feat-grant-spell-search="${idx}:${i}" ${state.srdSpellIndex?'':'disabled'}>
            <div class="search-results" id="featGrantResults-${idx}-${i}"></div>
          </div>
          <button class="small-add" data-action="add-custom-granted-spell-feat" data-idx="${idx}" data-item="${i}">+ Custom / homebrew granted spell</button>
          <div class="hint" style="flex-basis:100%;">Not limited to the character's class list — pick whatever the feat grants. Always active once the feat is taken (no "equipped" needed).</div>
        </div>
      ` : ''}
    </div>`;
  }).join('');

  return `
    <div class="row">
      <div class="col" style="flex:2;min-width:280px;">
        <div class="card">
          <div class="row" style="align-items:flex-start;">
            <div class="col">
              <div class="field"><label>Name</label><input type="text" data-bind="${base}.name" data-type="text" value="${escapeAttr(ch.name)}"></div>
              <div class="field"><label>Player</label><input type="text" data-bind="${base}.playerName" data-type="text" value="${escapeAttr(ch.playerName)}"></div>
            </div>
            <div class="col">
              <div class="field">
                <label>Race</label>
                ${ch.raceIndex ? `
                  <div style="display:flex;gap:6px;align-items:center;">
                    <span style="flex:1;">${escapeHtml(ch.race)}</span>
                    <button class="btn" style="padding:4px 8px;" data-action="clear-race" data-idx="${idx}">Change</button>
                  </div>
                  ${raceMeta ? `<div class="hint">Speed ${raceMeta.speed} · ${escapeHtml(raceMeta.size)} · Traits: ${escapeHtml(raceMeta.traits.join(', '))}</div>` : ''}
                ` : `
                  <div class="search-box">
                    <input type="text" class="search-input" placeholder="Search SRD races…" data-race-search="${idx}">
                    <div class="search-results" id="raceResults-${idx}"></div>
                  </div>
                  <input type="text" data-bind="${base}.race" data-type="text" value="${escapeAttr(ch.race)}" placeholder="or type a custom race" style="margin-top:6px;">
                `}
              </div>
              <div class="field">
                <label>Class</label>
                ${ch.classIndex ? `
                  <div style="display:flex;gap:6px;align-items:center;">
                    <span style="flex:1;">${escapeHtml(ch.class)}</span>
                    <button class="btn" style="padding:4px 8px;" data-action="clear-class" data-idx="${idx}">Change</button>
                  </div>
                  ${classMeta ? `<div class="hint">Hit die d${classMeta.hitDie} · Saves: ${classMeta.savingThrows.map(s=>s.toUpperCase()).join('/')}${classMeta.spellAbility? ' · Casts using '+SPELL_ABILITY_LABELS[classMeta.spellAbility] : ''}</div>` : ''}
                ` : `
                  <div class="search-box">
                    <input type="text" class="search-input" placeholder="Search SRD classes…" data-class-search="${idx}">
                    <div class="search-results" id="classResults-${idx}"></div>
                  </div>
                  <input type="text" data-bind="${base}.class" data-type="text" value="${escapeAttr(ch.class)}" placeholder="or type a custom class" style="margin-top:6px;">
                `}
              </div>
              <div class="field">
                <label>Subclass</label>
                <div class="search-box">
                  <input type="text" class="search-input" placeholder="${ch.classIndex? 'Search subclasses for this class…' : 'Pick a class above first, or search all…'}" data-subclass-search="${idx}">
                  <div class="search-results" id="subclassResults-${idx}"></div>
                </div>
                <input type="text" data-bind="${base}.subclass" data-type="text" value="${escapeAttr(ch.subclass)}" placeholder="or type a custom subclass" style="margin-top:6px;">
              </div>
            </div>
            <div class="col" style="max-width:170px;">
              <div class="field">
                <label>Level</label>
                <div style="display:flex;gap:6px;">
                  <input type="number" min="1" max="20" data-bind="${base}.level" data-type="number" value="${ch.level}" style="flex:1;min-width:0;">
                  <button class="btn primary" data-action="level-up" data-idx="${idx}" title="Level up: +1 level, HP, hit dice, spell slots, and an ASI/feat prompt if this level grants one" ${(ch.level>=20 || (state.levelUpPicker && state.levelUpPicker.charIdx===idx))?'disabled':''}>▲</button>
                </div>
              </div>
              <div class="field"><label>XP</label><input type="number" data-bind="${base}.xp" data-type="number" value="${ch.xp}"></div>
              <div class="hint">Prof. bonus +${profBonus(ch.level)}</div>
            </div>
          </div>
          ${renderLevelUpPicker(ch, idx)}
          <div class="row" style="margin-top:6px;">
            <div class="col">
              <label>Status</label>
              <select data-bind="${base}.status" data-type="text">
                ${['alive','unconscious','dead','ghost','other'].map(s=>`<option value="${s}" ${ch.status===s?'selected':''}>${s}</option>`).join('')}
              </select>
            </div>
            <div class="col" style="flex:2;">
              <label>Status note (e.g. "haunts the party as a ghostly advisor")</label>
              <input type="text" data-bind="${base}.statusNote" data-type="text" value="${escapeAttr(ch.statusNote)}">
            </div>
            <div class="col">
              <button class="btn danger${isArmed('remove-char',idx)?' armed':''}" data-action="remove-char" data-idx="${idx}" style="margin-top:16px;">${isArmed('remove-char',idx)?'⚠ Click again to confirm':'Remove Character'}</button>
            </div>
          </div>
          <div class="row" style="margin-top:6px;">
            <div class="col">
              <label>Background</label>
              <input type="text" data-bind="${base}.background" data-type="text" value="${escapeAttr(ch.background||'')}" placeholder="e.g. Folk Hero, Sage, Criminal">
            </div>
            <div class="col">
              <label>Alignment</label>
              <select data-bind="${base}.alignment" data-type="text">
                <option value="">— unspecified —</option>
                ${ALIGNMENTS.map(a=>`<option value="${a}" ${ch.alignment===a?'selected':''}>${a}</option>`).join('')}
              </select>
            </div>
            <div class="col" style="flex:2;">
              <label>Languages</label>
              <input type="text" data-bind="${base}.languages" data-type="text" value="${escapeAttr(ch.languages||'')}" placeholder="Common, ...">
              <div class="hint">Auto-filled from race when picked above — free to edit.</div>
            </div>
          </div>
        </div>

        <div class="card">
          <h3>Vitals</h3>
          <div class="row">
            <div class="col">
              <label>HP (current / max / temp)</label>
              <div class="hp-row">
                <button class="step-btn dmg" data-action="hp-step" data-idx="${idx}" data-amt="-1">−</button>
                <input type="number" data-bind="${base}.hp.current" data-type="number" value="${ch.hp.current}">
                <span>/</span>
                <input type="number" data-bind="${base}.hp.max" data-type="number" value="${ch.hp.max}">
                <span>+</span>
                <input type="number" data-bind="${base}.hp.temp" data-type="number" value="${ch.hp.temp}">
                <button class="step-btn heal" data-action="hp-step" data-idx="${idx}" data-amt="1">+</button>
              </div>
              <div class="hp-bar-track"><div class="hp-bar-fill" style="width:${hpPct}%;background:${hpColor};"></div></div>
            </div>
            <div class="col" style="max-width:110px;">
              <label>AC (base)</label>
              <input type="number" data-bind="${base}.ac" data-type="number" value="${ch.ac}">
              ${(equippedItemAttrBonus(ch,'ac')||featAcBonus) ? `<div class="hint">${equippedItemAttrBonus(ch,'ac')?fmtMod(equippedItemAttrBonus(ch,'ac'))+' gear ':''}${featAcBonus?fmtMod(featAcBonus)+' feat ':''}→ <strong style="color:var(--brass);">${effectiveAC(ch)}</strong></div>` : ''}
            </div>
            <div class="col" style="max-width:110px;">
              <label>Speed (base)</label>
              <input type="number" data-bind="${base}.speed" data-type="number" value="${ch.speed}">
              ${(equippedItemAttrBonus(ch,'speed')||featSpeedBonus) ? `<div class="hint">${equippedItemAttrBonus(ch,'speed')?fmtMod(equippedItemAttrBonus(ch,'speed'))+' gear ':''}${featSpeedBonus?fmtMod(featSpeedBonus)+' feat ':''}→ <strong style="color:var(--brass);">${effectiveSpeed(ch)} ft</strong></div>` : ''}
            </div>
            <div class="col" style="max-width:140px;">
              <label>Hit Dice (cur/total, die)</label>
              <div style="display:flex;gap:4px;">
                <input type="number" data-bind="${base}.hitDice.current" data-type="number" value="${ch.hitDice.current}" style="width:40px;">
                <input type="number" data-bind="${base}.hitDice.total" data-type="number" value="${ch.hitDice.total}" style="width:40px;">
                <input type="text" data-bind="${base}.hitDice.die" data-type="text" value="${escapeAttr(ch.hitDice.die)}" style="width:44px;">
              </div>
            </div>
          </div>
          <div class="row" style="margin-top:10px;">
            <div class="col" style="max-width:120px;">
              <label>Initiative</label>
              <div style="display:flex;gap:6px;">
                <input type="number" data-bind="${base}.initiative" data-type="number" value="${ch.initiative??''}" style="flex:1;">
                <button class="step-btn" data-action="roll-char-initiative" data-idx="${idx}" title="Roll 1d20 + DEX modifier">🎲</button>
              </div>
            </div>
            <div class="col" style="max-width:140px;">
              <label>Bonus (class features, manual)</label>
              <input type="number" data-bind="${base}.initiativeBonus" data-type="number" value="${ch.initiativeBonus||0}">
              ${(equippedItemInitiativeBonus(ch)||featInitBonus) ? `<div class="hint">${featInitBonus?`+${featInitBonus} from feats (e.g. Alert)`:''}${featInitBonus&&equippedItemInitiativeBonus(ch)?' · ':''}${equippedItemInitiativeBonus(ch)?`+${equippedItemInitiativeBonus(ch)} from equipped gear`:''} — already applied automatically.</div>` : `<div class="hint">Feat bonuses (e.g. Alert) and magic item bonuses apply automatically once added.</div>`}
            </div>
            <div class="col" style="max-width:140px;">
              <label>Roll with</label>
              <select data-bind="${base}.initiativeMode" data-type="text">
                <option value="normal" ${(ch.initiativeMode||'normal')==='normal'?'selected':''}>Normal</option>
                <option value="adv" ${ch.initiativeMode==='adv'?'selected':''}>Advantage</option>
                <option value="disadv" ${ch.initiativeMode==='disadv'?'selected':''}>Disadvantage</option>
              </select>
            </div>
            <div class="col">
              <label>&nbsp;</label>
              <label style="display:inline-flex;align-items:center;gap:4px;text-transform:none;font-size:13px;color:var(--text);">
                <input type="checkbox" data-bind="${base}.surprised" data-type="checkbox" ${ch.surprised?'checked':''} style="width:auto;"> Surprised this round
              </label>
            </div>
          </div>
          <div class="row" style="margin-top:10px;align-items:flex-end;">
            <div class="col" style="max-width:150px;">
              <label>Short rest: spend hit dice</label>
              <input type="number" min="0" max="${ch.hitDice.current}" id="shortRestDice-${idx}" value="0">
            </div>
            <div class="col" style="max-width:170px;">
              <button class="btn" data-action="short-rest" data-idx="${idx}" style="width:100%;" title="Rolls that many hit dice + CON modifier each, adds the total to HP (capped at max), and refreshes short-rest item/feat uses plus Warlock spell slots">🌗 Take Short Rest</button>
            </div>
            <div class="col hint" style="flex:1;min-width:180px;">Leave at 0 to still refresh short-rest resources (Warlock slots, short-rest item/feat uses) without touching HP.</div>
          </div>
        </div>

        ${renderDeathSaves(ch, idx, base)}

        <div class="card">
          <h3>Ability Scores</h3>
          <div class="hint" style="margin-bottom:8px;">Point buy: <strong style="color:${pointBuySpent(ch.baseAbilities)>=POINT_BUY_BUDGET?'var(--ember)':'var(--brass)'}">${pointBuySpent(ch.baseAbilities)} / ${POINT_BUY_BUDGET}</strong> points spent. Base scores run 8–15; your chosen bonus, any equipped gear bonus, and the 20 hard cap apply on top automatically.</div>
          ${abilityBonusPicker}
          <div class="hint" style="margin-top:10px;">Ability Score Improvements (from leveling, separate from feats) — set these directly here if building a character who's already past level 1:</div>
          <div style="display:flex;gap:6px;flex-wrap:wrap;margin:6px 0 4px 0;">${asiEditors}</div>
          <div class="grid-6">${abilityBoxes}</div>
          <div class="hint">Saving throw proficiencies:</div>
          <div style="margin-top:4px;">${saveChecks}</div>
        </div>

        ${renderSkillsCard(ch, idx, base)}

        <div class="card">
          <h3>Spellcasting</h3>
          ${renderConcentrationBlock(ch, idx, base)}
          <div class="row" style="align-items:flex-end;">
            <div class="col field" style="max-width:160px;">
              <label>Spellcasting ability</label>
              <select data-bind="${base}.spellcasting.ability" data-type="text">
                ${['none','int','wis','cha'].map(s=>`<option value="${s}" ${ch.spellcasting.ability===s?'selected':''}>${SPELL_ABILITY_LABELS[s]}</option>`).join('')}
              </select>
            </div>
            <div class="col" style="max-width:220px;margin-bottom:8px;">
              <button class="btn" data-action="autofill-slots" data-idx="${idx}" style="width:100%;" title="Fills spell slot maxima from class + level (Bard/Cleric/Druid/Sorcerer/Wizard, Paladin/Ranger, Warlock)">↻ Auto-fill slots for level ${ch.level}</button>
            </div>
          </div>
          <label>Spell slots (current / max)</label>
          <div class="slot-grid">${slotBoxes}</div>
          <label style="margin-top:10px;">Spells known</label>
          <div class="hint" style="margin-bottom:6px;">Spells with SRD damage or a saving throw get a 🎲 Cast row: pick a target from the Enemies tab and, if it's a leveled spell, which slot to spend (only levels at or above the spell's own show up — pick higher to upcast, and the bigger SRD damage dice for that level are used automatically). Casting rolls the attack or the target's save, applies damage, spends the slot, and — for a concentration spell — fills in "Concentrating on" below. Buff/utility spells with nothing to auto-roll still get a lighter "Cast (spend slot)" button so slot tracking stays accurate.</div>
          ${spellRows || '<div class="empty-note">No spells added.</div>'}
          ${grantedSpellRows}
          ${grantedSpellRows ? `<button class="small-add" data-action="reset-all-granted-spells" data-idx="${idx}">↻ Reset all granted spell uses (long rest)</button>` : ''}
          <div class="search-box">
            <input type="text" class="search-input" placeholder="${state.srdSpellIndex? 'Search spells to add…' : 'Loading SRD spell library…'}" data-spell-search="${idx}" ${state.srdSpellIndex?'':'disabled'}>
            <div class="search-results" id="spellResults-${idx}"></div>
          </div>
          ${classListIdx ? `
          <label style="display:inline-flex;align-items:center;gap:4px;text-transform:none;font-size:11px;margin-top:4px;">
            <input type="checkbox" data-action="toggle-spell-filter" data-idx="${idx}" ${filterOff?'':'checked'} style="width:auto;"> Only show spells on the ${escapeHtml(classListIdx)} spell list
          </label>` : (ch.classIndex || ch.class ? `<div class="hint">No SRD spell-list data for this class/subclass, so search shows everything.</div>` : '')}
          <button class="small-add" data-action="add-custom-spell" data-idx="${idx}">+ Add custom / homebrew spell</button>
        </div>
      </div>

      <div class="col" style="flex:1;min-width:260px;">
        <div class="card">
          <h3>Inventory</h3>
          <div class="hint" style="margin-bottom:8px;">Magic items? Open "Magic bonuses" on any item to give it a flat bonus to AC, Speed, Initiative, or an ability score — it'll only count while that item is checked "equipped," and flows into the character's stats automatically. Weight is optional — leave it at 0 for anything you don't want to bother tracking. Equipped items whose tags contain a rollable damage die (e.g. "1d8 Slashing" — auto-filled when picked from the SRD search, or typed by hand for anything homebrew) get a 🎲 Attack row: pick a target from the Enemies tab and it rolls to-hit against their AC, then damage on a hit, applying it automatically.</div>
          <div class="field" style="max-width:140px;"><label>Personal gold</label><input type="number" data-bind="${base}.gold" data-type="number" value="${ch.gold}"></div>
          ${(()=>{ const enc = encumbranceStatus(ch); return `
          <div class="field">
            <label>Carried weight: <span style="color:${enc.color};">${enc.weight.toFixed(1)} lb</span> / ${enc.cap} lb capacity — <span style="color:${enc.color};">${enc.label}</span></label>
            <div class="hp-bar-track"><div class="hp-bar-fill" style="width:${enc.pct}%;background:${enc.color};"></div></div>
            <div class="hint" style="margin-top:4px;">Capacity is Strength score × 15 (standard rule). "Encumbered" past 5× Strength and "Heavily Encumbered" past 10× Strength are the optional variant — informational only here, so apply the speed penalty or not, table's call.</div>
          </div>`; })()}
          ${invRows || '<div class="empty-note">No items yet.</div>'}
          <div class="search-box">
            <input type="text" class="search-input" placeholder="${state.srdEquipmentIndex? 'Search SRD equipment to add…' : 'Loading SRD equipment library…'}" data-equip-search="${idx}" ${state.srdEquipmentIndex?'':'disabled'}>
            <div class="search-results" id="equipResults-${idx}"></div>
          </div>
          <button class="small-add" data-action="add-custom-item" data-idx="${idx}">+ Add custom item / loot</button>
        </div>
        <div class="card">
          <h3>Conditions</h3>
          <div class="hint" style="margin-bottom:6px;">Reference only — shows the SRD rules text for whatever's marked here, but doesn't touch this character's attack rolls, saves, or speed automatically. Deliberate, so the table applies effects by hand and stays in control of adjudication.</div>
          ${conditionRows || '<div class="empty-note">No active conditions.</div>'}
          <div class="row" style="align-items:flex-end;margin-top:8px;">
            <div class="col">
              <label>Add condition</label>
              <select id="condSelect-${idx}" ${state.srdConditions?'':'disabled'}>
                <option value="">${state.srdConditions? 'Choose…' : 'Loading…'}</option>
                ${conditionOptions}
                <option value="__custom">Custom / homebrew…</option>
              </select>
            </div>
            <div class="col" style="max-width:90px;">
              <button class="btn primary" data-action="add-condition" data-idx="${idx}" style="width:100%;">+ Add</button>
            </div>
          </div>
        </div>
        <div class="card">
          <h3>Feats</h3>
          ${(()=>{ const earned = featSlotsEarned(ch), used = featSlotsUsed(ch), atCap = used>=earned; return `
          <div class="hint" style="margin-bottom:8px;">
            <strong style="color:${atCap?'var(--ember)':'var(--brass)'};">${used} / ${earned}</strong> feat-or-ASI slots used, based on ${escapeHtml(ch.class||'this class')}'s Ability Score Improvement levels reached so far (level ${ch.level}). Ability-boosting feats and flat bonuses like Alert's initiative apply automatically. Plain +2/+1 Ability Score Improvements taken via Level Up count against this too; hand-typed ASI edits (for a character built already past level 1) don't.
          </div>
          ${atCap ? `<div class="hint" style="color:var(--ember);margin-bottom:8px;">No slots left at this level — level up further to unlock more, or remove a feat/ASI to swap it. (The direct ASI-editor boxes above still work if you're hand-building a higher-level character.)</div>` : ''}
          ${featRows || '<div class="empty-note">No feats yet.</div>'}
          <div class="search-box">
            <input type="text" class="search-input" placeholder="${atCap?'No slots left — see above':'Search feats to add…'}" data-feat-search="${idx}" ${atCap?'disabled':''}>
            <div class="search-results" id="featResults-${idx}"></div>
          </div>
          <button class="small-add" data-action="add-custom-feat" data-idx="${idx}" ${atCap?'disabled':''}>+ Add custom / homebrew feat</button>
          `; })()}
        </div>
        <div class="card">
          <h3>Notes</h3>
          <textarea data-bind="${base}.notes" data-type="text" placeholder="Backstory hooks, bonds, running jokes...">${escapeHtml(ch.notes)}</textarea>
        </div>
      </div>
    </div>
  `;
}

