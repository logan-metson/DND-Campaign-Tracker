// ---- Rules Reference tab ----
// Static reference data below (ability-check/saving-throw guidance, weapon/armor proficiency
// categories, armor Str requirements & Stealth disadvantage) is standard, fixed 5e SRD/PHB table
// content — the same kind of "won't change" reference data as the class hit-dice/saving-throw
// proficiencies already embedded elsewhere in this file. Everything else on this tab (spell lists,
// weapon/armor stat lines, condition text) is pulled live from the same embedded SRD bundle used
// throughout the tool, so there's nothing duplicated here that could drift out of sync.

const ABILITY_CHECK_EXAMPLES = [
  { ability:'STR', uses:"Athletics — climbing, jumping, swimming, forcing a stuck door, grappling or shoving, breaking free of a grapple" },
  { ability:'DEX', uses:"Acrobatics (balance, tumbling), Sleight of Hand (pickpocketing, palming an object, disarming/resetting a trap), Stealth (hiding, moving quietly) — this is the one for lockpicking with thieves' tools" },
  { ability:'CON', uses:"No skill of its own — used directly for holding your breath, forced marches, and (importantly) the save to keep concentrating on a spell when you take damage" },
  { ability:'INT', uses:"Arcana (magic lore), History, Investigation (finding hidden clues, working out how something functions), Nature, Religion" },
  { ability:'WIS', uses:"Animal Handling, Insight (reading intentions, spotting a lie), Medicine, Perception (noticing things — the classic \"perception check\"), Survival (tracking, foraging, navigating the wild)" },
  { ability:'CHA', uses:"Deception, Intimidation, Performance, Persuasion — how convincingly or forcefully a character presents themselves" }
];
const SAVING_THROW_EXAMPLES = [
  { ability:'STR', uses:"Resisting being physically moved, knocked prone, or crushed — e.g. shrugging off a shove or a giant's grab" },
  { ability:'DEX', uses:"Dodging an area effect you can see coming — fireballs, breath weapons, collapsing floors, traps" },
  { ability:'CON', uses:"Enduring poison, disease, and other bodily punishment — plus concentration saves when you're hit while concentrating on a spell" },
  { ability:'INT', uses:"Resisting effects that attack your reasoning or grip on reality — some illusions and psychic assaults" },
  { ability:'WIS', uses:"Resisting effects on your mind and will — charm, fear, domination, and illusions that trick your senses" },
  { ability:'CHA', uses:"Resisting effects that reach for your identity or soul — banishment, possession, and similar" }
];

// Full 18-skill breakdown — same idea as the ability-grouped summary above but exhaustive and
// alphabetical, for when someone needs the specific skill rather than the general ability.
const SKILLS_REFERENCE = [
  { name:'Acrobatics', ability:'DEX', uses:'Staying on your feet in a tricky spot, or pulling off an acrobatic stunt (tumbling, cartwheeling off a ledge)' },
  { name:'Animal Handling', ability:'WIS', uses:'Calming a spooked animal, keeping a mount under control, or reading an animal\'s intentions' },
  { name:'Arcana', ability:'INT', uses:'Recalling lore about spells, magic items, planes of existence, and magical traditions' },
  { name:'Athletics', ability:'STR', uses:'Climbing, jumping, swimming, or a physical contest like grappling and shoving' },
  { name:'Deception', ability:'CHA', uses:'Convincingly hiding the truth — lies, misdirection, disguises' },
  { name:'History', ability:'INT', uses:'Recalling lore about historical events, legendary people, and past conflicts' },
  { name:'Insight', ability:'WIS', uses:"Reading body language and mannerisms to gauge true intentions — spotting a lie" },
  { name:'Intimidation', ability:'CHA', uses:'Influencing someone through overt threats, hostile actions, or a show of force' },
  { name:'Investigation', ability:'INT', uses:'Finding hidden clues, or deducing how something works when actively searching or examining' },
  { name:'Medicine', ability:'WIS', uses:'Stabilizing a dying creature or diagnosing an illness' },
  { name:'Nature', ability:'INT', uses:'Recalling lore about terrain, plants, animals, and weather' },
  { name:'Perception', ability:'WIS', uses:'Noticing things — the classic "roll a perception check" for spotting or hearing something' },
  { name:'Performance', ability:'CHA', uses:'Delighting an audience with music, dance, acting, or storytelling' },
  { name:'Persuasion', ability:'CHA', uses:'Influencing someone with tact, social grace, or good nature (as opposed to threats)' },
  { name:'Religion', ability:'INT', uses:'Recalling lore about deities, rites, prayers, and religious hierarchies' },
  { name:'Sleight of Hand', ability:'DEX', uses:'Pickpocketing, palming an object, or planting something on someone unnoticed — and lockpicking with thieves\' tools' },
  { name:'Stealth', ability:'DEX', uses:'Concealing yourself, slipping past guards, or moving without being heard' },
  { name:'Survival', ability:'WIS', uses:'Tracking, foraging, navigating the wild, or predicting the weather' }
];

