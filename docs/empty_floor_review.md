# Empty-floor review — 2026-10-23

The owner's L94 screenshot exposed a gap between solvability and level quality:
large flat terraces could pass both the scale floor and the obstacle-engagement
law. A compulsory obstacle somewhere does not make a mostly empty board good.

## Audit and scope

`node scripts/empty-floor-audit.mjs` reports same-height rectangles free of
mechanics, patrol lines, start, goal and shards. Both dimensions must be ≥3,
the longer ≥8, area ≥32. These are **review warnings**, not automatic proof
of bad design. Initially 32 campaign/Vault boards were flagged. Smaller safe
landings and disconnected scenery are not silently called broken.

The offline generator gate and catalogue verifier now reject empty rectangles
of **96 or more tiles** (an 8×12 blank plaza). This is an upper bound, not a
substitute for playtesting. Smaller warnings remain visible in the audit.
Zero-height slabs count as floor too. The daily generator is unchanged; its
14 sampled layouts are checked by the catalogue verifier.

## Curated boards

19 boards received void slots that divide broad terraces into narrower fingers
and cross-aisles. Start, goal, shards, mechanics, heights and proven pars stay
unchanged. Goal/key/shard shortest walks and furniture-adjacent safety tiles
are retained; the full shared gate re-proves each edited definition. Only maps
are edited; no sentinel or platform is added as decoration. The 17 generated
boards are spliced into static campaign data; L192/L196 are hand definitions.

| Level | Name | Largest empty rectangle before | After |
|---|---|---:|---:|
| 55 | The Drop Deck | 85 | 0 |
| 61 | Pothole March | 180 | 36 |
| 68 | The Lost Stair | 190 | 0 |
| 84 | Overweave | 209 | 57 |
| 94 | Struck Through | 119 | 0 |
| 129 | The Crossing | 184 | 45 |
| 137 | The Turnaround | 260 | 91 |
| 148 | The Fee | 228 | 36 |
| 162 | The Squeeze | 152 | 60 |
| 166 | The Load | 176 | 39 |
| 171 | All Hands | 184 | 56 |
| 182 | Over the Line | 286 | 39 |
| 185 | The Final Weave | 200 | 33 |
| 186 | Loose Ends | 198 | 60 |
| 189 | The Unwinding | 161 | 33 |
| 192 | The Turning | 110 | 54 |
| 195 | The Last Step | 154 | 36 |
| 196 | Beneath the Rim | 66 | 36 |
| 198 | The Spire Reclimbed | 240 | 36 |

“0” means no rectangle meeting the warning dimensions, not no plain floor.
Smaller safe rooms and route choices remain intentional; this is not a claim
that every level now has exactly one or two graph-theoretic paths.

## Regression coverage

`tests/unit/empty-floor.test.mjs` checks broad vs narrow floor, height changes,
L94, reductions on the 17 generated boards, and the 96-tile ceiling on every
campaign/Vault definition. Run `npm run verify`, `npm run scale`, and
`npm run difficulty -- --strict` alongside real live play; none replaces it.

Executed validation: focused live batch 18/18 (17 generated boards + daily),
wheel batch 3/3 (two hand boards + daily), zero page errors in both; static
verifier 200+10+14; scale audit; difficulty `--strict`; production build.
L94's updated rendering inspected at 950×830. Eight dedicated audit tests
cover warning dimensions, differing heights, zero-height floor, transposed
rectangles, the L94 regression and catalogue-wide ceiling.
