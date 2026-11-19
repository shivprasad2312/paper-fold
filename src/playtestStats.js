// ---------------------------------------------------------------------------
// KUBIK — playtest statistics (Phase F, ADR-044)
//
// Turns exported playtest sessions into the numbers the protocol asks for:
// first-try clear rate, deaths per level, time-to-clear vs par, and quit
// points. Pure functions; scripts/playtest-report.mjs is the thin CLI over
// this module, and the unit tests exercise exactly what the CLI prints.
//
// The targets are the research pass's (§2.2, §6): level 1 must be impossible
// to fail, and no level may be abandoned by more than a quarter of the
// players who reach it. Those two are hard flags. Everything else is a
// reading, not a verdict — a cohort of five says little about a rate, and
// the report never pretends otherwise.
// ---------------------------------------------------------------------------

/** The hard targets, in one place so the docs and the code cannot drift. */
export const TARGETS = {
  firstLevelFirstTryRate: 1.0, // L1: "impossible to fail"
  maxQuitRate: 0.25, // no level abandoned by > 25% of the players who reach it
  minCohort: 5, // the protocol's five fresh players
};

const pct = (n, d) => (d > 0 ? n / d : null);
const median = (xs) => {
  const a = xs.filter((x) => Number.isFinite(x)).sort((x, y) => x - y);
  if (!a.length) return null;
  const mid = a.length >> 1;
  return a.length % 2 ? a[mid] : (a[mid - 1] + a[mid]) / 2;
};
const round = (x, places = 2) => (x == null ? null : +x.toFixed(places));

/**
 * Pool a cohort of sessions.
 *
 * `attempts` are counted per PLAYER-LEVEL, not per event: a player who
 * restarts a level three times before clearing it must not count as three
 * "attempts" in the quit rate, or a stubborn player inflates the level's
 * difficulty and a patient one deflates it. The unit of the quit rate is
 * "a player reached this level and left without clearing it".
 */
export function analyseSessions(sessions, { actFor = null } = {}) {
  const list = (sessions || []).filter((s) => s && Array.isArray(s.events));
  const byPlayerLevel = new Map(); // `${sessionId}|${level}` -> { attempts, events }
  const levelIds = new Set();

  for (const s of list) {
    const sid = s.id || `anon-${list.indexOf(s)}`;
    // stable order: a session's events arrive in play order, but a merged
    // export must not depend on it
    const events = [...s.events].sort((a, b) => (a.at || 0) - (b.at || 0));
    const tries = new Map();
    for (const e of events) {
      levelIds.add(e.level);
      const k = `${sid}|${e.level}`;
      const rec = byPlayerLevel.get(k) || { session: sid, level: e.level, attempts: 0, events: [] };
      rec.attempts++;
      rec.events.push(e); // in play order — the first event IS the first try
      byPlayerLevel.set(k, rec);
      tries.set(e.level, rec.attempts);
    }
  }

  const levels = [...levelIds].sort((a, b) => a - b).map((id) => {
    const recs = [...byPlayerLevel.values()].filter((r) => r.level === id);
    const events = recs.flatMap((r) => r.events);
    const players = recs.length;
    const cleared = recs.filter((r) => r.events.some((e) => e.outcome === 'win'));
    const firstTry = recs.filter((r) => r.events[0] && r.events[0].outcome === 'win');
    const abandoned = recs.filter((r) => !r.events.some((e) => e.outcome === 'win'));
    const wins = events.filter((e) => e.outcome === 'win');
    const deaths = events.reduce((n, e) => n + (e.deaths || 0), 0);
    const par = events.find((e) => Number.isFinite(e.par))?.par ?? null;

    return {
      id,
      players,
      attempts: events.length,
      clears: cleared.length,
      firstTryClears: firstTry.length,
      firstTryRate: pct(firstTry.length, players),
      clearRate: pct(cleared.length, players),
      abandons: abandoned.length,
      // the quit rate's denominator is players who REACHED the level
      quitRate: pct(abandoned.length, players),
      deaths,
      deathsPerAttempt: pct(deaths, events.length),
      deathsPerClear: pct(deaths, cleared.length),
      medianClearMoves: median(wins.map((e) => e.moves)),
      medianClearMs: median(wins.map((e) => e.ms)),
      par,
      // how far a human's median route runs over the proven optimal route —
      // the "readability tax" of the board
      movesOverPar: par && Number.isFinite(median(wins.map((e) => e.moves)))
        ? round(median(wins.map((e) => e.moves)) / par, 2)
        : null,
      // the export carries no wall-clock level timer, so `ms` is real time
      // spent in the level; per-par-second is the only fair cross-level unit
      secsOverPar: par
        ? round((median(wins.map((e) => e.ms)) || 0) / 1000 / par, 2)
        : null,
      abandonsByCause: countBy(events.filter((e) => e.outcome !== 'win'), 'cause'),
    };
  });

  const acts = [];
  if (actFor) {
    const groups = new Map();
    for (const row of levels) {
      const act = actFor(row.id);
      if (!act) continue;
      if (!groups.has(act.id)) groups.set(act.id, { id: act.id, name: act.name, rows: [] });
      groups.get(act.id).rows.push(row);
    }
    for (const g of [...groups.values()].sort((a, b) => a.id - b.id)) {
      const players = g.rows.reduce((n, r) => n + r.players, 0);
      const firstTry = g.rows.reduce((n, r) => n + r.firstTryClears, 0);
      const abandons = g.rows.reduce((n, r) => n + r.abandons, 0);
      const clears = g.rows.reduce((n, r) => n + r.clears, 0);
      const deaths = g.rows.reduce((n, r) => n + r.deaths, 0);
      acts.push({
        id: g.id,
        name: g.name,
        levels: g.rows.length,
        players,
        firstTryRate: pct(firstTry, players),
        quitRate: pct(abandons, players),
        deathsPerClear: pct(deaths, clears),
        meanMovesOverPar: round(
          g.rows.reduce((n, r) => n + (r.movesOverPar || 0), 0) / g.rows.filter((r) => r.movesOverPar != null).length || 0,
          2,
        ),
      });
    }
  }

  const cohort = new Set(list.map((s) => s.id));
  const flags = [];

  const first = levels.find((l) => l.id === 1);
  if (first && first.players > 0 && first.firstTryRate < TARGETS.firstLevelFirstTryRate) {
    flags.push({
      level: 1,
      kind: 'first-level',
      text: `L1 first-try clear ${fmtPct(first.firstTryRate)} — target ${fmtPct(TARGETS.firstLevelFirstTryRate)} (impossible to fail)`,
    });
  }
  for (const row of levels) {
    if (row.quitRate != null && row.quitRate > TARGETS.maxQuitRate) {
      flags.push({
        level: row.id,
        kind: 'quit',
        text: `L${row.id} quit rate ${fmtPct(row.quitRate)} — over the ${fmtPct(TARGETS.maxQuitRate)} cap (${row.abandons}/${row.players} left)`,
      });
    }
  }
  if (cohort.size < TARGETS.minCohort) {
    flags.push({
      level: null,
      kind: 'cohort',
      text: `cohort of ${cohort.size} — the protocol asks for ${TARGETS.minCohort}; treat every rate as a reading, not a result`,
    });
  }

  return {
    sessions: list.length,
    cohort: cohort.size,
    attempts: levels.reduce((n, l) => n + l.attempts, 0),
    levels,
    acts,
    flags,
    // the single number a producer asks first
    overallFirstTryRate: pct(
      levels.reduce((n, l) => n + l.firstTryClears, 0),
      levels.reduce((n, l) => n + l.players, 0),
    ),
    quitPoints: [...levels]
      .filter((l) => l.abandons > 0)
      .sort((a, b) => b.abandons - a.abandons || a.id - b.id)
      .slice(0, 10)
      .map((l) => ({ id: l.id, abandons: l.abandons, quitRate: l.quitRate })),
  };
}

