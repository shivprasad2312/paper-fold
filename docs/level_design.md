# KUBIK — Level Design

_Phase 6 deliverable. The level data is `src/levels.js` (13 hand) +
`src/campaign.js` (37 generated); this document is the design layer above
it: what each level teaches, the constraints it obeys, and how it is
validated._

## 1. The level definition (data contract)

See `agent_rules.md §3` for the field reference. Rules every def must
satisfy (enforced by `parseLevel` + verifier):

- `map`: row strings, digit = slab height (0–9), `.` = void.
- `start` / `goal`: on slabs; start not a crumble slab; start ≠ goal.
- `shards`: exactly 3, on slabs, none on start/goal.
- `orbs`: every path point on a slab; spawn point never on start/goal.
- `crumble`: never on a sentinel patrol line or on a tile adjacent to one — a crumble on a crossing entry would force the player to wait for the crossing window on a slab that breaks (BUG-005). The generator enforces this; hand-authored levels are checked by the verifier.
- `sliders`: groups of slabs; period ≥ ~1.5 s (human-readable timing).
- `key`: only with a sealed gate (finale); on a slab, not on start/goal.
- `wind`: diagonal unit vector only.
- `nudge` ≥ number of blocks that *must* move for any route (solver
  proves it — a level with 2 required pushes and `nudge: 1` fails
  `solveHazards`).

## 2. Design laws (why these numbers)

| Law | Value | Rationale |
|---|---|---|
| Max drop | 2 | Falling is the core threat; 2 lets you "jump" two slabs without it feeling like a fall. 3+ reads as a cliff, 1 makes height meaningless. |
| Max climb | 1 | Asymmetry (fall 2 / climb 1) makes heightfields *directional* — you can be led downhill and stopped going up. Symmetric movement would make every level a flat maze. |
| Roll time | 0.17 s | Fast enough for flow, slow enough to read the next tile; the genre's physicality lives in this single constant. |
| Crumble | break on leave | One-way commitment without any "timer to memorize" — the hazard is the route itself. |
| Sentinel period | ≥ ~2 s per loop | Readable patrol; never strobe-fast (eye-strain finding, research §6). |
| Wind period | 0.62 s | A nudge every ~4 rolls at typical pace — a drift you plan around, not a force you fight. |
| Shards | 2–5 (2 teaching / 3 most / 4 campaign / 5 pre-boss) | Risk/reward budget: each is ~1–3 rolls off-route; collecting every one ≈ a meaningful time cost = the perfect flag. |
| Level size | hand 7×3 → 11×10, campaign ≤ 12×12 | Teaching levels tiny; finale largest. Size ≈ difficulty budget. |

## 3. Hand levels (1–13) — the teaching spine

One new mechanic per level; combinations only after both parts are taught.
`par` shown = BFS shortest route (what the HUD counts against).

| # | Name | Size | Mechanics | Design intent |
|---|------|------|-----------|---------------|
| 1 | First Light | 7×3 | — | "Roll to the gate." One verb. |
| 2 | Step Down | 7×3 | drop | Falling is legal; the edge is the limit. |
| 3 | Switchback | 7×7 | climb | The asymmetry: you can be walled going up. |
| 4 | Twin Bridges | 9×6 | **blocks + nudge** | Telekinesis: plan the push, it's a resource. |
| 5 | Paper Bridge | 9×6 | **crumble** | One-way slabs: commitment, no backtrack. |
| 6 | Sentinel | 9×6 | **orbs** | Timing hazard, telegraphed patrol. |
| 7 | Weave | 9×6 | orbs + blocks | First *combination*: timing + resource. |
| 8 | Cascade | 9×7 | **wind** | Drift management: the world moves you. |
| 9 | Fault Line | 9×6 | orbs + crumble | Two commitment hazards at once (the level that shipped with the spawn bug — see bug_tracker BUG-002; the verifier now pins its spawn). |
| 10 | Spiral | 7×7 | — | Pure-heightfield fluency check (no new mechanic, harder shape). |
| 11 | Gauntlet | 9×8 | orbs + crumble | Density: many hazards, narrow routes. |
| 12 | The Fold | 9×8 | **key/lock** | Objective sequencing: key first, gate second. |
| 13 | Boss: The Folded Keep | 11×10 | orbs + crumble + **sliders** | Everything so far, plus the timing bridges. The hand-designed exam. |

**Par values (BFS):** 2, 2, 7, 7, 5, 5, 5, 7, 10, 7, 13, 10, 9 — monotone
*within* teaching beats (not across, by design: each mechanic changes the
route economy).

## 4. Campaign (14–50) — generated, proven, structured

`gen-campaign.mjs` seeds per level id, proposes, and **rejects until the
verifier proves** the layout (ADR-004). Five acts, each with a mechanic
budget:

| Act | Levels | Theme | Budget (what it may use) |
|---|---|---|---|
| Descent | 14–19 | falling, long drops | heightfield + crumble |
| Glass Meadow | 20–27 | open slabs, sentinels | + orbs, wind |
| Lattice | 28–35 | grid work, weave | + blocks/nudge, multi-mechanic combos |
| Crucible | 36–43 | dense, tight | all mechanics, small size, tight par |
| Spire | 44–50 | ascent to finale | all + sliders; **50: 12×12 with key & sealed gate** |

Generator guarantees: unique layouts (seeded, no repeats), shard
placement on-route-or-near (1–3 rolls off), par in the act's band, and
full 7-check proof. Re-running the generator is a *content release*, not a
code change — see `agent_rules.md §3`.

## 5. Daily challenge

One level per calendar date: seed `'kubik-daily-'+YYYY-MM-DD`, generated
in the same pipeline and **proven at load** (unprovable → next seed
variant). Own medal track + 14-day history in the save. This is the
retention hook (research §7) and doubles as a *live* exercise of the
prover: the generator + verifier + bot run on new data every single day.

## 6. Difficulty curve policy

- **Teach once, combine later.** A mechanic appears in exactly one "intro"
  level (the first level that uses it in the hand set); later uses combine
  it with already-taught ones.
- **No spikes:** adjacent levels in the hand set differ by ≤ 1 new
  mechanic; in the campaign, the act budget widens gradually.
- **Endgame is meant to hurt.** Levels 44–50 are the deliberate hard
  finish (research §2: EDGE's hard endgame is specifically praised).
- **No pixel-timing.** Any timing window the player needs must be ≥ ~1
  roll wide at sentinel speed — the verifier's always-solid model plus the
  bot's live play bounds both directions of this.
- **No unfair randomness.** Zero runtime RNG in gameplay (ADR-005
  contract).

## 7. Validation pipeline (what "level done" means)

A level is done when, all green:

1. `npm run verify` — 7 checks pass (route, soft-lock, shards,
   crumble/push survival, spawn safety, data sanity, par computable,
   **timing fairness** — at least one path whose every sentinel crossing
   has a ≥ 0.5 s window; for `gateKey` levels, start→key and key→goal
   are proven separately (algorithms §6.1)).
2. `npm run test:play` — the bot plays it to `won` through real input.
3. Design review against §3/§4 (teaches ≤ 1 new mechanic; par in band;
   shards worth 1–3 rolls of risk).
4. Screenshot (dark + light) in `docs/` for the visual gate.

Steps 1–2 are automated commit blockers; 3–4 are human (agent) review at
content time. **A level that fails 1 or 2 cannot be committed** — this is
the level-validation system the studio charter asks for, implemented as a
gate rather than a spreadsheet.
