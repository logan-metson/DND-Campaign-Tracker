
(function(){

// ---------- storage helpers ----------
async function safeGet(key, shared=false){
  try{ const r = await window.storage.get(key, shared); return r ? r.value : null; }
  catch(e){ return null; }
}
async function safeSet(key, value, shared=false){
  try{ const r = await window.storage.set(key, value, shared); return !!r; }
  catch(e){ return false; }
}
async function safeDelete(key, shared=false){
  try{ await window.storage.delete(key, shared); return true; }
  catch(e){ return false; }
}
async function safeList(prefix, shared=false){
  try{ const r = await window.storage.list(prefix, shared); return r ? r.keys : []; }
  catch(e){ return []; }
}

