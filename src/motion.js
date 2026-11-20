// ---------------------------------------------------------------------------
// KUBIK — reduced-motion accessibility mode (ADR-046)
//
// The game is a cube rolling through a void. Some of that motion IS the game;
// some of it is decoration that happens around it. This module owns the line
// between the two, and the rule that decides when the line applies.
//
// THE LAW: a presentation setting may never change WHEN the world advances.
// Roll duration, sentinel periods, shuttle dwell, freeze time, slider cycles
// and the hazard clock are gameplay: the entire catalogue is verified against
// those numbers (ADR-012/018), and a setting that shortened them would
// silently invalidate every timing proof in the game. Reduced motion changes
// HOW motion is drawn — never how long it takes.
//
// What it removes (decoration):
//   · the camera's glide, its yaw easing and the death shake
//   · the cube glow's breathing pulse and the high-contrast win flash
//   · the win spin/rise (a fade instead)
//   · shard, freeze-shard and goal-pad bob/spin/breathing
//   · sentinel bob and glow pulse (the PATROL still moves — that is the game)
//   · the starfield drift, and every CSS transition/animation
//
// What it keeps, deliberately:
//   · the roll itself (a cube physically turning is the game's language —
//     flattening it into a slide would misrepresent the puzzle; ADR-049)
//   · patrol travel, pistons, shuttles and bridge cycles (each one is a
//     hazard the player must read; freezing them would make levels unreadable
//     or, worse, unplayable)
//
// Three preferences: `auto` follows the OS, `full` and `reduced` override it.
// `auto` is the default so the OS setting is honoured without a visit to the
// menu, and an explicit choice always wins afterwards.
// ---------------------------------------------------------------------------

export const MOTION = {
  AUTO: 'auto',
  FULL: 'full',
  REDUCED: 'reduced',
};

const VALID = new Set(Object.values(MOTION));

/** Sanitise a stored preference (anything unknown reads as `auto`). */
export function normaliseMotionPref(value) {
  return VALID.has(value) ? value : MOTION.AUTO;
}

/**
 * Resolve a preference against the OS signal into the one boolean the game
 * reads. `auto` is the only mode that consults the system; an explicit choice
 * is never overridden by the OS.
 */
export function resolveReducedMotion(pref, systemReduced) {
  const p = normaliseMotionPref(pref);
  if (p === MOTION.REDUCED) return true;
  if (p === MOTION.FULL) return false;
  return !!systemReduced;
}

/** The menu label: the choice, and for `auto` what it currently resolves to. */
export function motionLabel(pref, systemReduced) {
  const p = normaliseMotionPref(pref);
  if (p === MOTION.AUTO) {
    return `Motion: Auto (${resolveReducedMotion(p, systemReduced) ? 'reduced' : 'full'})`;
  }
  return `Motion: ${p === MOTION.REDUCED ? 'Reduced' : 'Full'}`;
}

/** The next preference in the menu cycle: auto → reduced → full → auto. */
export function nextMotionPref(pref) {
  const p = normaliseMotionPref(pref);
  if (p === MOTION.AUTO) return MOTION.REDUCED;
  if (p === MOTION.REDUCED) return MOTION.FULL;
  return MOTION.AUTO;
}
