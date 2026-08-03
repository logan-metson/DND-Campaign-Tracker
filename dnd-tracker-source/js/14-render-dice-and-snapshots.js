// ---- Battle Initiative Order (Dice tab) ----
function renderBattleInitiative(){
  const c = state.campaign;
  const combatants = [
    ...c.characters.filter(ch=>['alive','unconscious'].includes(ch.status)).map(ch=>({ kind:'pc', ref:ch, idx:c.characters.indexOf(ch) })),
    ...c.enemies.filter(en=>en.status==='alive').map(en=>({ kind:'enemy', ref:en, idx:c.enemies.indexOf(en) }))
  ];

  const rows = combatants.map(({kind,ref,idx})=>{
    const dexMod = abilityMod(ref.abilities.dex);
    const base = kind==='pc' ? `characters.${idx}` : `enemies.${idx}`;
    const gearBonus = kind==='pc' ? equippedItemInitiativeBonus(ref) : 0;
    return `<div class="item-row" style="flex-wrap:wrap;">
      <strong style="flex:1;min-width:110px;color:${kind==='pc'?'var(--brass)':'var(--ember)'}">${escapeHtml(ref.name)}</strong>
      <span class="hint" style="width:70px;">DEX ${fmtMod(dexMod)}</span>
      <input type="number" data-bind="${base}.initiativeBonus" data-type="number" value="${ref.initiativeBonus||0}" style="width:56px;" title="${kind==='pc' ? 'Bonus from feats or class features (equipped-item bonuses are added automatically from Inventory)' : 'Bonus from traits, magic, etc.'}">
      ${gearBonus ? `<span class="hint" title="From equipped inventory items">+${gearBonus} gear</span>` : ''}
      <select data-bind="${base}.initiativeMode" data-type="text" style="width:120px;">
        <option value="normal" ${(ref.initiativeMode||'normal')==='normal'?'selected':''}>Normal</option>
        <option value="adv" ${ref.initiativeMode==='adv'?'selected':''}>Advantage</option>
        <option value="disadv" ${ref.initiativeMode==='disadv'?'selected':''}>Disadvantage</option>
      </select>
      <label style="display:inline-flex;align-items:center;gap:4px;text-transform:none;font-size:11px;">
        <input type="checkbox" data-bind="${base}.surprised" data-type="checkbox" ${ref.surprised?'checked':''} style="width:auto;"> surprised
      </label>
    </div>`;
  }).join('');

  const ordered = computeInitiativeOrder(c);
  const anyRolled = ordered.some(({ref})=>ref.initiative!=null);
  const combatActive = !!c.combat;
  const current = combatActive ? currentCombatRef(c) : null;

  const resultRows = ordered.map(({kind,ref},i)=>{
    const breakdown = state.battleInitBreakdown[ref.id];
    const isCurrent = current && current.id===ref.id && current.kind===kind;
    return `<div class="roll-log-row" style="align-items:center;flex-wrap:wrap;${isCurrent?'background:var(--panel-2);border-radius:6px;box-shadow:inset 3px 0 0 var(--brass);':''}">
      <span>${isCurrent?'▶ ':''}<strong style="color:${kind==='pc'?'var(--brass)':'var(--ember)'}">${i+1}. ${escapeHtml(ref.name)}</strong>${ref.surprised?' <span class="hint" style="color:var(--ember);">😮 surprised — no turn until round 2</span>':''}</span>
      <span>${ref.initiative==null?'—':ref.initiative}${breakdown?` <span class="hint">(${escapeHtml(breakdown)})</span>`:''}</span>
    </div>`;
  }).join('');

  return `
    <div class="card">
      <h3>Battle Initiative Order</h3>
      <div class="hint" style="margin-bottom:8px;">Rolls initiative for everyone currently active in the Party and Enemies tabs, all at once, and lines up the turn order. The ability-score bonus is automatic, and so is any bonus from an equipped item marked with an initiative bonus in that character's Inventory (a "+2 gear" tag shows up below when that applies). Anything else — a feat, a class feature not tied to an item — goes in the bonus box (roll with Advantage/Disadvantage there too, for things like a barbarian's danger sense). If someone's caught off guard this round — an ambush, a failed group sneak — check "surprised": they still get a place in line, but skip acting or reacting until their second turn.</div>
      ${rows || '<div class="empty-note">No active party members or enemies to roll for yet — check the Party and Enemies tabs.</div>'}
      <div class="row" style="margin-top:10px;">
        <button class="btn primary" data-action="roll-battle-initiative">🎲 Roll Battle Initiative</button>
        ${anyRolled ? `<button class="btn" data-action="clear-battle-initiative">Clear Order</button>` : ''}
        ${anyRolled && !combatActive ? `<button class="btn primary" data-action="start-combat">▶ Start Combat</button>` : ''}
        ${combatActive ? `<span class="hint" style="align-self:center;">Combat is running — use the bar up top to step through turns.</span>` : ''}
      </div>
      ${anyRolled ? `<div class="roll-log" style="margin-top:12px;">${resultRows}</div><div class="hint" style="margin-top:6px;">Ties are broken by the higher DEX modifier.</div>` : ''}
    </div>
  `;
}

