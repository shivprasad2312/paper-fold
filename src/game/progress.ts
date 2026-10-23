// ─────────────────────────────────────────────────────────────
// Local progress: stars earned per level, persisted in localStorage.
// ─────────────────────────────────────────────────────────────

const KEY = 'rope-untangle-progress-v1';

export interface Progress {
  stars: Record<number, number>;
}

function read(): Progress {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { stars: {} };
    const parsed = JSON.parse(raw) as Progress;
    return { stars: parsed.stars ?? {} };
  } catch {
    return { stars: {} };
  }
}

function write(p: Progress) {
  try {
    localStorage.setItem(KEY, JSON.stringify(p));
  } catch {
    /* storage unavailable — play still works, just not persisted */
  }
}

export function getStars(): Record<number, number> {
  return read().stars;
}

export function saveStars(levelId: number, stars: number) {
  const p = read();
  p.stars[levelId] = Math.max(p.stars[levelId] ?? 0, stars);
  write(p);
}

/** Highest unlocked level id (level 0 always open). */
export function maxUnlocked(total: number): number {
  const stars = read().stars;
  let max = 0;
  for (const id of Object.keys(stars).map(Number)) {
    if (stars[id] > 0) max = Math.max(max, id + 1);
  }
  return Math.min(max, total - 1);
}

export function totalStars(): number {
  return Object.values(getStars()).reduce((a, b) => a + b, 0);
}