// A quick DC ladder for improvising checks on the fly (PHB standard values).
const DC_REFERENCE = [
  { dc:5, label:'Very Easy' },
  { dc:10, label:'Easy' },
  { dc:15, label:'Medium' },
  { dc:20, label:'Hard' },
  { dc:25, label:'Very Hard' },
  { dc:30, label:'Nearly Impossible' }
];

const COMBAT_ACTIONS = [
  { name:'Attack', uses:'Make one melee or ranged attack (some features grant extra attacks with this same action)' },
  { name:'Cast a Spell', uses:'Cast a spell with a casting time of 1 action' },
  { name:'Dash', uses:'Gain extra movement equal to your speed for the turn' },
  { name:'Disengage', uses:'Your movement this turn doesn\'t provoke opportunity attacks' },
  { name:'Dodge', uses:'Until your next turn, attacks against you have disadvantage (if you can see the attacker) and you have advantage on Dex saves' },
  { name:'Help', uses:'Give an ally advantage on their next ability check or attack roll against a target within 5 ft of you' },
  { name:'Hide', uses:'Make a Dexterity (Stealth) check to try to go unseen/unheard' },
  { name:'Ready', uses:'Prepare an action (and a trigger) to use as a reaction before your next turn' },
  { name:'Search', uses:'Devote your attention to finding something — usually a Perception or Investigation check' },
  { name:'Use an Object', uses:'Interact with a second object this turn beyond the one free interaction already allowed' }
];

const DAMAGE_TYPES = [
  { name:'Acid', desc:'Corrosive damage — breath weapons, oozes, some traps' },
  { name:'Bludgeoning', desc:'Blunt-force damage — hammers, falling, constriction' },
  { name:'Cold', desc:'Freezing damage — frost breath weapons, cold spells' },
  { name:'Fire', desc:'Burning damage — flames, some breath weapons' },
  { name:'Force', desc:"Pure magical energy — almost nothing resists it (e.g. Magic Missile)" },
  { name:'Lightning', desc:'Electrical damage — lightning bolt, storm-related attacks' },
  { name:'Necrotic', desc:'Withering, life-draining damage — undead attacks, some curses' },
  { name:'Piercing', desc:'Puncturing damage — arrows, bites, spears' },
  { name:'Poison', desc:'Toxic damage — venom, poison gas, disease-adjacent effects' },
  { name:'Psychic', desc:'Mental damage that bypasses physical defenses' },
  { name:'Radiant', desc:'Divine/holy energy — often extra effective against undead and fiends' },
  { name:'Slashing', desc:'Cutting damage — swords, axes, claws' },
  { name:'Thunder', desc:'Concussive, sound-based force — Thunderwave, Shatter' }
];

