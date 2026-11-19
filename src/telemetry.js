// ---------------------------------------------------------------------------
// KUBIK — playtest telemetry (Phase F, ADR-044)
//
// The playtest protocol needs one thing above all: data. This module records
// what a session actually did — every attempt, every death, every level
// walked away from — so a session can be exported as JSON and analysed by
// scripts/playtest-report.mjs.
//
// Three rules shape it:
//
//   1. **Opt-in only.** Recording is enabled by `?playtest=1` in the URL.
//      A normal player is never measured; nothing is written to their
//      storage, and nothing leaves the device. The data belongs to the
//      session, not to the game.
//   2. **Separate key.** Sessions live under `kubik.playtest.v1`, not in the
//      save. Playtest data can be cleared without touching progress, and
//      progress can survive a wipe of the data.
//   3. **Bounded.** A session keeps at most MAX_EVENTS attempts (oldest
//      dropped). A session that runs for hours must not fill the quota and
//      break the save it sits beside.
//
// Everything here is pure and takes a storage object, so the math and the
// serialisation are testable in Node (no window, no localStorage).
// ---------------------------------------------------------------------------

export const STORE_KEY = 'kubik.playtest.v1';
export const MAX_EVENTS = 1500;

/**
 * A session is one playtest sitting: an id, a start time, and a list of
 * completed attempt events. Attempts are what the report analyses; an
 * attempt that is still open lives in memory only (see `beginAttempt`).
 */
export function newSession({ id = null, startedAt = null } = {}) {
  return {
    v: 1,
    id: id || makeSessionId(),
    startedAt: startedAt == null ? Date.now() : startedAt,
    events: [],
  };
}

/** A session id that sorts by time and is unlikely to collide across players. */
export function makeSessionId(now = Date.now(), rand = Math.random) {
  // the time field is zero-padded to a fixed 9 base-36 digits (ms since the
  // epoch needs 8) so that a directory of exports sorts chronologically by
  // filename — a playtest session is only useful if you can find it later
  const a = Math.floor(now).toString(36).padStart(9, '0');
  const b = Math.floor(rand() * 0x100000000).toString(36).padStart(7, '0');
  return `s-${a}-${b}`;
}

/**
 * Open an attempt. Kept out of the event list until it finishes — an
 * attempt that is still being played has no outcome, and half-written
 * events would corrupt every rate in the report.
 */
export function beginAttempt({ levelId, par = null, attempt = 1, now = Date.now() }) {
  return { levelId, par, attempt, startedAt: now, finished: false };
}

/**
 * Close an attempt and return the completed event.
 *
 *   outcome 'win'      — the level was cleared
 *   outcome 'abandon'  — the player left (restart, level select, menu)
 *   outcome 'quit'     — reserved for an explicit "give up" control, if one
 *                        is ever added; it is counted with abandons
 *
 * `cause` matters for abandon: 'restart' and 'leave' are different signals
 * (a restart is a retry inside the level; leaving is the editor's problem).
 */
export function finishAttempt(attempt, {
  outcome = 'win',
  moves = 0,
  deaths = 0,
  shards = 0,
  total = 0,
  rescued = false,
  cause = null,
  now = Date.now(),
} = {}) {
  if (!attempt || attempt.finished) return null;
  attempt.finished = true;
  return {
    level: attempt.levelId,
    attempt: attempt.attempt,
    par: attempt.par,
    outcome,
    cause: cause || null,
    moves,
    deaths,
    shards,
    total,
    rescued: !!rescued,
    ms: Math.max(0, now - attempt.startedAt),
    at: now,
  };
}

/** Append an event, dropping the oldest once the cap is reached. */
export function appendEvent(session, event, cap = MAX_EVENTS) {
  if (!session || !event) return session;
  session.events.push(event);
  if (session.events.length > cap) session.events.splice(0, session.events.length - cap);
  return session;
}

/** Session totals for the in-game indicator ("recorded 14 attempts"). */
export function summarise(session) {
  const events = (session && session.events) || [];
  const wins = events.filter((e) => e.outcome === 'win').length;
  const abandons = events.filter((e) => e.outcome !== 'win').length;
  const deaths = events.reduce((n, e) => n + (e.deaths || 0), 0);
  const levels = new Set(events.map((e) => e.level));
  return { attempts: events.length, wins, abandons, deaths, levels: levels.size };
}

// ------------------------------------------------------------------ storage --

/** Read a stored session, or null. A corrupt blob is discarded, not thrown. */
export function loadSession(storage) {
  try {
    const raw = storage && storage.getItem(STORE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (!data || data.v !== 1 || !Array.isArray(data.events)) return null;
    return { ...data, events: data.events.filter((e) => e && Number.isFinite(e.level)) };
  } catch {
    return null;
  }
}

/** Persist a session. Storage failures are the player's quota, not an error. */
export function saveSession(storage, session) {
  try {
    storage && storage.setItem(STORE_KEY, JSON.stringify(session));
    return true;
  } catch {
    return false;
  }
}

export function clearSession(storage) {
  try {
    storage && storage.removeItem(STORE_KEY);
    return true;
  } catch {
    return false;
  }
}

/**
 * The exported file. `players` is deliberately absent: one export is one
 * player's session. The report groups several exports into one cohort.
 */
export function exportJson(session) {
  return JSON.stringify({ app: 'kubik', kind: 'playtest', v: 1, session }, null, 2);
}
