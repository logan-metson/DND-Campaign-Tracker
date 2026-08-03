
(function(){

// ---------- storage helpers ----------
// Backed by the browser's own localStorage — this app runs as a plain local file in a normal
// browser, not inside a hosted sandbox with a window.storage API, so persistence has to be something
// every browser actually provides. Keys are namespaced under STORAGE_PREFIX since some browsers
// (Chrome in particular) pool all file:// pages into one shared storage bucket rather than one per
// file — the prefix keeps this app's keys from ever colliding with some unrelated local HTML file's.
// `shared` is kept only for call-site compatibility with the old API; nothing here ever uses it.
const STORAGE_PREFIX = 'dnd-tracker:';

async function safeGet(key, shared=false){
  try{ return localStorage.getItem(STORAGE_PREFIX + key); }
  catch(e){ return null; }
}
async function safeSet(key, value, shared=false){
  try{ localStorage.setItem(STORAGE_PREFIX + key, value); return true; }
  catch(e){ return false; } // e.g. quota exceeded, or storage disabled entirely (private browsing in some browsers)
}
async function safeDelete(key, shared=false){
  try{ localStorage.removeItem(STORAGE_PREFIX + key); return true; }
  catch(e){ return false; }
}
async function safeList(prefix, shared=false){
  try{
    const full = STORAGE_PREFIX + prefix;
    const keys = [];
    for(let i=0; i<localStorage.length; i++){
      const k = localStorage.key(i);
      if(k && k.indexOf(full)===0) keys.push(k.slice(STORAGE_PREFIX.length));
    }
    return keys;
  } catch(e){ return []; }
}

