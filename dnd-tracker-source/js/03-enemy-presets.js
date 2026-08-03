// ---------- enemy schema / monster presets ----------
function blankEnemy(name){
  return {
    id: uid('enemy'),
    name: name || 'New Enemy',
    presetKey: null,      // key of the MONSTER_PRESETS entry this came from, or null if custom/unique
    groupLabel: '',        // e.g. "Goblins" — shared label for a batch spawned from the same preset
    role: '',              // freeform, e.g. "Ranger", "Spellcaster", "Boss" — for reskinning one instance in a group
    cr: '',
    xp: 0,
    xpAwarded: false, // set true once this enemy's XP has been included in an "Award XP" action, so it isn't double-counted
    ac: 10,
    hp: { current: 10, max: 10 },
    speed: 30,
    abilities: { str:10, dex:10, con:10, int:10, wis:10, cha:10 },
    saveBonus: 0, // flat bonus added on top of ability mod when this enemy rolls a saving throw against a party member's spell (proficient saves, magic resistance flavor, etc.) — 0 for a plain ability-mod-only save
    attacks: [],   // {id,name,toHit,damage,damageType,notes,recharge,rechargeAvailable}
    traits: [],    // {id,name,desc}
    legendaryActionsMax: 0,      // legendary actions available per round; 0 means this enemy has none
    legendaryActionsUsed: 0,     // spent so far this round — resets to 0 when a new round starts in an active fight, or via the manual Reset button
    legendaryActions: [],  // {id,name,desc,cost}
    lairAction: '',  // freeform reference note — triggers on initiative count 20, not mechanically tracked
    conditions: [], // same shape as Character.conditions — {id,conditionIndex,name,duration,level,custom}
    initiative: null,
    initiativeBonus: 0,   // catch-all for pack tactics-like bonuses, homebrew traits, magic items — manual
    initiativeMode: 'normal', // 'normal' | 'adv' | 'disadv'
    surprised: false,
    status: 'alive', // alive | dead | fled | other
    notes: ''
  };
}

// A lightweight, non-adversarial roster entry — hirelings, animal companions, town contacts,
// anyone the party deals with who isn't a combat opponent. Deliberately much thinner than a full
// Character or Enemy sheet: no inventory, spells, or leveling, just enough to remember who's who
// and (optionally) track HP/AC for a companion that might actually take hits.
function blankNpc(name){
  return {
    id: uid('npc'),
    name: name || 'New NPC',
    role: '',          // freeform — e.g. "Blacksmith", "Hired guide", "Ranger's animal companion"
    disposition: 'friendly', // 'friendly' | 'neutral' | 'wary' | 'ally'
    hasCombatStats: false,   // toggles showing hp/ac — off by default, since most NPCs are just narrative
    hp: { current: 10, max: 10 },
    ac: 10,
    saveBonus: 0, // generic flat bonus for auto-rolled saving throws vs an enemy's save-based attack — NPCs don't track full ability scores, so this is one approximate number rather than six precise ones
    notes: ''
  };
}
function ensureNpcFields(npc){
  if(npc.role===undefined) npc.role = '';
  if(npc.disposition===undefined) npc.disposition = 'friendly';
  if(npc.hasCombatStats===undefined) npc.hasCombatStats = false;
  if(!npc.hp) npc.hp = { current:10, max:10 };
  if(npc.ac===undefined) npc.ac = 10;
  if(npc.saveBonus===undefined) npc.saveBonus = 0;
  if(npc.notes===undefined) npc.notes = '';
}

