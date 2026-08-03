// ---- Battle Console (Dice Roller tab, only shown once combat is actually running) ----
// A single place to see and act on whoever's turn it currently is, without hopping to the Party or
// Enemies tab — HP, AC, action economy, and every attack/spell they can take right now. Every button
// here dispatches the exact same data-action handlers as the Party/Enemies sheets (roll-weapon-attack,
// cast-spell, roll-attack, hp-step/enemy-hp-step) and reuses their render helpers (renderCastControls,
// renderWeaponAttackRow, renderEnemyAttackRow) — this file only adds a compact *view* onto the same
// state and the same business logic, never a second copy of either. The full sheet (skills, feats,
// conditions, inventory editing) still lives on those tabs, same as before.

function renderBattleConsole(){
  const c = state.campaign;
  if(!c.combat) return '';
  const cur = currentCombatRef(c);
  if(!cur) return '';
  const { kind, ref } = cur;
  const idx = kind==='pc' ? c.characters.indexOf(ref) : c.enemies.indexOf(ref);
  const aliveEnemies = (c.enemies||[]).filter(en=>en.status==='alive');

  const ac = kind==='pc' ? effectiveAC(ref) : ref.ac;
  const hpPct = Math.max(0, Math.min(100, (ref.hp.current/Math.max(1,ref.hp.max))*100));
  const hpColor = hpPct<25?'var(--ember)':(hpPct<60?'var(--brass)':'var(--moss)');
  const hpAction = kind==='pc' ? 'hp-step' : 'enemy-hp-step';

  const actionChip = (label, used, action)=>`
    <button class="btn ${used?'danger':'primary'}" data-action="${action}" title="Auto-marked when this ${kind==='pc'?'character':'enemy'} attacks or casts — click to correct it by hand (e.g. Extra Attack, an off-turn reaction, or a feature that doesn't cost the normal action).">
      ${label}: ${used ? '✓ used' : 'available'}
    </button>`;

  const body = kind==='pc' ? renderBattleConsolePc(ref, idx, aliveEnemies) : renderBattleConsoleEnemy(ref, idx);

  return `
    <div class="card" style="border-color:var(--brass);">
      <h3>⚔ ${escapeHtml(ref.name)}'s turn <span class="hint" style="display:inline;">(${kind==='pc'?'party':'enemy'} · round ${c.combat.round})</span></h3>
      <div class="row" style="align-items:center;flex-wrap:wrap;">
        <div class="col" style="max-width:220px;">
          <label>HP</label>
          <div class="hp-row">
            <button class="step-btn dmg" data-action="${hpAction}" data-idx="${idx}" data-amt="-1">−</button>
            <strong style="font-family:var(--font-mono);white-space:nowrap;">${ref.hp.current}/${ref.hp.max}${ref.hp.temp?'+'+ref.hp.temp:''}</strong>
            <button class="step-btn heal" data-action="${hpAction}" data-idx="${idx}" data-amt="1">+</button>
          </div>
          <div class="hp-bar-track"><div class="hp-bar-fill" style="width:${hpPct}%;background:${hpColor};"></div></div>
        </div>
        <div class="col" style="max-width:70px;"><label>AC</label><strong style="font-family:var(--font-mono);color:var(--brass);">${ac}</strong></div>
        <div class="col" style="flex:none;">
          <label>Action economy</label>
          <div style="display:flex;gap:6px;flex-wrap:wrap;">
            ${actionChip('Action', ref.actionUsed, 'toggle-current-action')}
            ${actionChip('Bonus Action', ref.bonusActionUsed, 'toggle-current-bonus-action')}
          </div>
        </div>
      </div>
      ${body}
    </div>
  `;
}

