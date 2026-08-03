// ---------- D&D 5e SRD data (embedded at build time — no runtime network dependency at all) ----------
let SRD_BUNDLE = null;

function loadSrdBundle(){
  try{
    const el = document.getElementById('srd-bundle');
    SRD_BUNDLE = JSON.parse(el.textContent);
  }catch(e){
    SRD_BUNDLE = { spells: [], conditions: [], equipment: [], classes: [], races: [], subclasses: [] };
  }
  state.srdConditions = SRD_BUNDLE.conditions;
  state.srdSpellIndex = SRD_BUNDLE.spells;       // full records: index,name,level,school,castingTime,range,duration,concentration,ritual,components,desc
  state.srdEquipmentIndex = SRD_BUNDLE.equipment; // full records: index,name,cost,weight,summary
  state.srdClasses = SRD_BUNDLE.classes || [];    // index,name,hitDie,savingThrows[],spellAbility
  state.srdRaces = SRD_BUNDLE.races || [];        // index,name,speed,size,abilityBonuses[],languages[],traits[]
  state.srdSubclasses = SRD_BUNDLE.subclasses || []; // index,name,classIndex
  try{
    const clsEl = document.getElementById('srd-spell-classes');
    state.spellClassMap = JSON.parse(clsEl.textContent); // { spellIndex: [classIndex,...] } — which classes can learn/prepare each spell
  }catch(e){
    state.spellClassMap = {};
  }
  state.srdLoading = false;
  render();
}

// Third-caster subclasses draw from the Wizard spell list per RAW, even though this tool otherwise
// treats subclass as a name-only free-text field (no other mechanical SRD data backs it). Matched by
// name text since that's all we store for subclass.
const THIRD_CASTER_SUBCLASS_LISTS = {
  'eldritch knight': 'wizard',
  'arcane trickster': 'wizard'
};
function classSpellListFor(ch){
  // Returns the SRD class index whose spell list should be used to filter the spell search for this
  // character, or null if we don't have list data for their class/subclass (custom class, non-caster
  // with no matching third-caster subclass, etc.) — callers should show everything when this is null.
  if(ch.classIndex && (state.srdClasses||[]).some(c=>c.index===ch.classIndex && c.spellAbility)) return ch.classIndex;
  const subclassName = (ch.subclass||'').toLowerCase();
  for(const key in THIRD_CASTER_SUBCLASS_LISTS){
    if(subclassName.includes(key)) return THIRD_CASTER_SUBCLASS_LISTS[key];
  }
  return null;
}

async function getSpellDetail(index){
  return (state.srdSpellIndex||[]).find(s=>s.index===index) || null;
}

async function getEquipmentDetail(index){
  return (state.srdEquipmentIndex||[]).find(s=>s.index===index) || null;
}

