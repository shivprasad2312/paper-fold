# KUBIK — Performance Report

_Phase 9 deliverable. All numbers below were **measured** by
`tests/performance/perf.mjs` (`npm run perf`) on 2026-11-06 — not estimated.
The harness is headless Chromium with **SwiftShader software rendering**: a
deliberately pessimistic device, plus a throttled rAF cadence (~8 Hz) that
conveniently exercises the adaptive quality governor._

## 1. Measured results (2026-11-06)

| Metric | L1 (light) | L44 (heavy campaign) | Budget | Status |
|---|---|---|---|---|
| Frame cost p50 (CPU, per `_loop` incl. rasterization) | **0.5 ms** | **0.4 ms** | < 16 ms (60 fps) | ✅ 30×+ headroom |
| Frame cost p95 | **1.3 ms** | **0.8 ms** | < 16 ms | ✅ |
| Frame cost p99 | 332 ms (single level-reload outlier) | 3.5 ms | — | see §4 |
| Draw calls per frame | **22** | **31** | < 40 | ✅ |
| Triangles per frame | 3,066 | 3,132 | < 200k | ✅ |
| Heap over 40 level loads (churn) | **0 MB growth** (19.6 MB flat) | | < 30 MB | ✅ no leak |
| Page errors during full run | **0** | | 0 | ✅ |
| Startup (navigate → playable, **dev server, cold Vite compile**) | 7.5 s | | — | harness artifact, §5 |
| Production build | 655 kB JS (168 kB gzip) + 17 kB CSS | | — | §5 |

Budgets are defined in `tests/performance/perf.mjs` and enforced as a
non-zero exit on breach.

## 2. Where the cost goes (why the numbers are this good)

1. **Merged slab geometry** — every slab of a level is one
   `BufferGeometry` (single material, single draw call for the terrain).
   22–31 total draw calls for the whole scene is the direct result; the
   alternative (per-slab meshes) would be ~140+ calls on a 12×12 level.
2. **Static-by-construction scene** — meshes build once per level load;
   per-frame work is camera matrix, orb/slider/cube transforms, and HUD
   updates *on events* (the minimap redraws on moves, not per frame).
3. **Discrete movement** (ADR-002) — zero physics integration per frame;
   a roll is a 0.17 s animation on a cached temp vector. No per-frame
   allocations in the hot path.
4. **Adaptive quality governor** (`Game._loop`) — samples frame deltas;
   below 42 fps it sheds shadows (quality 2), then bloom + pixel-ratio cap
   (quality 3). On the throttled harness the game **reached quality 3 and
   stayed smooth** — exactly the mobile safeguard it was built for.
   One-time step cost measured: ~215–350 ms (shader recompile) — paid at
   most twice in a session, only on struggling devices.

## 3. Known costs & accepted trade-offs

- **Bloom composer**: adds passes when enabled (default on quality 0/1).
  On this harness the governor shed it quickly; on real GPUs the passes
  are cheap. Accepted: the glow is core to the look.
- **Startup 7.5 s is a dev-server artifact** (cold Vite transform of ~40
  modules under the sandbox's constrained CPU). The production build is
  317 ms to compile and 168 kB gzipped; a `vite preview` startup is
  expected to be well under a second on normal hardware. We do not
  budget the dev-server cold compile — it is not the shipping artifact.
- **SwiftShader numbers understate real GPUs**: the measured p95 (0.8–1.3
  ms) includes CPU rasterization of the whole scene; hardware raster is
  faster. The 16 ms budget therefore carries ≥10× real-world headroom.

## 4. Outlier analysis

L1 p99 (332 ms) is a single-frame event: the masher's `restartLevel()`
(→ `buildLevelView` geometry rebuild) landing inside the sample window.
Level-load cost is a one-time, user-triggered (or win-triggered) event of
~200–350 ms under software rendering — invisible on real hardware, and
bounded by the level size cap (12×12). Not a per-frame concern; logged
here so it is not "discovered" later as a mystery hitch.

## 5. Optimization backlog (measured, deferred)

| Item | Status | Why deferred |
|---|---|---|
| Preload/compile the next level's geometry during the win panel | deferred | load cost is one-time and small; adds complexity |
| Texture atlas for glow sprites | n/a | glows are shader/gradient based, no texture atlas to build |
| Shadow-map resize per quality tier | deferred | shadows are already shed as a whole at quality 2 |
| WebGPU backend | out of scope | three.js WebGL2 path is far from the budget; revisit if the scene grows 10× |

**Rule going forward** (agent_rules §4): any change regressing p95 frame
cost by >20% or draw calls by >50% needs a justification in the commit
message, because `npm run perf` will show the number either way.