// Standard DMG (2014) encounter-building tables — verified against the published DMG p.82/275
// values rather than reconstructed purely from memory, since these are numeric reference tables
// where an error would actively mislead rather than just being an incomplete list.
const XP_THRESHOLDS_BY_LEVEL = [
  {level:1,easy:25,medium:50,hard:75,deadly:100}, {level:2,easy:50,medium:100,hard:150,deadly:200},
  {level:3,easy:75,medium:150,hard:225,deadly:400}, {level:4,easy:125,medium:250,hard:375,deadly:500},
  {level:5,easy:250,medium:500,hard:750,deadly:1100}, {level:6,easy:300,medium:600,hard:900,deadly:1400},
  {level:7,easy:350,medium:750,hard:1100,deadly:1700}, {level:8,easy:450,medium:900,hard:1400,deadly:2100},
  {level:9,easy:550,medium:1100,hard:1600,deadly:2400}, {level:10,easy:600,medium:1200,hard:1900,deadly:2800},
  {level:11,easy:800,medium:1600,hard:2400,deadly:3600}, {level:12,easy:1000,medium:2000,hard:3000,deadly:4500},
  {level:13,easy:1100,medium:2200,hard:3400,deadly:5100}, {level:14,easy:1250,medium:2500,hard:3800,deadly:5700},
  {level:15,easy:1400,medium:2800,hard:4300,deadly:6400}, {level:16,easy:1600,medium:3200,hard:4800,deadly:7200},
  {level:17,easy:2000,medium:3900,hard:5900,deadly:8800}, {level:18,easy:2100,medium:4200,hard:6300,deadly:9500},
  {level:19,easy:2400,medium:4900,hard:7300,deadly:10900}, {level:20,easy:2800,medium:5700,hard:8500,deadly:12700}
];
const CR_TO_XP = [
  {cr:'0',xp:'10 (0 if it has no attacks)'},{cr:'1/8',xp:'25'},{cr:'1/4',xp:'50'},{cr:'1/2',xp:'100'},
  {cr:'1',xp:'200'},{cr:'2',xp:'450'},{cr:'3',xp:'700'},{cr:'4',xp:'1,100'},{cr:'5',xp:'1,800'},
  {cr:'6',xp:'2,300'},{cr:'7',xp:'2,900'},{cr:'8',xp:'3,900'},{cr:'9',xp:'5,000'},{cr:'10',xp:'5,900'},
  {cr:'11',xp:'7,200'},{cr:'12',xp:'8,400'},{cr:'13',xp:'10,000'},{cr:'14',xp:'11,500'},{cr:'15',xp:'13,000'},
  {cr:'16',xp:'15,000'},{cr:'17',xp:'18,000'},{cr:'18',xp:'20,000'},{cr:'19',xp:'22,000'},{cr:'20',xp:'25,000'},
  {cr:'21',xp:'33,000'},{cr:'22',xp:'41,000'},{cr:'23',xp:'50,000'},{cr:'24',xp:'62,000'},{cr:'25',xp:'75,000'},
  {cr:'26',xp:'90,000'},{cr:'27',xp:'105,000'},{cr:'28',xp:'120,000'},{cr:'29',xp:'135,000'},{cr:'30',xp:'155,000'}
];
const ENCOUNTER_MULTIPLIERS = [
  {monsters:'1',mult:'×1'}, {monsters:'2',mult:'×1.5'}, {monsters:'3–6',mult:'×2'},
  {monsters:'7–10',mult:'×2.5'}, {monsters:'11–14',mult:'×3'}, {monsters:'15+',mult:'×4'}
];

const SIZE_CATEGORIES = [
  ['Tiny','2.5 × 2.5 ft'], ['Small','5 × 5 ft'], ['Medium','5 × 5 ft'],
  ['Large','10 × 10 ft'], ['Huge','15 × 15 ft'], ['Gargantuan','20 × 20 ft or larger']
];

const WEAPON_CATEGORIES = {
  'Simple Melee': ['club','dagger','greatclub','handaxe','javelin','light-hammer','mace','quarterstaff','sickle','spear'],
  'Simple Ranged': ['crossbow-light','dart','shortbow','sling'],
  'Martial Melee': ['battleaxe','flail','glaive','greataxe','greatsword','halberd','lance','longsword','maul','morningstar','pike','rapier','scimitar','shortsword','trident','war-pick','warhammer','whip'],
  'Martial Ranged': ['blowgun','crossbow-hand','crossbow-heavy','longbow','net']
};
const ARMOR_CATEGORIES = {
  'Light Armor': ['padded-armor','leather-armor','studded-leather-armor'],
  'Medium Armor': ['hide-armor','chain-shirt','scale-mail','breastplate','half-plate-armor'],
  'Heavy Armor': ['ring-mail','chain-mail','splint-armor','plate-armor'],
  'Shields': ['shield']
};
const ARMOR_STR_MIN = { 'chain-mail':13, 'splint-armor':15, 'plate-armor':15 };
const ARMOR_STEALTH_DISADV = new Set(['padded-armor','scale-mail','half-plate-armor','ring-mail','chain-mail','splint-armor','plate-armor']);

const SPELL_NONCASTER_NOTE = {
  barbarian: 'Barbarians have no spellcasting.',
  fighter: "Fighters have no spellcasting by default — the Eldritch Knight subclass gains a limited selection from the Wizard list starting at 3rd level.",
  monk: 'Monks have no spellcasting.',
  rogue: "Rogues have no spellcasting by default — the Arcane Trickster subclass gains a limited selection from the Wizard list starting at 3rd level."
};

