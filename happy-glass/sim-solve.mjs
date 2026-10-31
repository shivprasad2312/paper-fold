/* sim-solve.mjs -- headless solvability check.
 *
 *   node happy-glass/sim-solve.mjs
 *
 * For every level we try a family of single straight ramps (the way a player
 * would first attempt it), simulate, and report the best fill reached. A level
 * whose best attempt is 0 is almost certainly broken geometry -- the water never
 * gets anywhere near the glass no matter what you draw.
 */
import { LEVELS } from "./levels.js";
import { createWorld, addInkStroke, step, fillState } from "./engine.js";

const DT = 1 / 60;
const SECONDS = 5;

function run(level, stroke) {
  const w = createWorld(structuredClone(level));
  if (stroke) addInkStroke(w, stroke);
  let best = 0;
  for (let i = 0; i < SECONDS / DT; i++) {
    step(w, DT);
    const f = fillState(w);
    best = Math.max(best, f.ratio);
    if (w.win) break;
  }
  return { best, win: w.win, t: w.winTime };
}

function ramp(cx, cy, len, deg) {
  const a = (deg * Math.PI) / 180;
  const dx = Math.cos(a) * len / 2, dy = Math.sin(a) * len / 2;
  return [{ x: cx - dx, y: cy + dy }, { x: cx + dx, y: cy - dy }];
}

let failures = 0;
for (const [i, level] of LEVELS.entries()) {
  let best = { best: 0 };
  let bestCfg = null;
  for (const dx of [-180, -110, -40, 40, 110, 180]) {
    for (const dy of [320, 420, 520]) {
      for (const deg of [-30, -18, -8, 8, 18, 30]) {
        const len = Math.min(level.ink, 300);
        const stroke = ramp(level.pipe.x + dx, dy, len, deg);
        const r = run(level, stroke);
        if (r.best > best.best) { best = r; bestCfg = { dx, dy, deg }; }
      }
    }
  }
  const ok = best.best > 0.05;
  if (!ok) failures++;
  console.log(
    `L${String(i + 1).padStart(2)} ${level.name.padEnd(16)} ` +
    `best fill ${(best.best * 100).toFixed(0).padStart(3)}%` +
    `${best.win ? " (cleared)" : "        "}  ${ok ? "ok " : "BAD"} ` +
    (bestCfg ? `ramp dx=${bestCfg.dx} dy=${bestCfg.dy} ${bestCfg.deg}deg` : "")
  );
}
console.log(failures ? `\n${failures} level(s) unreachable by any tested ramp` : "\nall levels reachable");
process.exit(failures ? 1 : 0);
