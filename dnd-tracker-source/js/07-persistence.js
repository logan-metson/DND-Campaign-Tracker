// ---------- persistence ----------
async function loadInitial(){
  const raw = await safeGet('campaign:current');
  if(raw){
    try{ state.campaign = normalizeCampaign(JSON.parse(raw)); } catch(e){ state.campaign = blankCampaign(); }
  }
  const idxRaw = await safeGet('campaign:snapshot-index');
  if(idxRaw){
    try{ state.snapshotIndex = JSON.parse(idxRaw); } catch(e){ state.snapshotIndex = []; }
  }
  const logRaw = await safeGet('campaign:dice-log');
  if(logRaw){
    try{ state.diceLog = JSON.parse(logRaw); } catch(e){ state.diceLog = []; }
  }
  render();
}

async function persistCurrent(){
  const ok = await safeSet('campaign:current', JSON.stringify(state.campaign));
  state.storageOk = ok;
  return ok;
}

async function saveSnapshot(label){
  state.campaign.updatedAt = Date.now();
  const ok1 = await persistCurrent();
  const id = uid('snap');
  const entry = { id, timestamp: Date.now(), label: label || ('Session '+state.campaign.sessionNumber) };
  const ok2 = await safeSet('campaign:snap:'+id, JSON.stringify({ ...entry, state: state.campaign }));
  state.snapshotIndex.unshift(entry);
  const ok3 = await safeSet('campaign:snapshot-index', JSON.stringify(state.snapshotIndex));
  state.lastSavedAt = Date.now();
  showToast(ok1&&ok2&&ok3 ? 'Snapshot saved' : 'Saved locally (storage error)');
  render();
}

async function loadSnapshot(id){
  const raw = await safeGet('campaign:snap:'+id);
  if(!raw){ showToast('Could not load that snapshot'); return; }
  try{
    const parsed = JSON.parse(raw);
    // safety snapshot of what we're leaving, so nothing is lost
    await saveSnapshotSilent('(auto) before revert');
    state.campaign = normalizeCampaign(parsed.state);
    await persistCurrent();
    showToast('Loaded: ' + parsed.label);
    render();
  }catch(e){ showToast('That snapshot looks corrupted'); }
}

async function saveSnapshotSilent(label){
  const id = uid('snap');
  const entry = { id, timestamp: Date.now(), label };
  await safeSet('campaign:snap:'+id, JSON.stringify({ ...entry, state: state.campaign }));
  state.snapshotIndex.unshift(entry);
  await safeSet('campaign:snapshot-index', JSON.stringify(state.snapshotIndex));
}

async function renameSnapshot(id, newLabel){
  const entry = state.snapshotIndex.find(s=>s.id===id);
  if(!entry) return;
  entry.label = newLabel;
  await safeSet('campaign:snapshot-index', JSON.stringify(state.snapshotIndex));
  const raw = await safeGet('campaign:snap:'+id);
  if(raw){
    try{
      const parsed = JSON.parse(raw);
      parsed.label = newLabel;
      await safeSet('campaign:snap:'+id, JSON.stringify(parsed));
    }catch(e){}
  }
}

async function deleteSnapshot(id){
  await safeDelete('campaign:snap:'+id);
  state.snapshotIndex = state.snapshotIndex.filter(s=>s.id!==id);
  await safeSet('campaign:snapshot-index', JSON.stringify(state.snapshotIndex));
  render();
}

async function persistDiceLog(){
  state.diceLog = state.diceLog.slice(0,30);
  await safeSet('campaign:dice-log', JSON.stringify(state.diceLog));
}