function renderAbilityRefSection(){
  const abilityRows = ABILITY_CHECK_EXAMPLES.map(a=>`<div class="ref-row"><span class="ref-key">${a.ability}</span><span class="ref-val">${escapeHtml(a.uses)}</span></div>`).join('');
  const saveRows = SAVING_THROW_EXAMPLES.map(s=>`<div class="ref-row"><span class="ref-key">${s.ability}</span><span class="ref-val">${escapeHtml(s.uses)}</span></div>`).join('');
  const classRows = (state.srdClasses||[]).map(c=>`<div class="ref-row"><span class="ref-key">${escapeHtml(c.name)}</span><span class="ref-val">${(c.savingThrows||[]).map(s=>s.toUpperCase()).join(', ')}</span></div>`).join('');
  const skillRows = SKILLS_REFERENCE.map(s=>`<div class="ref-row"><span class="ref-key">${s.ability}</span><span class="ref-val"><strong style="color:var(--text);">${escapeHtml(s.name)}</strong> — ${escapeHtml(s.uses)}</span></div>`).join('');
  const dcRows = DC_REFERENCE.map(d=>`<div class="ref-row"><span class="ref-key">DC ${d.dc}</span><span class="ref-val">${escapeHtml(d.label)}</span></div>`).join('');
  return `
    <details class="rules-section" open>
      <summary><span>Ability Checks, Saves &amp; Skills</span></summary>
      <div class="rules-body">
        <div class="hint" style="margin-bottom:8px;">General guidance for "which ability covers this?" — enough to call for a check on the fly without looking anything up.</div>
        <details class="rules-sub" open>
          <summary><span>Which ability check for which situation</span></summary>
          <div class="rules-sub-body"><div class="ref-table">${abilityRows}</div></div>
        </details>
        <details class="rules-sub">
          <summary><span>Which saving throw resists what</span></summary>
          <div class="rules-sub-body"><div class="ref-table">${saveRows}</div></div>
        </details>
        <details class="rules-sub">
          <summary><span>Class saving throw proficiencies</span></summary>
          <div class="rules-sub-body"><div class="ref-table">${classRows}</div></div>
        </details>
        <details class="rules-sub">
          <summary><span>All 18 skills</span></summary>
          <div class="rules-sub-body"><div class="ref-table">${skillRows}</div></div>
        </details>
        <details class="rules-sub">
          <summary><span>Passive checks</span></summary>
          <div class="rules-sub-body hint" style="line-height:1.6;">A passive check is 10 + all the same modifiers as an active check (proficiency, ability modifier, any other bonus) — no roll. Most often used for passive Perception, to see whether the party notices something without calling for a roll; compare it against a hidden creature's Stealth result or a trap's DC.</div>
        </details>
        <details class="rules-sub">
          <summary><span>Setting a DC on the fly</span></summary>
          <div class="rules-sub-body">
            <div class="hint" style="margin-bottom:6px;">A rough ladder for improvising — pick the difficulty that feels right rather than overthinking the exact number.</div>
            <div class="ref-table">${dcRows}</div>
          </div>
        </details>
      </div>
    </details>
  `;
}

