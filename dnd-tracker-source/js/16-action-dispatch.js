async function onClick(e){
  const btn = e.target.closest('[data-action]');
  if(!btn) return;
  const action = btn.dataset.action;
  const c = state.campaign;

  // First click on a confirm-guarded action just arms it and stops here; the matching handler
  // below only runs once the same button is clicked again inside the confirm window.
  if(CONFIRM_ACTIONS.has(action)){
    const key = armKeyFor(action, btn.dataset.idx ?? btn.dataset.id);
    if(!isArmed(action, btn.dataset.idx ?? btn.dataset.id)){
      state.armedAction = { key, armedAt: Date.now() };
      render();
      return;
    }
    state.armedAction = null;
  } else if(state.armedAction){
    state.armedAction = null; // clicking anything else cancels a pending confirm
  }
  scheduleAutosave();

  if(action==='set-tab'){ state.activeTab = btn.dataset.tab; render(); }

  else if(action==='select-char'){ state.activeCharId = btn.dataset.id; render(); }

  else if(action==='add-char'){
    const ch = blankCharacter('New Adventurer');
    c.characters.push(ch);
    state.activeCharId = ch.id;
    render();
  }

  else if(action==='remove-char'){
    const idx = Number(btn.dataset.idx);
    const removed = c.characters[idx];
    await saveSnapshotSilent('(auto) before removing '+(removed?.name||'character'));
    c.characters.splice(idx,1);
    state.activeCharId = c.characters.length ? c.characters[0].id : null;
    showToast('Character removed (safety snapshot saved first)');
    render();
  }

  else if(action==='hp-step'){
    const idx = Number(btn.dataset.idx);
    const amt = Number(btn.dataset.amt);
    const ch = c.characters[idx];
    ch.hp.current = Math.max(0, Math.min(ch.hp.max, ch.hp.current + amt));
    if(ch.hp.current > 0){ ensureCharacterExtras(ch); ch.deathSaves = { successes:0, failures:0 }; }
    render();
  }

  else if(action==='short-rest'){
    const idx = Number(btn.dataset.idx);
    const ch = c.characters[idx];
    const diceInput = document.getElementById('shortRestDice-'+idx);
    const spend = Math.max(0, Math.min(ch.hitDice.current, Number(diceInput ? diceInput.value : 0) || 0));
    let healed = 0;
    if(spend>0){
      const dieSides = parseInt(String(ch.hitDice.die||'d8').replace(/[^\d]/g,''),10) || 8;
      const conMod = abilityMod(ch.abilities.con);
      for(let i=0;i<spend;i++){
        const roll = 1+Math.floor(Math.random()*dieSides);
        healed += Math.max(0, roll+conMod);
      }
      ch.hitDice.current -= spend;
      ch.hp.current = Math.min(ch.hp.max, ch.hp.current + healed);
      if(ch.hp.current > 0){ ensureCharacterExtras(ch); ch.deathSaves = { successes:0, failures:0 }; }
      state.diceLog.unshift({ id: uid('roll'), timestamp: Date.now(), label: `${ch.name} — short rest (${spend}x ${ch.hitDice.die})`, total: healed, breakdown: `${spend}x d${dieSides} ${fmtMod(conMod)} each` });
      persistDiceLog();
    }
    resetGrantedSpellUsesByCadence(ch, 'short rest');
    if(ch.classIndex==='warlock') resetSpellSlotsCurrent(ch);
    showToast(spend>0 ? `${ch.name} spends ${spend} hit dice, heals ${healed} HP.` : `${ch.name} takes a short rest — short-rest resources refreshed.`);
    render();
  }

  else if(action==='toggle-death-success'){
    const idx = Number(btn.dataset.idx), pos = Number(btn.dataset.pos);
    const ch = c.characters[idx];
    ensureCharacterExtras(ch);
    ch.deathSaves.successes = (ch.deathSaves.successes === pos+1) ? pos : pos+1;
    render();
  }
  else if(action==='toggle-death-failure'){
    const idx = Number(btn.dataset.idx), pos = Number(btn.dataset.pos);
    const ch = c.characters[idx];
    ensureCharacterExtras(ch);
    ch.deathSaves.failures = (ch.deathSaves.failures === pos+1) ? pos : pos+1;
    if(ch.deathSaves.failures>=3 && ch.status!=='dead'){ ch.status='dead'; showToast(`${ch.name} has died.`); }
    render();
  }
  else if(action==='roll-death-save'){
    const idx = Number(btn.dataset.idx);
    const ch = c.characters[idx];
    ensureCharacterExtras(ch);
    const roll = 1+Math.floor(Math.random()*20);
    let msg;
    if(roll===20){
      ch.hp.current = 1;
      ch.deathSaves = { successes:0, failures:0 };
      if(ch.status==='unconscious') ch.status = 'alive';
      msg = `${ch.name} rolled a natural 20 on their death save — regains 1 HP and wakes up!`;
    } else if(roll===1){
      ch.deathSaves.failures = Math.min(3, ch.deathSaves.failures+2);
      msg = `${ch.name} rolled a natural 1 — that's two failures (${ch.deathSaves.failures}/3).`;
    } else if(roll>=10){
      ch.deathSaves.successes = Math.min(3, ch.deathSaves.successes+1);
      msg = `${ch.name} rolled ${roll} — success (${ch.deathSaves.successes}/3).`;
    } else {
      ch.deathSaves.failures = Math.min(3, ch.deathSaves.failures+1);
      msg = `${ch.name} rolled ${roll} — failure (${ch.deathSaves.failures}/3).`;
    }
    if(ch.deathSaves.failures>=3 && roll!==20){ ch.status='dead'; msg += ' Three failures — they have died.'; }
    state.diceLog.unshift({ id: uid('roll'), timestamp: Date.now(), label: `${ch.name} — death save`, total: roll, breakdown: `d20 ${roll}` });
    persistDiceLog();
    showToast(msg);
    render();
  }

  else if(action==='clear-concentration'){
    const idx = Number(btn.dataset.idx);
    const ch = c.characters[idx];
    ensureCharacterExtras(ch);
    ch.concentratingOn = '';
    render();
  }
  else if(action==='roll-concentration-check'){
    const idx = Number(btn.dataset.idx);
    const ch = c.characters[idx];
    ensureCharacterExtras(ch);
    const dmgInput = document.getElementById('concDamage-'+idx);
    const dmg = Math.max(0, Number(dmgInput ? dmgInput.value : 0) || 0);
    const dc = Math.max(10, Math.floor(dmg/2));
    const conMod = abilityMod(ch.abilities.con);
    const prof = ch.savingThrowProfs.con ? profBonus(ch.level) : 0;
    const warCaster = hasFeat(ch, 'war-caster');
    let roll, rollDetail;
    if(warCaster){
      const r1 = 1+Math.floor(Math.random()*20), r2 = 1+Math.floor(Math.random()*20);
      roll = Math.max(r1,r2);
      rollDetail = `d20 ${r1}/${r2}→${roll} (advantage: War Caster)`;
    } else {
      roll = 1+Math.floor(Math.random()*20);
      rollDetail = `d20 ${roll}`;
    }
    const total = roll + conMod + prof;
    const pass = total >= dc;
    state.diceLog.unshift({
      id: uid('roll'), timestamp: Date.now(),
      label: `${ch.name} — concentration check (DC ${dc})`, total,
      breakdown: `${rollDetail} ${fmtMod(conMod)} con${prof?(' '+fmtMod(prof)+' prof'):''}`
    });
    persistDiceLog();
    if(!pass){
      showToast(`${ch.name} loses concentration${ch.concentratingOn?' on '+ch.concentratingOn:''} — rolled ${total} vs DC ${dc}.`);
      ch.concentratingOn = '';
    } else {
      showToast(`${ch.name} maintains concentration — rolled ${total} vs DC ${dc}.`);
    }
    render();
  }

  else if(action==='add-custom-spell'){
    const idx = Number(btn.dataset.idx);
    c.characters[idx].spells.push({id:uid('spell'), index:null, name:'', level:1, school:'', prepared:false});
    render();
  }
  else if(action==='pick-spell'){
    const idx = Number(btn.dataset.idx);
    const spellIndex = btn.dataset.spellIndex;
    const detail = await getSpellDetail(spellIndex);
    c.characters[idx].spells.push({
      id: uid('spell'), index: spellIndex,
      name: detail ? detail.name : spellIndex,
      level: detail ? detail.level : 0,
      school: detail ? detail.school : '',
      prepared: false
    });
    const searchInput = document.querySelector(`[data-spell-search="${idx}"]`);
    if(searchInput) searchInput.value = '';
    const resultsDiv = document.getElementById('spellResults-'+idx);
    if(resultsDiv){ resultsDiv.innerHTML=''; resultsDiv.classList.remove('open'); }
    render();
  }
  else if(action==='remove-spell'){
    const idx = Number(btn.dataset.idx), item = Number(btn.dataset.item);
    c.characters[idx].spells.splice(item,1);
    render();
  }
  else if(action==='toggle-spell-filter'){
    const idx = Number(btn.dataset.idx);
    if(state.spellFilterOff.has(idx)) state.spellFilterOff.delete(idx);
    else state.spellFilterOff.add(idx);
    render();
  }

  else if(action==='cast-spell'){
    const idx = Number(btn.dataset.idx);
    const ch = c.characters[idx];
    const source = btn.dataset.source; // 'known' | 'item' | 'feat'
    let sp, consumeResource, resourceLabel;
    if(source==='known'){
      const si = Number(btn.dataset.spellIdx);
      sp = ch.spells[si];
      if(!sp) return;
      ensureSpellCastFields(sp);
      if((sp.level||0) > 0){
        const slot = ch.spellcasting.slots[sp.castAtLevel];
        if(!slot || slot.current<=0){ showToast(`No level ${sp.castAtLevel} slots remaining.`); return; }
        consumeResource = ()=>{ slot.current -= 1; };
        resourceLabel = `spends a level ${sp.castAtLevel} slot`;
      } else {
        consumeResource = ()=>{};
        resourceLabel = 'at-will cantrip';
      }
    } else {
      const holders = source==='feat' ? (ch.feats||[]) : (ch.inventory||[]);
      const holder = holders.find(h=>h.id===btn.dataset.sourceId);
      if(!holder) return;
      sp = (holder.grantsSpells||[]).find(g=>g.id===btn.dataset.spellId);
      if(!sp) return;
      ensureSpellCastFields(sp);
      if(!sp.atWill && (sp.usesCurrent||0)<=0){ showToast(`No uses of ${sp.name} left.`); return; }
      consumeResource = ()=>{ if(!sp.atWill) sp.usesCurrent = Math.max(0, sp.usesCurrent-1); };
      resourceLabel = sp.atWill ? 'at-will' : `spends a charge (${holder.name})`;
    }

    const meta = sp.index ? (state.srdSpellIndex||[]).find(s=>s.index===sp.index) : null;
    const castLevel = (sp.level||0) > 0 ? (Number(sp.castAtLevel)||sp.level) : 0;
    let target = null, targetLabel = '';
    if(sp.targetKind==='enemy' && sp.targetId){
      target = c.enemies.find(x=>x.id===sp.targetId);
      if(target) targetLabel = target.name;
    }
    if(target && target.status!=='alive'){
      showToast(`${target.name} is already down — pick a new target.`);
      return;
    }

    const bonus = spellAttackBonus(ch), dc = spellSaveDC(ch);
    if(bonus===null){ showToast(`${ch.name} has no spellcasting ability set (see Spellcasting card).`); return; }

    const dmgFormula = spellDamageForCast(meta, castLevel, ch.level);
    const hasSave = !!(meta && meta.saveAbility);

    if(!meta || (!hasSave && !dmgFormula)){
      // No SRD metadata, or a known utility/buff spell with nothing to auto-roll — just spend the
      // resource and log the cast.
      consumeResource();
      if(meta && meta.concentration) ch.concentratingOn = sp.name;
      showToast(`${ch.name} casts ${sp.name} (${resourceLabel}).`);
      render();
      return;
    }

    if(hasSave){
      let saveTotal=null, passed=null;
      if(target){
        const roll = 1+Math.floor(Math.random()*20);
        const tgtMod = abilityMod(target.abilities[meta.saveAbility]);
        const tgtBonus = target.saveBonus||0;
        saveTotal = roll+tgtMod+tgtBonus;
        passed = saveTotal >= dc;
        state.diceLog.unshift({ id: uid('roll'), timestamp: Date.now(), label: `${targetLabel} — save vs ${ch.name}'s ${sp.name} (DC ${dc})`, total: saveTotal, breakdown: `d20 ${roll} ${fmtMod(tgtMod)} ${meta.saveAbility.toUpperCase()}${tgtBonus?(' '+fmtMod(tgtBonus)+' bonus'):''}` });
      }
      let dmgTotal = 0;
      if(dmgFormula){
        dmgTotal = rollDiceFormula(dmgFormula);
        state.diceLog.unshift({ id: uid('roll'), timestamp: Date.now(), label: `${ch.name} — ${sp.name} (damage${meta.damageType?' · '+meta.damageType:''})`, total: dmgTotal, breakdown: dmgFormula });
      }
      consumeResource();
      if(meta.concentration) ch.concentratingOn = sp.name;
      if(target && dmgTotal>0){
        let applied = dmgTotal;
        if(passed) applied = meta.saveEffect==='half' ? Math.floor(dmgTotal/2) : 0;
        let died = false;
        if(applied>0) died = applyDamageToTarget(target, 'enemy', applied).died;
        if(died){
          advanceIfCurrentTurnDied(c, target);
          showToast(`${targetLabel} is slain by ${sp.name}!`);
        } else {
          showToast(`${targetLabel} ${passed?'succeeds':'fails'} the save${applied>0?` — takes ${applied} damage`:(passed?' — no damage':' — effect per spell text, no damage auto-applied')}.`);
        }
      } else {
        showToast(`${ch.name} casts ${sp.name} (${resourceLabel}).`);
      }
      persistDiceLog();
      render();
      return;
    }

    // Spell attack roll (no saveAbility, but has structured damage — e.g. Fire Bolt, Eldritch Blast, Guiding Bolt).
    const { d20, detail } = rollD20Mode(state.adv);
    const attackTotal = d20 + bonus;
    let isHit = null, hitNote = '';
    if(target){
      isHit = attackTotal >= (target.ac||10);
      hitNote = ` vs ${targetLabel}'s AC ${target.ac} — ${isHit?'HIT':'MISS'}`;
    }
    state.diceLog.unshift({ id: uid('roll'), timestamp: Date.now(), label: `${ch.name} — ${sp.name} (spell attack${hitNote})`, total: attackTotal, breakdown: `${detail} ${fmtMod(bonus)}` });
    consumeResource();
    if(meta.concentration) ch.concentratingOn = sp.name;
    if(isHit===false){
      showToast(`${sp.name} misses ${targetLabel}.`);
      persistDiceLog();
      render();
      return;
    }
    const dmgTotal = rollDiceFormula(dmgFormula);
    state.diceLog.unshift({ id: uid('roll'), timestamp: Date.now(), label: `${ch.name} — ${sp.name} (damage${meta.damageType?' · '+meta.damageType:''})`, total: dmgTotal, breakdown: dmgFormula });
    if(target){
      const { died } = applyDamageToTarget(target, 'enemy', dmgTotal);
      if(died) advanceIfCurrentTurnDied(c, target);
      showToast(died ? `${targetLabel} is slain by ${sp.name}!` : `${targetLabel} takes ${dmgTotal} damage.`);
    } else {
      showToast(`${dmgTotal} damage rolled (no target selected).`);
    }
    persistDiceLog();
    render();
  }

  else if(action==='add-custom-item'){
    const idx = Number(btn.dataset.idx);
    c.characters[idx].inventory.push({id:uid('item'), index:null, name:'', qty:1, equipped:false, tags:'', weight:0, bonuses: blankItemBonuses(), grantsSpells: []});
    render();
  }
  else if(action==='pick-item'){
    const idx = Number(btn.dataset.idx);
    const equipIndex = btn.dataset.equipIndex;
    const detail = await getEquipmentDetail(equipIndex);
    const tags = detail ? [detail.summary, detail.weight, detail.cost].filter(Boolean).join(' · ') : '';
    const parsedWeight = detail && detail.weight ? (parseFloat(String(detail.weight).replace(/[^\d.]/g,'')) || 0) : 0;
    c.characters[idx].inventory.push({
      id: uid('item'), index: equipIndex,
      name: detail ? detail.name : equipIndex,
      qty: 1, equipped: false, tags, weight: parsedWeight, bonuses: blankItemBonuses(), grantsSpells: []
    });
    const searchInput = document.querySelector(`[data-equip-search="${idx}"]`);
    if(searchInput) searchInput.value = '';
    const resultsDiv = document.getElementById('equipResults-'+idx);
    if(resultsDiv){ resultsDiv.innerHTML=''; resultsDiv.classList.remove('open'); }
    render();
  }
  else if(action==='remove-item'){
    const idx = Number(btn.dataset.idx), item = Number(btn.dataset.item);
    c.characters[idx].inventory.splice(item,1);
    render();
  }
  else if(action==='roll-weapon-attack'){
    const idx = Number(btn.dataset.idx), item = Number(btn.dataset.item);
    const ch = c.characters[idx];
    const it = ch.inventory[item];
    if(!it) return;
    ensureItemAtkFields(it);
    const parsed = parseWeaponFromTags(it.tags);
    if(!parsed){ showToast(`No rollable weapon damage found in this item's tags.`); return; }

    let target = null, targetLabel = '';
    if(it.targetKind==='enemy' && it.targetId){
      target = c.enemies.find(x=>x.id===it.targetId);
      if(target) targetLabel = target.name;
    }
    if(target && target.status!=='alive'){
      showToast(`${target.name} is already down — pick a new target.`);
      return;
    }

    const abilityKey = weaponAbilityKey(ch, it, parsed);
    const bonus = weaponAttackBonus(ch, it, abilityKey);
    const { d20, detail } = rollD20Mode(state.adv);
    const attackTotal = d20 + bonus;
    let isHit = null, hitNote = '';
    if(target){
      isHit = attackTotal >= (target.ac||10);
      hitNote = ` vs ${targetLabel}'s AC ${target.ac} — ${isHit?'HIT':'MISS'}`;
    }
    state.diceLog.unshift({ id: uid('roll'), timestamp: Date.now(), label: `${ch.name} — ${it.name||'weapon'} (to hit${hitNote})`, total: attackTotal, breakdown: `${detail} ${fmtMod(bonus)}` });
    if(isHit===false){
      showToast(`${it.name||'Attack'} misses ${targetLabel}.`);
      persistDiceLog();
      render();
      return;
    }
    const dmgMod = abilityMod(ch.abilities[abilityKey]);
    const dmgFormula = parsed.damage + (dmgMod ? (dmgMod>0?'+':'')+dmgMod : '');
    const dmgTotal = rollDiceFormula(dmgFormula);
    state.diceLog.unshift({ id: uid('roll'), timestamp: Date.now(), label: `${ch.name} — ${it.name||'weapon'} (damage${parsed.damageType?' · '+parsed.damageType:''})`, total: dmgTotal, breakdown: dmgFormula });
    if(target){
      const { died } = applyDamageToTarget(target, 'enemy', dmgTotal);
      if(died) advanceIfCurrentTurnDied(c, target);
      showToast(died ? `${targetLabel} is slain by ${it.name||'the attack'}!` : `${targetLabel} takes ${dmgTotal} damage.`);
    } else {
      showToast(`${dmgTotal} damage rolled (no target selected).`);
    }
    persistDiceLog();
    render();
  }

  else if(action==='add-custom-party-item'){
    c.partyInventory.push({ id: uid('pitem'), index:null, name:'', qty:1, tags:'', weight:0 });
    render();
  }
  else if(action==='pick-party-item'){
    const equipIndex = btn.dataset.equipIndex;
    const detail = await getEquipmentDetail(equipIndex);
    const tags = detail ? [detail.summary, detail.weight, detail.cost].filter(Boolean).join(' · ') : '';
    const parsedWeight = detail && detail.weight ? (parseFloat(String(detail.weight).replace(/[^\d.]/g,'')) || 0) : 0;
    c.partyInventory.push({
      id: uid('pitem'), index: equipIndex,
      name: detail ? detail.name : equipIndex,
      qty: 1, tags, weight: parsedWeight
    });
    const searchInput = document.querySelector('[data-party-equip-search]');
    if(searchInput) searchInput.value = '';
    const resultsDiv = document.getElementById('partyEquipResults');
    if(resultsDiv){ resultsDiv.innerHTML=''; resultsDiv.classList.remove('open'); }
    render();
  }
  else if(action==='remove-party-item'){
    const item = Number(btn.dataset.item);
    c.partyInventory.splice(item,1);
    render();
  }
  else if(action==='give-party-item'){
    const item = Number(btn.dataset.item);
    const sel = document.getElementById('giveSelect-'+item);
    if(!sel || !sel.value){ showToast('Pick who to give it to first.'); return; }
    const ch = c.characters.find(x=>x.id===sel.value);
    const loot = c.partyInventory[item];
    if(!ch || !loot) return;
    ch.inventory.push({
      id: uid('item'), index: loot.index, name: loot.name, qty: loot.qty||1,
      equipped: false, tags: loot.tags||'', weight: loot.weight||0,
      bonuses: blankItemBonuses(), grantsSpells: []
    });
    c.partyInventory.splice(item,1);
    showToast(`${loot.name||'Item'} given to ${ch.name}.`);
    render();
  }

  else if(action==='long-rest-party'){
    const resting = c.characters.filter(ch=>['alive','unconscious'].includes(ch.status));
    resting.forEach(longRestCharacter);
    showToast(`Long rest complete for ${resting.length} character${resting.length===1?'':'s'} — HP, hit dice, and spell slots refreshed.`);
    render();
  }

  else if(action==='award-xp'){
    const dead = c.enemies.filter(en=>en.status==='dead' && !en.xpAwarded);
    const total = dead.reduce((s,en)=>s+(Number(en.xp)||0),0);
    const eligible = c.characters.filter(ch=>['alive','unconscious'].includes(ch.status));
    if(!eligible.length || total<=0){ showToast('Nothing to award yet.'); return; }
    const perChar = Math.floor(total/eligible.length);
    const leveled = [];
    eligible.forEach(ch=>{
      const before = levelForXp(ch.xp||0);
      ch.xp = (ch.xp||0) + perChar;
      const after = levelForXp(ch.xp);
      if(after>before) leveled.push(`${ch.name} → level ${after}`);
    });
    dead.forEach(en=>{ en.xpAwarded = true; });
    showToast(`Awarded ${perChar.toLocaleString()} XP each to ${eligible.length} character${eligible.length===1?'':'s'}.${leveled.length? ' Ready to level: '+leveled.join(', '):''}`);
    render();
  }

  else if(action==='toggle-item-bonuses'){
    const id = btn.dataset.itemId;
    if(state.expandedItemIds.has(id)) state.expandedItemIds.delete(id);
    else state.expandedItemIds.add(id);
    render();
  }

  else if(action==='pick-granted-spell'){
    const idx = Number(btn.dataset.idx), item = Number(btn.dataset.item);
    const spellIndex = btn.dataset.spellIndex;
    const detail = await getSpellDetail(spellIndex);
    const it = c.characters[idx].inventory[item];
    ensureItemGrantsSpells(it);
    it.grantsSpells.push({
      id: uid('gspell'), index: spellIndex,
      name: detail ? detail.name : spellIndex,
      level: detail ? detail.level : 0,
      school: detail ? detail.school : '',
      usesCurrent: 1, usesMax: 1, resetsOn: 'long rest', atWill: false
    });
    const searchInput = document.querySelector(`[data-grant-spell-search="${idx}:${item}"]`);
    if(searchInput) searchInput.value = '';
    const resultsDiv = document.getElementById(`grantResults-${idx}-${item}`);
    if(resultsDiv){ resultsDiv.innerHTML=''; resultsDiv.classList.remove('open'); }
    render();
  }
  else if(action==='add-custom-granted-spell'){
    const idx = Number(btn.dataset.idx), item = Number(btn.dataset.item);
    const it = c.characters[idx].inventory[item];
    ensureItemGrantsSpells(it);
    it.grantsSpells.push({id: uid('gspell'), index:null, name:'New spell', level:1, school:'', usesCurrent:1, usesMax:1, resetsOn:'long rest', atWill:false});
    render();
  }
  else if(action==='remove-granted-spell-def'){
    const idx = Number(btn.dataset.idx), item = Number(btn.dataset.item), grant = Number(btn.dataset.grant);
    c.characters[idx].inventory[item].grantsSpells.splice(grant,1);
    render();
  }

  else if(action==='toggle-feat-spells'){
    const id = btn.dataset.featId;
    if(state.expandedFeatIds.has(id)) state.expandedFeatIds.delete(id);
    else state.expandedFeatIds.add(id);
    render();
  }
  else if(action==='pick-granted-spell-feat'){
    const idx = Number(btn.dataset.idx), item = Number(btn.dataset.item);
    const spellIndex = btn.dataset.spellIndex;
    const detail = await getSpellDetail(spellIndex);
    const ft = c.characters[idx].feats[item];
    ensureFeatGrantsSpells(ft);
    ft.grantsSpells.push({
      id: uid('gspell'), index: spellIndex,
      name: detail ? detail.name : spellIndex,
      level: detail ? detail.level : 0,
      school: detail ? detail.school : '',
      usesCurrent: 1, usesMax: 1, resetsOn: 'long rest', atWill: detail && detail.level===0
    });
    const searchInput = document.querySelector(`[data-feat-grant-spell-search="${idx}:${item}"]`);
    if(searchInput) searchInput.value = '';
    const resultsDiv = document.getElementById(`featGrantResults-${idx}-${item}`);
    if(resultsDiv){ resultsDiv.innerHTML=''; resultsDiv.classList.remove('open'); }
    render();
  }
  else if(action==='add-custom-granted-spell-feat'){
    const idx = Number(btn.dataset.idx), item = Number(btn.dataset.item);
    const ft = c.characters[idx].feats[item];
    ensureFeatGrantsSpells(ft);
    ft.grantsSpells.push({id: uid('gspell'), index:null, name:'New spell', level:1, school:'', usesCurrent:1, usesMax:1, resetsOn:'long rest', atWill:false});
    render();
  }
  else if(action==='remove-granted-spell-def-feat'){
    const idx = Number(btn.dataset.idx), item = Number(btn.dataset.item), grant = Number(btn.dataset.grant);
    c.characters[idx].feats[item].grantsSpells.splice(grant,1);
    render();
  }

  else if(action==='use-granted-spell' || action==='reset-granted-spell'){
    const sourceType = btn.dataset.sourceType, sourceId = btn.dataset.sourceId, spellId = btn.dataset.spellId;
    outer:
    for(const ch of c.characters){
      const holders = sourceType==='feat' ? (ch.feats||[]) : (ch.inventory||[]);
      for(const holder of holders){
        if(holder.id !== sourceId) continue;
        const gs = (holder.grantsSpells||[]).find(x=>x.id===spellId);
        if(!gs) continue;
        if(action==='use-granted-spell') gs.usesCurrent = Math.max(0, gs.usesCurrent - 1);
        else gs.usesCurrent = gs.usesMax;
        break outer;
      }
    }
    render();
  }
  else if(action==='reset-all-granted-spells'){
    const idx = Number(btn.dataset.idx);
    resetAllGrantedSpellUses(c.characters[idx]);
    render();
  }

  else if(action==='add-condition'){
    const idx = Number(btn.dataset.idx);
    const sel = document.getElementById('condSelect-'+idx);
    const val = sel ? sel.value : '';
    if(!val) return;
    const ch = c.characters[idx];
    if(val==='__custom'){
      ch.conditions.push({id:uid('cond'), conditionIndex:'custom', name:'Custom condition', duration:'', level:null, custom:true});
    } else {
      const meta = (state.srdConditions||[]).find(x=>x.index===val);
      ch.conditions.push({id:uid('cond'), conditionIndex:val, name: meta?meta.name:val, duration:'', level: val==='exhaustion'?1:null, custom:false});
    }
    render();
  }
  else if(action==='remove-condition'){
    const idx = Number(btn.dataset.idx), item = Number(btn.dataset.item);
    c.characters[idx].conditions.splice(item,1);
    render();
  }
  else if(action==='pick-race'){
    const idx = Number(btn.dataset.idx);
    const raceIndex = btn.dataset.raceIndex;
    const race = (state.srdRaces||[]).find(x=>x.index===raceIndex);
    const ch = c.characters[idx];
    if(race){
      ch.race = race.name;
      ch.raceIndex = race.index;
      ch.speed = race.speed;
      ensureCharacterExtras(ch);
      if(!ch.languages && race.languages && race.languages.length){
        ch.languages = race.languages.join(', ');
      }
    }
    render();
  }
  else if(action==='clear-race'){
    const idx = Number(btn.dataset.idx);
    c.characters[idx].raceIndex = null;
    render();
  }
  else if(action==='pick-class'){
    const idx = Number(btn.dataset.idx);
    const classIndex = btn.dataset.classIndex;
    const cls = (state.srdClasses||[]).find(x=>x.index===classIndex);
    const ch = c.characters[idx];
    if(cls){
      ch.class = cls.name;
      ch.classIndex = cls.index;
      ch.hitDice.die = 'd'+cls.hitDie;
      ['str','dex','con','int','wis','cha'].forEach(a=>{ ch.savingThrowProfs[a] = cls.savingThrows.includes(a); });
      ch.spellcasting.ability = cls.spellAbility || 'none';
    }
    render();
  }
  else if(action==='clear-class'){
    const idx = Number(btn.dataset.idx);
    c.characters[idx].classIndex = null;
    render();
  }
  else if(action==='pick-subclass'){
    const idx = Number(btn.dataset.idx);
    c.characters[idx].subclass = btn.dataset.subclassName;
    const searchInput = document.querySelector(`[data-subclass-search="${idx}"]`);
    if(searchInput) searchInput.value = '';
    const resultsDiv = document.getElementById('subclassResults-'+idx);
    if(resultsDiv){ resultsDiv.innerHTML=''; resultsDiv.classList.remove('open'); }
    render();
  }

  else if(action==='level-up'){
    const idx = Number(btn.dataset.idx);
    const ch = c.characters[idx];
    ensureLevelingFields(ch);
    if(ch.level>=20){ showToast('Already level 20'); render(); return; }
    if(state.levelUpPicker && state.levelUpPicker.charIdx===idx){
      showToast('Resolve the pending Ability Score Improvement / feat choice first');
      return;
    }
    ch.level += 1;
    ch.hitDice.total = ch.level;
    ch.hitDice.current = Math.min(ch.hitDice.total, ch.hitDice.current + 1);
    const hpGain = computeLevelUpHpGain(ch);
    ch.hp.max += hpGain;
    ch.hp.current += hpGain;
    const slotsApplied = applySpellSlotsForLevel(ch);
    let toastMsg = `Level ${ch.level}! +${hpGain} HP`;
    if(slotsApplied) toastMsg += ', spell slots updated';
    if(getAsiLevels(ch.classIndex).includes(ch.level) && !ch.asiLevelsUsed.includes(ch.level)){
      state.levelUpPicker = { charIdx: idx, level: ch.level, mode:'choose', asiSplit:false };
      toastMsg += ' — ASI/feat available below';
    }
    showToast(toastMsg);
    render();
  }
  else if(action==='levelup-mode'){
    if(!state.levelUpPicker) return;
    state.levelUpPicker.mode = btn.dataset.mode;
    state.levelUpPicker.asiSplit = false;
    render();
  }
  else if(action==='levelup-asi-split'){
    if(!state.levelUpPicker) return;
    state.levelUpPicker.asiSplit = btn.dataset.split === '1';
    render();
  }
  else if(action==='confirm-asi'){
    const picker = state.levelUpPicker;
    if(!picker) return;
    const ch = c.characters[picker.charIdx];
    ensureLevelingFields(ch);
    const aSel = document.getElementById('asiSelectA');
    const bSel = document.getElementById('asiSelectB');
    const a = aSel ? aSel.value : '';
    const b = picker.asiSplit && bSel ? bSel.value : '';
    if(!a || (picker.asiSplit && (!b || b===a))){
      showToast(picker.asiSplit ? 'Pick two different abilities' : 'Pick an ability');
      return;
    }
    if(picker.asiSplit){
      ch.asiBonuses[a] = (ch.asiBonuses[a]||0) + 1;
      ch.asiBonuses[b] = (ch.asiBonuses[b]||0) + 1;
    } else {
      ch.asiBonuses[a] = (ch.asiBonuses[a]||0) + 2;
    }
    ch.plainAsiPicks = (ch.plainAsiPicks||0) + 1;
    ch.asiLevelsUsed.push(picker.level);
    state.levelUpPicker = null;
    showToast('Ability Score Improvement applied');
    render();
  }
  else if(action==='pick-levelup-feat'){
    const picker = state.levelUpPicker;
    if(!picker) return;
    const ch = c.characters[picker.charIdx];
    addFeatToCharacter(ch, btn.dataset.featKey, picker.level);
    ch.asiLevelsUsed.push(picker.level);
    state.levelUpPicker = null;
    render();
  }
  else if(action==='skip-levelup-choice'){
    state.levelUpPicker = null;
    render();
  }
  else if(action==='autofill-slots'){
    const idx = Number(btn.dataset.idx);
    const ch = c.characters[idx];
    const applied = applySpellSlotsForLevel(ch);
    showToast(applied ? `Spell slots updated for level ${ch.level}` : "This class's slots aren't auto-tracked here — edit them manually below");
    render();
  }
  else if(action==='add-feat'){
    const idx = Number(btn.dataset.idx);
    const ch = c.characters[idx];
    if(featSlotsUsed(ch) >= featSlotsEarned(ch)){
      showToast(`No feat/ASI slots left at level ${ch.level} — ${featSlotsUsed(ch)}/${featSlotsEarned(ch)} already used. Level up further, or remove one to swap it.`);
      return;
    }
    addFeatToCharacter(ch, btn.dataset.featKey, ch.level);
    const searchInput = document.querySelector(`[data-feat-search="${idx}"]`);
    if(searchInput) searchInput.value = '';
    const resultsDiv = document.getElementById('featResults-'+idx);
    if(resultsDiv){ resultsDiv.innerHTML=''; resultsDiv.classList.remove('open'); }
    render();
  }
  else if(action==='add-custom-feat'){
    const idx = Number(btn.dataset.idx);
    const ch = c.characters[idx];
    if(featSlotsUsed(ch) >= featSlotsEarned(ch)){
      showToast(`No feat/ASI slots left at level ${ch.level} — ${featSlotsUsed(ch)}/${featSlotsEarned(ch)} already used. Level up further, or remove one to swap it.`);
      return;
    }
    addFeatToCharacter(ch, '__custom', ch.level);
    render();
  }
  else if(action==='remove-feat'){
    const idx = Number(btn.dataset.idx), item = Number(btn.dataset.item);
    c.characters[idx].feats.splice(item,1);
    render();
  }

  else if(action==='select-enemy'){ state.activeEnemyId = btn.dataset.id; render(); }

  else if(action==='spawn-preset'){
    const sel = document.getElementById('presetSelect');
    const qtyInput = document.getElementById('presetQty');
    const preset = MONSTER_PRESETS.find(p=>p.key===sel.value);
    if(!preset) return;
    const qty = Math.max(1, Math.min(30, Number(qtyInput.value)||1));
    state.enemyQty = qty;
    const existingOfType = c.enemies.filter(en=>en.presetKey===preset.key).length;
    let lastId = null;
    for(let i=1;i<=qty;i++){
      const label = qty>1 || existingOfType>0 ? `${preset.name} ${existingOfType+i}` : preset.name;
      const en = enemyFromPreset(preset, label);
      c.enemies.push(en);
      lastId = en.id;
    }
    state.activeEnemyId = lastId;
    render();
  }

  else if(action==='add-custom-enemy'){
    const en = blankEnemy('New Enemy');
    c.enemies.push(en);
    state.activeEnemyId = en.id;
    render();
  }

  else if(action==='remove-enemy'){
    const idx = Number(btn.dataset.idx);
    c.enemies.splice(idx,1);
    state.activeEnemyId = c.enemies.length ? c.enemies[0].id : null;
    render();
  }

  else if(action==='clear-enemies'){
    await saveSnapshotSilent('(auto) before clearing enemies');
    c.enemies = [];
    state.activeEnemyId = null;
    showToast('Enemies cleared (safety snapshot saved first)');
    render();
  }

  else if(action==='copy-enemy-prompt'){
    const block = "Generate D&D 5e enemies for my tracker.\n\n" + ENEMY_IMPORT_SCHEMA_DOC +
      "\n\nRequest: [describe how many enemies, what kind/theme, and roughly what level or CR they should challenge — replace this line before sending]";
    copyToClipboard(block);
    showToast('Copied — paste into a Claude chat and fill in your request');
  }

  else if(action==='import-enemies-json'){
    const area = document.getElementById('enemyJsonImportArea');
    const raw = area ? area.value.trim() : '';
    if(!raw){ showToast('Paste some enemy JSON first'); return; }
    let parsed;
    try{ parsed = JSON.parse(raw); }
    catch(e){ showToast('Not valid JSON — check for stray text outside the [ ] brackets'); return; }
    const list = Array.isArray(parsed) ? parsed : (parsed && Array.isArray(parsed.enemies) ? parsed.enemies : null);
    if(!list){ showToast('Expected a JSON array of enemies (or {"enemies":[...]})'); return; }
    if(!list.length){ showToast('That array is empty'); return; }
    await saveSnapshotSilent('(auto) before enemy import');
    const added = list.map((obj,i)=>enemyFromImportObject(obj,i));
    c.enemies.push(...added);
    state.activeEnemyId = added[added.length-1].id;
    await persistCurrent();
    if(area) area.value = '';
    showToast(`Added ${added.length} enem${added.length===1?'y':'ies'} (safety snapshot saved first)`);
    render();
  }

  else if(action==='enemy-hp-step'){
    const idx = Number(btn.dataset.idx);
    const amt = Number(btn.dataset.amt);
    const en = c.enemies[idx];
    en.hp.current = Math.max(0, Math.min(en.hp.max, en.hp.current + amt));
    if(en.hp.current===0 && en.status==='alive') en.status = 'dead';
    render();
  }

  else if(action==='roll-enemy-initiative'){
    const idx = Number(btn.dataset.idx);
    applyInitiativeRoll(c.enemies[idx]);
    render();
  }
  else if(action==='roll-all-initiative'){
    c.enemies.forEach(applyInitiativeRoll);
    state.enemySort = 'initiative';
    render();
  }
  else if(action==='toggle-enemy-sort'){
    state.enemySort = state.enemySort==='initiative' ? 'added' : 'initiative';
    render();
  }

  else if(action==='roll-char-initiative'){
    const idx = Number(btn.dataset.idx);
    applyInitiativeRoll(c.characters[idx]);
    render();
  }

  else if(action==='roll-battle-initiative'){
    const combatants = [
      ...c.characters.filter(ch=>['alive','unconscious'].includes(ch.status)),
      ...c.enemies.filter(en=>en.status==='alive')
    ];
    combatants.forEach(applyInitiativeRoll);
    render();
  }
  else if(action==='clear-battle-initiative'){
    c.characters.forEach(ch=>{ ch.initiative = null; });
    c.enemies.forEach(en=>{ en.initiative = null; });
    state.battleInitBreakdown = {};
    render();
  }

  else if(action==='start-combat'){
    const ordered = computeInitiativeOrder(c);
    if(!ordered.length){ showToast('Roll initiative for at least one combatant first.'); return; }
    onNewCombatRound(c); // fresh fight, fresh legendary-action pools
    c.combat = { round: 1, turnIndex: 0, order: ordered.map(({kind,ref})=>({id:ref.id, kind, name:ref.name})) };
    showToast(`Combat started — round 1, ${ordered[0].ref.name}'s turn.`);
    render();
  }
  else if(action==='next-turn'){ advanceCombatTurn(c, 1); render(); }
  else if(action==='prev-turn'){ advanceCombatTurn(c, -1); render(); }
  else if(action==='end-combat'){ c.combat = null; render(); }

  else if(action==='add-enemy-attack'){
    const idx = Number(btn.dataset.idx);
    c.enemies[idx].attacks.push({id:uid('atk'), name:'', toHit:0, damage:'', damageType:'', notes:'', recharge:null, rechargeAvailable:true});
    render();
  }
  else if(action==='remove-enemy-attack'){
    const idx = Number(btn.dataset.idx), item = Number(btn.dataset.item);
    c.enemies[idx].attacks.splice(item,1);
    render();
  }
  else if(action==='roll-attack'){
    const idx = Number(btn.dataset.idx), ai = Number(btn.dataset.atk);
    const en = c.enemies[idx];
    const atk = en.attacks[ai];
    ensureAttackFields(atk);
    if(atk.recharge!=null && !atk.rechargeAvailable){ showToast(`${atk.name||'That attack'} hasn't recharged yet.`); return; }

    // Resolve the chosen target (if any) to its live character/NPC object.
    let target = null, targetLabel = '';
    if(atk.targetKind && atk.targetId){
      target = atk.targetKind==='pc'
        ? c.characters.find(x=>x.id===atk.targetId)
        : c.npcs.find(x=>x.id===atk.targetId);
      if(target) targetLabel = target.name;
    }

    if(atk.attackType==='save'){
      // Save-based attack (e.g. a spell): target rolls, then damage applies based on the result.
      const dc = Number(atk.saveDC)||10;
      let saveTotal = null, passed = null;
      if(target){
        const roll = 1+Math.floor(Math.random()*20);
        let detail, mod;
        if(atk.targetKind==='pc'){
          mod = abilityMod(target.abilities[atk.saveAbility]);
          const prof = target.savingThrowProfs[atk.saveAbility] ? profBonus(target.level) : 0;
          saveTotal = roll+mod+prof;
          detail = `d20 ${roll} ${fmtMod(mod)} ${atk.saveAbility.toUpperCase()} save${prof?(' '+fmtMod(prof)+' prof'):''}`;
        } else {
          const bonus = target.saveBonus||0;
          saveTotal = roll+bonus;
          detail = `d20 ${roll}${bonus?(' '+fmtMod(bonus)+' (generic NPC bonus, not ability-specific)'):' (no ability scores tracked for NPCs)'}`;
        }
        passed = saveTotal >= dc;
        state.diceLog.unshift({ id: uid('roll'), timestamp: Date.now(), label: `${targetLabel} — save vs ${en.name}'s ${atk.name||'attack'} (DC ${dc})`, total: saveTotal, breakdown: detail });
      }
      const dmgTotal = rollDiceFormula(atk.damage);
      state.diceLog.unshift({ id: uid('roll'), timestamp: Date.now(), label: `${en.name} — ${atk.name||'attack'} (damage${atk.damageType?' · '+atk.damageType:''})`, total: dmgTotal, breakdown: atk.damage||'' });
      if(atk.recharge!=null) atk.rechargeAvailable = false;
      if(target){
        let applied = dmgTotal;
        if(passed){
          if(atk.saveEffect==='half') applied = Math.floor(dmgTotal/2);
          else applied = 0; // 'none', or 'other' — don't guess at a non-damage effect, DM checks notes
        }
        if(applied>0) applyDamageToTarget(target, atk.targetKind, applied);
        showToast(`${targetLabel} ${passed?'succeeds':'fails'} the save${applied>0?` — takes ${applied} damage`:(passed?' — no damage':' — effect per notes, no damage auto-applied')}.`);
      }
      persistDiceLog();
      render();
      return;
    }

    // Attack-roll based (the original behavior) — now checks hit/miss vs a target's AC when one's picked.
    const toHit = Number(atk.toHit)||0;
    const { d20, detail } = rollD20Mode(state.adv);
    const attackTotal = d20 + toHit;
    let isHit = null, hitNote = '';
    if(target){
      const ac = atk.targetKind==='pc' ? effectiveAC(target) : (target.ac||10);
      isHit = attackTotal >= ac;
      hitNote = ` vs ${targetLabel}'s AC ${ac} — ${isHit?'HIT':'MISS'}`;
    }
    state.diceLog.unshift({ id: uid('roll'), timestamp: Date.now(), label: `${en.name} — ${atk.name||'attack'} (to hit${hitNote})`, total: attackTotal, breakdown: `${detail} ${fmtMod(toHit)}` });
    if(atk.recharge!=null) atk.rechargeAvailable = false;
    if(isHit===false){
      showToast(`${targetLabel} avoids the hit.`);
      persistDiceLog();
      render();
      return;
    }
    const dmgTotal = rollDiceFormula(atk.damage);
    state.diceLog.unshift({ id: uid('roll'), timestamp: Date.now(), label: `${en.name} — ${atk.name||'attack'} (damage${atk.damageType?' · '+atk.damageType:''})`, total: dmgTotal, breakdown: atk.damage||'' });
    if(target){
      applyDamageToTarget(target, atk.targetKind, dmgTotal);
      showToast(`${targetLabel} takes ${dmgTotal} damage.`);
    }
    persistDiceLog();
    render();
  }
  else if(action==='roll-recharge'){
    const idx = Number(btn.dataset.idx), ai = Number(btn.dataset.atk);
    const en = c.enemies[idx];
    const atk = en.attacks[ai];
    const roll = 1+Math.floor(Math.random()*6);
    const threshold = atk.recharge||6;
    const success = roll >= threshold;
    atk.rechargeAvailable = success;
    state.diceLog.unshift({ id: uid('roll'), timestamp: Date.now(), label: `${en.name} — ${atk.name||'attack'} recharge`, total: roll, breakdown: `d6 ${roll} (needs ${threshold}+)` });
    persistDiceLog();
    showToast(success ? `${atk.name||'It'} recharges!` : `${atk.name||'It'} stays spent.`);
    render();
  }
  else if(action==='add-legendary-action'){
    const idx = Number(btn.dataset.idx);
    const en = c.enemies[idx];
    ensureLegendaryFields(en);
    en.legendaryActions.push({ id: uid('legact'), name:'', desc:'', cost:1 });
    render();
  }
  else if(action==='remove-legendary-action'){
    const idx = Number(btn.dataset.idx), item = Number(btn.dataset.item);
    c.enemies[idx].legendaryActions.splice(item,1);
    render();
  }
  else if(action==='use-legendary-action'){
    const idx = Number(btn.dataset.idx), item = Number(btn.dataset.item);
    const en = c.enemies[idx];
    const la = en.legendaryActions[item];
    const cost = la.cost||1;
    if((en.legendaryActionsUsed||0) + cost > (en.legendaryActionsMax||0)){ showToast('Not enough legendary actions left this round.'); return; }
    en.legendaryActionsUsed = (en.legendaryActionsUsed||0) + cost;
    showToast(`${en.name} uses ${la.name||'a legendary action'} (${en.legendaryActionsUsed}/${en.legendaryActionsMax} used this round).`);
    render();
  }
  else if(action==='reset-legendary'){
    const idx = Number(btn.dataset.idx);
    c.enemies[idx].legendaryActionsUsed = 0;
    render();
  }
  else if(action==='add-enemy-trait'){
    const idx = Number(btn.dataset.idx);
    c.enemies[idx].traits.push({id:uid('trait'), name:'', desc:''});
    render();
  }
  else if(action==='remove-enemy-trait'){
    const idx = Number(btn.dataset.idx), item = Number(btn.dataset.item);
    c.enemies[idx].traits.splice(item,1);
    render();
  }
  else if(action==='add-enemy-condition'){
    const idx = Number(btn.dataset.idx);
    const sel = document.getElementById('enemyCondSelect-'+idx);
    const val = sel ? sel.value : '';
    if(!val) return;
    const en = c.enemies[idx];
    if(val==='__custom'){
      en.conditions.push({id:uid('cond'), conditionIndex:'custom', name:'Custom condition', duration:'', level:null, custom:true});
    } else {
      const meta = (state.srdConditions||[]).find(x=>x.index===val);
      en.conditions.push({id:uid('cond'), conditionIndex:val, name: meta?meta.name:val, duration:'', level: val==='exhaustion'?1:null, custom:false});
    }
    render();
  }
  else if(action==='remove-enemy-condition'){
    const idx = Number(btn.dataset.idx), item = Number(btn.dataset.item);
    c.enemies[idx].conditions.splice(item,1);
    render();
  }

  else if(action==='add-quest'){
    c.questLog.push({id:uid('quest'), title:'', status:'active', notes:''});
    render();
  }
  else if(action==='remove-quest'){
    const item = Number(btn.dataset.item);
    c.questLog.splice(item,1);
    render();
  }

  else if(action==='add-npc'){
    c.npcs.push(blankNpc(''));
    render();
  }
  else if(action==='remove-npc'){
    const item = Number(btn.dataset.item);
    c.npcs.splice(item,1);
    render();
  }

  else if(action==='add-session'){
    const nextNumber = c.sessions.length ? Math.max(...c.sessions.map(s=>s.number||0)) + 1 : (c.sessionNumber||1);
    c.sessions.push({ id: uid('sess'), number: nextNumber, date: c.inGameDate||'', recap:'' });
    render();
  }
  else if(action==='remove-session'){
    const item = Number(btn.dataset.item);
    c.sessions.splice(item,1);
    render();
  }

  else if(action==='roll'){
    const sides = Number(btn.dataset.sides);
    doRoll(1, sides, 0, `d${sides}`);
  }
  else if(action==='roll-custom'){
    const count = Number(document.getElementById('diceCount').value)||1;
    const sides = Number(document.getElementById('diceSides').value)||20;
    const mod = Number(document.getElementById('diceMod').value)||0;
    const label = document.getElementById('diceLabel').value || `${count}d${sides}${mod?fmtMod(mod):''}`;
    doRoll(count, sides, mod, label);
  }
  else if(action==='set-adv'){ state.adv = btn.dataset.adv; render(); }
  else if(action==='clear-dice-log'){ state.diceLog = []; await persistDiceLog(); render(); }

  else if(action==='load-snap'){ await loadSnapshot(btn.dataset.id); }
  else if(action==='delete-snap'){ await deleteSnapshot(btn.dataset.id); }

  else if(action==='copy-export'){
    const json = JSON.stringify(state.campaign, null, 2);
    copyToClipboard(json); showToast('Copied JSON to clipboard');
  }
  else if(action==='copy-ai-prompt'){
    const json = JSON.stringify(state.campaign, null, 2);
    const block = "Here is the current campaign state, using this schema:\n\n" + SCHEMA_DOC +
      "\n\nCurrent state:\n```json\n" + json + "\n```\n\nPick up the session from this state. When you export updated state at a checkpoint, return the full CampaignState as a single fenced json block matching this exact schema, nothing else.";
    copyToClipboard(block); showToast('Copied AI-DM prompt block');
  }
  else if(action==='do-import'){
    const raw = document.getElementById('importArea').value;
    try{
      const parsed = JSON.parse(raw);
      if(!parsed || !Array.isArray(parsed.characters)) throw new Error('bad shape');
      await saveSnapshotSilent('(auto) before import');
      state.campaign = normalizeCampaign(parsed);
      await persistCurrent();
      showToast('Imported and saved');
      render();
    }catch(err){
      showToast('Import failed — check the JSON');
    }
  }

  else if(action==='save-snapshot'){
    btn.classList.add('stamping');
    setTimeout(()=>btn.classList.remove('stamping'), 350);
    const auto = 'Session ' + c.sessionNumber + ' — ' + fmtDate(Date.now());
    await saveSnapshot(auto);
  }
}
