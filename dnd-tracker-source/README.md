# D&D Campaign Tracker — source

This is the source layout for the campaign tracker. **The single file your
group actually opens at the table is `dist/dnd-campaign-tracker.html`** —
that stays a self-contained file with zero build step and zero runtime
network dependency, exactly as before. Splitting the source into files only
changes how *editing* works, not how *playing* works.

## Layout

```
shell.html        The HTML page structure — markup only, no embedded logic.
                   Contains four placeholder tokens that build.js fills in.
css/
  styles.css       All app styling (the parchment/brass/moss theme).
data/
  srd-bundle.json          Embedded SRD data: spells, equipment, monsters,
                            conditions, classes, races.
  srd-spell-classes.json   Which classes can learn/prepare each spell.
js/
  00-17 *.js       The app logic, split at its existing natural section
                   boundaries (storage, schema, state, persistence, one file
                   per tab's render logic, event handling). Numbered so the
                   build concatenates them in the right order.
build.js           Zero-dependency Node script. Reads everything above and
                   reassembles the single dist HTML.
dist/
  dnd-campaign-tracker.html   The generated file — this is what you open at
                              the table, and what gets shared/played with.
```

## Why the files are plain concatenated fragments, not ES modules

The whole app runs inside one `(function(){ ... })();` wrapper sharing a
single scope — that's what lets every function reach `state` and every
helper without imports. The split preserves that: `build.js` just
concatenates the numbered `js/*.js` files back into one script block in
order, byte-for-byte equivalent to gluing them together. There's no
`import`/`export` anywhere, and files `00-` and `17-` won't pass a syntax
check on their own — they hold the wrapper's opening `(function(){` and
closing `})();` respectively, which only balance once every file is
concatenated. That's expected, not a bug.

## Building

```
node build.js
```

Produces `dist/dnd-campaign-tracker.html`. No npm install, no packages,
no config — `build.js` only uses Node's built-in `fs`/`path` modules.

## The rule

**Never hand-edit `dist/dnd-campaign-tracker.html` directly.** It's a
generated artifact, like a compiled binary — edit the source files under
`js/`, `css/`, `data/`, or `shell.html`, then re-run `node build.js`.
If the dist file and the source ever disagree, the source is what's real;
regenerate, don't patch the output by hand.

`dist/dnd-campaign-tracker.html` is committed to the repo (unusual for a
build artifact, but intentional here) — the point is that anyone at the
table can download or open that one file directly, without cloning the
repo or running anything.