function renderCombatBasicsSection(){
  const tierRows = [[1,4],[5,8],[9,12],[13,16],[17,20]].map(([lo,hi])=>
    `<div class="ref-row"><span class="ref-key">Lv ${lo}–${hi}</span><span class="ref-val">${fmtMod(profBonus(lo))} proficiency bonus</span></div>`).join('');
  const actionRows = COMBAT_ACTIONS.map(a=>`<div class="ref-row"><span class="ref-key" style="flex-basis:110px;">${escapeHtml(a.name)}</span><span class="ref-val">${escapeHtml(a.uses)}</span></div>`).join('');
  return `
    <details class="rules-section">
      <summary><span>Combat &amp; Core Mechanics</span></summary>
      <div class="rules-body">
        <details class="rules-sub" open>
          <summary><span>Proficiency bonus by level</span></summary>
          <div class="rules-sub-body"><div class="ref-table">${tierRows}</div></div>
        </details>
        <details class="rules-sub">
          <summary><span>Actions in combat</span></summary>
          <div class="rules-sub-body"><div class="ref-table">${actionRows}</div></div>
        </details>
        <details class="rules-sub">
          <summary><span>Advantage &amp; Disadvantage</span></summary>
          <div class="rules-sub-body hint" style="line-height:1.6;">
            Roll two d20s and take the higher (advantage) or lower (disadvantage). They don't stack — even with multiple sources of each, it's still just one extra roll. If a roll would have both advantage and disadvantage from different sources, they cancel out and you roll normally.
          </div>
        </details>
        <details class="rules-sub">
          <summary><span>Cover</span></summary>
          <div class="rules-sub-body"><div class="ref-table">
            <div class="ref-row"><span class="ref-key">Half</span><span class="ref-val">+2 to AC and Dexterity saving throws</span></div>
            <div class="ref-row"><span class="ref-key">3/4</span><span class="ref-val">+5 to AC and Dexterity saving throws</span></div>
            <div class="ref-row"><span class="ref-key">Total</span><span class="ref-val">Can't be targeted directly at all</span></div>
          </div></div>
        </details>
        <details class="rules-sub">
          <summary><span>Critical hits</span></summary>
          <div class="rules-sub-body hint" style="line-height:1.6;">On a natural 20 attack roll, roll all the attack's damage dice twice and add them together, then add modifiers once as normal.</div>
        </details>
        <details class="rules-sub">
          <summary><span>Death saving throws</span></summary>
          <div class="rules-sub-body hint" style="line-height:1.6;">
            At 0 HP and not stable, roll a plain d20 (no modifiers) at the start of each of your turns: 10 or higher is a success, below 10 is a failure. Three successes stabilizes you; three failures and you die. A natural 1 counts as two failures; a natural 20 means you regain 1 HP and wake up. Taking any damage while at 0 HP counts as one automatic failure (two if it's a critical hit) — and if that damage is enough on its own to equal or exceed your hit point maximum, you die outright.
          </div>
        </details>
        <details class="rules-sub">
          <summary><span>Resting</span></summary>
          <div class="rules-sub-body hint" style="line-height:1.6;">
            <strong style="color:var(--text);">Short rest</strong> (at least 1 hour): spend Hit Dice to heal, rolling each die and adding your Constitution modifier.<br>
            <strong style="color:var(--text);">Long rest</strong> (at least 8 hours): regain all HP, half your total Hit Dice (minimum 1), all spell slots, and most limited-use features. Only one long rest benefit per 24 hours, and you need at least 1 HP when you start it.
          </div>
        </details>
        <details class="rules-sub">
          <summary><span>Opportunity attacks</span></summary>
          <div class="rules-sub-body hint" style="line-height:1.6;">When a hostile creature you can see moves out of your reach, you can use your reaction to make one melee attack against it. It doesn't trigger if the creature Disengages first, or if its movement doesn't actually leave your reach (like standing up from prone).</div>
        </details>
        <details class="rules-sub">
          <summary><span>Grappling &amp; shoving</span></summary>
          <div class="rules-sub-body hint" style="line-height:1.6;">In place of one of your attacks, try to grapple or shove a creature no more than one size larger than you: a Strength (Athletics) check contested by the target's Athletics or Acrobatics (their choice). Grapple success — the target is grappled (speed 0, escapable with an action). Shove success — push it 5 feet away, or knock it prone, your choice.</div>
        </details>
        <details class="rules-sub">
          <summary><span>Two-weapon fighting</span></summary>
          <div class="rules-sub-body hint" style="line-height:1.6;">Attacking with a light weapon in each hand: make your normal attack with one, then use a bonus action to attack once with the other. Don't add your ability modifier to that second attack's damage unless it's negative. Both weapons need the Light property (a fighting style can waive this).</div>
        </details>
        <details class="rules-sub">
          <summary><span>Damage types</span></summary>
          <div class="rules-sub-body"><div class="ref-table">${(DAMAGE_TYPES.map(d=>`<div class="ref-row"><span class="ref-key">${escapeHtml(d.name)}</span><span class="ref-val">${escapeHtml(d.desc)}</span></div>`).join(''))}</div></div>
        </details>
      </div>
    </details>
  `;
}

function renderSpellcastingBasicsSection(){
  return `
    <details class="rules-section">
      <summary><span>Spellcasting Basics</span></summary>
      <div class="rules-body">
        <details class="rules-sub" open>
          <summary><span>Spell save DC &amp; spell attack bonus</span></summary>
          <div class="rules-sub-body"><div class="ref-table">
            <div class="ref-row"><span class="ref-key">Save DC</span><span class="ref-val">8 + proficiency bonus + spellcasting ability modifier</span></div>
            <div class="ref-row"><span class="ref-key">Attack</span><span class="ref-val">proficiency bonus + spellcasting ability modifier</span></div>
          </div></div>
        </details>
        <details class="rules-sub">
          <summary><span>Concentration</span></summary>
          <div class="rules-sub-body hint" style="line-height:1.6;">Only one concentration spell can be active at a time — casting a second one ends the first. Whenever you take damage while concentrating, make a Constitution save; the DC is 10 or half the damage taken, whichever is higher. Being incapacitated or killed also ends concentration immediately.</div>
        </details>
        <details class="rules-sub">
          <summary><span>Ritual casting</span></summary>
          <div class="rules-sub-body hint" style="line-height:1.6;">A spell tagged Ritual can be cast without using a spell slot by adding 10 minutes to its casting time, if the caster's class allows ritual casting for that spell. Exactly which spells qualify varies a bit by class — worth a quick check the first time a player wants to use one.</div>
        </details>
      </div>
    </details>
  `;
}


