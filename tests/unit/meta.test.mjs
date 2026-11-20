// Unit tests — the mastery meta (Phase E, ADR-043).
//
// Four things ship here and each one is arithmetic with a rule behind it:
//   - the three-notch grade (CLEAR / SWIFT / FLAWLESS) and its monotone save
//   - the daily streak (consecutive days, with today's grace period)
//   - the Vault's shard ladder (ten rooms, 60 shards each)
//   - the Vault itself: ten proved rooms outside the campaign, each built
//     around one headline mechanic
import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  GRADE, GRADE_LABEL, gradeFor, betterGrade, savedGrade,
  streakInfo, dateKey, parseKey, totalShardsCollected, vaultUnlockedCount,
  vaultProgress, VAULT_SHARD_STEP,
} from '../../src/meta.js';
import { LEVELS, VAULT_LEVELS, ALL_LEVELS } from '../../src/levels.js';
import { VAULT_PAR_BAND } from '../../src/vault.js';
import { parseLevel, shortestRoute } from '../../src/rules.js';
import { mechanicSignature, MECH_CAP } from '../../scripts/experience.mjs';
import { loadSave, recordWin } from '../../src/save.js';

// ------------------------------------------------------------------ grade --

test('meta: grade is par + shards + deathless, in that order', () => {
  assert.equal(gradeFor({ moves: 30, par: 24, shards: 4, total: 4, deaths: 0 }), GRADE.clear);
  assert.equal(gradeFor({ moves: 24, par: 24, shards: 2, total: 4, deaths: 0 }), GRADE.swift);
  assert.equal(gradeFor({ moves: 24, par: 24, shards: 4, total: 4, deaths: 2 }), GRADE.swift);
  assert.equal(gradeFor({ moves: 24, par: 24, shards: 4, total: 4, deaths: 0 }), GRADE.flawless);
  // a run that is slower than par can never be FLAWLESS, however clean
  assert.equal(gradeFor({ moves: 25, par: 24, shards: 4, total: 4, deaths: 0 }), GRADE.clear);
});

test('meta: a level with no shards cannot be FLAWLESS (nothing was collected)', () => {
  assert.equal(gradeFor({ moves: 10, par: 10, shards: 0, total: 0, deaths: 0 }), GRADE.swift);
});

test('meta: grades are monotone and corrupt saves read as no grade', () => {
  assert.equal(betterGrade(GRADE.swift, GRADE.flawless), GRADE.flawless);
  assert.equal(betterGrade(GRADE.flawless, GRADE.clear), GRADE.flawless);
  assert.equal(betterGrade(undefined, GRADE.clear), GRADE.clear);
  assert.equal(savedGrade({ grade: 3 }), 3);
  assert.equal(savedGrade({ grade: 99 }), 0, 'out-of-range save data must not paint three notches');
  assert.equal(savedGrade(undefined), 0);
  assert.equal(GRADE_LABEL[GRADE.flawless], 'FLAWLESS');
});

test('meta: a better grade survives a later sloppy win', () => {
  // recordWin writes through localStorage; the sandbox has none, and save.js
  // swallows that by design — so this exercises the merge, not the storage
  const data = { best: {}, ghosts: {}, daily: {} };
  recordWin(data, 7, 20, 4, 20, { par: 20, total: 4, deaths: 0 });
  assert.equal(data.best[7].grade, GRADE.flawless);
  recordWin(data, 7, 60, 1, 40, { par: 20, total: 4, deaths: 3 });
  assert.equal(data.best[7].grade, GRADE.flawless, 'a bad run must not erase the seal');
  assert.equal(data.best[7].shards, 4);
});

// ----------------------------------------------------------------- streak --

const day = (y, m, d) => new Date(y, m - 1, d);

test('meta: a streak counts consecutive days and survives an unplayed today', () => {
  const daily = {};
  for (const d of [day(2026, 10, 18), day(2026, 10, 19), day(2026, 10, 20)]) daily[dateKey(d)] = { time: 9 };

  // today (the 21st) is still open: the streak reads 3, not 0
  assert.deepEqual(
    (({ current, best, playedToday, next }) => ({ current, best, playedToday, next }))(streakInfo(daily, day(2026, 10, 21))),
    { current: 3, best: 3, playedToday: false, next: 4 },
  );
  // play today and it extends
  daily['2026-10-21'] = { time: 8 };
  assert.equal(streakInfo(daily, day(2026, 10, 21)).current, 4);
  // a whole missed day breaks it
  assert.equal(streakInfo(daily, day(2026, 10, 23)).current, 0);
  // ...but the best is history and stays
  assert.equal(streakInfo(daily, day(2026, 10, 23)).best, 4);
});

