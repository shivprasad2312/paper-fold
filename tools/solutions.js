/* ==========================================================================
   tools/solutions.js — one human-style solution per level.
   These are NOT shown in the game; they exist so `npm run verify` can prove
   that every level can actually be filled with a reasonable stroke (and to
   report how much ink a decent solution uses).
   Coordinates are world space (1280 x 720).
   ========================================================================== */
'use strict';

module.exports = {
  1: [],                                                    // falls straight in
  2: [[[378, 300], [700, 372]]],                            // slope right
  3: [[[498, 292], [672, 366]]],                            // slope right, shorter drop
  4: [[[385, 182], [580, 346]]],                            // arc over the wall
  5: [[[490, 362], [640, 286], [812, 432]]],                // splitter
  6: [[[534, 332], [612, 376]]],                            // nudge the stream right
  7: [[[295, 200], [760, 292]]],                            // arc over the tall wall
  8: [[[396, 288], [862, 380]]],                            // long slide over the pad
  9: [[[445, 190], [610, 270]]],                            // jam the spinner + slide right
  10: [[[365, 180], [800, 294]]],                           // slide over the plank
  11: [[[230, 300], [420, 380]], [[1050, 300], [860, 380]]],// both taps
  12: [[[500, 296], [556, 308]]],                           // off the ledge, through the neck
  13: [[[360, 300], [860, 400]]],                           // ride the wind right
  14: [[[365, 180], [860, 264]]],                           // over the crate wall
  15: [[[460, 320], [626, 286]], [[654, 286], [820, 320]]], // splitter with a centre gap
  16: [[[605, 166], [692, 220]]],                           // jam the first gear
  17: [[[430, 180], [756, 292]]],                           // under the patrolling block
  18: [[[215, 168], [792, 312]]],                           // the long drop
  19: [[[265, 170], [876, 290]]],                           // fly over both pipes
  20: [[[358, 258], [878, 478]]],                           // over the spinner, into the glass
  21: [[[675, 352], [540, 416]]],                           // catch the spray, slide left
  22: [[[935, 180], [584, 250]]],                           // ride the wind left
  23: [[[265, 220], [856, 354]]],                           // the long gauntlet slide
  24: [[[340, 290], [240, 450]], [[940, 350], [690, 410]]], // both storeys
  25: [[[450, 340], [640, 250], [830, 340]]],               // finale splitter
};
