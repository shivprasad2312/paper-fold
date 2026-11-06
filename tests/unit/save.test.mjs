// Unit tests — save.js (medal logic, record merging, corruption recovery).
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

// localStorage stub (Node has none)
const store = new Map();
globalThis.localStorage = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: (k) => store.delete(k),
};

const {
  loadSave,
  writeSave,
  medalFor,
  betterMedal,
  recordWin,
  recordGhost,
  recordDaily,
  fmtTime,
} = await import('../../src/save.js');

beforeEach(() => store.clear());

test('medalFor: three independent criteria, one point each', () => {
  // gold: par + all shards + fast
  assert.equal(medalFor({ time: 5, shards: 3, total: 3, moves: 10, par: 10 }), 'gold');
  // silver: par + shards (slow time)
  assert.equal(medalFor({ time: 99, shards: 3, total: 3, moves: 10, par: 10 }), 'silver');
  // silver: shards + fast (over par)
  assert.equal(medalFor({ time: 4, shards: 3, total: 3, moves: 99, par: 10 }), 'silver');
  // silver: par + fast (missing a shard)
  assert.equal(medalFor({ time: 4, shards: 2, total: 3, moves: 10, par: 10 }), 'silver');
  // bronze: single criterion
  assert.equal(medalFor({ time: 99, shards: 3, total: 3, moves: 99, par: 10 }), 'bronze');
  assert.equal(medalFor({ time: 99, shards: 1, total: 3, moves: 10, par: 10 }), 'bronze');
  assert.equal(medalFor({ time: 4, shards: 1, total: 3, moves: 99, par: 10 }), 'bronze');
  // none: no criteria
  assert.equal(medalFor({ time: 99, shards: 1, total: 3, moves: 99, par: 10 }), 'none');
  // fast rule: time ≤ par × 0.5
  assert.equal(medalFor({ time: 5, shards: 0, total: 3, moves: 99, par: 10 }), 'bronze');
  assert.equal(medalFor({ time: 5.1, shards: 0, total: 3, moves: 99, par: 10 }), 'none');
});

test('betterMedal: only upgrades, never downgrades', () => {
  assert.equal(betterMedal('none', 'bronze'), 'bronze');
  assert.equal(betterMedal('gold', 'bronze'), 'gold');
  assert.equal(betterMedal('silver', 'gold'), 'gold');
  assert.equal(betterMedal('none', 'none'), 'none');
});

test('recordWin: keeps best time, most shards, fewest moves, best medal', () => {
  let data = { ...loadSave(), best: {}, ghosts: {}, daily: {} };
  data = recordWin(data, 1, 12, 2, 8, { par: 10, total: 3 }); // bronze (par only)
  data = recordWin(data, 1, 4, 3, 10, { par: 10, total: 3 }); // gold: par + all shards + fast
  assert.equal(data.best[1].time, 4); // best time kept
  assert.equal(data.best[1].shards, 3); // best shards kept
  assert.equal(data.best[1].moves, 8); // fewest moves kept
  assert.equal(data.best[1].medal, 'gold'); // medal upgraded
  // a worse medal must not downgrade
  data = recordWin(data, 1, 50, 0, 50, { par: 10, total: 3 });
  assert.equal(data.best[1].medal, 'gold');
});

test('recordDaily: one entry per date, best time + medal upgrade', () => {
  let data = { ...loadSave(), best: {}, ghosts: {}, daily: {} };
  data = recordDaily(data, '2026-11-06', { time: 30, shards: 1, total: 3, moves: 20, par: 15 }); // none
  data = recordDaily(data, '2026-11-06', { time: 7, shards: 3, total: 3, moves: 15, par: 15 }); // gold: par + shards + fast
  assert.equal(data.daily['2026-11-06'].time, 7);
  assert.equal(data.daily['2026-11-06'].medal, 'gold');
  assert.equal(Object.keys(data.daily).length, 1);
});

test('recordGhost: only the fastest win is stored', () => {
  let data = { ...loadSave(), best: {}, ghosts: {}, daily: {} };
  const log = [{ t: 0, x: 0, z: 0, h: 1 }, { t: 0.2, x: 1, z: 0, h: 1 }];
  data = recordGhost(data, 1, 15, log);
  data = recordGhost(data, 1, 30, log); // slower → ignored
  assert.equal(data.ghosts[1].time, 15);
  data = recordGhost(data, 1, 10, log); // faster → replaced
  assert.equal(data.ghosts[1].time, 10);
  assert.deepEqual(Object.keys(data.ghosts[1].log[0]).sort(), ['h', 't', 'x', 'z']);
});

test('loadSave: fresh, partial, and CORRUPTED storage all load safely', () => {
  // fresh
  const fresh = loadSave();
  assert.equal(fresh.theme, 'dark');
  assert.equal(fresh.cam, 0);
  assert.deepEqual(fresh.best, {});

  // partial (an old save missing new fields) → defaults merged
  store.set('kubik.save.v1', JSON.stringify({ best: { 7: { time: 5, shards: 3, moves: 6, medal: 'gold' } } }));
  const partial = loadSave();
  assert.equal(partial.best[7].medal, 'gold');
  assert.equal(partial.theme, 'dark');
  assert.equal(partial.unlocked, 1);

  // corrupted JSON → fresh defaults, no throw
  store.set('kubik.save.v1', '{not json!!');
  const corrupt = loadSave();
  assert.deepEqual(corrupt.best, {});
  assert.equal(corrupt.cam, 0);

  // cam wraps into 0..3
  store.set('kubik.save.v1', JSON.stringify({ cam: 5 }));
  assert.equal(loadSave().cam, 1);
  store.set('kubik.save.v1', JSON.stringify({ cam: -1 }));
  assert.equal(loadSave().cam, 3);
});

test('writeSave: survives storage being unavailable (game still plays)', () => {
  const real = globalThis.localStorage.setItem;
  globalThis.localStorage.setItem = () => {
    throw new Error('quota');
  };
  assert.doesNotThrow(() => writeSave({ best: {} }));
  globalThis.localStorage.setItem = real;
});

test('fmtTime: m:ss.s formatting', () => {
  assert.equal(fmtTime(0), '—');
  assert.equal(fmtTime(Infinity), '—');
  assert.equal(fmtTime(59.94), '0:59.9');
  assert.equal(fmtTime(61.3), '1:01.3');
  assert.equal(fmtTime(12.04), '0:12.0');
});
