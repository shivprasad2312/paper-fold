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
  4: [[[390, 250], [790, 320]]],                            // arc over the wall
  5: [[[490, 362], [640, 286], [812, 432]]],                // splitter
  6: [[[534, 332], [612, 376]]],                            // nudge the stream right
  7: [[[300, 250], [810, 350]]],                            // arc over the tall wall
  8: [[[396, 288], [862, 380]]],                            // long slide over the pad
  9: [[[450, 250], [700, 290]]],                            // jam the spinner + slide right
  10: [[[370, 250], [830, 370]]],                           // slide over the plank
  11: [[[230, 300], [420, 380]], [[1050, 300], [860, 380]]],// both taps
  12: [[[500, 296], [556, 308]], [[570, 545], [720, 545]]],  // slide in + prop the glass up
  13: [[[360, 300], [860, 400]]],                           // ride the wind right
  14: [[[340, 230], [870, 320]]],                           // arc over the crate stack
  15: [[[460, 320], [626, 286]], [[654, 286], [820, 320]]], // splitter with a centre gap
  16: [[[605, 240], [692, 294]]],                           // jam the first gear
  17: [[[450, 250], [860, 360]], [[815, 545], [985, 545]]],  // ramp + support under the glass
  18: [[[190, 230], [890, 370]]],                           // the long drop
  19: [[[270, 250], [930, 350]]],                           // fly over both pipes
  20: [[[358, 258], [878, 478]]],                           // over the spinner, into the glass
  21: [[[710, 352], [452, 500]]],                           // catch the spray, slide left
  22: [[[930, 250], [520, 290]]],                           // ride the wind left
  23: [[[265, 220], [856, 354]]],                           // the long gauntlet slide
  24: [[[340, 290], [240, 450]], [[940, 350], [690, 410]]], // both storeys
  25: [[[450, 340], [640, 250], [830, 340]]],               // finale splitter
  // ---- the "floating glass" set: every one needs a drawn shelf -------------
  26: [[[400, 250], [640, 310]], [[630, 470], [790, 470]]],
  27: [[[320, 250], [455, 330]], [[965, 250], [825, 330]],
       [[385, 470], [555, 470]], [[725, 470], [895, 470]]],
  28: [[[720, 230], [540, 350]], [[435, 515], [605, 515]]],
  29: [[[590, 250], [630, 300]], [[555, 475], [725, 475]]],
  30: [[[560, 510], [730, 510]]],
  31: [[[300, 250], [600, 330]], [[550, 505], [740, 505]]],
  32: [[[370, 300], [720, 390]], [[655, 545], [825, 545]], [[870, 290], [1030, 340]]],
  33: [[[600, 240], [820, 340]], [[815, 545], [985, 545]]],
  34: [[[480, 300], [700, 360]], [[735, 530], [905, 530]]],
  35: [[[280, 240], [970, 380]], [[915, 505], [1085, 505]]],
};
