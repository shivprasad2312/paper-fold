// Unit tests — the playtest instrument and its report (Phase F, ADR-044).
//
// Two halves, both testable without a browser:
//   1. the recorder (src/telemetry.js): attempt lifecycle, the event cap,
//      storage round-trips and corrupt-blob recovery, the export shape
//   2. the analysis (src/playtestStats.js): first-try rate, quit rate,
//      deaths, moves/par, act roll-up, the hard-target flags, markdown
//
// The end-to-end path (real key presses → export → report) was exercised in
// a live browser separately; these pins keep the arithmetic honest offline.
import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  STORE_KEY, MAX_EVENTS, newSession, makeSessionId, beginAttempt, finishAttempt,
  appendEvent, summarise, loadSession, saveSession, clearSession, exportJson,
} from '../../src/telemetry.js';
import { analyseSessions, renderMarkdown, TARGETS, fmtPct } from '../../src/playtestStats.js';
import { execFileSync, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

/** A tiny in-memory localStorage stand-in. */
function fakeStorage(initial = {}) {
  const data = { ...initial };
  return {
    getItem: (k) => (k in data ? data[k] : null),
    setItem: (k, v) => { data[k] = String(v); },
    removeItem: (k) => { delete data[k]; },
    _data: data,
  };
}

const ev = (level, outcome = 'win', extra = {}) => ({
  level, attempt: 1, par: 10, outcome, cause: outcome === 'win' ? null : 'leave',
  moves: 10, deaths: 0, shards: 4, total: 4, rescued: false, ms: 20000, at: 1, ...extra,
});

// ------------------------------------------------------------- recorder --

test('telemetry: an attempt becomes an event only when it finishes', () => {
  const a = beginAttempt({ levelId: 7, par: 22, attempt: 1, now: 1000 });
  const e = finishAttempt(a, { outcome: 'win', moves: 21, deaths: 0, shards: 3, total: 3, now: 5000 });
  assert.equal(e.level, 7);
  assert.equal(e.par, 22);
  assert.equal(e.outcome, 'win');
  assert.equal(e.ms, 4000);
  assert.equal(e.shards, 3);
  // a double finish must not mint a second event (the win handler can fire
  // next to a level transition; two events would double every rate)
  assert.equal(finishAttempt(a, { outcome: 'win' }), null);
});

test('telemetry: the event list is bounded and drops the oldest', () => {
  const s = newSession({ id: 's-test', startedAt: 0 });
  for (let i = 0; i < MAX_EVENTS + 5; i++) appendEvent(s, ev(1 + (i % 200)));
  assert.equal(s.events.length, MAX_EVENTS);
  // the five oldest are gone, so the first event is the sixth written
  assert.equal(s.events[s.events.length - 1].level, 1 + ((MAX_EVENTS + 4) % 200));
});

test('telemetry: summarise counts attempts, endings, deaths and distinct levels', () => {
  const s = newSession({ id: 's', startedAt: 0 });
  s.events = [ev(1), ev(2, 'abandon'), ev(2, 'abandon', { deaths: 3 })];
  assert.deepEqual(summarise(s), { attempts: 3, wins: 1, abandons: 2, deaths: 3, levels: 2 });
});

test('telemetry: session ids differ and sort by time', () => {
  const a = makeSessionId(1000, () => 0.5);
  const b = makeSessionId(2000, () => 0.5);
  const c = makeSessionId(2000, () => 0.25);
  assert.ok(a.startsWith('s-'));
  assert.notEqual(b, c);
  assert.ok(a < b, 'a later session sorts later');
});

test('telemetry: storage round-trips, and corrupt data is discarded not thrown', () => {
  const store = fakeStorage();
  const s = newSession({ id: 's-1', startedAt: 42 });
  s.events.push(ev(3));
  assert.equal(saveSession(store, s), true);
  assert.ok(store._data[STORE_KEY]);
  const back = loadSession(store);
  assert.equal(back.id, 's-1');
  assert.equal(back.events.length, 1);

  store._data[STORE_KEY] = '{not json';
  assert.equal(loadSession(store), null);
  store._data[STORE_KEY] = JSON.stringify({ v: 99, events: [] });
  assert.equal(loadSession(store), null, 'a future schema version is not guessed at');
  store._data[STORE_KEY] = JSON.stringify({ v: 1, events: [{ level: 'x' }, ev(4)] });
  assert.deepEqual(loadSession(store).events.map((e) => e.level), [4], 'non-numeric levels are dropped');

  clearSession(store);
  assert.equal(loadSession(store), null);
  // a storage that throws (quota, privacy mode) must not break the game
  assert.equal(saveSession({ setItem() { throw new Error('quota'); } }, s), false);
});

test('telemetry: the export is a self-describing playtest file', () => {
  const s = newSession({ id: 's-x', startedAt: 7 });
  s.events.push(ev(1));
  const data = JSON.parse(exportJson(s));
  assert.equal(data.app, 'kubik');
  assert.equal(data.kind, 'playtest');
  assert.equal(data.v, 1);
  assert.equal(data.session.id, 's-x');
  assert.equal(data.session.events.length, 1);
});

// ------------------------------------------------------------- analysis --

test('stats: first-try clear is per player-level, not per event', () => {
  // one player restarts L2 twice, then clears it: that is a FIRST-TRY MISS
  // and one clear, never "three attempts, first try won"
  const a = { id: 'a', events: [ev(1), ev(2, 'abandon', { at: 2 }), ev(2, 'abandon', { at: 3 }), ev(2, 'win', { at: 4 })] };
  const r = analyseSessions([a]);
  const l2 = r.levels.find((l) => l.id === 2);
  assert.equal(l2.players, 1);
  assert.equal(l2.attempts, 3);
  assert.equal(l2.clears, 1);
  assert.equal(l2.firstTryClears, 0);
  assert.equal(l2.firstTryRate, 0);
  assert.equal(l2.quitRate, 0, 'the player did not leave without clearing');
  const l1 = r.levels.find((l) => l.id === 1);
  assert.equal(l1.firstTryRate, 1);
});

test('stats: the quit rate counts players who reached the level and left', () => {
  const sessions = [
    { id: 'a', events: [ev(1), ev(2, 'abandon', { cause: 'leave', deaths: 4 })] },
    { id: 'b', events: [ev(1), ev(2, 'win', { moves: 12 })] },
    { id: 'c', events: [ev(1), ev(2, 'abandon', { cause: 'unload', deaths: 2 })] },
    { id: 'd', events: [ev(1)] }, // never reached L2: not in the denominator
    { id: 'e', events: [ev(1)] },
  ];
  const r = analyseSessions(sessions);
  const l2 = r.levels.find((l) => l.id === 2);
  assert.equal(l2.players, 3, 'only the three who reached it count');
  assert.equal(l2.abandons, 2);
  assert.equal(Math.round(l2.quitRate * 100), 67);
  assert.deepEqual(l2.abandonsByCause, { leave: 1, unload: 1 });
  assert.equal(l2.deaths, 6);
});

test('stats: moves and time against par are medians of the CLEAR runs', () => {
  const sessions = [
    { id: 'a', events: [ev(1, 'win', { moves: 12, par: 10, ms: 30000, at: 1 })] },
    { id: 'b', events: [ev(1, 'win', { moves: 14, par: 10, ms: 50000, at: 2 })] },
    { id: 'c', events: [ev(1, 'win', { moves: 40, par: 10, ms: 90000, at: 3 })] },
  ];
  const l1 = analyseSessions(sessions).levels[0];
  assert.equal(l1.medianClearMoves, 14);
  assert.equal(l1.movesOverPar, 1.4);
  assert.equal(l1.medianClearMs, 50000);
  assert.equal(l1.secsOverPar, 5, '50 s over a par of 10 rolls');
});

test('stats: flags fire on the two hard targets and on a thin cohort', () => {
  // L1 must be impossible to fail: one player dies and leaves it
  const sessions = [
    { id: 'a', events: [ev(1, 'abandon', { deaths: 2 })] },
    { id: 'b', events: [ev(1)] },
    { id: 'c', events: [ev(1)] },
    { id: 'd', events: [ev(1)] },
    { id: 'e', events: [ev(1)] },
  ];
  const r = analyseSessions(sessions);
  assert.ok(r.flags.some((f) => f.kind === 'first-level'), 'L1 first-try failure is a flag');

  // a five-player cohort is enough; four is not
  assert.equal(TARGETS.minCohort, 5);
  const four = analyseSessions(sessions.slice(1));
  assert.ok(four.flags.some((f) => f.kind === 'cohort'));
  assert.ok(!r.flags.some((f) => f.kind === 'cohort'), 'five players clear the cohort flag');

  // a level over the quit cap, with the numbers in the text
  const quits = [
    { id: 'a', events: [ev(1), ev(9, 'abandon', { at: 2 })] },
    { id: 'b', events: [ev(1), ev(9, 'win', { at: 2 })] },
    { id: 'c', events: [ev(1)] },
    { id: 'd', events: [ev(1)] },
    { id: 'e', events: [ev(1)] },
  ];
  const q = analyseSessions(quits);
  const flag = q.flags.find((f) => f.kind === 'quit' && f.level === 9);
  assert.ok(flag);
  assert.match(flag.text, /50%/);
  assert.equal(q.quitPoints[0].id, 9);
});

test('stats: acts roll up only the levels that belong to them', () => {
  const actFor = (id) => (id <= 20 ? { id: 1, name: 'First Fall' } : { id: 2, name: 'Second' });
  const sessions = [
    { id: 'a', events: [ev(1), ev(3, 'abandon', { at: 2 })] },
    { id: 'b', events: [ev(1), ev(3, 'win', { at: 2 })] },
  ];
  const r = analyseSessions(sessions, { actFor });
  assert.equal(r.acts.length, 1);
  const act = r.acts[0];
  assert.equal(act.levels, 2);
  assert.equal(act.players, 4);
  // L1 is a first-try clear for both players; L3 only for b — 3 of 4
  assert.equal(act.firstTryRate, 0.75);
  assert.equal(act.quitRate, 0.25);
});

test('stats: an empty cohort reports nothing rather than dividing by zero', () => {
  const r = analyseSessions([]);
  assert.equal(r.sessions, 0);
  assert.equal(r.overallFirstTryRate, null);
  assert.equal(r.levels.length, 0);
  assert.equal(r.quitPoints.length, 0);
  assert.equal(fmtPct(null), '—');
});

test('stats: the markdown report carries the cohort, the acts and every flag', () => {
  const sessions = [
    { id: 'a', events: [ev(1), ev(2, 'abandon', { cause: 'unload' })] },
    { id: 'b', events: [ev(1), ev(2, 'win')] },
  ];
  const md = renderMarkdown(analyseSessions(sessions, { actFor: (id) => ({ id: 1, name: 'First Fall' }) }));
  assert.match(md, /^# KUBIK playtest report/m);
  assert.match(md, /sessions: \*\*2\*\*/);
  assert.match(md, /## Flags/);
  assert.match(md, /## Acts/);
  assert.match(md, /\| 1 \| First Fall \| 2 \|/);
  assert.match(md, /## Quit points/);
  assert.match(md, /\| L2 \| 1 \| 50% \|/);
  assert.match(md, /## Levels/);
  assert.match(md, /\| L1 \| 2 \| 2 \| 100% \|/);
});

// ------------------------------------------------------------------ CLI --

test('report CLI: reads a directory of real exports and prints the cohort', () => {
  // tests/fixtures/playtest is a five-player cohort written in the same shape
  // the game exports, so this exercises the file handling the runbook uses —
  // glob, parse, pool, render — not just the arithmetic above
  const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
  const out = execFileSync(
    process.execPath,
    [join(root, 'scripts/playtest-report.mjs'), join(root, 'tests/fixtures/playtest')],
    { cwd: root, encoding: 'utf8' },
  );
  assert.match(out, /sessions: \*\*5\*\*/);
  assert.match(out, /cohort \*\*5\*\*/);
  assert.match(out, /L3 quit rate 50%/);
  assert.match(out, /\| L1 \| 5 \| 5 \| 100% \|/);

  // a malformed file is reported and skipped, and the run still produces a
  // report from the good ones — a bad export must not lose a whole cohort
  const bad = join(root, 'tests/fixtures/playtest-bad.json');
  const mixed = spawnSync(
    process.execPath,
    [join(root, 'scripts/playtest-report.mjs'), join(root, 'tests/fixtures/playtest'), bad],
    { cwd: root, encoding: 'utf8' },
  );
  assert.equal(mixed.status, 0, 'one bad file does not fail the report');
  assert.match(mixed.stderr, /not a KUBIK playtest export/);
  assert.match(mixed.stdout, /sessions: \*\*5\*\*/);
});
