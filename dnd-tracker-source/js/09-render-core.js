// ---------- render ----------
function render(){
  syncAllAbilities();
  const c = state.campaign;
  document.getElementById('app').innerHTML = `
    <div class="topbar">
      <div class="brand">
        <h1>📜 ${escapeHtml(c.campaignName)}</h1>
        <div class="meta-field"><input data-bind="campaignName" data-type="text" value="${escapeAttr(c.campaignName)}" placeholder="Campaign name"></div>
        <div class="meta-field">Session <input data-bind="sessionNumber" data-type="number" value="${c.sessionNumber}" style="width:36px"></div>
        <div class="meta-field"><input data-bind="inGameDate" data-type="text" value="${escapeAttr(c.inGameDate)}" placeholder="in-game date"></div>
      </div>
      <div style="display:flex;align-items:center;gap:12px;">
        <span class="saved-indicator">last saved ${timeAgo(state.lastSavedAt)}${state.storageOk?'':' — storage unavailable'}</span>
        <button class="stamp-btn" id="saveSnapBtn" data-action="save-snapshot">⚈ Save Snapshot</button>
      </div>
    </div>
    ${renderLastRollBar()}
    ${renderCombatBar()}
    <div class="tabs">
      ${tabBtn('party','Party')}
      ${tabBtn('enemies','Enemies')}
      ${tabBtn('quests','Quests & World')}
      ${tabBtn('dice','Dice Roller')}
      ${tabBtn('rules','Rules Reference')}
      ${tabBtn('snapshots','Snapshots / Import-Export')}
    </div>
    <div class="content">
      ${state.activeTab==='party' ? renderParty() : ''}
      ${state.activeTab==='enemies' ? renderEnemies() : ''}
      ${state.activeTab==='quests' ? renderQuests() : ''}
      ${state.activeTab==='dice' ? renderDice() : ''}
      ${state.activeTab==='rules' ? renderRules() : ''}
      ${state.activeTab==='snapshots' ? renderSnapshots() : ''}
    </div>
  `;
  attachHandlers();
}

// Shown across every tab, so glancing at the last roll while adjusting HP doesn't require a trip
// to the Dice tab. Updates automatically — it's just the head of the existing dice log.
function renderLastRollBar(){
  const last = state.diceLog[0];
  if(!last) return '';
  return `<div class="last-roll-bar">
    <span class="last-roll-label">🎲 ${escapeHtml(last.label)}</span>
    <span>${escapeHtml(last.breakdown)} = <strong>${last.total}</strong></span>
    <span class="hint" style="margin-left:auto;">${timeAgo(last.timestamp)}</span>
  </div>`;
}

// Shown across every tab whenever a fight is active, so the DM never has to flip to the Dice tab
// just to remember whose turn it is.
function renderCombatBar(){
  const c = state.campaign;
  if(!c.combat) return '';
  const cur = currentCombatRef(c);
  return `<div class="combat-bar">
    <span class="combat-bar-round">⚔ Round ${c.combat.round}</span>
    <span class="combat-bar-name">${cur ? escapeHtml(cur.ref.name)+`'s turn` : '— no active combatants left —'}</span>
    <button class="btn" data-action="prev-turn">◀ Prev</button>
    <button class="btn primary" data-action="next-turn">Next ▶</button>
    <button class="btn danger" data-action="end-combat">End Combat</button>
  </div>`;
}

function tabBtn(key,label){
  return `<button class="tab ${state.activeTab===key?'active':''}" data-action="set-tab" data-tab="${key}">${label}</button>`;
}

function escapeHtml(s){ return (s==null?'':String(s)).replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
function escapeAttr(s){ return escapeHtml(s); }

function renderSrdStatus(){
  const spellN = (state.srdSpellIndex||[]).length;
  const condN = (state.srdConditions||[]).length;
  const equipN = (state.srdEquipmentIndex||[]).length;
  return `SRD library: ${spellN} spells · ${condN} conditions · ${equipN} equipment items — embedded in this file, no external calls at any point.`;
}

