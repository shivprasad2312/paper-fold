# Jungle level design: historical research and implementation notes

These notes record work before the later chain-reaction pass. The current game was reconstructed approximately, not restored from that historical snapshot. References to tests, layouts and results below describe the versions tested at the time; they do not validate the reconstruction.

## What informed the plan

- Valve's *Half-Life 2* design-process presentation recommends measurable goals, small experiments, watching external players without coaching, and iterating on evidence rather than relying on the designer's intuition: https://steamcdn-a.akamaihd.net/apps/valve/2006/GDC2006_HL2DesignProcess.pdf
- A discussion of *Super Mario 3D World* describes introducing an idea, developing it, adding a twist and resolving it: https://mcvuk.com/business-news/publishing/video-nintendos-level-design-secrets-in-four-steps/
- The Level Design Book describes teach/test/twist pacing and spacing those beats rather than introducing all ideas simultaneously: https://book.leveldesignbook.com/process/preproduction/pacing
- The Fallout 3/Skyrim iterative-design account describes repeatedly testing and refining playable levels instead of treating a plan or polish pass as proof: http://blog.joelburgess.com/2014/07/gdc-2014-transcript-iterative-level.html

These are general design practices, not a claim that these studios used our specific physics, tuning or testing methods.

## Requirements and plan

1. Preserve seven mangoes, two swinging bombs, fixed separated rooftops, real falling objects, independent world progress and the clearance-only win rule. Do not hang a character or enforce bomb use in the victory condition.
2. Use three visibly rising bases whose widths, offsets and heights vary across authored jungle levels while preserving gaps and accessible trajectories. Vary structure silhouette, physical footholds, materials, layout, cargo and tier heights, not just names or decorations. Use deterministic layouts, so a retry is fair.
3. Put at least three visible structural courses in each jungle bay, with different shapes and proportions. Introduce an understandable physical cascade early: a first impact moves other bodies through actual collisions; no scripted mass deletion or forced win.
4. Keep difficulty paced: introduce, develop and combine ideas across the 30 levels. Bomb blasts should help physically and ordinary shots should not automatically clear the whole board. Prioritize playable levels over unverified claims of guaranteed difficulty.
5. Validate at rest; check fixed bases, gaps, on-screen pieces and direct reachability; run real-pointer bomb-assisted and mango-only searches; check shot counts and short clears; exercise mobile and both bomb interactions; verify snow/desert regressions and production build. Bots are finite search strategies, not proof of impossibility or a substitute for observing real players. Record failures honestly and revisit unverified layouts.

## Earlier three-base redesign checks (historical baseline)

- Six physical blueprints are varied by deterministic per-level dimensions, materials and orientation. The three fixed islands vary their width, elevation, horizontal offset and clipped stone silhouette while keeping gaps and an ascending shot line. Twin towers and gateway/cart cargo have visibly raised third courses; these are counted moving bodies, not decorative tiers.
- Browser smoke checks all 30 jungle levels for three or more structural courses per bay, varied bay/base geometry, and 1,200-frame idle stability. It fires a real mango into each of levels 61–65 and measures subsequent structural body-to-body collisions with both bombs untouched. This is collision telemetry, not a scripted collapse. The full browser suite and production build passed; a separate reachability check hit 108 isolated low targets across the three worlds.
- Bomb-assisted real-pointer searches cleared 28/30 jungle levels within seven mangoes: levels 62–90 were tested together in three groups, and level 61 was retested after its introductory towers lost one stray central block. Levels 73 and 83 each retained one piece after up to 220 attempts. This is an open balance issue, not proof those levels are impossible. Successful runs used 3–7 mangoes, so the earlier goal of making all seven necessary is not achieved.
- A separate mango-only search found no wins in eight attempts per level, but this finite search cannot prove that bomb-free wins are impossible. Automated testing does not substitute for human playtesting. The victory condition remains purely physical clearance: no bomb-use or shot-count gate.
- Desert regression: 30/30 bot wins with bombs untouched. Snow: 30/30 in the preceding unchanged-physics sweep.

## Four-base study and prototype plan

The four supplied screenshots show the sling on a separate left-hand perch and the puzzles to its right. Their ledges are deliberately different heights and widths, with clear visual gaps, and their structures mostly use horizontal floors supported by upright pieces. Targets and payloads occur within and above those floors, rather than only on the roof. The jungle example has a much higher middle island; the snow example builds on roofs and raised scaffolds; the lava example spreads towers across three plinths; the forest example places the sling high and uses widely separated platforms. The promotional overlays obscure parts of several levels, so these screenshots alone do not establish exact physical mechanics or difficulty.

For our existing fixed-screen, single-sling physics, copying the jungle image's high middle/low far island would repeat the low-target occlusion problem. Prototype a four-bay jungle level with a separate launcher, fixed ascending roof surfaces, meaningful gaps, a taller open-frame tower with a character inside, and physically supported payload. Keep the two swinging bombs, seven mangoes and clearance-only victory. First test rest stability, frame visibility, gaps, direct low-target shots on all four roofs, mobile and full bomb-assisted playthroughs. Do not roll this geometry through all levels unless it is playable and the camera has room; record any unresolved results rather than claiming success. Snow and desert layouts remain unchanged.

