# KUBIK — Genre Research & Competitor Analysis

_Phase 1 deliverable. Research date: 2026-11-06. Sources: live store reviews (cited),
genre knowledge, and our own shipped implementation (the analysis is written to
justify/refute what the code already does)._

## 1. Genre definition

KUBIK sits in the **minimalist reflex-puzzle** lane: a one-touch input
(roll in 4 directions), instant death, instant restart, floating-platform 3D
set dressing, short levels (10–40 s), and mastery-driven replay (times, ranks,
leaderboards). The direct design ancestor is Mobigame's **EDGE** (2009–2015,
mobile/console ports); the spiritual siblings are **Super Hexagon**,
**Geometry Dash**, **Tiny Planet**, and **1000 Steps**.

## 2. Top 10 references

| # | Game | Core loop | Why players enjoy it | Retention mechanic |
|---|------|-----------|----------------------|--------------------|
| 1 | **EDGE** (Mobigame) | Roll cube across floating slabs, dodge/push/move through hazards to the gate | "Simple principle but it still gets pretty hard"; tight, readable geometry; satisfying physical roll | Per-level medal times (players report S-ranks are "diabolical"); Extended edition added hard endgame |
| 2 | **Super Hexagon** (Two Tribes) | One-axis rotation, survive rotating hex pattern | "Every time you die it's your own fault" — **perfectly fair difficulty**; rhythm soundtrack | Per-level leaderboards, 130 s+ mastery records |
| 3 | **Geometry Dash** (RobTop) | Auto-run, tap to jump/flip through pattern levels | Pattern-memorisation payoff; music sync | Level editor + community levels (huge), rank chasing |
| 4 | **Tiny Planet** (Gameloft) | Tap planet to move a ball across arcs | Same 1-input purity in 3D; elegant physics feel | Medal/trophy chase, endless mode |
| 5 | **Monument Valley 1/2** (ustwo) | Tap/rotate to re-route a princess through impossible geometry | Perspective puzzles as "living art"; calm | No grind — completionism + art |
| 6 | **1000 Steps** (Clever Dys) | Roll ball down 1000 steps, one-tap steering | Precision micro-reflexes; zen visuals | Step records, hidden paths |
| 7 | **Alto's Odyssey** (Snowman) | Endless hill-roll, tap to jump/flip | Flow state, procedural beauty | Daily challenge, coins, character unlocks |
| 8 | **Two Dots** (Playdots) | Tap to connect coloured dot paths | "Just one more level" loop; soothing audio | 4000+ levels, weekly events, social |
| 9 | **Paper Trail** (Molehill) | Drag paper planes along cut paths | Narrative + mechanical novelty | Story chapters, achievements |
| 10 | **Silent Dot** (AstralShift) | Guided dot through minimalist patterns | Minimalism, gentle pacing, "breathing" levels | Level completion, calm replay |

Honourable mentions: **Moncage** (car physics, 1 input), **Block Blast**
(instant-gratification + dailies), **Squex** (pure reflex training).

## 3. What makes the loop addictive (synthesis)

1. **Input purity** — one button/one gesture. Zero learning cost, infinite
   skill ceiling. (EDGE, SHG, Tiny Planet, 1000 Steps all share this.)
2. **Instant feedback loop** — die → restart in <0.5 s. No menus between
   attempts. The retry *is* the loop.
3. **Fairness** — "the game didn't do anything unfair, I just fucked up"
   (top SHG sentiment). Every death is readable and self-blameable. RNG that
   can kill you breaks this (see §5).
4. **Readable geometry** — hazards telegraphed by position/motion, no hidden
   rules. Players say EDGE's level design is "really neat".
5. **Mastery metrics** — times and ranks create an open-ended second game
   (EDGE S-ranks; SHG 130 s records).
6. **Short, varied units** — 10–40 s levels keep failure cheap and novelty
   high; difficulty rises in visible steps, with a deliberately harder
   endgame ("the increase in difficulty on the last few levels helps keep
   you engaged even after the full game has been beaten" — EDGE Extended
   review).
7. **Music as metronome** — in pure-reflex games the soundtrack sets the
   pace (SHG explicitly praised for this).

## 4. UI/UX & presentation patterns (what works)

- **Level select as a wall of cards** with completion state + best medal
  (EDGE; adopted by us).
- **In-level HUD: minimal** — score/time top, hint bottom, nothing else.
- **Win screen**: big medal, time, shards, best — and one prominent
  *Next* button (the retry/advance gesture).
- **No pause pressure**: one-tap pause overlay; auto-pause on background.
- **Onboarding by level design, not text**: level 1 teaches roll-to-gate in
  one sentence ("Roll to the gate").
- **Theme/visual variety** as a cosmetic layer, never a mechanic.
- Camera options are rare in the genre — an opportunity (we ship 4 seats).

## 5. Monetization landscape

- EDGE/EDGE Extended: paid (demo on store). Complaints: ads in the free
  version "glitching", payment friction.
