# D&D Campaign Tracker — Project Context

Single-file HTML app (vanilla JS, no runtime dependencies, embedded SRD
data) that tracks a D&D 5e campaign for a casual home group. Logan plays/
facilitates rather than DMs. The tracker owns all exact numbers (HP, gold,
spell slots, XP, initiative); a separate AI DM chat handles narrative/
adjudication and syncs via JSON export at checkpoints.

Source now lives in this repo (migrated from a claude.ai project) as a
**split source tree that builds to a single file** — see
[dnd-tracker-source/README.md](dnd-tracker-source/README.md) for the exact
layout. Ground truth is `dnd-tracker-source/dist/dnd-campaign-tracker.html`
(the generated file actually opened at the table) or, better, the source
files under `js/`/`css`/`data`/`shell.html` that generate it — never a
summary doc. Regenerate summaries from the source, never the reverse.

## Repo layout

```
LICENSE
dnd-tracker-source/
  README.md        Source-layout details and the build rule.
  shell.html        HTML page structure + placeholder tokens.
  css/styles.css     App styling.
  data/*.json        Embedded SRD data (monsters, spells, equipment, etc.)
  js/00-17-*.js       App logic, numbered for concatenation order. NOT ES
                      modules — one shared-scope IIFE split across files.
                      Files 00- and 17- won't pass a standalone syntax
                      check (they hold the wrapper's open/close) — expected.
  build.js            Zero-dependency Node script: js/ + css/ + data/ +
                      shell.html -> dist/dnd-campaign-tracker.html.
  dist/dnd-campaign-tracker.html   Generated. Committed intentionally so
                      anyone can grab the one file without cloning/building.
```

**Never hand-edit `dist/dnd-campaign-tracker.html`.** Edit the source
under `js/`, `css/`, `data/`, or `shell.html`, then run `node build.js`
from `dnd-tracker-source/` to regenerate. If dist and source ever
disagree, source is real — regenerate, don't patch the output by hand.

## Design philosophy

- Casual over rules-precise. Default to the simpler/more permissive ruling.
- Always give a homebrew/custom escape hatch — never a dead end.
- Be upfront about SRD coverage gaps rather than overstating them.
- Keep the table fun, not grimdark — no gratuitous character death.
- Avoid or explain D&D jargon (e.g. "difficulty rating" not "CR").
- Maximum automation — no mental math needed at the table.

## Current state (update this section as features land)

Major systems implemented (verified against source as of the GitHub
migration, 2026-08-03):

- **Characters**: full sheets, death saves, concentration tracking (War
  Caster), all 18 skills w/ proficiency + passive scores, background/
  alignment/languages, encumbrance, feat/ASI system, Tasha's free-assign
  ability score variant (+2/+1 to any two)
- **Spells**: class-filtered search, damage/save/AoE/upcast info, item-
  granted (🔮) and feat-granted (⭐) spells, at-will support, per-source use
  tracking + recharge
- **Combat**: persistent round/turn bar, 19-monster SRD library + custom
  stat blocks, batch spawn w/ numbered duplicates, initiative rolling,
  legendary/lair actions, enemy recharge, attack targeting vs. AC, auto-
  rolled saves (full math for PCs, generic bonus for NPCs), temp HP
  absorption, death auto-advance, dead/fled enemy skipping
- **Party tools**: long/short rest, XP award + level-up detection, shared
  inventory w/ give-to-character, NPC/ally roster, session log/recap
- **DM reference**: Rules Reference tab — spells, skills, DC ladder, combat
  actions, DMG XP thresholds, CR-to-XP, multiplier table
- **AI integration**: JSON import for enemy stat blocks w/ copy-prompt
  button, `SCHEMA_DOC` / `ENEMY_IMPORT_SCHEMA_DOC` for AI-DM export
- **Autosave**: `js/08-autosave-and-confirm.js` — debounced save 1.5s
  after the last change, flushed immediately on `visibilitychange`/
  `pagehide`. This used to be the #1 open gap; it's done.