## Progressive challenge plan (jungle levels 61–90)

Maintain three bases while players learn the structures in 61–70; develop larger towers and mixed supports in 71–80; and introduce four-base layouts as intermittent late-chapter challenges in 81–90 rather than repeating one arrangement everywhere. Use distinct authored blueprint combinations and vary tower position and silhouette. Increasing the number of objects alone is not a difficulty metric: test rests, visibility, all-base trajectories and actual wins under the unchanged seven-mango budget, and track short clears separately. Keep a rhythm of easier recovery levels between challenge peaks. Any rollout remains provisional until those tests run; existing unresolved levels must be recorded rather than silently called wins.

## Progression experiments

- Tall open-frame towers now appear in levels 75 and 79 with different adjacent structures. Real-pointer bomb-assisted traces cleared these levels in seven and six shots respectively; the tests replay those shots without any clearance fixture. This does not prove those shot counts are minimums.
- Four-base versions of levels 82, 85 and 88 were tested, including a lighter lookout variation. Each bay could be directly hit with its structures intact and bombs untouched, and isolated low-target checks passed. However, 120-attempt bomb-assisted searches still left a best of three, two and four pieces respectively. Those unverified variants were initially held back; see the subsequent debris-tuning results below. This search was not proof that no solution existed.
- Level 90 remains the four-base finale prototype. Earlier high-blast testing found a three-shot win, so it does not yet meet the requested seven-mango difficulty goal. Moving its first bomb further from the structures reduced the early blast, but a 140-attempt search then failed to clear the level (best two pieces remaining); that change was reverted. The current layout retains the verified short solution and needs further balance work. No shot-count or bomb-use win gate is used.

## Extra bomb-shot experiment

Tested the unshipped lighter four-base versions of levels 82, 85 and 88 in an isolated development copy. The test copy allowed eight mango launches: one initial shot at a bomb plus up to seven further shots. Only runs where exactly one bomb detonated and the other stayed attached were eligible. The player used normal pointer input, structures remained physical, and no clearance fixtures were used. At most 200 seeded attempts per level produced 145 valid one-bomb openings per level. No full win was found: the best eligible attempts had 2 pieces left in level 82, 2 in level 85 and 1 in level 88. An additional separate 120-attempt-per-level search allowed either or both bombs; it also found no wins, with the best runs leaving 2 pieces per level. These are finite searches, not proof of impossibility, and their different aiming strategies are not a controlled comparison.

At that point the production game was not switched to eight shots and the experimental four-base layouts had not been deployed. The helper scripts now create an eight-shot copy of the **current**, subsequently tuned layouts; they do not recreate the earlier geometry. Run `node tests/prepare-jungle-eight-shot-copy.mjs`, start Vite in the printed temporary directory, then run `CHROME_PATH=/path/to/chromium GAME_URL=http://localhost:5174/ node tests/jungle-eight-shot-experiment.mjs`. Set `TEST_LEVELS` and `MAX_ATTEMPTS` to narrow or expand the search.

## Debris tuning and rollout (before the later friction adjustment)

- Inspection of the failed runs showed independent pieces settling on broad fixed roofs. The four-base levels 82, 85 and 88 now use slightly narrower but still solid, fixed, rising stone roofs with gaps. Structures themselves remain moving, counted bodies. A spare low rock was removed from compact pyramids; the level 85 lookout's posts stand directly on the roof instead of leaving an extra loose floor plank. These are physical layout changes, not automatic clearing.
- In deterministic real-pointer tests, levels 82, 85 and 88 now clear in six, seven and six mangoes respectively, with both bombs detonated by the opening shot in each recorded trace. The game still supplies seven mangoes, with no extra bomb-shot allocation or bomb-use victory gate. Earlier and later stages retain different structures; these are the only new four-base stages besides level 90.
- All 30 jungle levels pass the 1,200-frame idle stability and three-course checks. Real pointer tests hit an intact structure on each of all four bases in levels 82, 85, 88 and 90 without touching bombs. An independent parked-structure test checks low-target access across representative levels; it recorded 174 hits across all themes. Production build and browser/mobile smoke tests pass.
- A 16-attempt-per-level mango-only search on 82, 85 and 88 found no wins, but does not prove a bomb is necessary. The six-shot wins also show that requiring all seven mangoes has not been achieved. Human playtesting is still needed.

## Jungle base-contact friction adjustment (historical baseline)

The jungle roof/block contact friction coefficient is now 70% of Matter's normal combined coefficient. For example, a standard jungle block changes from .30 to .21 on a fixed base, and a staircase block from .55 to .385. This adjustment is applied per contact; block-to-block, character-to-base and bomb-to-base friction remain unchanged, as did the snow and desert worlds at the time. `npm run test:physics` checks the actual Matter solver over repeated contact frames and verifies a block slides farther.

All 30 jungle layouts passed the 1,200-frame idle stability check. A 40-attempt-per-level bomb-assisted real-pointer sweep cleared 28/30; focused retries cleared levels 69 and 82 in seven shots each. Together these runs found valid clears for all 30, but they do not establish a minimum shot count or rule out mango-only wins. Browser regression tests, isolated reachability tests and production build also passed.

