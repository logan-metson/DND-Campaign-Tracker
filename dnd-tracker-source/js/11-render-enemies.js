// ---- Enemies tab ----
function renderEnemies(){
  const c = state.campaign;
  if(!state.activeEnemyId && c.enemies.length) state.activeEnemyId = c.enemies[0].id;

  const presetGroups = {};
  MONSTER_PRESETS.forEach(p=>{ (presetGroups[p.category] = presetGroups[p.category]||[]).push(p); });
  const presetOptions = Object.keys(presetGroups).map(cat=>
    `<optgroup label="${escapeHtml(cat)}">${presetGroups[cat].map(p=>`<option value="${p.key}">${escapeHtml(p.name)} (difficulty ${p.cr})</option>`).join('')}</optgroup>`
  ).join('');

  const list = [...c.enemies];
  if(state.enemySort==='initiative'){
    list.sort((a,b)=> (b.initiative??-Infinity) - (a.initiative??-Infinity));
  }
  const curTurn = c.combat ? currentCombatRef(c) : null;
  const chips = list.map(en=>{
    const isCurrent = curTurn && curTurn.kind==='enemy' && curTurn.id===en.id;
    return `<div class="char-chip enemy-chip status-${en.status} ${en.id===state.activeEnemyId?'active':''}" data-action="select-enemy" data-id="${en.id}">
      <span>${escapeHtml(en.name)}</span>
      <span class="hp-tag">${en.hp.current}/${en.hp.max}</span>
      ${en.initiative!=null ? `<span class="init-tag">init ${en.initiative}</span>` : ''}
      ${en.surprised ? `<span class="init-tag" title="Surprised — no turn until round 2">😮</span>` : ''}
      ${isCurrent ? `<span class="init-tag" style="background:var(--brass);color:#1a1e27;" title="Current turn">▶ turn</span>` : ''}
    </div>`;
  }).join('');

  const active = c.enemies.find(en=>en.id===state.activeEnemyId);

  return `
    <div class="card">
      <h3>Spawn Enemies</h3>
      <div class="hint" style="margin-bottom:8px;">Pick a preset for common mooks (a handful of curated 5e SRD stat blocks — goblins, orcs, skeletons, and the like) and spawn as many as you need in one go. Each copy rolls its own HP from the monster's hit dice, so they won't all have identical health. For a boss or anything one-of-a-kind, skip the preset and build a custom sheet below.</div>
      <div class="row" style="align-items:flex-end;">
        <div class="col" style="flex:2;">
          <label>Monster preset</label>
          <select id="presetSelect">${presetOptions}</select>
        </div>
        <div class="col" style="max-width:90px;">
          <label>Quantity</label>
          <input type="number" id="presetQty" min="1" max="30" value="${state.enemyQty}">
        </div>
        <div class="col" style="max-width:140px;">
          <button class="btn primary" data-action="spawn-preset" style="width:100%;">+ Spawn</button>
        </div>
      </div>
      <button class="small-add" data-action="add-custom-enemy">+ Add custom / unique enemy (boss, homebrew, anything one-of-a-kind)</button>
    </div>

    <div class="card">
      <h3>Quick Add from JSON <span class="hint" style="display:inline;">(built by an AI DM chat, or hand-written)</span></h3>
      <div class="hint" style="margin-bottom:8px;">If the party goes off-script and you need enemies on the fly, hit "Copy enemy-generator prompt," paste it into any Claude chat along with what you need, then paste what comes back here. A safety snapshot is taken before anything is added, and every field left out just falls back to a sensible default.</div>
      <textarea class="code" id="enemyJsonImportArea" placeholder='[{"name":"Cultist Fanatic","cr":"2","ac":13,"hp":33,"attacks":[{"name":"Dagger","toHit":4,"damage":"1d4+2","damageType":"piercing"}]}]'></textarea>
      <div class="row" style="margin-top:8px;gap:8px;">
        <button class="btn primary" data-action="import-enemies-json">+ Import enemies</button>
        <button class="btn" data-action="copy-enemy-prompt">Copy enemy-generator prompt</button>
      </div>
    </div>

    ${(()=>{
      const dead = (c.enemies||[]).filter(en=>en.status==='dead' && !en.xpAwarded);
      const unawardedXp = dead.reduce((s,en)=>s+(Number(en.xp)||0),0);
      const eligibleChars = (c.characters||[]).filter(ch=>['alive','unconscious'].includes(ch.status));
      const perChar = eligibleChars.length ? Math.floor(unawardedXp/eligibleChars.length) : 0;
      const remainder = eligibleChars.length ? unawardedXp - perChar*eligibleChars.length : 0;
      return `
    <div class="card">
      <h3>Award XP</h3>
      <div class="hint" style="margin-bottom:8px;">Sums XP from defeated enemies not yet awarded and splits it evenly across everyone currently alive or unconscious. Enemies marked "fled" don't count toward this — only "dead."</div>
      ${dead.length ? `
        <div class="hint">${dead.length} defeated ${dead.length===1?'enemy':'enemies'} worth <strong style="color:var(--brass);">${unawardedXp.toLocaleString()} XP</strong> not yet awarded.</div>
        ${eligibleChars.length ? `<div class="hint">Split ${eligibleChars.length} way${eligibleChars.length===1?'':'s'}: <strong style="color:var(--brass);">${perChar.toLocaleString()} XP each</strong>${remainder?` (${remainder} XP left over)`:''}.</div>` : `<div class="hint" style="color:var(--ember);">No alive/unconscious characters to award it to right now.</div>`}
        <button class="btn primary" data-action="award-xp" style="margin-top:6px;" ${eligibleChars.length?'':'disabled'}>🏆 Award XP to Party</button>
      ` : `<div class="empty-note">No newly defeated enemies to award XP for yet.</div>`}
    </div>`; })()}

    <div class="row" style="align-items:center;margin-bottom:10px;">
      <div class="col" style="flex:none;">
        <button class="btn" data-action="roll-all-initiative">🎲 Roll All Initiative</button>
      </div>
      <div class="col" style="flex:none;">
        <button class="btn ${state.enemySort==='initiative'?'active':''}" data-action="toggle-enemy-sort">
          ${state.enemySort==='initiative' ? 'Sorted by Initiative' : 'Sort by Initiative'}
        </button>
      </div>
      <div class="col" style="flex:none;">
        ${c.enemies.length ? `<button class="btn danger" data-action="clear-enemies">Clear All Enemies</button>` : ''}
      </div>
    </div>

    <div class="char-chips">
      ${chips || '<div class="empty-note" style="width:100%;">No enemies on the board — spawn a group above, or add a unique one.</div>'}
    </div>
    ${active ? renderEnemySheet(active, c.enemies.indexOf(active)) : ''}
  `;
}