- **Destructive-action confirm**: click-to-arm pattern (first click arms,
  second click within 4s confirms) covering `remove-char`, `remove-enemy`,
  `delete-snap` — used instead of `window.confirm()` (see Environment
  notes below for why).
- **Mobile**: viewport meta tag present, several `@media` breakpoints in
  `css/styles.css` (700px, 460px) — more than "minimal," though not
  audited for full usability.

### Known gaps (priority order)

1. Currency is flat gold, no denomination breakdown (cp/sp/ep/gp/pp).
2. No global party-wide search (the only search present is SRD equipment
   search when adding inventory items).
3. No multiclassing support.
4. No gold-splitting/transfer mechanic between party members.
5. Mobile CSS exists but hasn't been walked through on an actual small
   screen — treat as "should verify," not "known broken."

## Environment notes

- **Artifact-sandbox-specific origin, no longer the active constraint**: in
  the old claude.ai artifact iframe, `window.confirm()`/`window.prompt()`
  were silently blocked, which is why the app uses the custom click-to-arm
  confirm UI instead of native dialogs. That constraint doesn't apply in a
  normal browser or in Claude Code's environment, but keep the custom
  inline UI as-is regardless — it's better UX and works consistently
  everywhere. Don't "fix" this back to native dialogs.
- Now that this lives in a normal git clone, the old note about
  `raw.githubusercontent.com`/API fetches being unreliable from a
  sandboxed tool environment no longer applies — normal git/network access
  works.

## Working conventions

- This is a real git repo now (`gh`-based PR workflow) — work on a
  feature branch, never commit straight to `main`.
- Edit the split source under `js/`, `css/`, `data/`, `shell.html` — not
  `dist/dnd-campaign-tracker.html`. Run `node build.js` from
  `dnd-tracker-source/` before testing or committing, so `dist/` stays in
  sync with source.
- Validation sequence before opening a PR: `node --check` on each touched
  `js/*.js` file is unreliable for `00-`/`17-` (see Repo layout — they're
  fragments of a shared IIFE, not standalone) — instead check syntax on
  the *built* `dist/dnd-campaign-tracker.html`'s script contents, or run a
  jsdom/Node functional smoke test against the built file simulating real
  interactions, then ship.
- In jsdom tests, re-query DOM elements fresh after each `render()` call —
  `render()` replaces `innerHTML`, so cached references go stale.
- Every new field/schema change needs a backward-compatibility guard +
  lazy migration on load/import, following the existing
  `normalizeCampaign` / `ensureCombatFields` / `ensureItemBonuses` pattern.
  Never break existing saved campaigns.
- Keep `SCHEMA_DOC` and `ENEMY_IMPORT_SCHEMA_DOC` in sync with any schema
  change — the AI-DM chat depends on these strings for export
  compatibility.
- SRD data lives in `data/srd-bundle.json` / `data/srd-spell-classes.json`
  now (previously embedded `<script>` tags in the single file) — query
  those directly rather than regexing HTML.
- Native HTML elements (`<details>`/`<summary>` accordions, etc.) over
  custom JS widgets or external dependencies where possible.

## Key learnings from past sessions

- The handoff doc fell far behind the actual build more than once —
  always regenerate it from the source itself before starting new work,
  not from a prior summary. (This doc was itself corrected against source
  on 2026-08-03: autosave and destructive-action confirm were already
  built despite an older doc listing them as open gaps.)
- Headless smoke tests that simulate actual user interactions catch real
  bugs that syntax checks miss (examples hit in practice: a legendary-
  actions re-render miss, a `Math.random` realm mismatch, apostrophe-
  escaping bugs in template literals).

## On the horizon

- Currency denominations, global party search, multiclassing, gold
  transfer — pick from Known gaps above based on what's most annoying at
  the table.
- Mobile usability pass now that viewport/breakpoints exist but are
  unverified in practice.
- AI-DM chat prompt / custom instructions not yet written.
