// ---------- autosave ----------
// Historically, render() alone never touched storage — only explicit actions (Save Snapshot, import,
// loading a snapshot) called persistCurrent(). That meant ordinary play — HP changes, attacks, XP,
// leveling, loot — was never actually saved unless someone remembered to tap "Save Snapshot," so a
// closed or reloaded tab could lose a whole session. This debounces a save to campaign:current a
// moment after the last change, and flushes immediately if the tab is hidden or closed — which
// covers the common case of tabbing over to a separate AI-DM chat mid-session.
let autosaveTimer = null;
let autosavePending = false;
function scheduleAutosave(){
  autosavePending = true;
  clearTimeout(autosaveTimer);
  autosaveTimer = setTimeout(runAutosave, 1500);
}
async function runAutosave(){
  clearTimeout(autosaveTimer);
  if(!autosavePending) return;
  autosavePending = false;
  const ok = await persistCurrent();
  state.lastSavedAt = Date.now();
  state.storageOk = ok;
  updateSavedIndicator();
}
// Updates just the "last saved" text directly, without a full render() — a full render() replaces
// the whole #app innerHTML, which would blur whatever field the person is mid-typing in.
function updateSavedIndicator(){
  const el = document.querySelector('.saved-indicator');
  if(el) el.textContent = `last saved ${timeAgo(state.lastSavedAt)}${state.storageOk?'':' — storage unavailable'}`;
}
document.addEventListener('visibilitychange', ()=>{ if(document.hidden) runAutosave(); });
window.addEventListener('pagehide', runAutosave);
setInterval(updateSavedIndicator, 15000); // keeps "last saved Xm ago" fresh even between edits

// ---------- destructive-action confirm ----------
// window.confirm() is blocked in this sandboxed artifact iframe, so these use a click-to-arm pattern
// instead: the first click flips the button into a "click again to confirm" state, and only a second
// click within a few seconds actually performs the action. Clicking anything else, or letting the
// window lapse, cancels the pending confirm.
const CONFIRM_ACTIONS = new Set(['remove-char','remove-enemy','delete-snap']);
const CONFIRM_WINDOW_MS = 4000;
function armKeyFor(action, key){ return action + ':' + key; }
function isArmed(action, key){
  return !!(state.armedAction && state.armedAction.key===armKeyFor(action,key) && (Date.now()-state.armedAction.armedAt)<CONFIRM_WINDOW_MS);
}