function renderBattleConsolePc(ch, idx, aliveEnemies){
  ensureCharacterExtras(ch);
  const base = `characters.${idx}`;

  const slotLevels = [1,2,3,4,5,6,7,8,9].filter(lv=>(ch.spellcasting.slots[lv]||{}).max>0);
  const slotSummary = slotLevels.length
    ? slotLevels.map(lv=>{ const s = ch.spellcasting.slots[lv]; return `<span class="hint" style="font-family:var(--font-mono);margin-right:10px;">Lv${lv} ${s.current}/${s.max}</span>`; }).join('')
    : `<span class="hint">No spell slots.</span>`;

  const weaponRows = ch.inventory.map((it,i)=>{
    ensureItemAtkFields(it);
    const row = renderWeaponAttackRow(ch, idx, it, i, aliveEnemies);
    if(!row) return '';
    return `<div class="item-row" style="flex-wrap:wrap;"><strong style="flex-basis:100%;">${escapeHtml(it.name)}</strong>${row}</div>`;
  }).join('');

  const knownSpellRows = ch.spells.map((sp,i)=>{
    ensureSpellCastFields(sp);
    const meta = sp.index ? (state.srdSpellIndex||[]).find(s=>s.index===sp.index) : null;
    const statLine = spellStatLine(meta);
    return `<div class="spell-row" style="flex-wrap:wrap;">
      <span style="flex:1;min-width:100px;">${escapeHtml(sp.name)} <span class="hint" style="display:inline;">Lv${sp.level}</span></span>
      ${statLine ? `<div class="hint" style="flex-basis:100%;color:var(--brass-dim);font-family:var(--font-mono);">${escapeHtml(statLine)}</div>` : ''}
      ${renderCastControls(ch, idx, sp, meta, 'known', `${base}.spells.${i}`, `data-source="known" data-spell-idx="${i}"`, aliveEnemies)}
    </div>`;
  }).join('');

  const grantedSpellRows = allGrantedSpellsWithPaths(ch).map(({sourceType,sourceId,sourceName,spell:gs,path})=>{
    ensureSpellCastFields(gs);
    const meta = gs.index ? (state.srdSpellIndex||[]).find(s=>s.index===gs.index) : null;
    const statLine = spellStatLine(meta);
    const icon = sourceType==='feat' ? '⭐' : '🔮';
    return `<div class="spell-row" style="flex-wrap:wrap;background:var(--panel);border:1px dashed var(--line);">
      <span style="flex:1;min-width:100px;">${icon} ${escapeHtml(gs.name)} <span class="hint" style="display:inline;">Lv${gs.level}</span></span>
      ${statLine ? `<div class="hint" style="flex-basis:100%;color:var(--brass-dim);font-family:var(--font-mono);">${escapeHtml(statLine)}</div>` : ''}
      ${renderCastControls(ch, idx, gs, meta, sourceType, `${base}.${path}`, `data-source="${sourceType}" data-source-id="${sourceId}" data-spell-id="${gs.id}"`, aliveEnemies)}
    </div>`;
  }).join('');

  const nothingToShow = !weaponRows && !knownSpellRows && !grantedSpellRows;

  return `
    <div class="hint" style="margin:8px 0;">Spell slots: ${slotSummary}</div>
    ${weaponRows ? `<label style="margin-top:6px;">Equipped weapons</label>${weaponRows}` : ''}
    ${(knownSpellRows || grantedSpellRows) ? `<label style="margin-top:6px;">Spells</label>${knownSpellRows}${grantedSpellRows}` : ''}
    ${nothingToShow ? '<div class="empty-note">No equipped weapons or known spells yet — add some on the Party tab.</div>' : ''}
    <div class="hint" style="margin-top:8px;">Full sheet, skills, conditions, and inventory editing are on the Party tab.</div>
  `;
}

// Always-visible (not gated on active combat) quick-glance strip of every party member's and
// enemy's HP, so a quick "who's actually hurt" check doesn't require leaving the Dice Roller tab.
// Clicking a chip jumps straight to that character/enemy's full sheet, same as clicking it in its
// own tab's chip row — a shortcut on top of the same select-char/select-enemy state, not a new copy.
function renderCombatantHpStrip(){
  const c = state.campaign;
  if(!c.characters.length && !c.enemies.length) return '';
  const curTurn = c.combat ? currentCombatRef(c) : null;
  const chip = (kind, ref)=>{
    const isCurrent = curTurn && curTurn.kind===kind && curTurn.id===ref.id;
    const cls = kind==='pc' ? 'char-chip' : 'char-chip enemy-chip';
    return `<div class="${cls} status-${ref.status}" data-action="${kind==='pc'?'jump-to-char':'jump-to-enemy'}" data-id="${ref.id}" style="cursor:pointer;${isCurrent?'box-shadow:inset 0 0 0 2px var(--brass);':''}">
      <span>${escapeHtml(ref.name)}</span>
      <span class="hp-tag">${ref.hp.current}/${ref.hp.max}${ref.hp.temp?('+'+ref.hp.temp):''}</span>
    </div>`;
  };
  return `
    <div class="card">
      <h3>Party &amp; Enemy HP</h3>
      <div class="char-chips" style="margin-bottom:0;">
        ${c.characters.map(ch=>chip('pc', ch)).join('')}
        ${c.enemies.map(en=>chip('enemy', en)).join('')}
      </div>
    </div>
  `;
}

function renderBattleConsoleEnemy(en, idx){
  const attackRows = (en.attacks||[]).map((atk,i)=>renderEnemyAttackRow(en, idx, atk, i)).join('');
  ensureLegendaryFields(en);
  const legendaryHint = en.legendaryActionsMax>0
    ? `<div class="hint" style="margin-top:8px;">Legendary actions used: <strong style="color:${(en.legendaryActionsUsed||0)>=en.legendaryActionsMax?'var(--ember)':'var(--brass)'};">${en.legendaryActionsUsed||0}/${en.legendaryActionsMax}</strong> — spend or reset them on the Enemies tab.</div>`
    : '';

  return `
    <label style="margin-top:8px;">Attacks</label>
    ${attackRows || '<div class="empty-note">No attacks defined — add some on the Enemies tab.</div>'}
    ${legendaryHint}
    <div class="hint" style="margin-top:8px;">Full stat block, traits, and conditions are on the Enemies tab.</div>
  `;
}
