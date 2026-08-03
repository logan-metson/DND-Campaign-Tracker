#!/usr/bin/env node
/**
 * build.js — assembles the split source files back into the single
 * self-contained HTML file used at the table.
 *
 * No npm dependencies, no bundler, no transpilation. This does exactly
 * one thing: read the shell + resources, concatenate the JS files in
 * order, and string-replace them into the shell's placeholder slots.
 *
 * Usage:  node build.js
 * Output: dist/dnd-campaign-tracker.html
 */
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const JS_DIR = path.join(ROOT, 'js');
const DATA_DIR = path.join(ROOT, 'data');
const CSS_DIR = path.join(ROOT, 'css');
const OUT_DIR = path.join(ROOT, 'dist');
const OUT_FILE = path.join(OUT_DIR, 'dnd-campaign-tracker.html');

function readFile(p) {
  return fs.readFileSync(p, 'utf-8');
}

// Concatenate every js/*.js file in filename order (the leading NN- prefix
// controls load order — this is the only thing that matters, since the
// whole app is one shared-scope IIFE, not ES modules).
function buildAppJs() {
  const files = fs.readdirSync(JS_DIR)
    .filter(f => f.endsWith('.js'))
    .sort(); // "00-", "01-", ... sorts correctly as plain strings
  if (files.length === 0) throw new Error('No JS files found in js/');
  return files.map(f => readFile(path.join(JS_DIR, f))).join('');
}

function main() {
  const shell = readFile(path.join(ROOT, 'shell.html'));
  const stylesCss = readFile(path.join(CSS_DIR, 'styles.css'));
  const srdBundleJson = readFile(path.join(DATA_DIR, 'srd-bundle.json'));
  const srdSpellClassesJson = readFile(path.join(DATA_DIR, 'srd-spell-classes.json'));
  const appJs = buildAppJs();

  // Plain split/join instead of regex replace — avoids '$'-pattern footguns
  // from JSON/JS content that happens to contain replacement-string syntax.
  let out = shell;
  out = out.split('__STYLES_CSS__').join(stylesCss);
  out = out.split('__SRD_BUNDLE_JSON__').join(srdBundleJson);
  out = out.split('__SRD_SPELL_CLASSES_JSON__').join(srdSpellClassesJson);
  out = out.split('__APP_JS__').join(appJs);

  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(OUT_FILE, out, 'utf-8');
  console.log(`Built ${OUT_FILE} (${out.length} bytes)`);
}

main();