// The full attack row (roll type, save/to-hit fields, target picker, recharge) — shared between the
// enemy sheet's Attacks card (js/11) and the Battle Console (js/14a), so there's exactly one place
// that builds it, never two copies to drift apart.
function renderEnemyAttackRow(en, idx, atk, i){
  ensureAttackFields(atk);
  const base = `enemies.${idx}`;
  const targetableChars = state.campaign.characters||[];
  const targetableNpcs = (state.campaign.npcs||[]).filter(n=>n.hasCombatStats);
  const rechargeSet = atk.recharge != null;
  const canFire = !rechargeSet || atk.rechargeAvailable;
  const isSave = atk.attackType==='save';
  const targetOptions = `
    <option value="">— no target (just roll) —</option>
    ${targetableChars.length ? `<optgroup label="Party">${targetableChars.map(pc=>`<option value="pc:${pc.id}" ${atk.targetKind==='pc'&&atk.targetId===pc.id?'selected':''}>${escapeHtml(pc.name)} (AC ${effectiveAC(pc)})</option>`).join('')}</optgroup>` : ''}
    ${targetableNpcs.length ? `<optgroup label="NPCs">${targetableNpcs.map(npc=>`<option value="npc:${npc.id}" ${atk.targetKind==='npc'&&atk.targetId===npc.id?'selected':''}>${escapeHtml(npc.name)} (AC ${npc.ac})</option>`).join('')}</optgroup>` : ''}
  `;
  return `
  <div class="item-row" style="flex-wrap:wrap;">
    <input type="text" data-bind="${base}.attacks.${i}.name" data-type="text" value="${escapeAttr(atk.name)}" placeholder="Attack name" style="flex:2;min-width:110px;">
    <select data-bind="${base}.attacks.${i}.attackType" data-type="text" style="width:110px;" title="Attack roll vs AC, or the target rolls a saving throw (e.g. most spell attacks)">
      <option value="attack" ${!isSave?'selected':''}>Attack roll</option>
      <option value="save" ${isSave?'selected':''}>Saving throw</option>
    </select>
    ${isSave ? `
      <select data-bind="${base}.attacks.${i}.saveAbility" data-type="text" style="width:66px;" title="Which save the target rolls">
        ${['str','dex','con','int','wis','cha'].map(a=>`<option value="${a}" ${atk.saveAbility===a?'selected':''}>${a.toUpperCase()}</option>`).join('')}
      </select>
      <input type="number" data-bind="${base}.attacks.${i}.saveDC" data-type="number" value="${atk.saveDC}" style="width:50px;" title="Save DC">
      <select data-bind="${base}.attacks.${i}.saveEffect" data-type="text" style="width:100px;" title="What a successful save does to the damage">
        <option value="half" ${atk.saveEffect==='half'?'selected':''}>half on save</option>
        <option value="none" ${atk.saveEffect==='none'?'selected':''}>none on save</option>
        <option value="other" ${atk.saveEffect==='other'?'selected':''}>other (notes)</option>
      </select>
    ` : `
      <input type="number" data-bind="${base}.attacks.${i}.toHit" data-type="number" value="${atk.toHit}" style="width:56px;" title="Attack bonus">
    `}
    <input type="text" data-bind="${base}.attacks.${i}.damage" data-type="text" value="${escapeAttr(atk.damage)}" placeholder="1d6+2" style="width:70px;" title="Damage">
    <input type="text" data-bind="${base}.attacks.${i}.damageType" data-type="text" value="${escapeAttr(atk.damageType||'')}" placeholder="type" style="width:80px;">
    <input type="text" data-bind="${base}.attacks.${i}.notes" data-type="text" value="${escapeAttr(atk.notes||'')}" placeholder="range / notes" style="flex:2;min-width:100px;">
    <button class="remove-btn" data-action="remove-enemy-attack" data-idx="${idx}" data-item="${i}">✕</button>
    <div style="flex-basis:100%;display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-top:2px;">
      <label class="hint" style="display:inline-flex;align-items:center;gap:4px;margin:0;">Target
        <select data-bind="${base}.attacks.${i}.__target" data-type="target" style="min-width:150px;">${targetOptions}</select>
      </label>
      <button class="step-btn" data-action="roll-attack" data-idx="${idx}" data-atk="${i}" style="${canFire?'':'opacity:0.55;'}" title="${canFire ? (isSave? 'Rolls the target save, rolls damage, and applies it automatically based on the result' : 'Rolls to-hit against the target AC (if one is picked), then damage, and applies it automatically on a hit') : 'Not recharged yet — clicking will explain why rather than doing nothing'}">🎲 ${isSave?'Cast':'Attack'}</button>
    </div>
    <div style="flex-basis:100%;display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-top:2px;">
      <label class="hint" style="display:inline-flex;align-items:center;gap:4px;margin:0;">Recharge on
        <input type="number" min="1" max="6" data-bind="${base}.attacks.${i}.recharge" data-type="rechargeslot" value="${atk.recharge??''}" style="width:44px;" placeholder="—" title="e.g. 6 for &quot;recharge 6&quot;, 5 for &quot;recharge 5–6&quot;. Leave blank for an at-will attack.">
      </label>
      ${rechargeSet ? `<span class="hint" style="color:${atk.rechargeAvailable?'var(--moss)':'var(--ember)'};margin:0;">${atk.rechargeAvailable?'Ready':'Spent — needs to recharge'}</span>
        <button class="btn" data-action="roll-recharge" data-idx="${idx}" data-atk="${i}" style="padding:3px 8px;">🎲 Roll recharge</button>` : ''}
    </div>
  </div>`;
}