function countBy(list, key) {
  const out = {};
  for (const x of list) out[x[key] || 'unknown'] = (out[x[key] || 'unknown'] || 0) + 1;
  return out;
}

export function fmtPct(x) {
  return x == null ? '—' : `${Math.round(x * 100)}%`;
}

export function fmtNum(x, places = 2) {
  return x == null || !Number.isFinite(x) ? '—' : x.toFixed(places);
}

/**
 * The report as markdown: cohort summary, act table, the level table, the
 * quit points, and the flags. Deliberately verbose — a playtest report is
 * read once, by a human looking for the one level that is bleeding.
 */
export function renderMarkdown(report, { maxLevels = 60, title = 'KUBIK playtest report' } = {}) {
  const L = [];
  L.push(`# ${title}`);
  L.push('');
  L.push(`- sessions: **${report.sessions}** (cohort **${report.cohort}**)`);
  L.push(`- attempts: **${report.attempts}**`);
  L.push(`- overall first-try clear: **${fmtPct(report.overallFirstTryRate)}**`);
  L.push('');

  if (report.flags.length) {
    L.push('## Flags');
    L.push('');
    for (const f of report.flags) L.push(`- **${f.kind}** — ${f.text}`);
    L.push('');
  } else {
    L.push('## Flags');
    L.push('');
    L.push('- none — every hard target holds in this cohort');
    L.push('');
  }

  if (report.acts.length) {
    L.push('## Acts');
    L.push('');
    L.push('| act | name | levels | players | first-try | quit | deaths / clear | moves / par |');
    L.push('|---|---|---|---|---|---|---|---|');
    for (const a of report.acts) {
      L.push(`| ${a.id} | ${a.name} | ${a.levels} | ${a.players} | ${fmtPct(a.firstTryRate)} | ${fmtPct(a.quitRate)} | ${fmtNum(a.deathsPerClear)} | ${fmtNum(a.meanMovesOverPar)} |`);
    }
    L.push('');
  }

  L.push('## Quit points');
  L.push('');
  if (!report.quitPoints.length) {
    L.push('Nobody left a level. (Either the levels hold, or the cohort never reached a wall.)');
  } else {
    L.push('| level | abandons | quit rate |');
    L.push('|---|---|---|');
    for (const q of report.quitPoints) L.push(`| L${q.id} | ${q.abandons} | ${fmtPct(q.quitRate)} |`);
  }
  L.push('');

  const shown = report.levels.slice(0, maxLevels);
  L.push('## Levels');
  L.push('');
  L.push('| level | players | attempts | first-try | clear | deaths | quit | moves / par | par |');
  L.push('|---|---|---|---|---|---|---|---|---|');
  for (const r of shown) {
    L.push(
      `| L${r.id} | ${r.players} | ${r.attempts} | ${fmtPct(r.firstTryRate)} | ${fmtPct(r.clearRate)} | ${r.deaths} | ${fmtPct(r.quitRate)} | ${fmtNum(r.movesOverPar)} | ${r.par ?? '—'} |`,
    );
  }
  if (report.levels.length > shown.length) L.push(`\n_… ${report.levels.length - shown.length} more levels not shown._`);
  L.push('');
  return L.join('\n');
}
