// ---- Quests tab ----
function renderQuests(){
  const c = state.campaign;
  const rows = c.questLog.map((q,i)=>`
    <div class="quest-row">
      <input type="text" data-bind="questLog.${i}.title" data-type="text" value="${escapeAttr(q.title)}" placeholder="Quest / thread" style="flex:2;">
      <select data-bind="questLog.${i}.status" data-type="text">
        ${['active','completed','failed'].map(s=>`<option value="${s}" ${q.status===s?'selected':''}>${s}</option>`).join('')}
      </select>
      <input type="text" data-bind="questLog.${i}.notes" data-type="text" value="${escapeAttr(q.notes)}" placeholder="notes" style="flex:2;">
      <button class="remove-btn" data-action="remove-quest" data-item="${i}">✕</button>
    </div>`).join('');

  const npcRows = (c.npcs||[]).map((npc,i)=>{
    ensureNpcFields(npc);
    return `<div class="item-row" style="flex-wrap:wrap;">
      <input type="text" data-bind="npcs.${i}.name" data-type="text" value="${escapeAttr(npc.name)}" placeholder="Name" style="flex:1;min-width:110px;">
      <input type="text" data-bind="npcs.${i}.role" data-type="text" value="${escapeAttr(npc.role)}" placeholder="Role / relationship" style="flex:1;min-width:130px;">
      <select data-bind="npcs.${i}.disposition" data-type="text" style="width:100px;">
        ${['friendly','neutral','wary','ally'].map(d=>`<option value="${d}" ${npc.disposition===d?'selected':''}>${d}</option>`).join('')}
      </select>
      <label style="display:inline-flex;align-items:center;gap:4px;text-transform:none;font-size:11px;">
        <input type="checkbox" data-bind="npcs.${i}.hasCombatStats" data-type="checkbox" ${npc.hasCombatStats?'checked':''} style="width:auto;"> HP/AC
      </label>
      ${npc.hasCombatStats ? `
        <input type="number" data-bind="npcs.${i}.hp.current" data-type="number" value="${npc.hp.current}" style="width:44px;" title="Current HP">
        <span>/</span>
        <input type="number" data-bind="npcs.${i}.hp.max" data-type="number" value="${npc.hp.max}" style="width:44px;" title="Max HP">
        <input type="number" data-bind="npcs.${i}.ac" data-type="number" value="${npc.ac}" style="width:44px;" title="AC">
        <input type="number" data-bind="npcs.${i}.saveBonus" data-type="number" value="${npc.saveBonus||0}" style="width:44px;" title="Generic flat bonus used for any auto-rolled saving throw against an enemy attack — not ability-specific">
      ` : ''}
      <button class="remove-btn" data-action="remove-npc" data-item="${i}">✕</button>
      <input type="text" data-bind="npcs.${i}.notes" data-type="text" value="${escapeAttr(npc.notes||'')}" placeholder="notes" style="flex-basis:100%;margin-top:4px;">
    </div>`;
  }).join('');

  const sessionsByRecency = c.sessions.map((s,i)=>({s,i})).sort((a,b)=>(b.s.number||0)-(a.s.number||0));
  const sessionRows = sessionsByRecency.map(({s,i})=>`
    <details class="rules-sub">
      <summary><span>Session ${s.number}${s.date?' — '+escapeHtml(s.date):''}</span></summary>
      <div class="rules-sub-body">
        <textarea data-bind="sessions.${i}.recap" data-type="text" placeholder="What happened this session...">${escapeHtml(s.recap||'')}</textarea>
        <button class="remove-btn" data-action="remove-session" data-item="${i}" style="margin-top:4px;">✕ Remove entry</button>
      </div>
    </details>`).join('');

  return `
    <div class="card">
      <h3>Quest Log</h3>
      ${rows || '<div class="empty-note">No quests logged yet.</div>'}
      <button class="small-add" data-action="add-quest">+ Add quest thread</button>
    </div>
    <div class="card">
      <h3>NPCs &amp; Allies</h3>
      <div class="hint" style="margin-bottom:8px;">Friendly, neutral, or allied faces — hirelings, contacts, animal companions — distinct from the adversarial Enemies tab. HP/AC are optional, for the rare NPC who might actually take a hit.</div>
      ${npcRows || '<div class="empty-note">No NPCs added yet.</div>'}
      <button class="small-add" data-action="add-npc">+ Add NPC / ally</button>
    </div>
    <div class="card">
      <h3>Session Log</h3>
      <div class="hint" style="margin-bottom:8px;">A recap per session, distinct from the always-current Quest Log and World Notes below — so "what happened last time" doesn't get lost in one flat notes box.</div>
      ${sessionRows || '<div class="empty-note">No session recaps yet.</div>'}
      <button class="small-add" data-action="add-session">+ New session entry</button>
    </div>
    <div class="card">
      <h3>World Notes</h3>
      <textarea data-bind="worldNotes" data-type="text" style="min-height:180px;" placeholder="NPCs, locations, running lore, GM-only secrets...">${escapeHtml(c.worldNotes)}</textarea>
    </div>
  `;
}