function renderEnemySheet(en, idx){
  const base = `enemies.${idx}`;
  const hpPct = Math.max(0, Math.min(100, (en.hp.current/Math.max(1,en.hp.max))*100));
  const hpColor = hpPct<25?'var(--ember)':(hpPct<60?'var(--brass)':'var(--moss)');
  const abilities = ['str','dex','con','int','wis','cha'];

  const abilityBoxes = abilities.map(a=>{
    const score = en.abilities[a];
    return `<div class="ability-box">
      <label>${a.toUpperCase()}</label>
      <input type="number" data-bind="${base}.abilities.${a}" data-type="number" value="${score}">
      <div class="ability-mod">${fmtMod(abilityMod(score))}</div>
    </div>`;
  }).join('');

  const attackRows = (en.attacks||[]).map((atk,i)=>renderEnemyAttackRow(en, idx, atk, i)).join('');

  const traitRows = (en.traits||[]).map((tr,i)=>`
    <div class="item-row" style="flex-wrap:wrap;">
      <input type="text" data-bind="${base}.traits.${i}.name" data-type="text" value="${escapeAttr(tr.name)}" placeholder="Trait name" style="flex:1;min-width:120px;">
      <input type="text" data-bind="${base}.traits.${i}.desc" data-type="text" value="${escapeAttr(tr.desc||'')}" placeholder="What it does" style="flex:2;min-width:160px;">
      <button class="remove-btn" data-action="remove-enemy-trait" data-idx="${idx}" data-item="${i}">✕</button>
    </div>`).join('');

  ensureLegendaryFields(en);
  const legendaryRows = (en.legendaryActions||[]).map((la,i)=>{
    const cost = la.cost||1;
    const disabled = (en.legendaryActionsUsed||0) + cost > (en.legendaryActionsMax||0);
    return `<div class="item-row" style="flex-wrap:wrap;">
      <input type="text" data-bind="${base}.legendaryActions.${i}.name" data-type="text" value="${escapeAttr(la.name)}" placeholder="Action name" style="flex:1;min-width:100px;">
      <input type="text" data-bind="${base}.legendaryActions.${i}.desc" data-type="text" value="${escapeAttr(la.desc||'')}" placeholder="What it does" style="flex:2;min-width:140px;">
      <input type="number" min="1" max="3" data-bind="${base}.legendaryActions.${i}.cost" data-type="number" value="${cost}" style="width:44px;" title="Actions this costs">
      <button class="btn" data-action="use-legendary-action" data-idx="${idx}" data-item="${i}" ${disabled?'disabled':''} title="Spend ${cost} legendary action(s)">Use</button>
      <button class="remove-btn" data-action="remove-legendary-action" data-idx="${idx}" data-item="${i}">✕</button>
    </div>`;
  }).join('');

  const conditionRows = (en.conditions||[]).map((cnd,i)=>{
    const meta = (state.srdConditions||[]).find(x=>x.index===cnd.conditionIndex);
    const desc = meta ? meta.desc : '';
    return `<div class="item-row" style="flex-wrap:wrap;">
      <strong style="flex:1;min-width:100px;">${cnd.custom ? `<input type="text" data-bind="${base}.conditions.${i}.name" data-type="text" value="${escapeAttr(cnd.name)}" style="width:100%;">` : escapeHtml(cnd.name)}</strong>
      ${cnd.conditionIndex==='exhaustion' ? `<input type="number" min="1" max="6" data-bind="${base}.conditions.${i}.level" data-type="number" value="${cnd.level||1}" style="width:44px;" title="Exhaustion level">` : ''}
      <input type="text" data-bind="${base}.conditions.${i}.duration" data-type="text" value="${escapeAttr(cnd.duration||'')}" placeholder="duration (e.g. 3 rounds)" style="flex:1;min-width:100px;">
      <button class="remove-btn" data-action="remove-enemy-condition" data-idx="${idx}" data-item="${i}">✕</button>
      ${desc ? `<div class="hint" style="flex-basis:100%;">${escapeHtml(desc.slice(0,180))}${desc.length>180?'…':''}</div>` : ''}
    </div>`;
  }).join('');
  const conditionOptions = (state.srdConditions||[]).map(cn=>`<option value="${cn.index}">${escapeHtml(cn.name)}</option>`).join('');

  return `
    <div class="row">
      <div class="col" style="flex:2;min-width:280px;">
        <div class="card">
          <div class="row" style="align-items:flex-start;">
            <div class="col">
              <div class="field"><label>Name</label><input type="text" data-bind="${base}.name" data-type="text" value="${escapeAttr(en.name)}"></div>
              <div class="field"><label>Role / reskin (optional — e.g. "Ranger", "Spellcaster", "Boss")</label><input type="text" data-bind="${base}.role" data-type="text" value="${escapeAttr(en.role||'')}"></div>
            </div>
            <div class="col" style="max-width:160px;">
              <div class="field"><label>Difficulty rating</label><input type="text" data-bind="${base}.cr" data-type="text" value="${escapeAttr(en.cr||'')}" placeholder="e.g. 1/4 or 2"></div>
              <div class="field"><label>XP</label><input type="number" data-bind="${base}.xp" data-type="number" value="${en.xp||0}"></div>
              <div class="hint">Fractions (1/8–1/2) are weak; whole numbers get progressively tougher. Rulebooks and official stat blocks call this "Challenge Rating" (CR) — same thing.</div>
            </div>
            <div class="col" style="max-width:160px;">
              <label>Status</label>
              <select data-bind="${base}.status" data-type="text">
                ${['alive','dead','fled','other'].map(s=>`<option value="${s}" ${en.status===s?'selected':''}>${s}</option>`).join('')}
              </select>
            </div>
            <div class="col" style="flex:none;">
              <button class="btn danger${isArmed('remove-enemy',idx)?' armed':''}" data-action="remove-enemy" data-idx="${idx}" style="margin-top:16px;">${isArmed('remove-enemy',idx)?'⚠ Click again to confirm':'Remove Enemy'}</button>
            </div>
          </div>
        </div>

        <div class="card">
          <h3>Vitals</h3>
          <div class="row">
            <div class="col">
              <label>HP (current / max)</label>
              <div class="hp-row">
                <button class="step-btn dmg" data-action="enemy-hp-step" data-idx="${idx}" data-amt="-1">−</button>
                <input type="number" data-bind="${base}.hp.current" data-type="number" value="${en.hp.current}">
                <span>/</span>
                <input type="number" data-bind="${base}.hp.max" data-type="number" value="${en.hp.max}">
                <button class="step-btn heal" data-action="enemy-hp-step" data-idx="${idx}" data-amt="1">+</button>
              </div>
              <div class="hp-bar-track"><div class="hp-bar-fill" style="width:${hpPct}%;background:${hpColor};"></div></div>
            </div>
            <div class="col" style="max-width:100px;"><label>AC</label><input type="number" data-bind="${base}.ac" data-type="number" value="${en.ac}"></div>
            <div class="col" style="max-width:100px;"><label>Speed</label><input type="number" data-bind="${base}.speed" data-type="number" value="${en.speed}"></div>
          </div>
          <div class="row" style="margin-top:10px;">
            <div class="col" style="max-width:120px;">
              <label>Initiative</label>
              <div style="display:flex;gap:6px;">
                <input type="number" data-bind="${base}.initiative" data-type="number" value="${en.initiative??''}" style="flex:1;">
                <button class="step-btn" data-action="roll-enemy-initiative" data-idx="${idx}" title="Roll 1d20 + DEX modifier">🎲</button>
              </div>
            </div>
            <div class="col" style="max-width:120px;"><label>Bonus (traits, magic, etc.)</label><input type="number" data-bind="${base}.initiativeBonus" data-type="number" value="${en.initiativeBonus||0}"></div>
            <div class="col" style="max-width:140px;">
              <label>Roll with</label>
              <select data-bind="${base}.initiativeMode" data-type="text">
                <option value="normal" ${(en.initiativeMode||'normal')==='normal'?'selected':''}>Normal</option>
                <option value="adv" ${en.initiativeMode==='adv'?'selected':''}>Advantage</option>
                <option value="disadv" ${en.initiativeMode==='disadv'?'selected':''}>Disadvantage</option>
              </select>
            </div>
            <div class="col">
              <label>&nbsp;</label>
              <label style="display:inline-flex;align-items:center;gap:4px;text-transform:none;font-size:13px;color:var(--text);">
                <input type="checkbox" data-bind="${base}.surprised" data-type="checkbox" ${en.surprised?'checked':''} style="width:auto;"> Surprised this round
              </label>
            </div>
          </div>
        </div>

        <div class="card">
          <h3>Ability Scores</h3>
          <div class="grid-6">${abilityBoxes}</div>
          <div class="field" style="max-width:220px;margin-top:8px;">
            <label>Save bonus <span class="hint" style="display:inline;">(on top of ability mod — proficient saves, magic resistance, etc.)</span></label>
            <input type="number" data-bind="${base}.saveBonus" data-type="number" value="${en.saveBonus||0}">
          </div>
        </div>

        <div class="card">
          <h3>Attacks</h3>
          <div class="hint" style="margin-bottom:8px;">Pick a target from the Party or NPC roster (NPCs need "HP/AC" checked on their card first) and the roll resolves fully: an Attack roll checks against their AC and only rolls damage on a hit; a Saving throw auto-rolls the target's save (full ability-score math for party members, a flat generic bonus for NPCs) and applies full/half/no damage based on the result. Either way, HP updates automatically — temp HP absorbs first. Leave target on "no target" to just roll the numbers without touching anyone's HP, same as before.</div>
          ${attackRows || '<div class="empty-note">No attacks added.</div>'}
          <button class="small-add" data-action="add-enemy-attack" data-idx="${idx}">+ Add attack</button>
        </div>

        <div class="card">
          <h3>Traits / Abilities</h3>
          ${traitRows || '<div class="empty-note">No special traits added.</div>'}
          <button class="small-add" data-action="add-enemy-trait" data-idx="${idx}">+ Add trait</button>
        </div>

        <div class="card">
          <h3>Legendary &amp; Lair Actions <span class="hint" style="display:inline;">(optional — for boss fights)</span></h3>
          <div class="row" style="align-items:flex-end;">
            <div class="col" style="max-width:170px;">
              <label>Legendary actions / round</label>
              <input type="number" min="0" data-bind="${base}.legendaryActionsMax" data-type="number" value="${en.legendaryActionsMax||0}">
            </div>
            ${en.legendaryActionsMax>0 ? `
            <div class="col" style="max-width:170px;">
              <label>Used this round</label>
              <div style="display:flex;gap:6px;align-items:center;">
                <strong style="font-family:var(--font-mono);color:${(en.legendaryActionsUsed||0)>=en.legendaryActionsMax?'var(--ember)':'var(--brass)'};">${en.legendaryActionsUsed||0} / ${en.legendaryActionsMax}</strong>
                <button class="btn" data-action="reset-legendary" data-idx="${idx}">Reset</button>
              </div>
            </div>` : ''}
          </div>
          ${en.legendaryActionsMax>0 ? `
            ${legendaryRows || '<div class="empty-note">No legendary actions defined yet.</div>'}
            <button class="small-add" data-action="add-legendary-action" data-idx="${idx}">+ Add legendary action</button>
            <div class="hint" style="margin-top:6px;">Resets automatically at the start of a new round once Battle Initiative's "Start Combat" is running — or hit Reset any time.</div>
          ` : ''}
          <div class="field" style="margin-top:10px;">
            <label>Lair action (optional — reference note, triggers on initiative count 20, DM's call when to use it)</label>
            <textarea data-bind="${base}.lairAction" data-type="text" placeholder="e.g. The cavern shudders and stalactites rain down...">${escapeHtml(en.lairAction||'')}</textarea>
          </div>
        </div>
      </div>

      <div class="col" style="flex:1;min-width:260px;">
        <div class="card">
          <h3>Conditions</h3>
          <div class="hint" style="margin-bottom:6px;">Reference only — shows the SRD rules text for whatever's marked here, but doesn't touch this enemy's attack rolls, saves, or speed automatically. Deliberate, so the table applies effects by hand and stays in control of adjudication.</div>
          ${conditionRows || '<div class="empty-note">No active conditions.</div>'}
          <div class="row" style="align-items:flex-end;margin-top:8px;">
            <div class="col">
              <label>Add condition</label>
              <select id="enemyCondSelect-${idx}" ${state.srdConditions?'':'disabled'}>
                <option value="">${state.srdConditions? 'Choose…' : 'Loading…'}</option>
                ${conditionOptions}
                <option value="__custom">Custom / homebrew…</option>
              </select>
            </div>
            <div class="col" style="max-width:90px;">
              <button class="btn primary" data-action="add-enemy-condition" data-idx="${idx}" style="width:100%;">+ Add</button>
            </div>
          </div>
        </div>
        <div class="card">
          <h3>Notes</h3>
          <textarea data-bind="${base}.notes" data-type="text" placeholder="Tactics, loot, why they're here...">${escapeHtml(en.notes||'')}</textarea>
        </div>
      </div>
    </div>
  `;
}

