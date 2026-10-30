import Matter from 'matter-js';
const { Resolver } = Matter;

// Matter combines a contact's dynamic friction using min(bodyA, bodyB).
// Changing a block's friction would also change block-on-block behaviour, and
// changing the whole roof would affect birds, bombs and differently grippy
// staircase pieces. Adjust only marked jungle-roof/block contact pairs,
// after Matter has refreshed them and immediately before velocity solving.
// Pair.friction is recomputed by Matter each step, so this is not cumulative.
const ROOF_BLOCK_FRICTION_FACTOR = 0.7;
const preSolveVelocity = Resolver.preSolveVelocity;
Resolver.preSolveVelocity = function(pairs) {
  for (const pair of pairs) {
    if (!pair.isActive) continue;
    const a = pair.collision.parentA, b = pair.collision.parentB;
    if ((a.jungleRoof && b.kind === 'block') || (b.jungleRoof && a.kind === 'block')) {
      pair.friction = Math.min(a.friction, b.friction) * ROOF_BLOCK_FRICTION_FACTOR;
    }
  }
  return preSolveVelocity.apply(this, arguments);
};