- Super Hexagon: paid ($2). Geometry Dash: F2P + IAP (removal of ads).
- Alto's Odyssey / Two Dots / Block Blast: F2P + IAP + events + battle passes.

**Decision for KUBIK: free, offline, no ads, no IAP.** The research shows
ad-monetized reflex games get dinged for intrusive ads at the exact moment
the loop is most intense. Our retention levers are the ones that *improve*
the loop: dailies, medals, ghosts, par. (A store build can revisit IAP-free
pricing later.)

## 6. Negative reviews & recurring complaints (what to avoid)

| Complaint | Source | KUBIK answer |
|-----------|--------|--------------|
| Touch/dpad input "delayed response", "won't respond to my swipes… I have to swipe several times" | EDGE store reviews [1][3] | Input is applied on keydown with a **2-deep buffer queue**, so a roll never eats the next input; hold-to-roll covers mobile thumb dwell. Regression-tested. |
| "Interaction w/ moving blocks is rly janky when you're half on the block half on air" | EDGE [3] | Blocks are **tile-discrete**: a push is a full-tile deterministic operation, there is no half-state to be janky in. |
| Crash on a specific moving-block level (EDGE Extended, level 12 "Furious Bot") | [2] | Levels are **proven solvable by an automated verifier + played to completion by a bot in CI** before commit; a crash or dead level blocks the build. |
| Control layout "not up/down/left/right as normal… good luck with big fingers" | EDGE Extended [2] | 4-way arrows/WASD/swipe — the canonical layout; 44 px+ touch targets. |
| Lag on low-end phones | EDGE [2] | Single merged slab mesh, no shadow acne, no per-frame allocations in the hot path; perf budget tracked in `tests/performance/`. |
| Eye strain from fast neon visuals | SHG [4] | Two full themes (dark + high-key light) + 4 camera seats; hazard motion is periodic and readable, not strobe-fast. |
| "Fake difficulty" — difficulty caused by controls, not design | SHG [5][6] | Death causes are exactly: fell, crumbled, sentinel, locked gate. All deterministic (no RNG at runtime). |
| Repetition / "hold forward to win" fatigue | SHG thread [5] | 50 distinct layouts across 5 acts; each hand level introduces or combines one mechanic; generator forbids duplicate layouts (seeded, proven). |

## 7. Retention mechanics worth keeping / adding

- ✅ **Daily challenge** (date-seeded, verifiable, medal-tracked) — Alto's /
  Block Blast pattern, fits our deterministic core perfectly.
- ✅ **Ghosts** (race your best run) — Geometry Dash-style; implemented.
- ✅ **Medals + par** — EDGE S-rank pattern; implemented (3 criteria).
- ➕ *Future (not shipped)*: weekly themed event, shareable run cards,
  local leaderboard of friends via share-code. Logged in `progress.md`,
  not built — no feature without a loop that improves the 10-second retry
  cycle.

## 8. Differentiators (what nobody in the genre ships)

1. **Provably solvable levels, enforced in CI.** Every level is
   (a) logically solved by a pure-Node verifier (route, push budget,
   crumble survival, spawn safety, no soft-lock) and (b) *played to
   completion by a real keyboard-driven bot* in a real browser. No shipped
   reflex game we found guarantees this; EDGE's crash bug [2] is exactly
   the class of defect this catches.
2. **Zero assets.** All art is procedural (merged geometry, generated
   glow textures), all audio is synthesized Web Audio. The whole game is
   source code — small, auditable, offline.
3. **Camera as a feature.** Four orbit seats with screen-input remap; the
   genre standard is one fixed camera.
4. **Mastery without lockout.** All 50 levels open from start; difficulty is
   a menu, not a wall (deliberate choice — see GDD §Progression).

## 9. References

- [1] EDGE — Google Play reviews (dpad delay, level-design praise, S-rank
  chasing) — play.google.com/store/apps/details?id=net.mobigame.edge
- [2] EDGE Extended — Google Play reviews (4.1★, 3.25K: crash on level 12
  "Furious Bot", control layout, lag) — play.google.com/store/apps/details?id=net.mobigame.edge.extended
- [3] EDGE on AppBrain (4.60★ / 2.7K ratings: moving-block jank, swipe
  non-response, ad glitches) — appbrain.com/app/edge/net.mobigame.edge
- [4] Super Hexagon analysis (addictive/fair difficulty; eye strain, control
  sensitivity negatives) — niklasnotes.com/dashboard/game/55156/super_hexagon
- [5] r/gaming Super Hexagon thread ("not real difficulty", "my own damn
  fault" fairness) — reddit.com/r/gaming/comments/1ac4t8
- [6] Steamgifts SHG discussion (frustration + 70-hour retention) — steamgifts.com/discussion/vntGI
- [7] FoxData "10 Best Puzzle Mobile Games in 2025" (Two Dots, Block Blast,
  Paper Trail retention patterns) — foxdata.com/en/blogs/10-best-puzzle-mobile-games-in-2025
- [8] AndroidAyuda reflex-game list (Squex, Luminous Tap — 1-input purity)
  — en.androidayuda.com/games/lists/reflex-games-android
