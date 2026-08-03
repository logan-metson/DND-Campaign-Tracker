// ---------- schema / defaults ----------
function uid(prefix){ return prefix + '_' + Math.random().toString(36).slice(2,9); }

function blankCharacter(name){
  return {
    id: uid('char'),
    name: name || 'New Adventurer',
    playerName: '',
    background: '',
    alignment: '',
    languages: '',
    race: '', raceIndex: null,
    class: '', classIndex: null,
    subclass: '',
    level: 1,
    xp: 0,
    hp: { current: 10, max: 10, temp: 0 },
    ac: 10,
    speed: 30,
    hitDice: { total: 1, current: 1, die: 'd8' },
    baseAbilities: { str:8, dex:8, con:8, int:8, wis:8, cha:8 }, // point-buy base, 8-15 each
    abilityBonusChoice: { plus2: null, plus1: null }, // free-choice bonus (Tasha's "Customizing Your Origin") — player picks which ability gets +2 and a different one +1, independent of race
    asiBonuses: { str:0, dex:0, con:0, int:0, wis:0, cha:0 }, // flat increases from "Ability Score Improvement" choices made at level-up (not race, not feats — tracked separately so each source stays visible)
    asiLevelsUsed: [], // character levels at which an ASI/feat choice has already been made via the Level Up button, so it isn't offered twice
    feats: [], // [{id, key (FEATS index or null if custom), name, desc, sourceLevel, bonuses:{ac,speed,initiative,...}|null, abilityChoice:{options[],amount,grantsSaveProf,selected}|null, custom:bool}]
    abilities: { str:8, dex:8, con:8, int:8, wis:8, cha:8 }, // effective/derived — kept in sync each render, don't hand-edit
    savingThrowProfs: { str:false, dex:false, con:false, int:false, wis:false, cha:false },
    skillProfs: { acrobatics:false, animalHandling:false, arcana:false, athletics:false, deception:false, history:false, insight:false, intimidation:false, investigation:false, medicine:false, nature:false, perception:false, performance:false, persuasion:false, religion:false, sleightOfHand:false, stealth:false, survival:false },
    spellcasting: { ability: 'none', slots: {1:{current:0,max:0},2:{current:0,max:0},3:{current:0,max:0},4:{current:0,max:0},5:{current:0,max:0},6:{current:0,max:0},7:{current:0,max:0},8:{current:0,max:0},9:{current:0,max:0}} },
    concentratingOn: '', // name of the spell currently being concentrated on, or '' if none — freeform, not restricted to known spells
    spells: [],
    inventory: [],
    gold: 0,
    conditions: [],
    status: 'alive',
    statusNote: '',
    deathSaves: { successes: 0, failures: 0 }, // only relevant at 0 HP — resets automatically on regaining any HP
    initiative: null,
    initiativeBonus: 0,   // catch-all for feats, class features, magic items — manual, since these vary too much to auto-derive
    initiativeMode: 'normal', // 'normal' | 'adv' | 'disadv'
    surprised: false,
    notes: ''
  };
}

function blankCampaign(){
  return {
    campaignName: 'Untitled Campaign',
    sessionNumber: 1,
    inGameDate: '',
    partyGold: 0,
    worldNotes: '',
    questLog: [],
    characters: [],
    enemies: [],
    combat: null, // { round, turnIndex, order:[{id,kind:'pc'|'enemy',name}] } — null when no fight is active
    partyInventory: [], // shared loot not yet claimed by anyone — {id,index,name,qty,tags,weight}
    npcs: [], // friendly/neutral roster distinct from the adversarial Enemies tab — {id,name,role,disposition,hp:{current,max}|null,ac:number|null,notes}
    sessions: [], // session-by-session recap log — {id,number,date,recap}
    updatedAt: Date.now()
  };
}

