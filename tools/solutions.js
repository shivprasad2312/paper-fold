/* ==========================================================================
   tools/solutions.js — one human-style solution per level.
   These are NOT shown in the game; `npm run verify` uses them to prove every
   level really can be completed.

   Ink obeys gravity now: a stroke only stays where you put it when it is
   pegged to something solid — the tap housing (top of the level), a ledge, a
   crate, or one of the push-pins. Several solutions therefore start with a
   short connector from the tap, exactly how a player would draw it.
   ========================================================================== */
'use strict';

module.exports = {
  1: [[[570, 497], [730, 497]]],
  2: [[[500, 564], [640, 532], [732, 556]]],
  3: [[[510, 497], [780, 497]]],
  4: [[[802, 474], [692, 556]]],
  5: [[[605.6, 384], [690, 344], [798.4, 368]]],
  6: [[[280, 537], [940, 537]]],
  7: [[[652.8, 522], [766, 548]]],
  8: [[[982, 674], [873.5, 553], [807, 564]]],
};
