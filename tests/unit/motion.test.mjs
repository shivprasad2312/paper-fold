// Unit tests — reduced motion (Phase H, ADR-046).
//
// The mode is a presentation switch, and its one hard promise is that it
// NEVER touches a gameplay clock: every sentinel window, shuttle dwell,
// freeze duration and par in the game is verified against those numbers, and
// a setting that shortened a roll would silently invalidate every timing
// proof in the catalogue. These tests pin the policy and the promise.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  MOTION,
  normaliseMotionPref,
  resolveReducedMotion,
  motionLabel,
  nextMotionPref,
} from '../../src/motion.js';
import { ROLL_TIME, FREEZE_TIME, WIND_PERIOD, TIMING_FLOOR } from '../../src/rules.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const read = (p) => readFileSync(join(ROOT, p), 'utf8');

// --- the policy -----------------------------------------------------------

test('motion: the preference cycle is auto → reduced → full → auto', () => {
  assert.equal(nextMotionPref(MOTION.AUTO), MOTION.REDUCED);
  assert.equal(nextMotionPref(MOTION.REDUCED), MOTION.FULL);
  assert.equal(nextMotionPref(MOTION.FULL), MOTION.AUTO);
  // a corrupted save reads as auto, and the cycle still works
  assert.equal(nextMotionPref('sideways'), MOTION.REDUCED);
});

test('motion: auto follows the OS, an explicit choice never does', () => {
  assert.equal(resolveReducedMotion(MOTION.AUTO, true), true);
  assert.equal(resolveReducedMotion(MOTION.AUTO, false), false);
  // the whole point of an explicit override is that it wins both ways
  assert.equal(resolveReducedMotion(MOTION.REDUCED, false), true);
  assert.equal(resolveReducedMotion(MOTION.FULL, true), false);
});

test('motion: unknown stored values normalise to auto', () => {
  for (const bad of [undefined, null, '', 'reduce', 'motionless', 0, 1, {}, []]) {
    assert.equal(normaliseMotionPref(bad), MOTION.AUTO, `normalise(${JSON.stringify(bad)})`);
  }
  for (const ok of Object.values(MOTION)) assert.equal(normaliseMotionPref(ok), ok);
});

test('motion: the menu label reports what auto currently resolves to', () => {
  assert.equal(motionLabel(MOTION.AUTO, true), 'Motion: Auto (reduced)');
  assert.equal(motionLabel(MOTION.AUTO, false), 'Motion: Auto (full)');
  assert.equal(motionLabel(MOTION.REDUCED, false), 'Motion: Reduced');
  assert.equal(motionLabel(MOTION.FULL, true), 'Motion: Full');
});

// --- the promise ----------------------------------------------------------
// These read the SOURCE, not the running game: the failure mode this guards
// is someone later "optimising" the animation by scaling a duration, which
// would pass every gameplay test and quietly desync the timing model.

test('motion: the gameplay clocks are still the documented constants', () => {
  assert.equal(ROLL_TIME, 0.243);
  assert.equal(FREEZE_TIME, 3.2);
  assert.equal(WIND_PERIOD, 0.62);
  assert.equal(TIMING_FLOOR, 0.5);
});

test('motion: no animation duration is ever scaled by the motion mode', () => {
  const files = readdirSync(join(ROOT, 'src')).filter((f) => f.endsWith('.js'));
  const offenders = [];
  for (const f of files) {
    const src = read(join('src', f));
    // 1. a `dur:` field that consults the mode is the bug: roll/roll-like
    //    animations are timed by the rules, and the verifier's sentinel
    //    windows are computed from those same numbers
    for (const m of src.matchAll(/dur:\s*([^,\n]+)/g)) {
      if (/reduceMotion/.test(m[1])) offenders.push(`${f}: dur uses reduceMotion → ${m[1]}`);
    }
    // 2. the timing constants are declared once, in rules.js, and never
    //    reassigned anywhere (no `ROLL_TIME *= ...` "speed-up")
    const CLOCKS = 'ROLL_TIME|FREEZE_TIME|WIND_PERIOD|TIMING_FLOOR';
    for (const m of src.matchAll(new RegExp(`(^|[^.\\w])(${CLOCKS})\\s*(?:[*/+-]=|=)(?!=)`, 'g'))) {
      const beforeName = src.slice(0, m.index + m[1].length);
      if (!/export\s+const\s+$/.test(beforeName)) offenders.push(`${f}: gameplay clock reassigned → ${m[2]}`);
    }
    // and each is declared exactly once, in rules.js
    if (f === 'rules.js') {
      const n = [...src.matchAll(new RegExp(`export const (${CLOCKS}) = [0-9.]+;`, 'g'))].length;
      assert.equal(n, 4, `rules.js should declare the four clocks once each (got ${n})`);
    }
  }
  assert.deepEqual(offenders, [], offenders.join('\n'));
});

test('motion: the stage owns the camera side, the view owns the idle side', () => {
  // the split is the design: if a future edit puts camera glide inside the
  // view, or the world's bob inside the stage, one of these fails and the
  // author has to come back and read ADR-046
  const stage = read('src/stage.js');
  const view = read('src/levelView.js');
  assert.match(stage, /setReducedMotion\(/);
  assert.match(stage, /if \(this\.reduceMotion\) return; \/\/ ADR-046: no screen shake/);
  assert.match(view, /setReducedMotion\(/);
  // haze both doors onto the CSS: system and in-game
  const css = read('src/style.css');
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)/);
  assert.match(css, /body\.reduce-motion/);
  assert.match(css, /transition-duration: 0\.01ms !important/);
});

test('motion: the save stores the preference and sanitises it', () => {
  const save = read('src/save.js');
  assert.match(save, /motion: 'auto'/);
  assert.match(save, /motion: normaliseMotionPref\(data\.motion\)/);
});