// A small curated set of common low-to-mid CR SRD monsters, for quickly spawning
// "mook" groups (e.g. six goblins) without hand-authoring every stat block.
// Stats are standard 5e SRD numbers; trait descriptions are written in plain language here
// rather than reproduced verbatim from any sourcebook.
const MONSTER_PRESETS = [
  { key:'goblin', name:'Goblin', category:'Humanoid', cr:'1/4', xp:50, ac:15, hitDice:'2d6', speed:30,
    abilities:{str:8,dex:14,con:10,int:10,wis:8,cha:8},
    attacks:[
      {name:'Scimitar', toHit:4, damage:'1d6+2', damageType:'slashing', notes:'melee'},
      {name:'Shortbow', toHit:4, damage:'1d6+2', damageType:'piercing', notes:'ranged 80/320 ft'}
    ],
    traits:[{name:'Nimble Escape', desc:'Can Disengage or Hide as a bonus action each turn.'}] },
  { key:'goblin-boss', name:'Goblin Boss', category:'Humanoid', cr:'1', xp:200, ac:17, hitDice:'6d6', speed:30,
    abilities:{str:10,dex:14,con:10,int:10,wis:8,cha:10},
    attacks:[{name:'Scimitar (x2)', toHit:4, damage:'1d6+2', damageType:'slashing', notes:'multiattack, 2 hits'}],
    traits:[{name:'Nimble Escape', desc:'Can Disengage or Hide as a bonus action each turn.'}] },
  { key:'kobold', name:'Kobold', category:'Humanoid', cr:'1/8', xp:25, ac:12, hitDice:'2d6-2', speed:30,
    abilities:{str:7,dex:15,con:9,int:8,wis:7,cha:8},
    attacks:[
      {name:'Dagger', toHit:4, damage:'1d4+2', damageType:'piercing', notes:'melee'},
      {name:'Sling', toHit:4, damage:'1d4+2', damageType:'piercing', notes:'ranged 30/120 ft'}
    ],
    traits:[
      {name:'Pack Tactics', desc:'Attack rolls have advantage if an ally is adjacent to the target.'},
      {name:'Sunlight Sensitivity', desc:'Disadvantage on attacks and Perception in direct sunlight.'}
    ] },
  { key:'orc', name:'Orc', category:'Humanoid', cr:'1/2', xp:100, ac:13, hitDice:'2d8+6', speed:30,
    abilities:{str:16,dex:12,con:16,int:7,wis:11,cha:10},
    attacks:[
      {name:'Greataxe', toHit:5, damage:'1d12+3', damageType:'slashing', notes:'melee'},
      {name:'Javelin', toHit:5, damage:'1d6+3', damageType:'piercing', notes:'thrown, 30/120 ft'}
    ],
    traits:[{name:'Aggressive', desc:'Can move toward a hostile creature as a bonus action.'}] },
  { key:'skeleton', name:'Skeleton', category:'Undead', cr:'1/4', xp:50, ac:13, hitDice:'2d8+4', speed:30,
    abilities:{str:10,dex:14,con:15,int:6,wis:8,cha:5},
    attacks:[
      {name:'Shortsword', toHit:4, damage:'1d6+2', damageType:'piercing', notes:'melee'},
      {name:'Shortbow', toHit:4, damage:'1d6+2', damageType:'piercing', notes:'ranged 80/320 ft'}
    ],
    traits:[{name:'Vulnerable to Bludgeoning', desc:'Takes extra damage from bludgeoning attacks; immune to poison.'}] },
  { key:'zombie', name:'Zombie', category:'Undead', cr:'1/4', xp:50, ac:8, hitDice:'3d8+9', speed:20,
    abilities:{str:13,dex:6,con:16,int:3,wis:6,cha:5},
    attacks:[{name:'Slam', toHit:3, damage:'1d6+1', damageType:'bludgeoning', notes:'melee'}],
    traits:[{name:'Undead Fortitude', desc:'On a hit that would drop it to 0 HP (non-radiant, non-crit), can make a CON save to drop to 1 instead.'}] },
  { key:'giant-rat', name:'Giant Rat', category:'Beast', cr:'1/8', xp:25, ac:12, hitDice:'2d6', speed:30,
    abilities:{str:7,dex:15,con:11,int:2,wis:10,cha:4},
    attacks:[{name:'Bite', toHit:4, damage:'1d4+2', damageType:'piercing', notes:'melee'}],
    traits:[{name:'Pack Tactics', desc:'Attack rolls have advantage if an ally is adjacent to the target.'}] },
  { key:'wolf', name:'Wolf', category:'Beast', cr:'1/4', xp:50, ac:13, hitDice:'2d8+2', speed:40,
    abilities:{str:12,dex:15,con:12,int:3,wis:12,cha:6},
    attacks:[{name:'Bite', toHit:4, damage:'2d4+2', damageType:'piercing', notes:'melee, target may be knocked prone'}],
    traits:[
      {name:'Pack Tactics', desc:'Attack rolls have advantage if an ally is adjacent to the target.'},
      {name:'Keen Hearing & Smell', desc:'Advantage on Perception checks relying on hearing or smell.'}
    ] },
  { key:'bandit', name:'Bandit', category:'Humanoid', cr:'1/8', xp:25, ac:12, hitDice:'2d8+2', speed:30,
    abilities:{str:11,dex:12,con:12,int:10,wis:10,cha:10},
    attacks:[
      {name:'Scimitar', toHit:3, damage:'1d6+1', damageType:'slashing', notes:'melee'},
      {name:'Light Crossbow', toHit:3, damage:'1d8+1', damageType:'piercing', notes:'ranged 80/320 ft'}
    ],
    traits:[] },
  { key:'bandit-captain', name:'Bandit Captain', category:'Humanoid', cr:'2', xp:450, ac:15, hitDice:'10d8+20', speed:30,
    abilities:{str:15,dex:16,con:14,int:14,wis:11,cha:14},
    attacks:[
      {name:'Scimitar (x2)', toHit:5, damage:'1d6+3', damageType:'slashing', notes:'multiattack, part of a 3-hit turn'},
      {name:'Dagger', toHit:5, damage:'1d4+3', damageType:'piercing', notes:'thrown, melee or 20/60 ft'}
    ],
    traits:[] },
  { key:'cultist', name:'Cultist', category:'Humanoid', cr:'1/8', xp:25, ac:12, hitDice:'2d8', speed:30,
    abilities:{str:11,dex:12,con:10,int:10,wis:11,cha:10},
    attacks:[{name:'Scimitar', toHit:3, damage:'1d6+1', damageType:'slashing', notes:'melee'}],
    traits:[{name:'Dark Devotion', desc:'Advantage on saves vs being charmed or frightened.'}] },
  { key:'cult-fanatic', name:'Cult Fanatic', category:'Humanoid', cr:'2', xp:450, ac:13, hitDice:'6d8+6', speed:30,
    abilities:{str:11,dex:14,con:12,int:10,wis:13,cha:14},
    attacks:[{name:'Dagger (x2)', toHit:4, damage:'1d4+2', damageType:'piercing', notes:'multiattack, melee or thrown 20/60 ft'}],
    traits:[
      {name:'Dark Devotion', desc:'Advantage on saves vs being charmed or frightened.'},
      {name:'Spellcasting', desc:'Casts cleric-like spells such as Command, Shield of Faith, Hold Person, Spiritual Weapon.'}
    ] },
  { key:'hobgoblin', name:'Hobgoblin', category:'Humanoid', cr:'1/2', xp:100, ac:18, hitDice:'2d8+2', speed:30,
    abilities:{str:13,dex:12,con:12,int:10,wis:10,cha:9},
    attacks:[
      {name:'Longsword', toHit:3, damage:'1d8+1', damageType:'slashing', notes:'melee, versatile 1d10+1'},
      {name:'Longbow', toHit:2, damage:'1d8', damageType:'piercing', notes:'ranged 150/600 ft'}
    ],
    traits:[{name:'Martial Advantage', desc:'Deals an extra 2d6 damage when an ally is adjacent to its target.'}] },
  { key:'bugbear', name:'Bugbear', category:'Humanoid', cr:'1', xp:200, ac:16, hitDice:'5d8+5', speed:30,
    abilities:{str:15,dex:14,con:13,int:8,wis:11,cha:9},
    attacks:[
      {name:'Morningstar', toHit:4, damage:'2d8+2', damageType:'piercing', notes:'melee, extra die from Brute'},
      {name:'Javelin', toHit:4, damage:'1d6+2', damageType:'piercing', notes:'thrown, 30/120 ft'}
    ],
    traits:[
      {name:'Brute', desc:'Melee weapon attacks deal one extra damage die.'},
      {name:'Surprise Attack', desc:'Deals an extra 2d6 damage against a surprised target.'}
    ] },
  { key:'giant-spider', name:'Giant Spider', category:'Beast', cr:'1', xp:200, ac:14, hitDice:'4d10+4', speed:30,
    abilities:{str:14,dex:16,con:12,int:2,wis:11,cha:4},
    attacks:[{name:'Bite', toHit:5, damage:'1d8+3', damageType:'piercing', notes:'plus 2d8 poison, target makes a CON save or is poisoned'}],
    traits:[
      {name:'Spider Climb', desc:'Can climb difficult surfaces, including upside down, without a check.'},
      {name:'Web Walker', desc:'Ignores movement restrictions caused by webbing.'},
      {name:'Web (recharge)', desc:'Ranged attack to restrain a target in webbing.'}
    ] },
  { key:'ghoul', name:'Ghoul', category:'Undead', cr:'1', xp:200, ac:12, hitDice:'5d8', speed:30,
    abilities:{str:13,dex:15,con:10,int:7,wis:10,cha:6},
    attacks:[
      {name:'Bite', toHit:2, damage:'2d6+2', damageType:'piercing', notes:'melee'},
      {name:'Claws', toHit:4, damage:'2d4+2', damageType:'slashing', notes:'target makes a CON save or is paralyzed (not vs. elves)'}
    ],
    traits:[] },
  { key:'ogre', name:'Ogre', category:'Giant', cr:'2', xp:450, ac:11, hitDice:'7d10+21', speed:40,
    abilities:{str:19,dex:8,con:16,int:5,wis:7,cha:7},
    attacks:[
      {name:'Greatclub', toHit:6, damage:'2d8+4', damageType:'bludgeoning', notes:'melee'},
      {name:'Javelin', toHit:6, damage:'2d6+4', damageType:'piercing', notes:'thrown, 30/120 ft'}
    ],
    traits:[] },
  { key:'brown-bear', name:'Brown Bear', category:'Beast', cr:'1', xp:200, ac:11, hitDice:'4d10+12', speed:40,
    abilities:{str:19,dex:10,con:16,int:2,wis:13,cha:7},
    attacks:[
      {name:'Bite', toHit:5, damage:'1d8+4', damageType:'piercing', notes:'melee, multiattack w/ claw'},
      {name:'Claw', toHit:5, damage:'2d6+4', damageType:'slashing', notes:'melee, multiattack w/ bite'}
    ],
    traits:[{name:'Keen Smell', desc:'Advantage on Perception checks relying on smell.'}] },
  { key:'owlbear', name:'Owlbear', category:'Monstrosity', cr:'3', xp:700, ac:13, hitDice:'7d10+21', speed:40,
    abilities:{str:20,dex:12,con:17,int:3,wis:12,cha:7},
    attacks:[
      {name:'Beak', toHit:7, damage:'1d10+5', damageType:'piercing', notes:'melee, multiattack w/ claws'},
      {name:'Claws', toHit:7, damage:'2d8+5', damageType:'slashing', notes:'melee, multiattack w/ beak'}
    ],
    traits:[{name:'Keen Sight & Smell', desc:'Advantage on Perception checks relying on sight or smell.'}] }
];

