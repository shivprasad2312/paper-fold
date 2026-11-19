// KUBIK — the axis-mirror law (M2.5 orientation rotation, ADR-040).
//
// act.gen.flip mirrors a PROVEN layout about the x (east-west) or z
// (north-south) axis. Every move rule is mirror-symmetric (climb 1 / drop 2,
// patrols, spring/ice resolves, shuttle docks, the sealed goal), so the
// verifier's proof carries over — but ONLY if every coordinate- and
// direction-carrying field is mirrored with the board. That is what this
// module owns, one field at a time; the conveyor and piston laws reverse the
// push along the axis being flipped, the wind vector likewise.
//
// This lives outside gen-campaign2.mjs so the law is unit-testable
// (tests/unit/mirror.test.mjs): importing the generator would run it.
//
// The generator additionally refuses any candidate whose mirrored def does
// not parse (ADR-041), which is how the missing piston dx law surfaced.

/**
 * Mirror a PROVEN level def about the 'x' (east-west) or 'z' (north-south)
 * axis — the M2.5 orientation rotation (acts.js `flip`). Every move rule is
 * mirror-symmetric (climb 1 / drop 2, patrols, spring/ice resolves, shuttle
 * docks, the sealed goal), so the verifier's proof carries over unchanged;
 * the file-level verifier (scripts/verify-levels.mjs) re-proves it anyway.
 */
export function mirrorDef(def, axis) {
  const H = def.map.length;
  const W = def.map[0].length;
  const T = ([x, z]) => (axis === 'x' ? [W - 1 - x, z] : [x, H - 1 - z]);
  const mirrorPts = (pts) => pts.map(([x, z]) => T([x, z]));
  // a direction component mirrors to its negation — but negating 0 gives
  // -0, which is not strictly equal to 0 and would leak into every unit
  // test that compares a mirrored def field by field
  const rev = (v) => (v === 0 ? 0 : -v);
  const out = {
    ...def,
    map: axis === 'z' ? [...def.map].reverse() : def.map.map((row) => [...row].reverse().join('')),
    start: T(def.start),
    goal: T(def.goal),
  };
  if (def.shards) out.shards = mirrorPts(def.shards);
  if (def.crumble) out.crumble = mirrorPts(def.crumble);
  if (def.orbs) out.orbs = def.orbs.map((o) => ({ ...o, path: mirrorPts(o.path) }));
  if (def.shuttles) out.shuttles = def.shuttles.map((s) => ({ ...s, a: T(s.a), b: T(s.b) }));
  if (def.springs) out.springs = mirrorPts(def.springs);
  if (def.ice) out.ice = mirrorPts(def.ice);
  if (def.conveyors) {
    // belt directions mirror with the board: an x-flip reverses dx, a
    // z-flip reverses dz (the belt still points along the mirrored run)
    out.conveyors = def.conveyors.map(([x, z, dx, dz]) => {
      const [mx, mz] = T([x, z]);
      return [mx, mz, axis === 'x' ? rev(dx) : dx, axis === 'z' ? rev(dz) : dz];
    });
  }
  if (def.doors) {
    // plate and doorway mirror together — the pairing is positional, so
    // the mirrored plate still sits beside the mirrored doorway
    out.doors = def.doors.map((d) => ({ plate: T(d.plate), at: T(d.at) }));
  }
  if (def.timed) out.timed = mirrorPts(def.timed);
  if (def.freeze) out.freeze = mirrorPts(def.freeze);
  if (def.heavy) out.heavy = mirrorPts(def.heavy);
  if (def.blocks) out.blocks = mirrorPts(def.blocks);
  if (def.pulse) out.pulse = mirrorPts(def.pulse);
  if (def.lifts) out.lifts = def.lifts.map((l) => ({ ...l, at: T(l.at) }));
  // piston pushers (Phase B, ADR-035): base mirrors, the push reverses
  // piston pushers (Phase B, ADR-035): the base mirrors and the PUSH
  // follows the board — an x-flip reverses dx, a z-flip reverses dz. The
  // first version negated dx unconditionally, which is right only for an
  // x-flip: under act 8's z-flip the mirrored arm struck a void cell and
  // the level would not parse (ADR-040 found it — the same class of bug
  // the conveyor mirror law exists to prevent).
  if (def.pistons) {
    out.pistons = def.pistons.map((pn) => ({
      ...pn,
      at: T(pn.at),
      dx: axis === 'x' ? rev(pn.dx) : pn.dx,
      dz: axis === 'z' ? rev(pn.dz) : pn.dz,
    }));
  }
  // turntable bridges (Phase B, ADR-036): the bar is axis-symmetric, the
  // pivot simply mirrors (a mirrored spin reads identically)
  if (def.turntables) out.turntables = def.turntables.map((tt) => ({ ...tt, at: T(tt.at) }));
  // sliding bridges (ADR-038): a group is a set of tiles — mirror the set
  // (the period/phase clock is orientation-free)
  if (def.sliders) out.sliders = def.sliders.map((g) => ({ ...g, tiles: mirrorPts(g.tiles) }));
  // clinging (Phase B, ADR-037): a crevice is a point — the grip pair
  // mirrors with the board and both banks move with it
  if (def.clings) out.clings = mirrorPts(def.clings);
  // the breeze (ADR-039) is a VECTOR: an x-flip reverses dx, a z-flip dz
  // (a wind level mirrored without this would be proven in the wrong
  // direction — the mirror law applies to every coordinate-carrying field)
  if (def.wind) {
    out.wind = {
      x: axis === 'x' ? rev(def.wind.x) : def.wind.x,
      z: axis === 'z' ? rev(def.wind.z) : def.wind.z,
    };
  }
  if (def.shrink) out.shrink = mirrorPts(def.shrink);
  if (def.grow) out.grow = mirrorPts(def.grow);
  if (def.low) out.low = mirrorPts(def.low);
  if (def.key) out.key = T(def.key);
  return out;
}

export default mirrorDef;
