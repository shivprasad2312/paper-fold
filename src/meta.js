// ---------------------------------------------------------------------------
// KUBIK — mastery meta (Phase E, ADR-043)
//
// The retention layer's arithmetic, kept out of the DOM and out of the save
// writer so it can be unit-tested: what a run's grade is, how long a daily
// streak is, how many Vault rooms total shards have opened.
//
// Pure functions only. The DOM decides how to draw these; save.js decides
// how to persist them; nothing here touches localStorage or three.js.
// ---------------------------------------------------------------------------

/** The three-notch mastery seal. Ordinal — a higher grade always wins. */
export const GRADE = { none: 0, clear: 1, swift: 2, flawless: 3 };

export const GRADE_LABEL = { 0: '—', 1: 'CLEAR', 2: 'SWIFT', 3: 'FLAWLESS' };

/**
 * A run's grade (Phase E item 1):
 *   CLEAR     — you finished
 *   SWIFT     — finished in at most par presses
 *   FLAWLESS  — par, every shard, and no death on the way
 *
 * Not the medal: `medalFor` prices SPEED (a gold needs a sub-par-half time),
 * which is a time-trial axis. The grade prices MASTERY — the route and the
 * damage — and it never expires: a slower clean run still reads FLAWLESS.
 * Two axes on purpose: a player who plays carefully and one who plays fast
 * both have something to chase.
 */
export function gradeFor({ moves, par, shards, total, deaths = 0 }) {
  if (!Number.isFinite(moves) || !Number.isFinite(par) || par <= 0) return GRADE.clear;
  const parClear = moves <= par;
  const allShards = total > 0 && shards >= total;
  if (parClear && allShards && deaths === 0) return GRADE.flawless;
  if (parClear) return GRADE.swift;
  return GRADE.clear;
}

/** Grades only go up: a bad run never erases a good one. */
export function betterGrade(a, b) {
  return (b || 0) > (a || 0) ? b : a;
}

/** A saved grade for display; missing or corrupt data reads as no grade. */
export function savedGrade(entry) {
  const g = entry && Number.isInteger(entry.grade) ? entry.grade : 0;
  return g >= 0 && g <= 3 ? g : 0;
}

// ------------------------------------------------------------------ streak --

/** The local-date key for a Date, in the same shape the save uses. */
export function dateKey(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Parse a YYYY-MM-DD key as a local calendar day (no timezone drift). */
export function parseKey(key) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(key || '');
  if (!m) return null;
  const [y, mo, da] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const d = new Date(y, mo - 1, da);
  return d.getFullYear() === y && d.getMonth() === mo - 1 && d.getDate() === da ? d : null;
}

function daysBetween(a, b) {
  // calendar days, not milliseconds: DST can make a day 23 or 25 hours long
  const da = Date.UTC(a.getFullYear(), a.getMonth(), a.getDate());
  const db = Date.UTC(b.getFullYear(), b.getMonth(), b.getDate());
  return Math.round((db - da) / 86400000);
}

/**
 * Daily-streak arithmetic (Phase E item 4).
 *
 * `current` counts consecutive days played, ending today — or, if today has
 * not been played yet, ending yesterday. That second clause is the point: a
 * streak is not "broken" until a whole day has passed without a clear, so a
 * player who opens the game at 09:00 sees their streak intact and a live
 * invitation, not a zero.
 *
 * `best` is the longest run of consecutive days the save has ever held, and
 * `perfectWeek` says whether any seven-day run was completed.
 */
export function streakInfo(daily, today = new Date()) {
  const keys = Object.keys(daily || {})
    .map((k) => ({ key: k, date: parseKey(k) }))
    .filter((x) => x.date)
    .sort((a, b) => a.date - b.date);
  if (!keys.length) return { current: 0, best: 0, perfectWeek: false, playedToday: false, next: 1 };

  const todayKey = dateKey(today);
  const playedToday = keys.some((x) => x.key === todayKey);

  let best = 1;
  let run = 1;
  let perfectWeek = false;
  for (let i = 1; i < keys.length; i++) {
    if (daysBetween(keys[i - 1].date, keys[i].date) === 1) run++;
    else run = 1;
    if (run > best) best = run;
    if (run >= 7) perfectWeek = true;
  }

  // current: walk back from today (or yesterday when today is still open)
  let anchor = playedToday ? today : new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1);
  let current = 0;
  const have = new Set(keys.map((x) => x.key));
  while (have.has(dateKey(anchor))) {
    current++;
    anchor = new Date(anchor.getFullYear(), anchor.getMonth(), anchor.getDate() - 1);
  }
  return { current, best: Math.max(best, current), perfectWeek, playedToday, next: current + 1 };
}

// ------------------------------------------------------------------- vault --

/**
 * The Vault opens with total shards, not with levels: every 60 shards takes
 * one more room off the seal. The base 200 levels stay open from the start
 * (ADR-022) — the Vault is the completionist's hook, never a lock on the
 * campaign. 60 is roughly fifteen good levels, so the first door opens in
 * the first act a player finishes, and the tenth at ~600 of the ~800 shards
 * the campaign holds: the last rooms really are a long climb.
 */
export const VAULT_SHARD_STEP = 60;

export function totalShardsCollected(best) {
  let n = 0;
  for (const entry of Object.values(best || {})) {
    if (entry && Number.isFinite(entry.shards)) n += entry.shards;
  }
  return n;
}

export function vaultUnlockedCount(best, total = null, step = VAULT_SHARD_STEP) {
  const shards = total == null ? totalShardsCollected(best) : total;
  return Math.floor(shards / step);
}

/** Is this Vault room (1-based index) open? The first room needs 60 shards. */
export function vaultRoomOpen(index1, best, total = null) {
  return index1 <= vaultUnlockedCount(best, total);
}

/** Shards still needed for the next room, and how many rooms are open. */
export function vaultProgress(best, maxRooms, total = null) {
  const shards = total == null ? totalShardsCollected(best) : total;
  const open = Math.min(maxRooms, vaultUnlockedCount(best, shards));
  const into = shards % VAULT_SHARD_STEP;
  return {
    shards,
    open,
    maxRooms,
    nextAt: open >= maxRooms ? null : (open + 1) * VAULT_SHARD_STEP,
    toNext: open >= maxRooms ? 0 : VAULT_SHARD_STEP - into,
  };
}
