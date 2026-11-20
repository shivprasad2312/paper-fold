// ---------------------------------------------------------------------------
// KUBIK — camera framing law (Phase G, ADR-045)
//
// Pure math, no three.js: the stage feeds world-space corners, this decides
// how much of the board is on screen and where the view sits. Keeping it pure
// is what makes the camera testable — the alternative is a camera that can
// only be checked by looking at it.
//
// Two laws, one camera:
//
//   FIT    — boards up to `followSpan` tiles are shown whole, exactly as
//            they always were. Teaching boards are small BECAUSE reading the
//            whole puzzle is the lesson, so they must not start panning.
//   FOLLOW — bigger boards show a window that tracks the cube. The window is
//            a fixed fraction of the fit (zoom), floored so the player always
//            sees a usable plan area and capped so a 30×30 finale does not
//            zoom out to a postage stamp. The window is clamped to the board
//            so the view never drifts into empty space.
//
// The two laws meet at the same value: at `followSpan` tiles follow == fit,
// so crossing the threshold changes nothing on screen. That continuity is
// deliberate — a level that suddenly re-framed at act 3 would read as a bug.
// ---------------------------------------------------------------------------

export const FRAMING = {
  /** Board span (max of width, height, in tiles) where follow begins. */
  followSpan: 13,
  /** Follow half-height as a fraction of the whole-board fit. */
  zoom: 0.52,
  /** Never closer than this half-height (world units ≈ tiles). */
  minHalfH: 6.6,
  /** Never further than this half-height, however big the board. */
  maxHalfH: 10.8,
  /** Portrait guard: keep at least this half-width on screen. */
  minHalfW: 4.4,
  /** Cube travel (world units) before the view re-centres. */
  deadZone: 1.1,
  /** Void allowed past the board edge before the view stops panning. */
  edgePad: 2.2,
  /** World units of view the subject must keep between itself and the edge. */
  keepInside: 1.2,
};

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

/**
 * The half-height of the orthographic view for a level.
 *
 * @param {object} o
 * @param {number} o.fitHalfH half-height that shows the WHOLE board
 * @param {number} o.aspect   viewport width / height
 * @param {number} o.span     board span in tiles (max of width, height)
 * @returns {number} half-height to render with
 */
export function halfHeightFor({ fitHalfH, aspect, span }) {
  if (!(fitHalfH > 0)) return 8;
  if (span <= FRAMING.followSpan) return fitHalfH;
  let halfH = Math.max(FRAMING.minHalfH, fitHalfH * FRAMING.zoom);
  halfH = Math.min(halfH, FRAMING.maxHalfH);
  // portrait phones: the horizontal window is halfH*aspect — widen the view
  // rather than hand the player a two-tile-wide slit to plan in
  const a = Math.max(0.32, aspect || 1);
  halfH = Math.max(halfH, FRAMING.minHalfW / a);
  // never zoom OUT past the whole-board fit
  return Math.min(halfH, fitHalfH);
}

/** True when this board gets the follow camera. */
export function isFollowBoard(span) {
  return span > FRAMING.followSpan;
}

/**
 * Where the camera should look, in the board's screen-right / screen-up
 * ground axes (both unit vectors lying in the xz plane).
 *
 * `r`/`u` are the cube's offset from the board centre in those axes.
 * The result is clamped so the view stays on the board, and dead-zoned so
 * a cube standing still does not make the camera breathe.
 *
 * @returns {{r:number, u:number}} focus offset in the same axes
 */
export function focusFor({
  r, u, spanR, spanU, halfH, aspect, prevR = 0, prevU = 0,
  deadZone = FRAMING.deadZone, snap = false,
}) {
  const halfW = halfH * aspect;
  // The clamp keeps the view ON the board (no drifting into empty space) —
  // but the SUBJECT always wins. If the cube stands nearer a board edge than
  // the window can otherwise reach, the camera must still follow it, or the
  // player loses the thing they are steering. Measured at L60/L166 on the
  // first build of this law: the cube projected outside the frame at spawn.
  const keep = FRAMING.keepInside;
  const needR = Math.max(0, Math.abs(r) - Math.max(0, halfW - keep));
  const needU = Math.max(0, Math.abs(u) - Math.max(0, halfH - keep));
  const maxR = Math.max(Math.max(0, spanR + FRAMING.edgePad - halfW), needR);
  const maxU = Math.max(Math.max(0, spanU + FRAMING.edgePad - halfH), needU);
  const tr = clamp(r, -maxR, maxR);
  const tu = clamp(u, -maxU, maxU);
  const pr = clamp(prevR, -maxR, maxR);
  const pu = clamp(prevU, -maxU, maxU);
  // a level starts with the camera ON the cube, not at the board centre: the
  // dead zone is about not breathing while the cube stands still, never about
  // leaving the subject off screen at spawn (caught by screenshot at L166)
  if (snap) return { r: tr, u: tu };
  if (Math.abs(tr - pr) < deadZone && Math.abs(tu - pu) < deadZone) {
    return { r: pr, u: pu };
  }
  return { r: tr, u: tu };
}

/**
 * The vertical screen offset a cube gains by standing higher than the board
 * centre, expressed in ground units along the screen-up axis. Without this a
 * cube on the third ring of a tower sits near the top edge of a tight
 * follow view; with it the camera slips back and the cube stays centred.
 *
 * Derivation: screen-up coordinate of a world point is dot(p - target, up).
 * Setting it to zero for a cube at ground offset g and height dy gives
 * u = dot(g, U) + dy * up.y / |upGround|.
 */
export function heightCompensation(dy, up) {
  const s = Math.hypot(up.x, up.z);
  if (!(s > 0.05)) return 0;
  return dy * (up.y / s);
}

/**
 * Is the subject hidden behind level geometry from this camera?
 *
 * Walks the segment from the subject toward the camera and asks the level's
 * height map whether the ray is inside a slab. `heightAt(x, z)` returns the
 * TOP height of the tile at that world position, or -Infinity for void.
 * Samples within `ignoreNear` world units of the subject are skipped — the
 * cube's own tile must never count as an occluder.
 *
 * A ray test, not a screen test: it needs no renderer, which is why the
 * tests can pin it.
 */
export function isOccluded({ from, to, heightAt, ignoreNear = 0.9, step = 0.32 }) {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const dz = to.z - from.z;
  const len = Math.hypot(dx, dy, dz);
  if (!(len > ignoreNear)) return false;
  // walk from the subject back toward the camera
  for (let d = ignoreNear; d < len - step; d += step) {
    const t = d / len;
    const x = from.x + dx * t;
    const y = from.y + dy * t;
    const z = from.z + dz * t;
    const h = heightAt(Math.round(x), Math.round(z));
    if (Number.isFinite(h) && h > y + 0.08) return true;
  }
  return false;
}
