const KEY = 'kubik.save.v1';

const DEFAULTS = {
  unlocked: 1, // number of levels unlocked (1 = only the first)
  best: {}, // id -> { time, shards }
  sound: true,
  lastLevel: 1,
};

export function loadSave() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...DEFAULTS, best: {} };
    const data = JSON.parse(raw);
    return {
      ...DEFAULTS,
      ...data,
      best: data.best || {},
    };
  } catch {
    return { ...DEFAULTS, best: {} };
  }
}

export function writeSave(data) {
  try {
    localStorage.setItem(KEY, JSON.stringify(data));
  } catch {
    /* storage may be unavailable — game still plays */
  }
}

export function recordWin(data, id, time, shards, moves) {
  const prev = data.best[id] || { time: Infinity, shards: 0, moves: Infinity };
  data.best[id] = {
    time: Math.min(prev.time, time),
    shards: Math.max(prev.shards, shards),
    moves: Math.min(prev.moves ?? Infinity, moves ?? Infinity),
  };
  data.unlocked = Math.max(data.unlocked, id + 1);
  data.lastLevel = Math.min(id + 1, data.unlocked);
  writeSave(data);
  return data;
}

export function fmtTime(seconds) {
  if (!Number.isFinite(seconds) || seconds <= 0) return '—';
  const m = Math.floor(seconds / 60);
  const s = seconds - m * 60;
  return `${m}:${s < 10 ? '0' : ''}${s.toFixed(1)}`;
}