function renderExplorationSection(){
  const sizeRows = SIZE_CATEGORIES.map(([n,s])=>`<div class="ref-row"><span class="ref-key">${n}</span><span class="ref-val">${s} space</span></div>`).join('');
  return `
    <details class="rules-section">
      <summary><span>Exploration &amp; Environment</span></summary>
      <div class="rules-body">
        <details class="rules-sub" open>
          <summary><span>Vision &amp; light</span></summary>
          <div class="rules-sub-body"><div class="ref-table">
            <div class="ref-row"><span class="ref-key">Bright</span><span class="ref-val">Normal vision</span></div>
            <div class="ref-row"><span class="ref-key">Dim</span><span class="ref-val">Lightly obscured — disadvantage on Perception checks that rely on sight</span></div>
            <div class="ref-row"><span class="ref-key">Dark</span><span class="ref-val">Heavily obscured — effectively blinded while looking into or through it</span></div>
            <div class="ref-row"><span class="ref-key">Darkvision</span><span class="ref-val">See in dim light as if bright, and darkness as if dim (usually in shades of gray), out to its listed range</span></div>
            <div class="ref-row"><span class="ref-key">Blindsight</span><span class="ref-val">Perceive its surroundings without relying on sight, out to its listed range</span></div>
            <div class="ref-row"><span class="ref-key">Truesight</span><span class="ref-val">See in normal and magical darkness, see invisible creatures, see through illusions, and perceive a shapechanger's true form, out to its listed range</span></div>
          </div></div>
        </details>
        <details class="rules-sub">
          <summary><span>Movement &amp; terrain</span></summary>
          <div class="rules-sub-body hint" style="line-height:1.6;">Difficult terrain costs 2 feet of movement for every 1 foot moved. Climbing, swimming, and crawling cost the same — 2 feet per foot moved — unless the creature has a climbing/swimming speed for that mode. A long jump with a 10-foot running start covers a number of feet up to your Strength score (half that standing still); a high jump under the same conditions reaches 3 + your Strength modifier feet up.</div>
        </details>
        <details class="rules-sub">
          <summary><span>Falling &amp; suffocating</span></summary>
          <div class="rules-sub-body hint" style="line-height:1.6;">Falling deals 1d6 bludgeoning damage per 10 feet fallen (max 20d6), and the creature lands prone. A creature can hold its breath for a number of minutes equal to 1 + its Constitution modifier (minimum 30 seconds); once that runs out it can survive a number of rounds equal to its Constitution modifier (minimum 1) before dropping to 0 HP.</div>
        </details>
        <details class="rules-sub">
          <summary><span>Size categories</span></summary>
          <div class="rules-sub-body"><div class="ref-table">${sizeRows}</div></div>
        </details>
        <details class="rules-sub">
          <summary><span>Standard languages</span></summary>
          <div class="rules-sub-body hint" style="line-height:1.6;">
            <strong style="color:var(--text);">Standard:</strong> Common, Dwarvish, Elvish, Giant, Gnomish, Goblin, Halfling, Orc.<br>
            <strong style="color:var(--text);">Exotic:</strong> Abyssal, Celestial, Deep Speech, Draconic, Infernal, Primordial, Sylvan, Undercommon.
          </div>
        </details>
      </div>
    </details>
  `;
}

function renderEncounterBuildingSection(){
  const xpRows = XP_THRESHOLDS_BY_LEVEL.map(r=>`<div class="ref-row"><span class="ref-key">Lv ${r.level}</span><span class="ref-val">${r.easy.toLocaleString()} easy · ${r.medium.toLocaleString()} medium · ${r.hard.toLocaleString()} hard · ${r.deadly.toLocaleString()} deadly</span></div>`).join('');
  const crRows = CR_TO_XP.map(r=>`<div class="ref-row"><span class="ref-key">CR ${r.cr}</span><span class="ref-val">${r.xp} XP</span></div>`).join('');
  const multRows = ENCOUNTER_MULTIPLIERS.map(m=>`<div class="ref-row"><span class="ref-key">${m.monsters}</span><span class="ref-val">${m.mult} total monster XP</span></div>`).join('');
  return `
    <details class="rules-section">
      <summary><span>Encounter Building</span></summary>
      <div class="rules-body">
        <div class="hint" style="margin-bottom:8px;">The DMG's XP-budget method for gauging encounter difficulty. Add up each PC's threshold for the target difficulty, then compare that to the monsters' adjusted XP — their combined XP times the multiplier below for how many there are.</div>
        <details class="rules-sub" open>
          <summary><span>XP thresholds by character level</span></summary>
          <div class="rules-sub-body"><div class="ref-table">${xpRows}</div></div>
        </details>
        <details class="rules-sub">
          <summary><span>XP by challenge rating</span></summary>
          <div class="rules-sub-body"><div class="ref-table">${crRows}</div></div>
        </details>
        <details class="rules-sub">
          <summary><span>Multiple-monster multiplier</span></summary>
          <div class="rules-sub-body">
            <div class="ref-table">${multRows}</div>
            <div class="hint" style="margin-top:6px;">Shift one bracket up (more dangerous) if the party has fewer than 3 characters, or one bracket down if it has 6 or more.</div>
          </div>
        </details>
      </div>
    </details>
  `;
}

