const KEY = 'kubik.save.v1';

const DEFAULTS = {
  unlocked: 1, // number of levels unlocked (1 = only the first)
  best: {}, // id -> { time, shards, moves, medal }
  ghosts: {}, // id -> { time, moves, log: [{t,x,z,h}] } — the fastest win, replayed
  daily: {}, // 'YYYY-MM-DD' -> { time, shards, total, moves, par, medal }
  theme: 'dark', // 'dark' void or 'light' high-key world
  cam: 0, // camera seat: 0..3 quarter turns around the level
  sound: true,
  lastLevel: 1,
};

export const MEDAL_RANK = { none: 0, bronze: 1, silver: 2, gold: 3 };

export function loadSave() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...DEFAULTS, best: {}, ghosts: {}, daily: {} };
    const data = JSON.parse(raw);
    return {
      ...DEFAULTS,
      ...data,
      best: data.best || {},
      ghosts: data.ghosts || {},
      daily: data.daily || {},
      theme: data.theme === 'light' ? 'light' : 'dark',
      cam: Number.isInteger(data.cam) ? ((data.cam % 4) + 4) % 4 : 0,
    };
  } catch {
    return { ...DEFAULTS, best: {}, ghosts: {}, daily: {} };
  }
}

export function writeSave(data) {
  try {
    localStorage.setItem(KEY, JSON.stringify(data));
  } catch {
    /* storage may be unavailable — game still plays */
  }
}

/**
 * Medal for a run. Three factors, one point each:
 *   - par clear (finished in at most the par number of steps)
 *   - every shard collected
 *   - fast (under ~half a second of slack per par step)
 * 3 = gold, 2 = silver, 1 = bronze, 0 = cleared, no medal.
 */
export function medalFor({ time, shards, total, moves, par }) {
  let score = 0;
  if (moves != null && par != null && moves <= par) score++;
  if (total > 0 && shards >= total) score++;
  if (par > 0 && time <= par * 0.5) score++;
  if (score >= 3) return 'gold';
  if (score === 2) return 'silver';
  if (score === 1) return 'bronze';
  return 'none';
}

export function betterMedal(a, b) {
  return (MEDAL_RANK[b] || 0) > (MEDAL_RANK[a] || 0) ? b : a;
}

export function recordWin(data, id, time, shards, moves, { par = null, total = 0 } = {}) {
  const medal = medalFor({ time, shards, total, moves, par });
  const prev = data.best[id] || { time: Infinity, shards: 0, moves: Infinity, medal: 'none' };
  data.best[id] = {
    time: Math.min(prev.time, time),
    shards: Math.max(prev.shards, shards),
    moves: Math.min(prev.moves ?? Infinity, moves ?? Infinity),
    medal: betterMedal(prev.medal || 'none', medal),
  };
  data.unlocked = Math.max(data.unlocked, id + 1);
  data.lastLevel = Math.min(id + 1, data.unlocked);
  writeSave(data);
  return data;
}

/** Store the fastest win's route so the next attempt races against it. */
export function recordGhost(data, id, time, log) {
  if (!log || log.length < 2) return data;
  const prev = data.ghosts[id];
  if (!prev || time < prev.time) {
    data.ghosts[id] = {
      time,
      log: log.map((p) => ({ t: +p.t.toFixed(2), x: p.x, z: p.z, h: p.h })),
    };
    writeSave(data);
  }
  return data;
}

export function recordDaily(data, dateStr, { time, shards, total, moves, par }) {
  const medal = medalFor({ time, shards, total, moves, par });
  const prev = data.daily[dateStr];
  if (!prev || time < prev.time) {
    data.daily[dateStr] = { time, shards, total, moves, par, medal: betterMedal(prev?.medal || 'none', medal) };
    writeSave(data);
  }
  return data;
}

export function fmtTime(seconds) {
  if (!Number.isFinite(seconds) || seconds <= 0) return '—';
  const m = Math.floor(seconds / 60);
  const s = seconds - m * 60;
  return `${m}:${s < 10 ? '0' : ''}${s.toFixed(1)}`;
}