// ---- Dice tab ----
function renderDice(){
  const dice = [4,6,8,10,12,20,100];
  const pad = dice.map(d=>`<button class="die-btn" data-action="roll" data-sides="${d}"><span>d${d}</span></button>`).join('');
  const last = state.diceLog[0];
  const logRows = state.diceLog.map(r=>`
    <div class="roll-log-row"><span>${escapeHtml(r.label)}</span><span>${r.breakdown} = <strong style="color:var(--brass)">${r.total}</strong></span></div>
  `).join('');

  return `
    ${renderBattleConsole()}
    ${renderCombatantHpStrip()}
    ${renderBattleInitiative()}
    <div class="card">
      <h3>Quick Roll</h3>
      <div class="adv-toggle">
        <button class="btn ${state.adv==='normal'?'active':''}" data-action="set-adv" data-adv="normal">Normal</button>
        <button class="btn ${state.adv==='adv'?'active':''}" data-action="set-adv" data-adv="adv">Advantage</button>
        <button class="btn ${state.adv==='disadv'?'active':''}" data-action="set-adv" data-adv="disadv">Disadvantage</button>
      </div>
      <div class="dice-pad">${pad}</div>
      <div class="row" style="align-items:flex-end;">
        <div class="col" style="max-width:100px;"><label>Count</label><input type="number" id="diceCount" value="1" min="1"></div>
        <div class="col" style="max-width:100px;"><label>Sides</label><input type="number" id="diceSides" value="20" min="2"></div>
        <div class="col" style="max-width:100px;"><label>Modifier</label><input type="number" id="diceMod" value="0"></div>
        <div class="col" style="max-width:140px;"><label>Label</label><input type="text" id="diceLabel" placeholder="e.g. Attack roll"></div>
        <div class="col" style="max-width:120px;"><button class="btn primary" data-action="roll-custom" style="width:100%;">Roll</button></div>
      </div>
    </div>
    ${last ? `<div class="roll-result"><div class="breakdown">${escapeHtml(last.label)}</div><div class="total">${last.total}</div><div class="breakdown">${last.breakdown}</div></div>` : ''}
    <div class="card">
      <h3>Roll Log</h3>
      <div class="roll-log">${logRows || '<div class="empty-note">No rolls yet.</div>'}</div>
      ${state.diceLog.length ? '<button class="btn" style="margin-top:8px;" data-action="clear-dice-log">Clear log</button>' : ''}
    </div>
  `;
}

// ---- Snapshots / Import-Export tab ----
function renderSnapshots(){
  const snaps = state.snapshotIndex.map(s=>`
    <div class="snap-row">
      <div style="flex:1;">
        <input type="text" data-snap-rename="${s.id}" value="${escapeAttr(s.label)}" style="width:100%;background:transparent;border:none;color:var(--text);padding:2px 0;">
        <div class="snap-meta">${fmtDate(s.timestamp)}</div>
      </div>
      <div class="snap-actions">
        <button class="btn" data-action="load-snap" data-id="${s.id}">Load</button>
        <button class="btn danger${isArmed('delete-snap',s.id)?' armed':''}" data-action="delete-snap" data-id="${s.id}">${isArmed('delete-snap',s.id)?'⚠ Confirm?':'Delete'}</button>
      </div>
    </div>`).join('');

  const currentJson = JSON.stringify(state.campaign, null, 2);

  return `
    <div class="card">
      <h3>Snapshot History</h3>
      <div class="hint">Every "Save Snapshot" (top right) records a full, timestamped copy of the campaign — like a save file. Loading one first stashes your current state as a safety snapshot, so you never lose progress by reverting.</div>
      <div style="margin-top:10px;">${snaps || '<div class="empty-note">No snapshots yet — hit "Save Snapshot" up top.</div>'}</div>
    </div>
    <div class="card">
      <h3>Export Current State</h3>
      <div class="hint">Paste this into your DM chat when picking a session back up, or keep it as an external backup.</div>
      <textarea class="code" readonly>${escapeHtml(currentJson)}</textarea>
      <button class="btn primary" style="margin-top:8px;" data-action="copy-export">Copy JSON</button>
      <button class="btn" style="margin-top:8px;" data-action="copy-ai-prompt">Copy AI-DM-ready prompt block</button>
    </div>
    <div class="card">
      <h3>Import State</h3>
      <div class="hint">Paste a full CampaignState JSON export from your DM chat (the block it gives you at end of session). This overwrites current state — a safety snapshot is taken first.</div>
      <textarea class="code" id="importArea" placeholder="Paste JSON here..."></textarea>
      <button class="btn primary" style="margin-top:8px;" data-action="do-import">Import & Save</button>
    </div>
  `;
}

