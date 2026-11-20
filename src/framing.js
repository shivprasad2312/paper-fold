// ---------------------------------------------------------------------------
// KUBIK — camera helpers that are pure math
//
// The camera itself has exactly ONE law: the whole board is fitted on screen
// at the live yaw, and the only movement is a small clamped parallax toward
// the cube (src/stage.js). There is no follow window, no panning and no
// zooming — the puzzle is read as a single picture.
//
// What is left here is the one question the stage cannot answer on its own:
// is the cube hidden behind level geometry? Keeping it as a pure function
// (no three.js, no renderer) is what makes it testable — the alternative is
// a bug that can only be seen by looking at the screen.
// ---------------------------------------------------------------------------

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
