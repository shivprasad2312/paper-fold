# KUBIK — Progression & Difficulty Design

_Phase 6 deliverable (progression half). How the 50-level arc rises,
what the player is actually progressing toward, and the deliberate
"no lockout" decision._

## 1. The shape of the curve

```
difficulty
  ▲
  │                                    ▂▃▅▅▇█  Spire (44–50, finale 50)
  │                        ▂▂▃▃▅     ▂▃▄
  │              ▂▃▄     ▂▃▄        (Crucible 36–43)
  │        ▂▃  ▁▂▃ (Lattice 28–35)
  │   ▁▂ (Glass Meadow 20–27)
  │ ▁▂ (Descent 14–19)
  │▁▂▃▄▃▅▃▄▅▃▅▅▃  hand teaching spine (1–13: one mechanic per step)
  └──────────────────────────────────────────────▶ level
```

Three stacked progressions run at once:

1. **Mechanic progression** (the *what*): one new verb per hand level
   (§3 of level_design.md), act-budgeted combinations in the campaign.
   By level 13 the player has seen every mechanic in the game.
2. **Density progression** (the *how hard*): hazard count, route narrowness,
   par tightness, level size all ratchet within the acts; the finale
   (50) is the only 12×12 and the only key/lock.
3. **Mastery progression** (the *how well*): par, medals, ghosts, dailies
   — the second game that never locks out.

## 2. All 50 levels open from the start (ADR-011)

**Decision (2026-11-06, player-directed):** no gating. The level select is
a wall of 50 active cards from the first launch.

Design consequences (all deliberate):
- The curve becomes a **menu, not a wall** — a player stuck on 23 can play
  11 to recover (the genre's "rage-quit valve"), then return. This directly
  answers the #1 reflex-game complaint class: *frustration without
  release* (research §6, SHG threads).
- The teaching order is preserved by **list order + act structure + HUD
  mechanic chips**, not by locks. A player who jumps to 47 discovers the
  Spire's density and chooses their own path back.
- Replay economics change: medal/par chasing on *any* level is always
  available, so "completion" (all golds) is the real endgame target —
  the EDGE S-rank loop, but open.
- Reverting to gated progression is two lines in `openLevels()`
  (agent_rules.md §1.7: don't re-add gating without an explicit request).

## 3. Par as the mastery axis

Par = BFS shortest route (algorithms §3) — the theoretical minimum rolls,
computed from the *same* move law the player uses, so "par clear" always
means "you found the shortest possible line". It is shown in the HUD
(`moves / par`) and on the win panel (`N (par)`), and it feeds the medal
(≤ par rolls = 1 medal point).

Why rolls and not time for par: rolls are quantized by the grid — a
deterministic, teachable, replayable metric. Time stays the *ghost*
metric (your best run's clock), giving both a tactical target (par) and a
reflex target (time) without one number doing both jobs.

## 4. Medals & the open-ended chase

3 independent criteria → bronze/silver/gold (GDD §7). The design intent:
**no level ever feels finished.** After a first clear, the win panel
tells you exactly what's missing (shards? par? time?) — the next attempt
has a *named* objective. This is the retention loop the research found in
EDGE's S-ranks and SHG's records, implemented without any lockout.

## 5. Dailies as the daily tick

One date-seeded, proven level per day, own medal track, 14-day history.
Roles: (a) retention tick (the genre's "daily" pattern — Alto's, Block
Blast); (b) live exercise of the prover pipeline on fresh data every day;
(c) a low-stakes arena for a mechanic the player hasn't mastered (the
generator's mix varies day to day).

## 6. Known progression risks (honest list)

- **Mid-act plateau:** the generator's per-act budget can produce two
  adjacent levels of equal difficulty (observed in Lattice). Mitigation in
  the current pipeline: act-conditioned par bands + size drift; a
  "difficulty delta" verifier check is a possible future gate (logged in
  progress.md).
- **Post-completion wall:** after all golds, the only remaining metrics
  are time + dailies. Future candidates (not shipped, research §7):
  weekly event, share-code leaderboards.
- **No checkpoint in the finale:** 12×12 with key/lock and 19+ par rolls
  is the longest "one life" in the game — accepted (the boss should be a
  wall *you* chose), but the first complaint to watch.