function renderSpellsByClassSection(){
  const classes = state.srdClasses||[];
  const spells = state.srdSpellIndex||[];
  const classMap = state.spellClassMap||{};
  const blocks = classes.map(cls=>{
    if(!cls.spellAbility){
      return `
        <details class="rules-sub">
          <summary><span>${escapeHtml(cls.name)}</span></summary>
          <div class="rules-sub-body"><div class="hint">${escapeHtml(SPELL_NONCASTER_NOTE[cls.index] || 'No spellcasting.')}</div></div>
        </details>`;
    }
    const classSpells = spells.filter(s=> (classMap[s.index]||[]).includes(cls.index));
    const byLevel = {};
    classSpells.forEach(s=>{ (byLevel[s.level] = byLevel[s.level]||[]).push(s); });
    const levelBlocks = Object.keys(byLevel).map(Number).sort((a,b)=>a-b).map(lvl=>{
      const list = byLevel[lvl].slice().sort((a,b)=>a.name.localeCompare(b.name));
      const items = list.map(s=>{
        const meta = spellStatLine(s);
        const higher = s.higherLevel ? `<div style="margin-top:6px;"><em>At Higher Levels.</em> ${escapeHtml(s.higherLevel)}</div>` : '';
        return `<details class="spell-ref-item">
          <summary><span class="spell-ref-name">${escapeHtml(s.name)}</span><span class="spell-ref-meta">${escapeHtml(s.school)}${meta?' · '+escapeHtml(meta):''}</span></summary>
          <div class="spell-ref-item-body">${escapeHtml(s.desc||'')}${higher}</div>
        </details>`;
      }).join('');
      const label = lvl===0 ? 'Cantrips' : `Level ${lvl}`;
      return `<div class="spell-ref-level"><div class="spell-ref-level-label">${label} (${list.length})</div>${items}</div>`;
    }).join('');
    return `
      <details class="rules-sub">
        <summary><span>${escapeHtml(cls.name)}</span><span class="hint" style="margin:0;">${classSpells.length} spells · ${escapeHtml(SPELL_ABILITY_LABELS[cls.spellAbility]||cls.spellAbility)} casting</span></summary>
        <div class="rules-sub-body">${levelBlocks}</div>
      </details>`;
  }).join('');
  return `
    <details class="rules-section">
      <summary><span>Spells by Class</span></summary>
      <div class="rules-body">
        <div class="hint" style="margin-bottom:8px;">Every spell in the embedded SRD library, grouped by class spell list and level. Third-caster subclasses (Eldritch Knight, Arcane Trickster) pull from the Wizard list, noted under Fighter/Rogue below.</div>
        ${blocks}
      </div>
    </details>
  `;
}

function renderWeaponsSection(){
  const byIndex = {};
  (state.srdEquipmentIndex||[]).forEach(e=>{ byIndex[e.index] = e; });
  const blocks = Object.keys(WEAPON_CATEGORIES).map(cat=>{
    const rows = WEAPON_CATEGORIES[cat].map(idx=>byIndex[idx]).filter(Boolean).map(w=>`
      <div class="equip-ref-row">
        <span class="equip-ref-name">${escapeHtml(w.name)}</span>
        <span class="equip-ref-detail">${escapeHtml((w.summary||'').replace(/^Weapon\s*·\s*/,''))}</span>
        <span class="equip-ref-cost">${escapeHtml(w.cost)} · ${escapeHtml(w.weight)}</span>
      </div>`).join('');
    return `
      <details class="rules-sub">
        <summary><span>${cat}</span><span class="hint" style="margin:0;">${WEAPON_CATEGORIES[cat].length} weapons</span></summary>
        <div class="rules-sub-body">${rows}</div>
      </details>`;
  }).join('');
  return `
    <details class="rules-section">
      <summary><span>Weapons</span></summary>
      <div class="rules-body">
        <div class="hint" style="margin-bottom:8px;">Damage die, damage type, and properties for every SRD weapon, split into the four proficiency categories.</div>
        ${blocks}
      </div>
    </details>
  `;
}