test('meta: seven consecutive days is a perfect week', () => {
  const daily = {};
  for (let i = 0; i < 7; i++) daily[dateKey(day(2026, 10, 17 + i))] = { time: 9 };
  const s = streakInfo(daily, day(2026, 10, 23));
  assert.equal(s.current, 7);
  assert.equal(s.perfectWeek, true);

  const six = { ...daily };
  delete six['2026-10-23'];
  assert.equal(streakInfo(six, day(2026, 10, 23)).perfectWeek, false);
  assert.deepEqual(streakInfo({}, day(2026, 10, 23)), {
    current: 0, best: 0, perfectWeek: false, playedToday: false, next: 1,
  });
});

test('meta: date keys round-trip locally and reject nonsense', () => {
  assert.equal(dateKey(day(2026, 1, 5)), '2026-01-05');
  assert.equal(dateKey(parseKey('2026-01-05')), '2026-01-05');
  assert.equal(parseKey('2026-02-30'), null, 'an impossible date is not a played day');
  assert.equal(parseKey('not-a-date'), null);
});

// ------------------------------------------------------------------ vault --

test('meta: the Vault opens one room per 60 total shards', () => {
  assert.equal(VAULT_SHARD_STEP, 60);
  const best = { 1: { shards: 4 }, 2: { shards: 3 }, 3: { shards: 4 } };
  assert.equal(totalShardsCollected(best), 11);
  assert.equal(vaultUnlockedCount(best, 59), 0);
  assert.equal(vaultUnlockedCount(best, 60), 1);
  assert.equal(vaultUnlockedCount(best, 600), 10);
  assert.equal(vaultUnlockedCount({}, 660), 11, 'the count is not capped here — the UI caps it');

  assert.deepEqual(vaultProgress({}, 10, 340), {
    shards: 340, open: 5, maxRooms: 10, nextAt: 360, toNext: 20,
  });
  // every room open: no "next" to advertise
  assert.deepEqual(vaultProgress({}, 10, 700), {
    shards: 700, open: 10, maxRooms: 10, nextAt: null, toNext: 0,
  });
});

// -------------------------------------------------------------- the rooms --

const HEADLINE = {
  201: (d) => (d.lifts || []).length > 0,
  202: (d) => (d.shrink || []).length > 0,
  203: (d) => (d.pistons || []).length > 0,
  204: (d) => (d.turntables || []).length > 0,
  205: (d) => (d.clings || []).length > 0,
  206: (d) => (d.sliders || []).length > 0,
  207: (d) => !!d.wind,
  208: (d) => (d.doors || []).length > 0,
  209: (d) => (d.freeze || []).length > 0,
  210: (d) => (d.shuttles || []).length > 0,
};

test('vault: ten rooms, ids 201–210, outside the campaign order', () => {
  assert.equal(VAULT_LEVELS.length, 10);
  assert.deepEqual(VAULT_LEVELS.map((d) => d.id), [201, 202, 203, 204, 205, 206, 207, 208, 209, 210]);
  assert.equal(LEVELS.length, 200, 'the campaign stays exactly 200');
  assert.equal(ALL_LEVELS.length, 210);
  assert.equal(ALL_LEVELS[200].id, 201, 'the Vault follows the campaign in play order');
});

test('vault: ids and names are unique across the whole game', () => {
  const ids = ALL_LEVELS.map((d) => d.id);
  assert.equal(new Set(ids).size, ids.length);
  const names = ALL_LEVELS.map((d) => d.name);
  assert.equal(new Set(names).size, names.length, 'a Vault room may not reuse a campaign name');
});

test('vault: every room parses, proves a route, and honours the complexity cap', () => {
  for (const def of VAULT_LEVELS) {
    const lv = parseLevel(def);
    const par = shortestRoute(lv);
    assert.ok(par > 0, `V${def.id - 200} has no route`);
    assert.ok(par >= VAULT_PAR_BAND[0] && par <= VAULT_PAR_BAND[1],
      `V${def.id - 200} par ${par} outside [${VAULT_PAR_BAND.join(', ')}]`);
    assert.ok(mechanicSignature(def).length <= MECH_CAP, `V${def.id - 200} over the mechanic cap`);
    assert.ok((def.shards || []).length >= 4, `V${def.id - 200} carries fewer than four shards`);
  }
});

test('vault: each room is built around its headline mechanic', () => {
  for (const def of VAULT_LEVELS) {
    assert.ok(HEADLINE[def.id](def), `V${def.id - 200} (${def.name}) does not carry its headline mechanic`);
  }
});

test('vault: the save shape survives a level id above the campaign', () => {
  const save = loadSave(); // no localStorage in Node — defaults
  const data = { ...save, best: {} };
  recordWin(data, 201, 44, 4, 43, { par: 43, total: 4, deaths: 0 });
  assert.equal(data.best[201].grade, GRADE.flawless);
  assert.equal(vaultUnlockedCount(data.best, totalShardsCollected(data.best)), 0);
});
