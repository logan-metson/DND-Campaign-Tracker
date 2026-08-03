// ---------- event handling ----------
let clickListenerAttached = false;
function attachHandlers(){
  const app = document.getElementById('app');

  app.querySelectorAll('[data-bind]').forEach(el=>{
    el.addEventListener('change', onBindChange);
  });

  app.querySelectorAll('[data-snap-rename]').forEach(el=>{
    el.addEventListener('change', (e)=> renameSnapshot(el.dataset.snapRename, e.target.value));
  });

  app.querySelectorAll('[data-spell-search]').forEach(el=>{
    el.addEventListener('input', ()=>{
      const cidx = el.dataset.spellSearch;
      const q = el.value.trim().toLowerCase();
      const resultsDiv = document.getElementById('spellResults-'+cidx);
      if(!resultsDiv) return;
      if(!q){ resultsDiv.innerHTML=''; resultsDiv.classList.remove('open'); return; }
      const ch = state.campaign.characters[Number(cidx)];
      const classListIdx = ch ? classSpellListFor(ch) : null;
      const applyFilter = classListIdx && !state.spellFilterOff.has(Number(cidx));
      let pool = state.srdSpellIndex||[];
      if(applyFilter) pool = pool.filter(s=> (state.spellClassMap[s.index]||[]).includes(classListIdx));
      const matches = pool.filter(s=>s.name.toLowerCase().includes(q)).slice(0,8);
      resultsDiv.classList.add('open');
      resultsDiv.innerHTML = matches.length ? matches.map(m=>{
        const preview = [`Lv${m.level}`, m.school].concat(spellStatLine(m) ? [spellStatLine(m)] : []).join(' · ');
        return `<div class="search-result" data-action="pick-spell" data-idx="${cidx}" data-spell-index="${m.index}">${escapeHtml(m.name)}<div class="hint" style="margin-top:2px;">${escapeHtml(preview)}</div></div>`;
      }).join('')
        : `<div class="search-result" style="color:var(--text-dim);cursor:default;">No matches${applyFilter?' on the '+escapeHtml(classListIdx)+' list — try unchecking the filter below, or add as custom/homebrew':''}</div>`;
    });
  });

  app.querySelectorAll('[data-grant-spell-search]').forEach(el=>{
    el.addEventListener('input', ()=>{
      const [cidx,itemI] = el.dataset.grantSpellSearch.split(':');
      const q = el.value.trim().toLowerCase();
      const resultsDiv = document.getElementById(`grantResults-${cidx}-${itemI}`);
      if(!resultsDiv) return;
      if(!q){ resultsDiv.innerHTML=''; resultsDiv.classList.remove('open'); return; }
      // Deliberately unfiltered by class — an item can grant any spell regardless of the wearer's list.
      const matches = (state.srdSpellIndex||[]).filter(s=>s.name.toLowerCase().includes(q)).slice(0,8);
      resultsDiv.classList.add('open');
      resultsDiv.innerHTML = matches.length ? matches.map(m=>{
        const preview = [`Lv${m.level}`, m.school].join(' · ');
        return `<div class="search-result" data-action="pick-granted-spell" data-idx="${cidx}" data-item="${itemI}" data-spell-index="${m.index}">${escapeHtml(m.name)}<div class="hint" style="margin-top:2px;">${escapeHtml(preview)}</div></div>`;
      }).join('')
        : '<div class="search-result" style="color:var(--text-dim);cursor:default;">No matches</div>';
    });
  });

  app.querySelectorAll('[data-feat-grant-spell-search]').forEach(el=>{
    el.addEventListener('input', ()=>{
      const [cidx,featI] = el.dataset.featGrantSpellSearch.split(':');
      const q = el.value.trim().toLowerCase();
      const resultsDiv = document.getElementById(`featGrantResults-${cidx}-${featI}`);
      if(!resultsDiv) return;
      if(!q){ resultsDiv.innerHTML=''; resultsDiv.classList.remove('open'); return; }
      // Deliberately unfiltered by class — a feat like Magic Initiate can pull from any chosen class's list.
      const matches = (state.srdSpellIndex||[]).filter(s=>s.name.toLowerCase().includes(q)).slice(0,8);
      resultsDiv.classList.add('open');
      resultsDiv.innerHTML = matches.length ? matches.map(m=>{
        const preview = [`Lv${m.level}`, m.school].join(' · ');
        return `<div class="search-result" data-action="pick-granted-spell-feat" data-idx="${cidx}" data-item="${featI}" data-spell-index="${m.index}">${escapeHtml(m.name)}<div class="hint" style="margin-top:2px;">${escapeHtml(preview)}</div></div>`;
      }).join('')
        : '<div class="search-result" style="color:var(--text-dim);cursor:default;">No matches</div>';
    });
  });

  app.querySelectorAll('[data-equip-search]').forEach(el=>{
    el.addEventListener('input', ()=>{
      const cidx = el.dataset.equipSearch;
      const q = el.value.trim().toLowerCase();
      const resultsDiv = document.getElementById('equipResults-'+cidx);
      if(!resultsDiv) return;
      if(!q){ resultsDiv.innerHTML=''; resultsDiv.classList.remove('open'); return; }
      const matches = (state.srdEquipmentIndex||[]).filter(s=>s.name.toLowerCase().includes(q)).slice(0,8);
      resultsDiv.classList.add('open');
      resultsDiv.innerHTML = matches.length ? matches.map(m=>`<div class="search-result" data-action="pick-item" data-idx="${cidx}" data-equip-index="${m.index}">${escapeHtml(m.name)}</div>`).join('')
        : '<div class="search-result" style="color:var(--text-dim);cursor:default;">No matches</div>';
    });
  });

  app.querySelectorAll('[data-party-equip-search]').forEach(el=>{
    el.addEventListener('input', ()=>{
      const q = el.value.trim().toLowerCase();
      const resultsDiv = document.getElementById('partyEquipResults');
      if(!resultsDiv) return;
      if(!q){ resultsDiv.innerHTML=''; resultsDiv.classList.remove('open'); return; }
      const matches = (state.srdEquipmentIndex||[]).filter(s=>s.name.toLowerCase().includes(q)).slice(0,8);
      resultsDiv.classList.add('open');
      resultsDiv.innerHTML = matches.length ? matches.map(m=>`<div class="search-result" data-action="pick-party-item" data-equip-index="${m.index}">${escapeHtml(m.name)}</div>`).join('')
        : '<div class="search-result" style="color:var(--text-dim);cursor:default;">No matches</div>';
    });
  });

  app.querySelectorAll('[data-feat-search]').forEach(el=>{
    el.addEventListener('input', ()=>{
      const cidx = el.dataset.featSearch;
      const q = el.value.trim().toLowerCase();
      const resultsDiv = document.getElementById('featResults-'+cidx);
      if(!resultsDiv) return;
      if(!q){ resultsDiv.innerHTML=''; resultsDiv.classList.remove('open'); return; }
      const matches = FEATS.filter(f=>f.name.toLowerCase().includes(q)).slice(0,10);
      resultsDiv.classList.add('open');
      resultsDiv.innerHTML = matches.length ? matches.map(m=>`<div class="search-result" data-action="add-feat" data-idx="${cidx}" data-feat-key="${m.key}">${escapeHtml(m.name)}<div class="hint" style="margin-top:2px;">${escapeHtml(m.desc)}</div></div>`).join('')
        : '<div class="search-result" style="color:var(--text-dim);cursor:default;">No matches — try "+ Add custom feat" below</div>';
    });
  });

  app.querySelectorAll('[data-levelup-feat-search]').forEach(el=>{
    el.addEventListener('input', ()=>{
      const q = el.value.trim().toLowerCase();
      const resultsDiv = document.getElementById('levelupFeatResults');
      if(!resultsDiv) return;
      if(!q){ resultsDiv.innerHTML=''; resultsDiv.classList.remove('open'); return; }
      const matches = FEATS.filter(f=>f.name.toLowerCase().includes(q)).slice(0,10);
      resultsDiv.classList.add('open');
      resultsDiv.innerHTML = matches.length ? matches.map(m=>`<div class="search-result" data-action="pick-levelup-feat" data-feat-key="${m.key}">${escapeHtml(m.name)}<div class="hint" style="margin-top:2px;">${escapeHtml(m.desc)}</div></div>`).join('')
        : '<div class="search-result" style="color:var(--text-dim);cursor:default;">No matches</div>';
    });
  });

  app.querySelectorAll('[data-race-search]').forEach(el=>{
    el.addEventListener('input', ()=>{
      const cidx = el.dataset.raceSearch;
      const q = el.value.trim().toLowerCase();
      const resultsDiv = document.getElementById('raceResults-'+cidx);
      if(!resultsDiv) return;
      if(!q){ resultsDiv.innerHTML=''; resultsDiv.classList.remove('open'); return; }
      const matches = (state.srdRaces||[]).filter(s=>s.name.toLowerCase().includes(q)).slice(0,8);
      resultsDiv.classList.add('open');
      resultsDiv.innerHTML = matches.length ? matches.map(m=>`<div class="search-result" data-action="pick-race" data-idx="${cidx}" data-race-index="${m.index}">${escapeHtml(m.name)}</div>`).join('')
        : '<div class="search-result" style="color:var(--text-dim);cursor:default;">No matches — use the text field below for a custom race</div>';
    });
  });

  app.querySelectorAll('[data-class-search]').forEach(el=>{
    el.addEventListener('input', ()=>{
      const cidx = el.dataset.classSearch;
      const q = el.value.trim().toLowerCase();
      const resultsDiv = document.getElementById('classResults-'+cidx);
      if(!resultsDiv) return;
      if(!q){ resultsDiv.innerHTML=''; resultsDiv.classList.remove('open'); return; }
      const matches = (state.srdClasses||[]).filter(s=>s.name.toLowerCase().includes(q)).slice(0,8);
      resultsDiv.classList.add('open');
      resultsDiv.innerHTML = matches.length ? matches.map(m=>`<div class="search-result" data-action="pick-class" data-idx="${cidx}" data-class-index="${m.index}">${escapeHtml(m.name)}</div>`).join('')
        : '<div class="search-result" style="color:var(--text-dim);cursor:default;">No matches — use the text field below for a custom class</div>';
    });
  });

  app.querySelectorAll('[data-subclass-search]').forEach(el=>{
    el.addEventListener('input', ()=>{
      const cidx = el.dataset.subclassSearch;
      const q = el.value.trim().toLowerCase();
      const resultsDiv = document.getElementById('subclassResults-'+cidx);
      if(!resultsDiv) return;
      const ch = state.campaign.characters[Number(cidx)];
      const pool = (state.srdSubclasses||[]).filter(s=> !ch.classIndex || s.classIndex===ch.classIndex);
      if(!q){ resultsDiv.innerHTML=''; resultsDiv.classList.remove('open'); return; }
      const matches = pool.filter(s=>s.name.toLowerCase().includes(q)).slice(0,10);
      resultsDiv.classList.add('open');
      resultsDiv.innerHTML = matches.length ? matches.map(m=>`<div class="search-result" data-action="pick-subclass" data-idx="${cidx}" data-subclass-name="${escapeHtml(m.name)}">${escapeHtml(m.name)}</div>`).join('')
        : '<div class="search-result" style="color:var(--text-dim);cursor:default;">No matches — type your own below</div>';
    });
  });

  if(!clickListenerAttached){
    app.addEventListener('click', onClick);
    clickListenerAttached = true;
  }
}