function renderArmorSection(){
  const byIndex = {};
  (state.srdEquipmentIndex||[]).forEach(e=>{ byIndex[e.index] = e; });
  const blocks = Object.keys(ARMOR_CATEGORIES).map(cat=>{
    const rows = ARMOR_CATEGORIES[cat].map(idx=>byIndex[idx]).filter(Boolean).map(a=>{
      const strMin = ARMOR_STR_MIN[a.index];
      const stealthDisadv = ARMOR_STEALTH_DISADV.has(a.index);
      const notes = [];
      if(strMin) notes.push(`Str ${strMin} req.`);
      if(stealthDisadv) notes.push('Stealth disadv.');
      return `
      <div class="equip-ref-row">
        <span class="equip-ref-name">${escapeHtml(a.name)}</span>
        <span class="equip-ref-detail">${escapeHtml((a.summary||'').replace(/^Armor\s*·\s*/,''))}${notes.length?' · '+notes.join(', '):''}</span>
        <span class="equip-ref-cost">${escapeHtml(a.cost)} · ${escapeHtml(a.weight)}</span>
      </div>`;
    }).join('');
    return `
      <details class="rules-sub">
        <summary><span>${cat}</span><span class="hint" style="margin:0;">${ARMOR_CATEGORIES[cat].length} items</span></summary>
        <div class="rules-sub-body">${rows}</div>
      </details>`;
  }).join('');
  return `
    <details class="rules-section">
      <summary><span>Armor</span></summary>
      <div class="rules-body">
        <div class="hint" style="margin-bottom:8px;">Base AC formula, cost, and weight for every SRD armor type. Strength requirements and Stealth disadvantage are standard PHB values, included for convenience.</div>
        ${blocks}
      </div>
    </details>
  `;
}

function renderConditionsRefSection(){
  const rows = (state.srdConditions||[]).map(c=>`
    <details class="rules-sub">
      <summary><span>${escapeHtml(c.name)}</span></summary>
      <div class="rules-sub-body"><div class="hint" style="line-height:1.5;">${escapeHtml(c.desc)}</div></div>
    </details>`).join('');
  return `
    <details class="rules-section">
      <summary><span>Conditions</span></summary>
      <div class="rules-body">
        ${rows}
      </div>
    </details>
  `;
}

function renderFeatsRefSection(){
  const rows = FEATS.map(f=>{
    let tag = '';
    if(f.bonuses) tag = summarizeItemBonuses(f.bonuses);
    if(f.abilityChoice){
      const opts = f.abilityChoice.options.map(o=>o.toUpperCase()).join('/');
      const piece = `+${f.abilityChoice.amount} ${opts}${f.abilityChoice.grantsSaveProf ? ' (+ save proficiency)' : ''}`;
      tag = tag ? `${tag} · ${piece}` : piece;
    }
    if(f.hpPerLevel){
      const piece = `+${f.hpPerLevel} max HP now, and again each level`;
      tag = tag ? `${tag} · ${piece}` : piece;
    }
    return `
    <details class="rules-sub">
      <summary><span>${escapeHtml(f.name)}</span>${tag ? `<span class="hint" style="margin:0;">${escapeHtml(tag)}</span>` : ''}</summary>
      <div class="rules-sub-body"><div class="hint" style="line-height:1.5;">${escapeHtml(f.desc)}</div></div>
    </details>`;
  }).join('');
  return `
    <details class="rules-section">
      <summary><span>Feats</span><span class="hint" style="margin:0;">${FEATS.length} curated PHB feats</span></summary>
      <div class="rules-body">
        <div class="hint" style="margin-bottom:8px;">The full list built into the tracker's "Add feat" picker on each character's Ability Scores card, for quick browsing without having to search one at a time. Half-feats (ability-score bump) and always-on bonuses are tagged next to the name; everything else is a flavor/mechanical effect the table adjudicates directly. Homebrew feats are always an option too, from the same picker.</div>
        ${rows}
      </div>
    </details>
  `;
}

function renderRules(){
  return `
    <div class="card">
      <h3>📖 Rules Reference</h3>
      <div class="hint" style="margin-bottom:10px;">Pulled from the same embedded SRD data used everywhere else in this tool — no network needed. Click a section to expand it; open as many at once as you like.</div>
      ${renderAbilityRefSection()}
      ${renderFeatsRefSection()}
      ${renderCombatBasicsSection()}
      ${renderExplorationSection()}
      ${renderEncounterBuildingSection()}
      ${renderSpellcastingBasicsSection()}
      ${renderSpellsByClassSection()}
      ${renderWeaponsSection()}
      ${renderArmorSection()}
      ${renderConditionsRefSection()}
    </div>
  `;
}

