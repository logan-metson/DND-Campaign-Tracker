// Loads the app's source for testing, two different ways depending on what a test needs to do:
//
//   - loadFlattenedApp(): strips the outer `(function(){ ... })();` wrapper (js/00's open, js/17's
//     close) and skips the two auto-init calls, so every internal function/const becomes directly
//     callable from test code — e.g. dom.window.computeInitiativeOrder(campaign). Everything in
//     source normally lives in one closure (see dnd-tracker-source/README.md — "single shared scope,
//     not modules"), which is exactly what build.js relies on and exactly what makes it untestable
//     from outside without this. Use this for unit tests of pure logic functions.
//
//   - loadBuiltDist(): loads the real, unmodified dist/dnd-campaign-tracker.html — the literal file
//     users open at the table, wrapper and auto-init included — for black-box DOM smoke tests that
//     click buttons and read rendered output, the same way a person would.
//
// Both return a jsdom `window`. Neither calls node build.js — loadBuiltDist reads the already-built
// dist file (run `npm run build` first if you've changed source), so a stale dist file makes the
// smoke test fail loudly rather than silently testing old code.
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const ROOT = path.join(__dirname, '..', '..');
const JS_DIR = path.join(ROOT, 'js');
const DIST_FILE = path.join(ROOT, 'dist', 'dnd-campaign-tracker.html');

const WRAPPER_OPEN = '(function(){';
const WRAPPER_CLOSE_TAIL = /\s*loadInitial\(\);\s*loadSrdBundle\(\);\s*\}\)\(\);\s*$/;

function buildFlatSource() {
  const files = fs.readdirSync(JS_DIR).filter(f => f.endsWith('.js')).sort();
  const combined = files.map(f => fs.readFileSync(path.join(JS_DIR, f), 'utf-8')).join('');

  if (!combined.includes(WRAPPER_OPEN)) {
    throw new Error(`loadApp helper: expected to find "${WRAPPER_OPEN}" in js/00-*.js — did the IIFE wrapper change? Update WRAPPER_OPEN in test/helpers/loadApp.js.`);
  }
  if (!WRAPPER_CLOSE_TAIL.test(combined)) {
    throw new Error('loadApp helper: expected js/17-*.js to end with "loadInitial(); loadSrdBundle(); })();" — did the init sequence change? Update WRAPPER_CLOSE_TAIL in test/helpers/loadApp.js.');
  }

  return combined.replace(WRAPPER_OPEN, '').replace(WRAPPER_CLOSE_TAIL, '');
}

function loadFlattenedApp() {
  const dom = new JSDOM('<!doctype html><html><body><div id="app"></div></body></html>', {
    url: 'http://localhost/',
    runScripts: 'dangerously',
  });
  dom.window.eval(buildFlatSource());
  return dom.window;
}

function loadBuiltDist() {
  if (!fs.existsSync(DIST_FILE)) {
    throw new Error(`loadApp helper: ${DIST_FILE} doesn't exist — run "npm run build" first.`);
  }
  const html = fs.readFileSync(DIST_FILE, 'utf-8');
  const dom = new JSDOM(html, {
    url: 'http://localhost/',
    runScripts: 'dangerously',
    pretendToBeVisual: true,
  });
  return dom.window;
}

module.exports = { loadFlattenedApp, loadBuiltDist, buildFlatSource };