function onBindChange(e){
  const el = e.target;
  const path = el.dataset.bind;
  const type = el.dataset.type;
  scheduleAutosave();
  if(state.armedAction) state.armedAction = null; // editing anything else cancels a pending delete confirm
  if(type==='abilitybonus'){
    const keys = path.split('.'); // characters.<idx>.abilityBonusChoice.plus2|plus1
    const cIdx = Number(keys[1]);
    const slot = keys[3];
    const ch = state.campaign.characters[cIdx];
    ensureAbilityBonusChoice(ch);
    ch.abilityBonusChoice[slot] = el.value || null;
    render();
    return;
  }
  if(type==='featability'){
    const keys = path.split('.'); // characters.<idx>.feats.<i>.abilityChoice.selected
    const cIdx = Number(keys[1]);
    const fIdx = Number(keys[3]);
    const ch = state.campaign.characters[cIdx];
    const feat = ch.feats[fIdx];
    feat.abilityChoice.selected = el.value || null;
    if(feat.abilityChoice.grantsSaveProf && feat.abilityChoice.selected){
      ch.savingThrowProfs[feat.abilityChoice.selected] = true;
    }
    render();
    return;
  }
  if(type==='baseability'){
    const keys = path.split('.'); // characters.<idx>.baseAbilities.<key>
    const cIdx = Number(keys[1]);
    const abilKey = keys[3];
    const ch = state.campaign.characters[cIdx];
    const raw = Math.max(8, Math.min(15, Number(el.value)||8));
    let spent = 0;
    ABILITY_KEYS.forEach(k=>{ spent += POINT_BUY_COST[k===abilKey ? raw : ch.baseAbilities[k]] ?? 0; });
    if(spent > POINT_BUY_BUDGET){
      showToast('Not enough points left — lower another score first');
      render(); // re-render reverts the input to the last valid value
      return;
    }
    ch.baseAbilities[abilKey] = raw;
    render();
    return;
  }
  if(type==='rechargeslot'){
    // enemies.<idx>.attacks.<i>.recharge — blank means "no recharge, at-will". Editing the
    // threshold also resets availability to true, since changing it mid-fight is a build tweak,
    // not a "the attack just got used" event.
    const val = el.value==='' ? null : Math.max(1, Math.min(6, Number(el.value)||6));
    setPath(state.campaign, path, val);
    setPath(state.campaign, path.replace(/\.recharge$/, '.rechargeAvailable'), true);
    render();
    return;
  }
  if(type==='target'){
    // enemies.<idx>.attacks.<i>.__target — a synthetic field, not a real one: the select's value
    // is "pc:ID" / "npc:ID" / "", parsed here into the two real fields (targetKind/targetId) that
    // actually live on the attack.
    const basePath = path.replace(/\.__target$/, '');
    const val = el.value;
    if(!val){
      setPath(state.campaign, basePath+'.targetKind', null);
      setPath(state.campaign, basePath+'.targetId', null);
    } else {
      const sep = val.indexOf(':');
      setPath(state.campaign, basePath+'.targetKind', val.slice(0,sep));
      setPath(state.campaign, basePath+'.targetId', val.slice(sep+1));
    }
    render();
    return;
  }
  let value;
  if(type==='number') value = el.value===''? 0 : Number(el.value);
  else if(type==='checkbox') value = el.checked;
  else value = el.value;
  setPath(state.campaign, path, value);
  // Typing a positive HP value directly (not just using the +/- stepper) should also clear death
  // saves — regaining any HP resets them regardless of how the HP got there.
  const hpMatch = path.match(/^characters\.(\d+)\.hp\.current$/);
  if(hpMatch && value > 0){
    const ch = state.campaign.characters[Number(hpMatch[1])];
    if(ch){ ensureCharacterExtras(ch); ch.deathSaves = { successes:0, failures:0 }; }
  }
  // don't full re-render on plain text/number edits to avoid disrupting flow;
  // but re-render when it affects computed display (abilities, hp, status, level)
  if(/abilities|hp\.|status$|level$|spellcasting|initiative|surprised$|equipped$|bonuses\.|asiBonuses|feats\.|grantsSpells\.|skillProfs\.|deathSaves|weight$|legendaryActionsMax|hasCombatStats|attackType|castAtLevel$|atkAbility$|atkProficient$|saveBonus$/.test(path)){
    render();
  }
}

