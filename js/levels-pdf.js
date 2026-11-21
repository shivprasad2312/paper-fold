/* ==========================================================================
   levels-pdf.js — the 135 rooms of the reference sheet, in the sheet's own
   order: page 1 row 1 col 1 .. page 15 row 3 col 3.

   Nothing here is a re-design. Every room is the drawing:

     grey solid   -> static scenery (grey)      black solid -> static scenery (ink)
     orange piece -> a loose piece that falls   red surface -> hot, vaporises water
     pink sheet   -> a no-draw zone             grey arrow  -> the room's tap

   Water only ever comes out of a tap; nothing else moves on its own.

   Geometry. The sheet cell is 196.40 x 195.20 pt and a cell is exactly one screen,
   so 0.3551 pt map to one world pixel, a room is 553 x 550 px, and it is
   centred in the 1280 px width, below the game's own HUD bar so no part of
   the drawing hides behind the chrome. Positions, sizes, angles and shapes are
   the drawing's own, scaled as a whole: nothing is nudged or stretched.
   The cups are the sheet's own tumbler (27 x 43 pt -> 100 x 158 px).
   ========================================================================== */
(function (global) {
  'use strict';
  const HG = global.HG;

  const ROOMS = [
    {
      name: 'Sheet 1 · 1,1',
      blueprint: true,
      page: 1, row: 0, col: 0,
      cell: [351.82, 170, 914.71, 729.46],
      ink: 900,
      faucets: [
        { x: 524.93, y: 220.16, dir: 'down', rate: 46, total: 110, spread: 0.55 },
      ],
      glasses: [
        { x: 699.8, y: 579.05, w: 79.3, h: 129, need: 0.72, fixed: true },
      ],
      platforms: [
        { kind: 'ink', pieces: [{ x: 475.34, y: 460.91, w: 105.47, h: 234.45, angle: -1.57 }] },
        { kind: 'grey', pieces: [{ poly: [[524.93, 636.31], [525.5, 651.21], [928.18, 651.21], [928.18, 635.74], [727.27, 634.59], [706.06, 643.19], [671.67, 634.59]], ox: 715.97, oy: 640.98 }] },
      ],
    },
    {
      name: 'Sheet 1 · 1,2',
      blueprint: true,
      page: 1, row: 0, col: 1,
      cell: [358.55, 170, 921.45, 729.46],
      ink: 900,
      faucets: [
        { x: 626.53, y: 181.18, dir: 'down', rate: 46, total: 110, spread: 0.55 },
      ],
      glasses: [
        { x: 722.82, y: 579.05, w: 79.3, h: 129, need: 0.72, fixed: true },
      ],
      platforms: [
        { kind: 'ink', pieces: [{ x: 482.08, y: 460.91, w: 105.47, h: 235.02, angle: -1.57 }] },
        { kind: 'grey', pieces: [{ poly: [[531.95, 635.74], [531.95, 651.21], [921.45, 651.21], [921.45, 635.74]], ox: 726.7, oy: 643.48 }] },
        { kind: 'grey', pieces: [{ poly: [[626.53, 285.5], [571.5, 381.23], [680.98, 381.23]], ox: 626.34, oy: 349.32 }] },
      ],
    },
    {
      name: 'Sheet 1 · 1,3',
      blueprint: true,
      page: 1, row: 0, col: 2,
      cell: [358.55, 170, 921.45, 729.46],
      ink: 900,
      faucets: [
        { x: 921.45, y: 219.58, dir: 'left', rate: 46, total: 110, spread: 0.55 },
      ],
      glasses: [
        { x: 610.92, y: 571.14, w: 79.3, h: 129, need: 0.72, fixed: true },
      ],
      platforms: [
        { kind: 'ink', pieces: [{ x: 805.09, y: 419.64, w: 105.47, h: 218.39, angle: -1.57 }] },
        { kind: 'grey', pieces: [{ poly: [[518.19, 628.29], [518.76, 643.19], [921.45, 643.19], [921.45, 627.71], [638.57, 626.57], [617.36, 635.16], [582.97, 626.57]], ox: 674.11, oy: 632.95 }] },
        { kind: 'grey', pieces: [{ x: 809.39, y: 325.63, w: 57.55, h: 57.55, angle: -0.79 }] },
      ],
    },
    {
      name: 'Sheet 1 · 2,1',
      blueprint: true,
      page: 1, row: 1, col: 0,
      cell: [356.69, 170, 910.07, 720],
      ink: 900,
      faucets: [
        { x: 796.52, y: 170, dir: 'down', rate: 46, total: 110, spread: 0.55 },
      ],
      glasses: [
        { x: 804.97, y: 646.36, w: 61.5, h: 101.5, need: 0.72, fixed: true },
      ],
      platforms: [
        { kind: 'grey', pieces: [{ poly: [[923.31, 689.01], [826.67, 689.01], [812.58, 696.9], [786.66, 694.08], [782.71, 686.19], [529.69, 689.01], [529.13, 703.66], [923.31, 704.22]], ox: 764.26, oy: 694.01 }] },
        { kind: 'grey', pieces: [{ poly: [[688.04, 393.16], [639.01, 479.38], [737.07, 479.38]], ox: 688.04, oy: 450.64 }] },
        { kind: 'grey', pieces: [{ poly: [[923.31, 170], [894.29, 170], [715.65, 344.13], [923.31, 202.68]], ox: 864.14, oy: 221.7 }] },
      ],
    },
    {
      name: 'Sheet 1 · 2,2',
      blueprint: true,
      page: 1, row: 1, col: 1,
      cell: [363.31, 170, 916.69, 720],
      ink: 900,
      faucets: [
        { x: 520.25, y: 170, dir: 'down', rate: 46, total: 110, spread: 0.55 },
      ],
      glasses: [
        { x: 637.2, y: 620.81, w: 53.3, h: 88.8, need: 0.72, fixed: true },
      ],
      platforms: [
        { kind: 'grey', pieces: [{ poly: [[550.68, 434.86], [500.53, 522.2], [418.25, 522.2], [363.31, 669.28], [363.31, 680.55], [577.17, 680.55], [524.2, 522.2], [600.27, 521.08]], ox: 487.21, oy: 569.12 }] },
        { kind: 'grey', pieces: [{ x: 451.02, y: 273.94, w: 14.4, h: 226.42, angle: -0.87 }] },
        { kind: 'grey', pieces: [{ x: 679.73, y: 670.13, w: 10.71, h: 140.88, angle: -1.57 }] },
      ],
    },
    {
      name: 'Sheet 1 · 2,3',
      blueprint: true,
      page: 1, row: 1, col: 2,
      cell: [363.31, 170, 916.69, 720],
      ink: 900,
      faucets: [
        { x: 504.47, y: 170, dir: 'down', rate: 46, total: 110, spread: 0.55 },
      ],
      glasses: [
        { x: 718.39, y: 507.2, w: 53.3, h: 88.8, need: 0.72, fixed: true },
      ],
      platforms: [
        { kind: 'grey', pieces: [{ x: 801.17, y: 594.9, w: 87.91, h: 216.96, angle: -1.57 }] },
        { kind: 'ink', pieces: [{ poly: [[692.69, 552.07], [568.71, 638.85], [692.69, 638.85]], ox: 651.36, oy: 609.92 }] },
        { kind: 'grey', pieces: [{ x: 486.3, y: 334.69, w: 36.29, h: 36.29, angle: 0, r: 18.15 }] },
        { kind: 'grey', pieces: [{ x: 624.22, y: 406.12, w: 31.56, h: 11.83, angle: -1.57 }] },
      ],
    },
    {
      name: 'Sheet 1 · 3,1',
      blueprint: true,
      page: 1, row: 2, col: 0,
      cell: [356.83, 170, 909.93, 719.72],
      ink: 900,
      faucets: [
        { x: 804.61, y: 170, dir: 'down', rate: 46, total: 110, spread: 0.55 },
      ],
      glasses: [
        { x: 527.01, y: 557.89, w: 53.3, h: 88.7, need: 0.72, fixed: true },
      ],
      platforms: [
        { kind: 'grey', pieces: [{ poly: [[712.8, 340.66], [712.8, 371.64], [697.59, 372.2], [698.15, 459.5], [923.17, 459.5], [923.17, 372.2], [725.19, 372.2], [724.63, 340.66]], ox: 764.69, oy: 386.07 }] },
        { kind: 'ink', pieces: [{ poly: [[697.59, 372.76], [574.24, 459.5], [697.59, 459.5]], ox: 656.47, oy: 430.59 }] },
        { kind: 'grey', pieces: [{ x: 520.45, y: 646.22, w: 10.7, h: 140.25, angle: -1.57 }] },
        { kind: 'grey', pieces: [{ x: 798.72, y: 288.08, w: 36.27, h: 36.27, angle: 0, r: 18.14 }] },
      ],
    },
    {
      name: 'Sheet 1 · 3,2',
      blueprint: true,
      page: 1, row: 2, col: 1,
      noTap: true,
      cell: [363.45, 170, 916.55, 719.72],
      ink: 900,
      faucets: [],
      glasses: [
        { x: 687.47, y: 581.88, w: 53.3, h: 88.7, need: 0.72, fixed: true },
      ],
      platforms: [
        { kind: 'grey', pieces: [{ x: 586.49, y: 344.88, w: 41.43, h: 41.43, angle: -0.79 }] },
        { kind: 'grey', pieces: [{ x: 659.71, y: 386.56, w: 41.43, h: 41.43, angle: -0.79 }] },
        { kind: 'grey', pieces: [{ x: 597.19, y: 458.66, w: 41.43, h: 41.43, angle: -0.79 }] },
        { kind: 'grey', pieces: [{ x: 696.89, y: 631.01, w: 10.7, h: 140.25, angle: -1.57 }] },
      ],
    },
    {
      name: 'Sheet 1 · 3,3',
      blueprint: true,
      page: 1, row: 2, col: 2,
      cell: [363.45, 170, 916.55, 719.72],
      ink: 900,
      faucets: [
        { x: 688.44, y: 327.14, dir: 'left', rate: 46, total: 110, spread: 0.55 },
      ],
      glasses: [
        { x: 671.47, y: 526.77, w: 53.3, h: 88.7, need: 0.72, fixed: true },
      ],
      platforms: [
        { kind: 'grey', pieces: [{ x: 681.12, y: 576.09, w: 11.26, h: 140.25, angle: -1.57 }] },
        { kind: 'grey', pieces: [{ x: 560.89, y: 433.9, w: 36.27, h: 36.27, angle: 0, r: 18.14 }] },
      ],
    },
    {
      name: 'Sheet 2 · 1,1',
      blueprint: true,
      page: 2, row: 0, col: 0,
      noTap: true,
      cell: [351.82, 170, 914.71, 729.46],
      ink: 900,
      faucets: [],
      glasses: [
        { x: 699.8, y: 579.05, w: 79.3, h: 129, need: 0.72, fixed: true },
      ],
      platforms: [
        { kind: 'ink', pieces: [{ x: 475.63, y: 493.58, w: 64.2, h: 235.02, angle: -1.57 }] },
        { kind: 'grey', pieces: [{ poly: [[593.14, 424.22], [579.96, 424.22], [579.38, 460.91], [511.74, 460.33], [534.67, 436.83], [512.32, 414.48], [516.9, 413.9], [516.9, 325.63], [504.86, 325.63], [504.86, 413.33], [510.02, 414.48], [510.02, 424.22], [485.38, 424.79], [485.38, 449.44], [509.45, 449.44], [509.45, 460.91], [351.82, 460.91], [593.14, 460.91]], ox: 517.19, oy: 424.7 }] },
        { kind: 'grey', pieces: [{ poly: [[617.79, 642.04], [617.79, 650.07], [801.22, 650.07], [801.22, 642.04]], ox: 709.5, oy: 646.06 }] },
      ],
    },
    {
      name: 'Sheet 2 · 1,2',
      blueprint: true,
      page: 2, row: 0, col: 1,
      cell: [358.55, 170, 921.45, 729.46],
      ink: 900,
      faucets: [
        { x: 530.23, y: 170, dir: 'down', rate: 46, total: 110, spread: 0.55 },
      ],
      glasses: [
        { x: 554.4, y: 571.14, w: 79.3, h: 129, need: 0.72, fixed: true },
      ],
      platforms: [
        { kind: 'ink', pieces: [{ x: 748.77, y: 455.06, w: 10.03, h: 334.59, angle: -1.45 }] },
        { kind: 'ink', pieces: [{ x: 481.65, y: 366.5, w: 13.96, h: 236.34, angle: -1.48 }] },
        { kind: 'grey', pieces: [{ poly: [[673.53, 631.72], [576.09, 631.15], [560.61, 635.16], [530.8, 630.58], [358.55, 631.72], [358.55, 639.18], [673.53, 639.18]], ox: 533.09, oy: 634.1 }] },
      ],
    },
    {
      name: 'Sheet 2 · 1,3',
      blueprint: true,
      page: 2, row: 0, col: 2,
      cell: [358.55, 170, 921.45, 729.46],
      ink: 900,
      faucets: [
        { x: 921.45, y: 219.58, dir: 'left', rate: 46, total: 110, spread: 0.55 },
      ],
      glasses: [
        { x: 610.92, y: 571.14, w: 79.3, h: 129, need: 0.72, fixed: true },
      ],
      platforms: [
        { kind: 'ink', pieces: [{ x: 805.09, y: 419.64, w: 105.47, h: 218.39, angle: -1.57 }] },
        { kind: 'grey', pieces: [{ poly: [[518.19, 628.29], [518.76, 643.19], [921.45, 643.19], [921.45, 627.71], [638.57, 626.57], [617.36, 635.16], [582.97, 626.57]], ox: 674.11, oy: 632.95 }] },
        { kind: 'grey', pieces: [{ x: 626.1, y: 423.79, w: 57.55, h: 57.15, angle: -0.79 }] },
      ],
    },
    {
      name: 'Sheet 2 · 2,1',
      blueprint: true,
      page: 2, row: 1, col: 0,
      cell: [356.69, 170, 910.07, 720],
      ink: 900,
      faucets: [
        { x: 525.46, y: 170, dir: 'down', rate: 46, total: 110, spread: 0.55 },
      ],
      glasses: [
        { x: 549.19, y: 569.82, w: 77.9, h: 126.8, need: 0.72, fixed: true },
      ],
      platforms: [
        { kind: 'ink', pieces: [{ x: 477.82, y: 368.64, w: 13.72, h: 232.06, angle: -1.48 }] },
        { kind: 'grey', pieces: [{ poly: [[666.63, 629.27], [542.09, 633.22], [521.8, 624.76], [356.69, 629.27], [356.69, 637.16], [666.06, 637.16]], ox: 518.33, oy: 631.81 }] },
        { kind: 'ink', pieces: [{ x: 764.62, y: 460.58, w: 8.45, h: 186.22, angle: -1.45 }] },
        { kind: 'ink', pieces: [{ x: 602.13, y: 440.75, w: 9.47, h: 68.55, angle: -1.45 }] },
      ],
    },
    {
      name: 'Sheet 2 · 2,2',
      blueprint: true,
      page: 2, row: 1, col: 1,
      cell: [363.31, 170, 916.69, 720],
      ink: 900,
      faucets: [
        { x: 532.09, y: 170, dir: 'down', rate: 46, total: 110, spread: 0.55 },
      ],
      glasses: [
        { x: 555.85, y: 565.89, w: 77.9, h: 126.8, need: 0.72, fixed: true },
      ],
      platforms: [
        { kind: 'grey', pieces: [{ poly: [[672.97, 625.33], [578.86, 624.2], [561.95, 629.27], [532.65, 624.76], [363.31, 625.33], [363.31, 633.22], [672.97, 633.22]], ox: 535.15, oy: 627.9 }] },
        { kind: 'ink', pieces: [{ x: 771.3, y: 456.64, w: 8.45, h: 186.27, angle: -1.45 }] },
        { kind: 'ink', pieces: [{ x: 436.29, y: 361.71, w: 10.88, h: 135.61, angle: -1.48 }] },
        { kind: 'ink', pieces: [{ poly: [[575.48, 428.09], [574.35, 437.11], [638.03, 445], [642.54, 443.31], [641.41, 435.98]], ox: 614.36, oy: 437.9 }] },
        { kind: 'ink', pieces: [{ x: 569.95, y: 374.02, w: 10.96, h: 48.41, angle: -1.48 }] },
      ],
    },
    {
      name: 'Sheet 2 · 2,3',
      blueprint: true,
      page: 2, row: 1, col: 2,
      cell: [363.31, 170, 916.69, 720],
      ink: 900,
      faucets: [
        { x: 505.6, y: 248.89, dir: 'right', rate: 46, total: 110, spread: 0.55 },
      ],
      glasses: [
        { x: 721.42, y: 562.76, w: 77.9, h: 126.8, need: 0.72, fixed: true },
      ],
      platforms: [
        { kind: 'ink', pieces: [{ x: 484.75, y: 446.69, w: 103.69, h: 231.05, angle: -1.57 }] },
        { kind: 'grey', pieces: [{ poly: [[533.78, 618.57], [533.78, 633.78], [916.69, 633.78], [916.69, 618.57]], ox: 725.24, oy: 626.17 }] },
        { kind: 'grey', pieces: [{ poly: [[626.19, 274.25], [572.66, 368.36], [680.86, 368.36], [629.01, 277.63]], ox: 627.18, oy: 322.15 }] },
      ],
    },
    {
      name: 'Sheet 2 · 3,1',
      blueprint: true,
      page: 2, row: 2, col: 0,
      cell: [356.83, 170, 909.93, 719.72],
      ink: 900,
      faucets: [
        { x: 804.61, y: 170, dir: 'down', rate: 46, total: 110, spread: 0.55 },
      ],
      glasses: [
        { x: 527.01, y: 557.89, w: 53.3, h: 88.7, need: 0.72, fixed: true },
      ],
      platforms: [
        { kind: 'grey', pieces: [{ poly: [[712.8, 340.66], [712.8, 371.64], [697.59, 372.2], [698.15, 459.5], [923.17, 459.5], [923.17, 372.2], [725.19, 372.2], [724.63, 340.66]], ox: 764.69, oy: 386.07 }] },
        { kind: 'ink', pieces: [{ poly: [[697.59, 372.76], [574.24, 459.5], [697.59, 459.5]], ox: 656.47, oy: 430.59 }] },
        { kind: 'grey', pieces: [{ x: 520.45, y: 646.22, w: 10.7, h: 140.25, angle: -1.57 }] },
        { kind: 'grey', pieces: [{ x: 798.72, y: 288.08, w: 36.27, h: 36.27, angle: 0, r: 18.14 }] },
      ],
    },
    {
      name: 'Sheet 2 · 3,2',
      blueprint: true,
      page: 2, row: 2, col: 1,
      cell: [363.45, 170, 916.55, 719.72],
      ink: 900,
      faucets: [
        { x: 593.53, y: 170, dir: 'down', rate: 46, total: 110, spread: 0.55 },
      ],
      glasses: [
        { x: 665.42, y: 571.21, w: 53.3, h: 88.7, need: 0.72, fixed: true },
      ],
      platforms: [
        { kind: 'grey', pieces: [{ x: 494.97, y: 446.83, w: 9.58, h: 251.2, angle: -1.57 }] },
        { kind: 'grey', pieces: [{ x: 670.98, y: 620.59, w: 11.26, h: 140.25, angle: -1.57 }] },
        { kind: 'grey', pieces: [{ x: 628.88, y: 364.46, w: 36.24, h: 35.85, angle: -0.79 }] },
        { kind: 'grey', pieces: [{ x: 571.14, y: 313.48, w: 35.46, h: 35.85, angle: -0.79 }] },
      ],
    },
    {
      name: 'Sheet 2 · 3,3',
      blueprint: true,
      page: 2, row: 2, col: 2,
      cell: [363.45, 170, 916.55, 719.72],
      ink: 900,
      faucets: [
        { x: 638.59, y: 283.21, dir: 'left', rate: 46, total: 110, spread: 0.55 },
      ],
      glasses: [
        { x: 680.91, y: 565.88, w: 53.3, h: 88.7, need: 0.72, fixed: true },
      ],
      platforms: [
        { kind: 'grey', pieces: [{ x: 681.12, y: 615.24, w: 10.7, h: 140.25, angle: -1.57 }] },
        { kind: 'grey', pieces: [{ x: 511.84, y: 390.06, w: 36.22, h: 36.22, angle: 0, r: 18.11 }] },
        { kind: 'grey', pieces: [{ x: 597.48, y: 451.9, w: 30.98, h: 12.39, angle: -1.57 }] },
      ],
    },
    {
      name: 'Sheet 3 · 1,1',
      blueprint: true,
      page: 3, row: 0, col: 0,
      cell: [351.82, 170, 914.71, 729.46],
      ink: 900,
      faucets: [
        { x: 612.63, y: 170, dir: 'down', rate: 46, total: 110, spread: 0.55 },
      ],
      glasses: [
        { x: 610.26, y: 488.48, w: 79.3, h: 129, need: 0.72, fixed: true },
      ],
      platforms: [
        { kind: 'grey', pieces: [{ poly: [[456.14, 638.03], [456.14, 645.48], [769.12, 645.48], [769.12, 638.03], [644.73, 638.03], [609.76, 577.27], [574.22, 638.03]], ox: 611.32, oy: 631.48 }] },
      ],
    },
    {
      name: 'Sheet 3 · 1,2',
      blueprint: true,
      page: 3, row: 0, col: 1,
      cell: [358.55, 170, 921.45, 729.46],
      ink: 900,
      faucets: [
        { x: 601.31, y: 170, dir: 'down', rate: 46, total: 110, spread: 0.55 },
      ],
      glasses: [
        { x: 603.44, y: 440.47, w: 79.3, h: 129, need: 0.72, fixed: true },
      ],
      platforms: [
        { kind: 'ink', pieces: [{ poly: [[764.1, 569.24], [750.92, 560.65], [735.44, 555.49], [697.03, 553.19], [665.51, 559.5], [605.89, 581.86], [569.78, 587.01], [528.51, 581.86], [502.71, 569.82], [502.71, 703.95], [507.3, 720], [760.09, 720], [764.1, 705.1]], ox: 642.62, oy: 612.9 }] },
      ],
    },
    {
      name: 'Sheet 3 · 1,3',
      blueprint: true,
      page: 3, row: 0, col: 2,
      cell: [358.55, 170, 921.45, 729.46],
      ink: 900,
      faucets: [
        { x: 668.09, y: 170, dir: 'down', rate: 46, total: 110, spread: 0.55 },
      ],
      glasses: [
        { x: 610.92, y: 571.14, w: 79.3, h: 129, need: 0.72, fixed: true },
      ],
      platforms: [
        { kind: 'grey', pieces: [{ x: 681.41, y: 375.07, w: 57.15, h: 57.55, angle: -0.79 }] },
        { kind: 'grey', pieces: [{ x: 599.87, y: 638.32, w: 9.74, h: 163.37, angle: -1.57 }] },
      ],
    },
    {
      name: 'Sheet 3 · 2,1',
      blueprint: true,
      page: 3, row: 1, col: 0,
      cell: [356.69, 170, 910.07, 720],
      ink: 900,
      faucets: [
        { x: 839.35, y: 170, dir: 'down', rate: 46, total: 110, spread: 0.55 },
      ],
      glasses: [
        { x: 528.75, y: 596.4, w: 53.3, h: 88.8, need: 0.72, fixed: true },
      ],
      platforms: [
        { kind: 'grey', pieces: [{ x: 806.38, y: 415.41, w: 87.35, h: 219.77, angle: -1.57 }] },
        { kind: 'ink', pieces: [{ poly: [[697.06, 372.31], [573.64, 459.09], [697.06, 459.09]], ox: 655.92, oy: 430.16 }] },
        { kind: 'ink', pieces: [{ x: 867.52, y: 303.41, w: 109.89, h: 15.44, angle: -0.37 }] },
        { kind: 'grey', pieces: [{ poly: [[589.99, 641.11], [535.89, 641.11], [535.89, 639.98], [520.67, 639.98], [520.67, 641.11], [449.67, 641.11], [449.67, 651.25], [589.99, 651.25]], ox: 524.06, oy: 643.36 }] },
        { kind: 'grey', pieces: [{ x: 737.07, y: 353.71, w: 31.56, h: 12.4, angle: -1.57 }] },
      ],
    },
    {
      name: 'Sheet 3 · 2,2',
      blueprint: true,
      page: 3, row: 1, col: 1,
      cell: [363.31, 170, 916.69, 720],
      ink: 900,
      faucets: [
        { x: 628.17, y: 170, dir: 'down', rate: 46, total: 110, spread: 0.55 },
      ],
      glasses: [
        { x: 571.97, y: 569.62, w: 77.9, h: 126.8, need: 0.72, fixed: true },
      ],
      platforms: [
        { kind: 'grey', pieces: [{ x: 636.9, y: 388.08, w: 81.15, h: 93.55, angle: -1.57 }] },
        { kind: 'grey', pieces: [{ x: 561.11, y: 635.75, w: 9.58, h: 160.6, angle: -1.57 }] },
        { kind: 'ink', pieces: [{ x: 398.39, y: 268.67, w: 68.13, h: 15.44, angle: -0.37 }] },
      ],
    },
    {
      name: 'Sheet 3 · 2,3',
      blueprint: true,
      page: 3, row: 1, col: 2,
      cell: [363.31, 170, 916.69, 720],
      ink: 900,
      faucets: [
        { x: 629.57, y: 254.53, dir: 'down', rate: 46, total: 110, spread: 0.55 },
      ],
      glasses: [
        { x: 758.64, y: 578.78, w: 77.9, h: 126.8, need: 0.72, fixed: true },
        { x: 526.38, y: 574.13, w: 77.9, h: 126.8, need: 0.72, fixed: true },
      ],
      decals: [
        { x: 676.07, y: 431.48, r: 8.73, color: '#000000' },
        { x: 592.95, y: 446.41, r: 8.45, color: '#000000' },
      ],
      platforms: [
        { kind: 'grey', pieces: [{ x: 773.84, y: 341.31, w: 39.45, h: 211.89, angle: -1.57 }] },
        { kind: 'grey', pieces: [{ x: 483.34, y: 341.31, w: 39.45, h: 211.32, angle: -1.57 }] },
        { kind: 'grey', pieces: [{ poly: [[565.33, 632.65], [481.37, 632.09], [481.37, 646.74], [564.77, 646.74]], ox: 523.21, oy: 639.56 }] },
        { kind: 'grey', pieces: [{ poly: [[797.51, 637.16], [713.54, 637.16], [713.54, 651.25], [797.51, 651.25]], ox: 755.53, oy: 644.2 }] },
        { kind: 'grey', pieces: [{ x: 705.03, y: 408.43, w: 29.89, h: 9.55, angle: -0.43 }] },
        { kind: 'grey', pieces: [{ x: 697.42, y: 455.74, w: 9.61, h: 29.73, angle: -0.85 }] },
        { kind: 'grey', pieces: [{ x: 622.11, y: 423.39, w: 29.95, h: 9.55, angle: -0.42 }] },
        { kind: 'grey', pieces: [{ x: 655.07, y: 405.44, w: 9.61, h: 29.73, angle: -0.85 }] },
        { kind: 'grey', pieces: [{ x: 647.83, y: 449.34, w: 29.75, h: 9.55, angle: -0.43 }] },
        { kind: 'grey', pieces: [{ x: 572.15, y: 420.4, w: 9.55, h: 29.73, angle: -0.85 }] },
        { kind: 'grey', pieces: [{ x: 564.91, y: 464.27, w: 29.75, h: 9.55, angle: -0.43 }] },
        { kind: 'grey', pieces: [{ x: 614.5, y: 470.7, w: 9.55, h: 29.73, angle: -0.85 }] },
      ],
      falls: [
        { kind: 'hot', pieces: [{ x: 594.47, y: 446.24, w: 45.65, h: 45.65, angle: 0, r: 22.82 }] },
        { kind: 'hot', pieces: [{ x: 677.39, y: 431.25, w: 45.65, h: 45.65, angle: 0, r: 22.82 }] },
      ],
    },
    {
      name: 'Sheet 3 · 3,1',
      blueprint: true,
      page: 3, row: 2, col: 0,
      cell: [356.83, 170, 909.93, 719.72],
      ink: 900,
      faucets: [
        { x: 605.78, y: 236.46, dir: 'down', rate: 46, total: 110, spread: 0.55 },
      ],
      glasses: [
        { x: 619.57, y: 431.78, w: 53.3, h: 88.7, need: 0.72, fixed: true },
      ],
      platforms: [
        { kind: 'grey', pieces: [{ x: 639.01, y: 554.41, w: 157.14, h: 46.19, angle: -1.57 }] },
      ],
    },
    {
      name: 'Sheet 3 · 3,2',
      blueprint: true,
      page: 3, row: 2, col: 1,
      cell: [363.45, 170, 916.55, 719.72],
      ink: 900,
      faucets: [
        { x: 593.53, y: 170, dir: 'down', rate: 46, total: 110, spread: 0.55 },
      ],
      glasses: [
        { x: 665.42, y: 571.21, w: 53.3, h: 88.7, need: 0.72, fixed: true },
      ],
      platforms: [
        { kind: 'grey', pieces: [{ x: 494.97, y: 446.83, w: 9.58, h: 251.2, angle: -1.57 }] },
        { kind: 'grey', pieces: [{ x: 670.98, y: 620.59, w: 11.26, h: 140.25, angle: -1.57 }] },
        { kind: 'grey', pieces: [{ x: 628.88, y: 364.46, w: 36.24, h: 35.85, angle: -0.79 }] },
        { kind: 'grey', pieces: [{ x: 571.14, y: 313.48, w: 35.46, h: 35.85, angle: -0.79 }] },
      ],
    },
    {
      name: 'Sheet 3 · 3,3',
      blueprint: true,
      page: 3, row: 2, col: 2,
      cell: [363.45, 170, 916.55, 719.72],
      ink: 900,
      faucets: [
        { x: 638.59, y: 283.21, dir: 'left', rate: 46, total: 110, spread: 0.55 },
      ],
      glasses: [
        { x: 680.91, y: 565.88, w: 53.3, h: 88.7, need: 0.72, fixed: true },
      ],
      platforms: [
        { kind: 'grey', pieces: [{ x: 681.12, y: 615.24, w: 10.7, h: 140.25, angle: -1.57 }] },
        { kind: 'grey', pieces: [{ x: 511.84, y: 390.06, w: 36.22, h: 36.22, angle: 0, r: 18.11 }] },
        { kind: 'grey', pieces: [{ x: 597.48, y: 451.9, w: 30.98, h: 12.39, angle: -1.57 }] },
      ],
    },
    {
      name: 'Sheet 4 · 1,1',
      blueprint: true,
      page: 4, row: 0, col: 0,
      cell: [351.82, 170, 914.71, 729.46],
      ink: 900,
      faucets: [
        { x: 485.38, y: 442.85, dir: 'right', rate: 46, total: 110, spread: 0.55 },
      ],
      glasses: [
        { x: 699.8, y: 579.02, w: 79.3, h: 129, need: 0.72, fixed: true },
      ],
      platforms: [
        { kind: 'ink', pieces: [{ x: 475.63, y: 493.58, w: 64.2, h: 235.02, angle: -1.57 }] },
        { kind: 'grey', pieces: [{ poly: [[617.79, 641.47], [617.79, 650.07], [801.22, 650.07], [801.22, 641.47], [715.81, 640.9], [706.06, 643.19], [683.13, 640.9]], ox: 706.15, oy: 644.01 }] },
        { kind: 'grey', pieces: [{ x: 510.31, y: 379.22, w: 87.7, h: 12.04, angle: -1.57 }] },
        { kind: 'grey', pieces: [{ x: 586.55, y: 442.28, w: 37.26, h: 13.18, angle: -1.57 }] },
      ],
      falls: [
        { kind: 'hot', pieces: [{ x: 555.88, y: 276.62, w: 12.04, h: 74.52, angle: -1.57 }] },
      ],
    },
    {
      name: 'Sheet 4 · 1,2',
      blueprint: true,
      page: 4, row: 0, col: 1,
      cell: [358.55, 170, 921.45, 729.46],
      ink: 900,
      faucets: [
        { x: 530.23, y: 170, dir: 'down', rate: 46, total: 110, spread: 0.55 },
      ],
      glasses: [
        { x: 554.4, y: 571.14, w: 79.3, h: 129, need: 0.72, fixed: true },
      ],
      platforms: [
        { kind: 'ink', pieces: [{ x: 748.77, y: 455.06, w: 10.03, h: 334.59, angle: -1.45 }] },
        { kind: 'ink', pieces: [{ x: 481.65, y: 366.47, w: 13.9, h: 236.34, angle: -1.48 }] },
        { kind: 'grey', pieces: [{ poly: [[673.53, 631.72], [576.09, 631.15], [560.61, 635.16], [530.8, 630.58], [358.55, 631.72], [358.55, 639.18], [673.53, 639.18]], ox: 533.09, oy: 634.1 }] },
      ],
      falls: [
        { kind: 'hot', pieces: [{ x: 701.99, y: 390.89, w: 51.02, h: 94.12, angle: -0.31 }] },
      ],
    },
    {
      name: 'Sheet 4 · 1,3',
      blueprint: true,
      page: 4, row: 0, col: 2,
      cell: [358.55, 170, 921.45, 729.46],
      ink: 900,
      faucets: [
        { x: 921.45, y: 219.58, dir: 'left', rate: 46, total: 110, spread: 0.55 },
      ],
      glasses: [
        { x: 660.25, y: 571.14, w: 79.3, h: 129, need: 0.72, fixed: true },
      ],
      platforms: [
        { kind: 'ink', pieces: [{ x: 805.09, y: 419.64, w: 105.47, h: 218.39, angle: -1.57 }] },
        { kind: 'grey', pieces: [{ poly: [[518.19, 628.29], [518.76, 643.19], [921.45, 643.19], [921.45, 627.71], [687.86, 626.57], [666.65, 635.16], [632.26, 626.57]], ox: 695.23, oy: 632.95 }] },
        { kind: 'grey', pieces: [{ x: 631.12, y: 446, w: 57.55, h: 57.55, angle: -0.79 }] },
      ],
      falls: [
        { kind: 'hot', pieces: [{ poly: [[633.41, 189.2], [624.24, 251.68], [694.74, 325.05], [694.74, 251.68], [647.17, 251.11], [647.17, 189.2]], ox: 656.91, oy: 242.99 }] },
      ],
    },
    {
      name: 'Sheet 4 · 2,1',
      blueprint: true,
      page: 4, row: 1, col: 0,
      cell: [356.69, 170, 910.07, 720],
      ink: 900,
      faucets: [
        { x: 436.71, y: 170, dir: 'down', rate: 46, total: 110, spread: 0.55 },
      ],
      glasses: [
        { x: 613.44, y: 565.93, w: 77.9, h: 126.8, need: 0.72, fixed: true },
      ],
      platforms: [
        { kind: 'ink', pieces: [{ x: 477.82, y: 368.64, w: 13.67, h: 232.06, angle: -1.48 }] },
        { kind: 'grey', pieces: [{ x: 514.76, y: 632.65, w: 7.89, h: 303.74, angle: -1.57 }] },
        { kind: 'ink', pieces: [{ x: 764.62, y: 460.58, w: 8.42, h: 186.22, angle: -1.45 }] },
      ],
      falls: [
        { kind: 'hot', pieces: [{ x: 652, y: 219.25, w: 9.21, h: 141.67, angle: -1.45 }] },
      ],
    },
    {
      name: 'Sheet 4 · 2,2',
      blueprint: true,
      page: 4, row: 1, col: 1,
      cell: [363.31, 170, 916.69, 720],
      ink: 900,
      faucets: [
        { x: 532.09, y: 170, dir: 'down', rate: 46, total: 110, spread: 0.55 },
      ],
      glasses: [
        { x: 543.88, y: 563.57, w: 77.9, h: 126.8, need: 0.72, fixed: true },
      ],
      platforms: [
        { kind: 'grey', pieces: [{ poly: [[672.97, 625.33], [363.31, 625.33], [363.31, 632.65], [672.97, 632.65]], ox: 518.14, oy: 628.99 }] },
        { kind: 'ink', pieces: [{ x: 771.3, y: 456.64, w: 8.4, h: 186.27, angle: -1.45 }] },
        { kind: 'ink', pieces: [{ x: 436.29, y: 361.71, w: 10.88, h: 135.61, angle: -1.48 }] },
      ],
      falls: [
        { kind: 'hot', pieces: [{ x: 608.81, y: 436.8, w: 9.58, h: 68.69, angle: -1.45 }] },
        { kind: 'hot', pieces: [{ x: 569.95, y: 374.02, w: 11.07, h: 48.58, angle: -1.48 }] },
      ],
    },
    {
      name: 'Sheet 4 · 2,3',
      blueprint: true,
      page: 4, row: 1, col: 2,
      cell: [363.31, 170, 916.69, 720],
      ink: 900,
      faucets: [
        { x: 505.6, y: 248.89, dir: 'right', rate: 46, total: 110, spread: 0.55 },
      ],
      glasses: [
        { x: 721.42, y: 562.75, w: 77.9, h: 126.8, need: 0.72, fixed: true },
      ],
      platforms: [
        { kind: 'ink', pieces: [{ x: 484.75, y: 446.69, w: 103.69, h: 231.05, angle: -1.57 }] },
        { kind: 'grey', pieces: [{ poly: [[533.78, 618.57], [533.78, 633.78], [916.69, 633.78], [916.69, 618.57]], ox: 725.24, oy: 626.17 }] },
        { kind: 'grey', pieces: [{ poly: [[626.19, 274.25], [572.66, 368.36], [680.86, 368.36], [629.01, 277.63]], ox: 627.18, oy: 322.15 }] },
      ],
      falls: [
        { kind: 'hot', pieces: [{ x: 663.22, y: 285.04, w: 45.7, h: 45.7, angle: 0, r: 22.85 }] },
      ],
    },
    {
      name: 'Sheet 4 · 3,1',
      blueprint: true,
      page: 4, row: 2, col: 0,
      cell: [356.83, 170, 909.93, 719.72],
      ink: 900,
      faucets: [
        { x: 923.17, y: 333.62, dir: 'left', rate: 46, total: 110, spread: 0.55 },
      ],
      glasses: [
        { x: 529.31, y: 596.69, w: 53.3, h: 88.7, need: 0.72, fixed: true },
      ],
      platforms: [
        { kind: 'grey', pieces: [{ poly: [[923.17, 372.2], [844.6, 333.9], [881.77, 372.2], [697.59, 372.2], [698.15, 459.5], [923.17, 459.5]], ox: 828.07, oy: 394.92 }] },
        { kind: 'ink', pieces: [{ poly: [[697.59, 372.76], [574.24, 459.5], [697.59, 459.5]], ox: 656.47, oy: 430.59 }] },
        { kind: 'grey', pieces: [{ x: 520.45, y: 645.93, w: 11.26, h: 140.25, angle: -1.57 }] },
        { kind: 'grey', pieces: [{ x: 680.41, y: 288.28, w: 37.17, h: 34.36, angle: -1.57 }] },
      ],
      falls: [
        { kind: 'hot', pieces: [{ x: 829.56, y: 285.83, w: 188.91, h: 9.66, angle: -0.37 }] },
      ],
    },
    {
      name: 'Sheet 4 · 3,2',
      blueprint: true,
      page: 4, row: 2, col: 1,
      cell: [363.45, 170, 916.55, 719.72],
      ink: 900,
      faucets: [
        { x: 593.53, y: 170, dir: 'down', rate: 46, total: 110, spread: 0.55 },
      ],
      glasses: [
        { x: 665.42, y: 571.21, w: 53.3, h: 88.7, need: 0.72, fixed: true },
      ],
      platforms: [
        { kind: 'grey', pieces: [{ x: 494.97, y: 446.83, w: 9.58, h: 251.2, angle: -1.57 }] },
        { kind: 'grey', pieces: [{ x: 670.98, y: 620.31, w: 10.7, h: 140.25, angle: -1.57 }] },
        { kind: 'grey', pieces: [{ x: 628.88, y: 364.46, w: 36.24, h: 35.85, angle: -0.79 }] },
      ],
      falls: [
        { kind: 'hot', pieces: [{ x: 582.83, y: 317.88, w: 41.96, h: 41.96, angle: 0, r: 20.98 }] },
        { kind: 'hot', pieces: [{ x: 374.24, y: 245.9, w: 13.97, h: 9.63, angle: -0.36 }] },
      ],
    },
    {
      name: 'Sheet 4 · 3,3',
      blueprint: true,
      page: 4, row: 2, col: 2,
      cell: [363.45, 170, 916.55, 719.72],
      ink: 900,
      faucets: [
        { x: 638.59, y: 283.21, dir: 'left', rate: 46, total: 110, spread: 0.55 },
      ],
      glasses: [
        { x: 680.91, y: 565.86, w: 53.3, h: 88.7, need: 0.72, fixed: true },
      ],
      platforms: [
        { kind: 'grey', pieces: [{ x: 681.12, y: 615.24, w: 10.7, h: 140.25, angle: -1.57 }] },
        { kind: 'grey', pieces: [{ x: 511.84, y: 390.06, w: 36.22, h: 36.22, angle: 0, r: 18.11 }] },
        { kind: 'grey', pieces: [{ x: 597.48, y: 451.9, w: 30.98, h: 12.39, angle: -1.57 }] },
      ],
    },
    {
      name: 'Sheet 5 · 1,1',
      blueprint: true,
      page: 5, row: 0, col: 0,
      cell: [351.81, 170, 915, 729.75],
      ink: 900,
      faucets: [
        { x: 554.55, y: 258.32, dir: 'down', rate: 46, total: 110, spread: 0.55 },
      ],
      glasses: [
        { x: 715.16, y: 604.41, w: 48, h: 79.6, need: 0.72, fixed: true },
      ],
      platforms: [
        { kind: 'ink', pieces: [{ x: 556.84, y: 456.76, w: 64.23, h: 229.98, angle: -1.57 }] },
        { kind: 'grey', pieces: [{ poly: [[801.44, 641.43], [617.92, 641.43], [617.92, 650.03], [801.44, 650.03]], ox: 709.68, oy: 645.73 }] },
      ],
    },
    {
      name: 'Sheet 5 · 1,2',
      blueprint: true,
      page: 5, row: 0, col: 1,
      cell: [358.55, 170, 921.74, 729.75],
      ink: 900,
      faucets: [
        { x: 647.6, y: 170, dir: 'down', rate: 46, total: 110, spread: 0.55 },
      ],
      glasses: [
        { x: 722.89, y: 604.04, w: 60.5, h: 101.1, need: 0.72, fixed: true },
      ],
      platforms: [
        { kind: 'ink', pieces: [{ poly: [[358.55, 444.14], [358.55, 457.33], [693.48, 487.15], [691.76, 473.96]], ox: 525.59, oy: 465.64 }] },
        { kind: 'ink', pieces: [{ x: 749.34, y: 336.23, w: 341.9, h: 10.04, angle: -0.24 }] },
        { kind: 'grey', pieces: [{ poly: [[671.69, 650.03], [671.69, 662.08], [837.43, 662.08], [837.43, 649.46]], ox: 754.56, oy: 655.91 }] },
      ],
      falls: [
        { kind: 'hot', pieces: [{ x: 612.07, y: 451.82, w: 33.78, h: 37.22, angle: -1.5 }] },
      ],
    },
    {
      name: 'Sheet 5 · 1,3',
      blueprint: true,
      page: 5, row: 0, col: 2,
      cell: [358.69, 170, 921.88, 729.75],
      ink: 900,
      faucets: [
        { x: 921.31, y: 219.61, dir: 'left', rate: 46, total: 110, spread: 0.55 },
      ],
      glasses: [
        { x: 660.2, y: 571.03, w: 79.3, h: 129.1, need: 0.72, fixed: true },
      ],
      platforms: [
        { kind: 'ink', pieces: [{ x: 804.89, y: 419.48, w: 105.53, h: 218.51, angle: -1.57 }] },
        { kind: 'grey', pieces: [{ poly: [[518.42, 627.66], [518.42, 643.15], [921.31, 643.15], [921.31, 627.66]], ox: 719.87, oy: 635.4 }] },
        { kind: 'grey', pieces: [{ x: 631.11, y: 445.86, w: 57.18, h: 57.18, angle: -0.79 }] },
      ],
      falls: [
        { kind: 'hot', pieces: [{ poly: [[633.69, 170], [624.52, 252.01], [694.48, 324.85], [694.48, 251.44], [649.18, 250.87], [649.18, 170]], ox: 657.59, oy: 236.53 }] },
      ],
    },
    {
      name: 'Sheet 5 · 2,1',
      blueprint: true,
      page: 5, row: 1, col: 0,
      cell: [356.54, 170, 910.49, 720.56],
      ink: 900,
      faucets: [
        { x: 625.33, y: 189.46, dir: 'down', rate: 46, total: 110, spread: 0.55 },
      ],
      glasses: [
        { x: 613.56, y: 565.89, w: 78, h: 127, need: 0.72, fixed: true },
      ],
      platforms: [
        { kind: 'ink', pieces: [{ x: 476.41, y: 388.87, w: 13.54, h: 227.33, angle: -1.57 }] },
        { kind: 'grey', pieces: [{ poly: [[558.49, 629.18], [558.49, 634.82], [666.23, 634.82], [666.79, 634.26], [666.79, 629.74], [666.23, 629.18], [621.67, 629.18], [621.1, 628.62], [617.15, 628.62], [616.59, 629.18], [615.46, 628.62], [614.9, 629.18], [611.51, 629.18], [610.95, 628.62], [610.38, 629.18], [607.56, 628.62], [607, 629.18], [606.44, 628.62], [603.62, 629.18]], ox: 618.28, oy: 629.89 }] },
      ],
      falls: [
        { kind: 'hot', pieces: [{ x: 618.28, y: 336.97, w: 9.03, h: 141.03, angle: -1.57 }] },
      ],
    },
    {
      name: 'Sheet 5 · 2,2',
      blueprint: true,
      page: 5, row: 1, col: 1,
      cell: [363.17, 170, 917.12, 720.56],
      ink: 900,
      faucets: [
        { x: 532.12, y: 170, dir: 'down', rate: 46, total: 110, spread: 0.55 },
      ],
      glasses: [
        { x: 634.29, y: 559.17, w: 78, h: 127, need: 0.72, fixed: true },
      ],
      platforms: [
        { kind: 'grey', pieces: [{ x: 468.26, y: 330.15, w: 60.42, h: 60.42, angle: 0, r: 30.21 }] },
        { kind: 'grey', pieces: [{ x: 404.15, y: 324.14, w: 59.29, h: 59.29, angle: 0, r: 29.64 }] },
        { kind: 'ink', pieces: [{ x: 758.18, y: 424.47, w: 186.29, h: 8.43, angle: -0.17 }] },
        { kind: 'ink', pieces: [{ x: 436.02, y: 361.54, w: 10.89, h: 135.95, angle: -1.48 }] },
        { kind: 'ink', pieces: [{ poly: [[474.86, 421.59], [474.86, 424.97], [582.04, 437.95], [585.99, 437.95], [586.55, 433.44], [478.24, 420.46]], ox: 530.42, oy: 429.39 }] },
      ],
      falls: [
        { kind: 'hot', pieces: [{ x: 568.81, y: 376.6, w: 9.51, h: 68.99, angle: -1.48 }] },
      ],
    },
    {
      name: 'Sheet 5 · 2,3',
      blueprint: true,
      page: 5, row: 1, col: 2,
      cell: [363.31, 170, 917.26, 720.56],
      ink: 900,
      faucets: [
        { x: 505.46, y: 248.69, dir: 'right', rate: 46, total: 110, spread: 0.55 },
      ],
      glasses: [
        { x: 721.4, y: 562.7, w: 78, h: 127, need: 0.72, fixed: true },
      ],
      platforms: [
        { kind: 'ink', pieces: [{ x: 484.59, y: 446.41, w: 103.79, h: 230.72, angle: -1.57 }] },
        { kind: 'grey', pieces: [{ poly: [[533.95, 618.46], [533.95, 633.69], [916.69, 633.69], [916.69, 618.46]], ox: 725.32, oy: 626.08 }] },
        { kind: 'grey', pieces: [{ poly: [[626.46, 273.79], [572.87, 368], [680.62, 368]], ox: 626.65, oy: 336.6 }] },
      ],
      falls: [
        { kind: 'hot', pieces: [{ x: 586.21, y: 282.99, w: 45.64, h: 45.64, angle: 0, r: 22.82 }] },
      ],
    },
    {
      name: 'Sheet 5 · 3,1',
      blueprint: true,
      page: 5, row: 2, col: 0,
      cell: [356.68, 170, 910.35, 720.28],
      ink: 900,
      faucets: [
        { x: 923.32, y: 333.22, dir: 'left', rate: 46, total: 110, spread: 0.55 },
      ],
      glasses: [
        { x: 529.41, y: 596.78, w: 53.3, h: 88.9, need: 0.72, fixed: true },
      ],
      platforms: [
        { kind: 'grey', pieces: [{ poly: [[923.32, 372.41], [844.95, 334.07], [882.16, 372.41], [698.35, 372.41], [697.79, 459.8], [573.75, 459.8], [923.32, 459.8]], ox: 791.95, oy: 404.39 }] },
        { kind: 'ink', pieces: [{ poly: [[697.79, 372.41], [574.32, 459.24], [697.79, 459.24]], ox: 656.63, oy: 430.3 }] },
        { kind: 'ink', pieces: [{ x: 829.84, y: 285.75, w: 189.07, h: 9.53, angle: -0.37 }] },
        { kind: 'grey', pieces: [{ x: 520.47, y: 646.14, w: 10.71, h: 140.39, angle: -1.57 }] },
      ],
      falls: [
        { kind: 'hot', pieces: [{ x: 834.26, y: 257.05, w: 48.83, h: 48.83, angle: 0, r: 24.41 }] },
      ],
    },
    {
      name: 'Sheet 5 · 3,2',
      blueprint: true,
      page: 5, row: 2, col: 1,
      cell: [363.31, 170, 916.97, 720.28],
      ink: 900,
      faucets: [
        { x: 593.34, y: 170, dir: 'down', rate: 46, total: 110, spread: 0.55 },
      ],
      glasses: [
        { x: 665.39, y: 571.28, w: 53.3, h: 88.8, need: 0.72, fixed: true },
      ],
      platforms: [
        { kind: 'grey', pieces: [{ x: 494.68, y: 446.83, w: 10.15, h: 251.46, angle: -1.57 }] },
        { kind: 'grey', pieces: [{ x: 670.87, y: 620.49, w: 11.28, h: 140.39, angle: -1.57 }] },
        { kind: 'grey', pieces: [{ x: 628.86, y: 364.52, w: 35.89, h: 35.89, angle: -0.79 }] },
        { kind: 'ink', pieces: [{ x: 373.94, y: 245.97, w: 14.29, h: 9.47, angle: -0.37 }] },
      ],
      falls: [
        { kind: 'hot', pieces: [{ x: 582.74, y: 317.89, w: 42, h: 42, angle: 0, r: 21 }] },
      ],
    },
    {
      name: 'Sheet 5 · 3,3',
      blueprint: true,
      page: 5, row: 2, col: 2,
      cell: [363.45, 170, 917.11, 720.28],
      ink: 900,
      faucets: [
        { x: 638.87, y: 283.33, dir: 'left', rate: 46, total: 110, spread: 0.55 },
      ],
      glasses: [
        { x: 535.5, y: 565.95, w: 53.3, h: 88.8, need: 0.72, fixed: true },
      ],
      platforms: [
        { kind: 'grey', pieces: [{ x: 539.64, y: 626.13, w: 23.68, h: 109.38, angle: -1.57 }] },
        { kind: 'grey', pieces: [{ x: 597.43, y: 452.19, w: 31.01, h: 11.84, angle: -1.57 }] },
      ],
      falls: [
        { kind: 'hot', pieces: [{ x: 587.85, y: 428.79, w: 13.53, h: 211.43, angle: -1.57 }] },
        { kind: 'hot', pieces: [{ x: 514.24, y: 371.39, w: 36.03, h: 36.03, angle: 0, r: 18.01 }] },
      ],
    },
    {
      name: 'Sheet 6 · 1,1',
      blueprint: true,
      page: 6, row: 0, col: 0,
      cell: [351.67, 170, 914.57, 729.46],
      ink: 900,
      faucets: [
        { x: 507.87, y: 417.06, dir: 'right', rate: 46, total: 110, spread: 0.55 },
      ],
      glasses: [
        { x: 634.31, y: 507.88, w: 79.3, h: 129, need: 0.72, fixed: true },
      ],
      platforms: [
        { kind: 'ink', pieces: [{ x: 572.07, y: 341.96, w: 41.76, h: 41.76, angle: -0.79 }] },
        { kind: 'ink', pieces: [{ x: 706.64, y: 352.14, w: 41.76, h: 41.33, angle: -0.79 }] },
        { kind: 'grey', pieces: [{ poly: [[589.84, 572.68], [589.84, 584.15], [693.02, 584.15], [693.02, 572.68], [642.01, 572.68], [642.01, 571.54]], ox: 641.62, oy: 576.31 }] },
      ],
    },
    {
      name: 'Sheet 6 · 1,2',
      blueprint: true,
      page: 6, row: 0, col: 1,
      cell: [358.55, 170, 921.45, 729.46],
      ink: 900,
      faucets: [
        { x: 863.27, y: 253.69, dir: 'left', rate: 46, total: 110, spread: 0.55 },
      ],
      glasses: [
        { x: 516.92, y: 558.1, w: 79.3, h: 129, need: 0.72, fixed: true },
      ],
      platforms: [
        { kind: 'grey', pieces: [{ x: 773.85, y: 431.96, w: 49.87, h: 215.53, angle: -1.57 }] },
        { kind: 'grey', pieces: [{ x: 584.11, y: 431.96, w: 49.87, h: 61.91, angle: -1.57 }] },
        { kind: 'grey', pieces: [{ x: 523.92, y: 628, w: 12.04, h: 103.18, angle: -1.57 }] },
      ],
      falls: [
        { kind: 'hot', pieces: [{ x: 724.55, y: 350.28, w: 112.35, h: 20.64, angle: -1.57 }] },
      ],
    },
    {
      name: 'Sheet 6 · 1,3',
      blueprint: true,
      page: 6, row: 0, col: 2,
      cell: [358.55, 170, 921.45, 729.46],
      ink: 900,
      faucets: [
        { x: 921.45, y: 295.25, dir: 'left', rate: 46, total: 110, spread: 0.55 },
      ],
      glasses: [
        { x: 656.61, y: 572.48, w: 79.3, h: 129, need: 0.72, fixed: true },
      ],
      platforms: [
        { kind: 'ink', pieces: [{ x: 804.8, y: 419.64, w: 105.47, h: 218.97, angle: -1.57 }] },
        { kind: 'grey', pieces: [{ poly: [[518.19, 627.71], [518.19, 643.19], [921.45, 643.19], [921.45, 627.71]], ox: 719.82, oy: 635.45 }] },
        { kind: 'ink', pieces: [{ poly: [[555.45, 285.5], [625.96, 358.87], [625.96, 285.5]], ox: 602.46, oy: 309.96 }] },
      ],
      falls: [
        { kind: 'hot', pieces: [{ x: 628.39, y: 406.88, w: 49.04, h: 49.44, angle: -0.79 }] },
      ],
    },
    {
      name: 'Sheet 6 · 2,1',
      blueprint: true,
      page: 6, row: 1, col: 0,
      cell: [356.55, 170, 909.93, 720],
      ink: 900,
      faucets: [
        { x: 436.85, y: 170, dir: 'down', rate: 46, total: 110, spread: 0.55 },
      ],
      glasses: [
        { x: 613.47, y: 565.95, w: 77.9, h: 126.8, need: 0.72, fixed: true },
      ],
      platforms: [
        { kind: 'ink', pieces: [{ x: 477.62, y: 368.64, w: 13.72, h: 232.51, angle: -1.48 }] },
        { kind: 'grey', pieces: [{ x: 514.62, y: 632.94, w: 8.45, h: 304.3, angle: -1.57 }] },
        { kind: 'ink', pieces: [{ x: 764.71, y: 460.58, w: 8.45, h: 186.22, angle: -1.45 }] },
      ],
      falls: [
        { kind: 'hot', pieces: [{ x: 676.21, y: 254.67, w: 45.65, h: 45.65, angle: 0, r: 22.82 }] },
        { kind: 'hot', pieces: [{ x: 720.25, y: 346.27, w: 9.21, h: 141.61, angle: -1.45 }] },
      ],
    },
    {
      name: 'Sheet 6 · 2,2',
      blueprint: true,
      page: 6, row: 1, col: 1,
      cell: [363.31, 170, 916.69, 720],
      ink: 900,
      faucets: [
        { x: 480.24, y: 170, dir: 'down', rate: 46, total: 110, spread: 0.55 },
      ],
      glasses: [
        { x: 580.14, y: 562.76, w: 77.9, h: 126.8, need: 0.72, fixed: true },
      ],
      platforms: [
        { kind: 'ink', pieces: [{ poly: [[562.52, 381.89], [569.84, 428.09], [618.3, 435.98], [611.54, 392.03], [610.41, 389.21]], ox: 594.52, oy: 405.44 }] },
        { kind: 'ink', pieces: [{ x: 771.22, y: 456.64, w: 8.45, h: 186.24, angle: -1.45 }] },
        { kind: 'ink', pieces: [{ x: 435.24, y: 361.63, w: 10.88, h: 133.56, angle: -1.48 }] },
        { kind: 'grey', pieces: [{ x: 582.8, y: 634.91, w: 11.27, h: 101.43, angle: -1.57 }] },
      ],
      falls: [
        { kind: 'hot', pieces: [{ x: 603.06, y: 442.77, w: 11.41, h: 56.72, angle: -1.45 }] },
        { kind: 'hot', pieces: [{ x: 510.11, y: 386.39, w: 11.1, h: 48.38, angle: -0.46 }] },
        { kind: 'hot', pieces: [{ x: 574.1, y: 369.52, w: 11.1, h: 48.58, angle: -1.48 }] },
      ],
    },
    {
      name: 'Sheet 6 · 2,3',
      blueprint: true,
      page: 6, row: 1, col: 2,
      cell: [363.31, 170, 916.69, 720],
      ink: 900,
      faucets: [
        { x: 505.6, y: 248.89, dir: 'right', rate: 46, total: 110, spread: 0.55 },
      ],
      glasses: [
        { x: 721.33, y: 562.76, w: 77.9, h: 126.8, need: 0.72, fixed: true },
      ],
      platforms: [
        { kind: 'ink', pieces: [{ x: 484.75, y: 446.69, w: 103.69, h: 231.05, angle: -1.57 }] },
        { kind: 'grey', pieces: [{ poly: [[533.78, 618.57], [533.78, 633.78], [916.69, 633.78], [916.69, 618.57]], ox: 725.24, oy: 626.17 }] },
        { kind: 'grey', pieces: [{ poly: [[626.19, 274.25], [572.66, 368.36], [680.29, 368.36], [627.32, 274.82]], ox: 626.62, oy: 321.45 }] },
      ],
      falls: [
        { kind: 'hot', pieces: [{ x: 663.1, y: 285.07, w: 45.65, h: 45.65, angle: 0, r: 22.82 }] },
      ],
    },
    {
      name: 'Sheet 6 · 3,1',
      blueprint: true,
      page: 6, row: 2, col: 0,
      cell: [356.69, 170, 909.79, 719.72],
      ink: 900,
      faucets: [
        { x: 923.31, y: 333.62, dir: 'left', rate: 46, total: 110, spread: 0.55 },
      ],
      glasses: [
        { x: 529.35, y: 596.71, w: 53.3, h: 88.8, need: 0.72, fixed: true },
      ],
      platforms: [
        { kind: 'grey', pieces: [{ poly: [[923.31, 372.2], [844.74, 333.9], [881.91, 372.2], [697.73, 372.2], [698.29, 459.5], [923.31, 459.5]], ox: 828.22, oy: 394.92 }] },
        { kind: 'ink', pieces: [{ poly: [[697.73, 372.76], [573.82, 459.5], [697.73, 459.5]], ox: 656.43, oy: 430.59 }] },
        { kind: 'grey', pieces: [{ x: 520.03, y: 645.93, w: 11.26, h: 140.25, angle: -1.57 }] },
        { kind: 'grey', pieces: [{ x: 680.55, y: 288.28, w: 37.17, h: 34.36, angle: -1.57 }] },
      ],
      falls: [
        { kind: 'hot', pieces: [{ x: 829.67, y: 285.83, w: 188.99, h: 9.63, angle: -0.37 }] },
      ],
    },
    {
      name: 'Sheet 6 · 3,2',
      blueprint: true,
      page: 6, row: 2, col: 1,
      cell: [363.45, 170, 916.55, 719.72],
      ink: 900,
      faucets: [
        { x: 593.53, y: 170, dir: 'down', rate: 46, total: 110, spread: 0.55 },
      ],
      glasses: [
        { x: 665.3, y: 571.21, w: 53.3, h: 88.7, need: 0.72, fixed: true },
      ],
      platforms: [
        { kind: 'grey', pieces: [{ x: 494.97, y: 446.83, w: 9.58, h: 251.2, angle: -1.57 }] },
        { kind: 'grey', pieces: [{ x: 670.98, y: 620.59, w: 11.26, h: 140.25, angle: -1.57 }] },
        { kind: 'grey', pieces: [{ x: 628.74, y: 364.6, w: 35.85, h: 35.85, angle: -0.79 }] },
      ],
      falls: [
        { kind: 'hot', pieces: [{ x: 582.75, y: 317.91, w: 41.96, h: 41.96, angle: 0, r: 20.98 }] },
        { kind: 'hot', pieces: [{ x: 374.21, y: 245.9, w: 13.91, h: 9.63, angle: -0.36 }] },
      ],
    },
    {
      name: 'Sheet 6 · 3,3',
      blueprint: true,
      page: 6, row: 2, col: 2,
      cell: [363.45, 170, 916.55, 719.72],
      ink: 900,
      faucets: [
        { x: 638.59, y: 283.21, dir: 'left', rate: 46, total: 110, spread: 0.55 },
      ],
      glasses: [
        { x: 680.82, y: 565.88, w: 53.3, h: 88.7, need: 0.72, fixed: true },
      ],
      platforms: [
        { kind: 'grey', pieces: [{ x: 680.83, y: 615.24, w: 10.7, h: 140.81, angle: -1.57 }] },
        { kind: 'grey', pieces: [{ x: 511.75, y: 390.06, w: 36.22, h: 36.22, angle: 0, r: 18.11 }] },
        { kind: 'grey', pieces: [{ x: 597.48, y: 451.9, w: 30.98, h: 12.39, angle: -1.57 }] },
      ],
    },
    {
      name: 'Sheet 7 · 1,1',
      blueprint: true,
      page: 7, row: 0, col: 0,
      cell: [351.82, 170, 914.71, 729.46],
      ink: 900,
      faucets: [
        { x: 507.73, y: 417.06, dir: 'right', rate: 46, total: 110, spread: 0.55 },
      ],
      glasses: [
        { x: 634.27, y: 507.82, w: 79.3, h: 129, need: 0.72, fixed: true },
      ],
      platforms: [
        { kind: 'ink', pieces: [{ x: 706.64, y: 352, w: 41.76, h: 41.76, angle: -0.79 }] },
        { kind: 'ink', pieces: [{ x: 571.93, y: 341.96, w: 41.33, h: 41.33, angle: -0.79 }] },
        { kind: 'grey', pieces: [{ x: 641.29, y: 578.13, w: 11.46, h: 103.18, angle: -1.57 }] },
      ],
    },
    {
      name: 'Sheet 7 · 1,2',
      blueprint: true,
      page: 7, row: 0, col: 1,
      cell: [358.55, 170, 921.45, 729.46],
      ink: 900,
      faucets: [
        { x: 863.27, y: 253.4, dir: 'left', rate: 46, total: 110, spread: 0.55 },
      ],
      glasses: [
        { x: 517.03, y: 558.04, w: 79.3, h: 129, need: 0.72, fixed: true },
      ],
      platforms: [
        { kind: 'grey', pieces: [{ x: 773.85, y: 431.96, w: 50.44, h: 215.53, angle: -1.57 }] },
        { kind: 'grey', pieces: [{ x: 584.11, y: 431.96, w: 50.44, h: 61.91, angle: -1.57 }] },
        { kind: 'grey', pieces: [{ poly: [[472.33, 622.84], [472.91, 634.3], [575.51, 634.3], [575.51, 622.84], [525.07, 622.84], [524.5, 621.69]], ox: 524.31, oy: 626.47 }] },
      ],
      falls: [
        { kind: 'hot', pieces: [{ x: 724.55, y: 350.56, w: 112.35, h: 20.64, angle: -1.57 }] },
      ],
    },
    {
      name: 'Sheet 7 · 1,3',
      blueprint: true,
      page: 7, row: 0, col: 2,
      cell: [358.55, 170, 921.45, 729.46],
      ink: 900,
      faucets: [
        { x: 882.76, y: 276.9, dir: 'left', rate: 46, total: 110, spread: 0.55 },
      ],
      glasses: [
        { x: 660.65, y: 582.03, w: 79.3, h: 129, need: 0.72, fixed: true },
      ],
      platforms: [
        { kind: 'grey', pieces: [{ x: 793.34, y: 455.46, w: 50.44, h: 215.53, angle: -1.57 }] },
        { kind: 'grey', pieces: [{ x: 603.6, y: 455.46, w: 50.44, h: 61.91, angle: -1.57 }] },
        { kind: 'grey', pieces: [{ x: 657.48, y: 656.09, w: 11.46, h: 103.18, angle: -1.57 }] },
      ],
      falls: [
        { kind: 'hot', pieces: [{ x: 714.52, y: 347.98, w: 163.37, h: 12.04, angle: -1.57 }] },
      ],
    },
    {
      name: 'Sheet 7 · 2,1',
      blueprint: true,
      page: 7, row: 1, col: 0,
      cell: [356.69, 170, 910.07, 720],
      ink: 900,
      faucets: [
        { x: 485.74, y: 170, dir: 'down', rate: 46, total: 110, spread: 0.55 },
      ],
      glasses: [
        { x: 632.58, y: 565.89, w: 77.9, h: 126.8, need: 0.72, fixed: true },
      ],
      platforms: [
        { kind: 'ink', pieces: [{ x: 479.82, y: 422.46, w: 47.9, h: 233.86, angle: -1.57 }] },
        { kind: 'grey', pieces: [{ poly: [[596.75, 397.95], [580.97, 361.88], [541.52, 361.88], [540.4, 397.95], [356.69, 397.95]], ox: 523.27, oy: 383.52 }] },
        { kind: 'grey', pieces: [{ poly: [[602.38, 629.55], [602.38, 634.63], [666.63, 634.63], [666.63, 629.55], [635.63, 629.55], [634.51, 628.43], [630, 628.43], [629.43, 629.55], [626.62, 628.43], [626.62, 629.55]], ox: 632.08, oy: 630.23 }] },
      ],
      falls: [
        { kind: 'hot', pieces: [{ x: 501.51, y: 321.02, w: 8.45, h: 185.96, angle: -1.57 }] },
      ],
    },
    {
      name: 'Sheet 7 · 2,2',
      blueprint: true,
      page: 7, row: 1, col: 1,
      cell: [363.31, 170, 916.69, 720],
      ink: 900,
      faucets: [
        { x: 608.44, y: 241.85, dir: 'down', rate: 46, total: 110, spread: 0.55 },
      ],
      glasses: [
        { x: 625.95, y: 464.44, w: 75.9, h: 124.7, need: 0.72, fixed: true },
      ],
      platforms: [
        { kind: 'grey', pieces: [{ x: 579.98, y: 540.52, w: 28.18, h: 20.29, angle: -1.57 }] },
        { kind: 'grey', pieces: [{ x: 675.22, y: 540.52, w: 28.18, h: 20.29, angle: -1.57 }] },
        { kind: 'grey', pieces: [{ x: 525.89, y: 401.61, w: 27.61, h: 20.29, angle: -1.57 }] },
        { kind: 'grey', pieces: [{ x: 717.48, y: 401.61, w: 27.61, h: 20.29, angle: -1.57 }] },
      ],
      falls: [
        { kind: 'hot', pieces: [{ x: 735.24, y: 374.28, w: 18.03, h: 196.67, angle: -1.57 }] },
        { kind: 'hot', pieces: [{ x: 505.32, y: 375.4, w: 15.78, h: 195.54, angle: -1.57 }] },
        { kind: 'hot', pieces: [{ x: 627.6, y: 542.21, w: 14.65, h: 71.57, angle: -1.57 }] },
      ],
    },
    {
      name: 'Sheet 7 · 2,3',
      blueprint: true,
      page: 7, row: 1, col: 2,
      cell: [363.31, 170, 916.69, 720],
      ink: 900,
      faucets: [
        { x: 626.19, y: 254.81, dir: 'down', rate: 46, total: 110, spread: 0.55 },
      ],
      glasses: [
        { x: 640.51, y: 495.69, w: 75.9, h: 124.7, need: 0.72, fixed: true },
      ],
      platforms: [
        { kind: 'ink', pieces: [{ x: 643.1, y: 563.34, w: 14.09, h: 71, angle: -1.57 }] },
        { kind: 'grey', pieces: [{ x: 735.24, y: 414.57, w: 27.61, h: 20.85, angle: -1.57 }] },
        { kind: 'grey', pieces: [{ x: 543.64, y: 414.57, w: 27.61, h: 20.85, angle: -1.57 }] },
      ],
      falls: [
        { kind: 'hot', pieces: [{ x: 522.51, y: 387.24, w: 18.03, h: 193.85, angle: -1.57 }] },
        { kind: 'hot', pieces: [{ x: 754.68, y: 386.39, w: 16.34, h: 193.85, angle: -1.57 }] },
      ],
    },
    {
      name: 'Sheet 7 · 3,1',
      blueprint: true,
      page: 7, row: 2, col: 0,
      cell: [356.83, 170, 909.93, 719.72],
      ink: 900,
      faucets: [
        { x: 516.23, y: 299.83, dir: 'right', rate: 46, total: 110, spread: 0.55 },
      ],
      glasses: [
        { x: 622.55, y: 525.36, w: 75.9, h: 124.7, need: 0.72, fixed: true },
      ],
      platforms: [
        { kind: 'grey', pieces: [{ x: 742.37, y: 419.51, w: 53.51, h: 161.65, angle: -1.57 }] },
        { kind: 'ink', pieces: [{ x: 625.22, y: 592.99, w: 14.08, h: 71.53, angle: -1.57 }] },
        { kind: 'grey', pieces: [{ x: 504.96, y: 478.93, w: 27.04, h: 24.78, angle: -1.57 }] },
      ],
      falls: [
        { kind: 'hot', pieces: [{ x: 625.22, y: 362.63, w: 17.46, h: 211.21, angle: -1.57 }] },
      ],
    },
    {
      name: 'Sheet 7 · 3,2',
      blueprint: true,
      page: 7, row: 2, col: 1,
      cell: [363.45, 170, 916.55, 719.72],
      ink: 900,
      faucets: [
        { x: 633.52, y: 223.79, dir: 'down', rate: 46, total: 110, spread: 0.55 },
      ],
      glasses: [
        { x: 651.17, y: 560.48, w: 53.3, h: 88.7, need: 0.72, fixed: true },
      ],
      platforms: [
        { kind: 'ink', pieces: [{ x: 651.26, y: 610.17, w: 10.14, h: 140.25, angle: -1.57 }] },
        { kind: 'grey', pieces: [{ x: 570.16, y: 455.56, w: 25.35, h: 27.6, angle: -1.57 }] },
      ],
      falls: [
        { kind: 'hot', pieces: [{ x: 648.45, y: 406.28, w: 18.02, h: 211.21, angle: -1.57 }] },
        { kind: 'hot', pieces: [{ x: 722.09, y: 454.83, w: 35.99, h: 35.99, angle: 0, r: 18 }] },
      ],
    },
    {
      name: 'Sheet 7 · 3,3',
      blueprint: true,
      page: 7, row: 2, col: 2,
      cell: [363.45, 170, 916.55, 719.72],
      ink: 900,
      faucets: [
        { x: 486.52, y: 255.89, dir: 'down', rate: 46, total: 110, spread: 0.55 },
      ],
      glasses: [
        { x: 693.82, y: 465.47, w: 75.8, h: 124.6, need: 0.72, fixed: true },
      ],
      platforms: [
        { kind: 'grey', pieces: [{ poly: [[584.52, 525.68], [584.52, 540.89], [888.11, 540.89], [888.11, 525.68], [711.81, 524.56], [686.47, 527.37], [671.26, 522.87], [674.64, 525.12]], ox: 711.18, oy: 529.13 }] },
        { kind: 'grey', pieces: [{ x: 595.5, y: 460.07, w: 125.6, h: 17.46, angle: -1.57 }] },
      ],
    },
    {
      name: 'Sheet 8 · 1,1',
      blueprint: true,
      page: 8, row: 0, col: 0,
      cell: [351.82, 170, 914.71, 729.46],
      ink: 900,
      faucets: [
        { x: 656.77, y: 196.08, dir: 'down', rate: 46, total: 110, spread: 0.55 },
      ],
      glasses: [
        { x: 667.1, y: 532.54, w: 62.6, h: 103.2, need: 0.72, fixed: true },
      ],
      platforms: [
        { kind: 'grey', pieces: [{ x: 660.78, y: 632.58, w: 111.78, h: 395.52, angle: -1.57 }] },
        { kind: 'ink', pieces: [{ poly: [[511.74, 357.15], [511.74, 477.53], [626.96, 477.53]], ox: 550.15, oy: 437.4 }] },
      ],
      falls: [
        { kind: 'hot', pieces: [{ poly: [[597.73, 257.42], [512.89, 342.25], [593.71, 423.65]], ox: 568.11, oy: 341.11 }] },
      ],
    },
    {
      name: 'Sheet 8 · 1,2',
      blueprint: true,
      page: 8, row: 0, col: 1,
      cell: [358.55, 170, 921.45, 729.46],
      ink: 900,
      faucets: [
        { x: 646.31, y: 196.08, dir: 'down', rate: 46, total: 110, spread: 0.55 },
      ],
      glasses: [
        { x: 656.58, y: 532.54, w: 62.6, h: 103.2, need: 0.72, fixed: true },
      ],
      platforms: [
        { kind: 'grey', pieces: [{ x: 650.03, y: 633.73, w: 109.48, h: 395.52, angle: -1.57 }] },
        { kind: 'ink', pieces: [{ poly: [[501.57, 357.15], [501.57, 477.53], [616.78, 477.53]], ox: 539.97, oy: 437.4 }] },
      ],
      falls: [
        { kind: 'hot', pieces: [{ x: 562.82, y: 331.59, w: 59.04, h: 59.04, angle: 0, r: 29.52 }] },
      ],
    },
    {
      name: 'Sheet 8 · 1,3',
      blueprint: true,
      page: 8, row: 0, col: 2,
      cell: [358.55, 170, 921.45, 729.46],
      ink: 900,
      faucets: [
        { x: 660.06, y: 198.95, dir: 'down', rate: 46, total: 110, spread: 0.55 },
      ],
      glasses: [
        { x: 559.96, y: 534.98, w: 62.6, h: 103.2, need: 0.72, fixed: true },
        { x: 756.49, y: 532.54, w: 62.6, h: 103.2, need: 0.72, fixed: true },
      ],
      platforms: [
        { kind: 'grey', pieces: [{ x: 664.08, y: 634.88, w: 111.78, h: 394.95, angle: -1.57 }] },
        { kind: 'ink', pieces: [{ poly: [[612.77, 329.07], [705.63, 331.36], [658.63, 284.36], [643.73, 298.11]], ox: 655.19, oy: 310.73 }] },
      ],
      falls: [
        { kind: 'hot', pieces: [{ x: 745.18, y: 445.14, w: 7.45, h: 141.01, angle: -1.57 }] },
        { kind: 'hot', pieces: [{ x: 561.18, y: 444.57, w: 7.45, h: 141.01, angle: -1.57 }] },
      ],
    },
    {
      name: 'Sheet 8 · 2,1',
      blueprint: true,
      page: 8, row: 1, col: 0,
      cell: [356.69, 170, 910.07, 720],
      ink: 900,
      faucets: [
        { x: 799.05, y: 326.94, dir: 'left', rate: 46, total: 110, spread: 0.55 },
      ],
      glasses: [
        { x: 587.8, y: 509.99, w: 73.8, h: 120.5, need: 0.72, fixed: true },
      ],
      platforms: [
        { kind: 'grey', pieces: [{ x: 587.17, y: 619.41, w: 107.63, h: 388.83, angle: -1.57 }] },
      ],
      hots: [
        { kind: 'danger', pieces: [{ x: 727.21, y: 411.19, w: 18.03, h: 158.35, angle: -1.57 }] },
      ],
    },
    {
      name: 'Sheet 8 · 2,2',
      blueprint: true,
      page: 8, row: 1, col: 1,
      cell: [363.31, 170, 916.69, 720],
      ink: 900,
      faucets: [
        { x: 480.24, y: 309.19, dir: 'down', rate: 46, total: 110, spread: 0.55 },
      ],
      glasses: [
        { x: 688.1, y: 547.48, w: 75.9, h: 124.7, need: 0.72, fixed: true },
      ],
      platforms: [
        { kind: 'grey', pieces: [{ poly: [[578.29, 607.86], [578.86, 623.07], [882.03, 623.07], [882.03, 607.3], [706.21, 606.73], [680.86, 609.55], [665.08, 605.04], [669.02, 606.73]], ox: 705.3, oy: 611.17 }] },
        { kind: 'grey', pieces: [{ x: 589.85, y: 541.93, w: 125.1, h: 17.47, angle: -1.57 }] },
      ],
      hots: [
        { kind: 'danger', pieces: [{ x: 587.87, y: 466.13, w: 15.22, h: 81.15, angle: -1.57 }] },
      ],
    },
    {
      name: 'Sheet 8 · 2,3',
      blueprint: true,
      page: 8, row: 1, col: 2,
      cell: [363.31, 170, 916.69, 720],
      ink: 900,
      faucets: [
        { x: 635.49, y: 260.16, dir: 'down', rate: 46, total: 110, spread: 0.55 },
      ],
      glasses: [
        { x: 640.17, y: 460.26, w: 53.3, h: 88.8, need: 0.72, fixed: true },
      ],
      platforms: [
        { kind: 'grey', pieces: [{ x: 642.82, y: 582.78, w: 157.22, h: 45.65, angle: -1.57 }] },
      ],
      falls: [
        { kind: 'hot', pieces: [{ x: 680.01, y: 419.36, w: 7.33, h: 138.06, angle: -1.57 }] },
      ],
    },
    {
      name: 'Sheet 8 · 3,1',
      blueprint: true,
      page: 8, row: 2, col: 0,
      cell: [356.83, 170, 909.93, 719.72],
      ink: 900,
      faucets: [
        { x: 535.66, y: 203.79, dir: 'down', rate: 46, total: 110, spread: 0.55 },
      ],
      glasses: [
        { x: 520.97, y: 565.15, w: 73.8, h: 120.4, need: 0.72, fixed: true },
      ],
      platforms: [
        { kind: 'grey', pieces: [{ poly: [[881.77, 453.31], [791.09, 385.72], [723.5, 453.31], [608.04, 453.31], [608.04, 545.12], [881.77, 545.12]], ox: 749.03, oy: 472.65 }] },
        { kind: 'grey', pieces: [{ x: 519.05, y: 634.95, w: 17.46, h: 125.04, angle: -1.57 }] },
      ],
      hots: [
        { kind: 'danger', pieces: [{ x: 544.11, y: 338.41, w: 18.02, h: 158.27, angle: -1.57 }] },
      ],
    },
    {
      name: 'Sheet 8 · 3,2',
      blueprint: true,
      page: 8, row: 2, col: 1,
      cell: [363.45, 170, 916.55, 719.72],
      ink: 900,
      faucets: [
        { x: 606.49, y: 191.97, dir: 'down', rate: 46, total: 110, spread: 0.55 },
      ],
      glasses: [
        { x: 709.24, y: 545.31, w: 73.8, h: 120.4, need: 0.72, fixed: true },
        { x: 478.45, y: 484.65, w: 73.8, h: 120.4, need: 0.72, fixed: true },
      ],
      platforms: [
        { kind: 'grey', pieces: [{ x: 483.98, y: 554.41, w: 17.46, h: 125.6, angle: -1.57 }] },
        { kind: 'grey', pieces: [{ x: 714.07, y: 617.21, w: 16.9, h: 125.04, angle: -1.57 }] },
      ],
      hots: [
        { kind: 'danger', pieces: [{ x: 656.19, y: 415.43, w: 42.61, h: 42.21, angle: -0.79 }] },
        { kind: 'danger', pieces: [{ x: 568.19, y: 359.25, w: 42.21, h: 42.21, angle: -0.79 }] },
      ],
    },
    {
      name: 'Sheet 8 · 3,3',
      blueprint: true,
      page: 8, row: 2, col: 2,
      cell: [363.45, 170, 916.55, 719.72],
      ink: 900,
      faucets: [
        { x: 480.04, y: 327.99, dir: 'right', rate: 46, total: 110, spread: 0.55 },
      ],
      glasses: [
        { x: 623.57, y: 573.98, w: 73.8, h: 120.4, need: 0.72, fixed: true },
      ],
      platforms: [
        { kind: 'grey', pieces: [{ x: 636.06, y: 649.03, w: 17.46, h: 125.6, angle: -1.57 }] },
      ],
      hots: [
        { kind: 'danger', pieces: [{ x: 672.81, y: 444.72, w: 42.21, h: 42.61, angle: -0.79 }] },
        { kind: 'danger', pieces: [{ x: 566.64, y: 445.96, w: 47.76, h: 47.76, angle: 0, r: 23.88 }] },
      ],
    },
    {
      name: 'Sheet 9 · 1,1',
      blueprint: true,
      page: 9, row: 0, col: 0,
      cell: [351.82, 170, 914.71, 729.46],
      ink: 900,
      faucets: [
        { x: 656.77, y: 196.37, dir: 'down', rate: 46, total: 110, spread: 0.55 },
      ],
      glasses: [
        { x: 660.42, y: 532.53, w: 62.6, h: 103.2, need: 0.72, fixed: true },
      ],
      platforms: [
        { kind: 'grey', pieces: [{ x: 660.78, y: 633.73, w: 110.06, h: 395.52, angle: -1.57 }] },
        { kind: 'grey', pieces: [{ x: 643.87, y: 347.12, w: 47.58, h: 47.58, angle: 0, r: 23.79 }] },
      ],
      hots: [
        { kind: 'danger', pieces: [{ x: 603.92, y: 410.18, w: 47.18, h: 47.18, angle: 0, r: 23.59 }] },
      ],
    },
    {
      name: 'Sheet 9 · 1,2',
      blueprint: true,
      page: 9, row: 0, col: 1,
      noTap: true,
      cell: [358.55, 170, 921.45, 729.46],
      ink: 900,
      faucets: [],
      glasses: [
        { x: 607.54, y: 534.95, w: 62.6, h: 103.2, need: 0.72, fixed: true },
        { x: 707.05, y: 532.95, w: 62.6, h: 103.2, need: 0.72, fixed: true },
      ],
      platforms: [
        { kind: 'grey', pieces: [{ x: 650.03, y: 633.44, w: 110.63, h: 395.52, angle: -1.57 }] },
        { kind: 'grey', pieces: [{ poly: [[838.62, 214.71], [815.69, 214.71], [815.12, 239.36], [791.62, 225.03], [762.95, 253.69], [791.04, 281.78], [815.69, 268.59], [815.69, 424.51], [752.06, 425.08], [752.06, 441.13], [837.47, 441.13]], ox: 798.91, oy: 311.79 }] },
      ],
      hots: [
        { kind: 'danger', pieces: [{ x: 726.04, y: 335, w: 47.18, h: 47.18, angle: 0, r: 23.59 }] },
        { kind: 'danger', pieces: [{ x: 664.93, y: 394.5, w: 47.18, h: 47.18, angle: 0, r: 23.59 }] },
      ],
    },
    {
      name: 'Sheet 9 · 1,3',
      blueprint: true,
      page: 9, row: 0, col: 2,
      cell: [358.55, 170, 921.45, 729.46],
      ink: 900,
      faucets: [
        { x: 808.81, y: 329.93, dir: 'left', rate: 46, total: 110, spread: 0.55 },
      ],
      glasses: [
        { x: 639.79, y: 494.71, w: 62.6, h: 103.2, need: 0.72, fixed: true },
      ],
      hots: [
        { kind: 'danger', pieces: [{ x: 748.91, y: 402.15, w: 14.9, h: 140.44, angle: -1.57 }] },
      ],
    },
    {
      name: 'Sheet 9 · 2,1',
      blueprint: true,
      page: 9, row: 1, col: 0,
      cell: [356.69, 170, 910.07, 720],
      ink: 900,
      faucets: [
        { x: 495.32, y: 259.88, dir: 'right', rate: 46, total: 110, spread: 0.55 },
      ],
      glasses: [
        { x: 711.58, y: 592.59, w: 73.8, h: 120.5, need: 0.72, fixed: true },
      ],
      platforms: [
        { kind: 'grey', pieces: [{ x: 712.84, y: 663.93, w: 18.03, h: 137.5, angle: -1.57 }] },
        { kind: 'grey', pieces: [{ x: 670.57, y: 369.49, w: 45.03, h: 45.03, angle: -0.79 }] },
        { kind: 'grey', pieces: [{ x: 586.75, y: 330.46, w: 44.63, h: 45.03, angle: -0.79 }] },
        { kind: 'grey', pieces: [{ x: 589, y: 415.56, w: 44.63, h: 45.03, angle: -0.79 }] },
        { kind: 'grey', pieces: [{ x: 660.99, y: 277.35, w: 44.63, h: 44.63, angle: -0.79 }] },
        { kind: 'grey', pieces: [{ x: 671.42, y: 472.61, w: 44.63, h: 44.63, angle: -0.79 }] },
      ],
    },
    {
      name: 'Sheet 9 · 2,2',
      blueprint: true,
      page: 9, row: 1, col: 1,
      cell: [363.31, 170, 916.69, 720],
      ink: 900,
      faucets: [
        { x: 627.6, y: 208.88, dir: 'down', rate: 46, total: 110, spread: 0.55 },
      ],
      glasses: [
        { x: 734.26, y: 536.26, w: 73.8, h: 120.5, need: 0.72, fixed: true },
      ],
      platforms: [
        { kind: 'grey', pieces: [{ x: 529.89, y: 433.81, w: 16.23, h: 277, angle: -0.95 }] },
        { kind: 'grey', pieces: [{ x: 736.64, y: 608.42, w: 17.47, h: 137.5, angle: -1.57 }] },
      ],
      falls: [
        { kind: 'hot', pieces: [{ x: 497.57, y: 288.48, w: 51.62, h: 51.62, angle: 0, r: 25.81 }] },
        { kind: 'hot', pieces: [{ x: 534.85, y: 363.8, w: 51.62, h: 51.62, angle: 0, r: 25.81 }] },
      ],
    },
    {
      name: 'Sheet 9 · 2,3',
      blueprint: true,
      page: 9, row: 1, col: 2,
      cell: [363.31, 170, 916.69, 720],
      ink: 900,
      faucets: [
        { x: 593.23, y: 251.43, dir: 'down', rate: 46, total: 110, spread: 0.55 },
      ],
      glasses: [
        { x: 501.53, y: 596.07, w: 69.7, h: 114.1, need: 0.72, fixed: true },
      ],
      platforms: [
        { kind: 'grey', pieces: [{ x: 719.6, y: 516.06, w: 277, h: 16.2, angle: -0.61 }] },
        { kind: 'grey', pieces: [{ x: 599.29, y: 393.86, w: 60.97, h: 61.37, angle: -0.79 }] },
        { kind: 'grey', pieces: [{ poly: [[432.34, 648.71], [432.34, 661.68], [592.95, 661.11], [592.38, 648.71], [483.62, 647.59], [486.44, 648.71], [481.93, 649.28], [478.55, 647.02], [479.11, 648.71]], ox: 495.52, oy: 651.28 }] },
      ],
      falls: [
        { kind: 'hot', pieces: [{ x: 723.74, y: 447.34, w: 51.62, h: 51.62, angle: 0, r: 25.81 }] },
        { kind: 'hot', pieces: [{ x: 751.16, y: 324.83, w: 51.62, h: 51.62, angle: 0, r: 25.81 }] },
      ],
    },
    {
      name: 'Sheet 9 · 3,1',
      blueprint: true,
      page: 9, row: 2, col: 0,
      cell: [356.83, 170, 909.93, 719.72],
      ink: 900,
      faucets: [
        { x: 610.29, y: 186.9, dir: 'down', rate: 46, total: 110, spread: 0.55 },
      ],
      glasses: [
        { x: 608.67, y: 587.96, w: 73.8, h: 120.4, need: 0.72, fixed: true },
      ],
      platforms: [
        { kind: 'grey', pieces: [{ x: 526.93, y: 422.05, w: 96.37, h: 96.37, angle: -0.79 }] },
        { kind: 'grey', pieces: [{ x: 700.41, y: 424.3, w: 96.37, h: 96.37, angle: -0.79 }] },
        { kind: 'grey', pieces: [{ x: 609.61, y: 299.57, w: 55.82, h: 55.82, angle: 0, r: 27.91 }] },
        { kind: 'grey', pieces: [{ x: 604.38, y: 657.76, w: 17.46, h: 125.6, angle: -1.57 }] },
      ],
      falls: [
        { kind: 'hot', pieces: [{ x: 612.54, y: 340.38, w: 81.25, h: 84.43, angle: -0.79 }] },
      ],
    },
    {
      name: 'Sheet 9 · 3,2',
      blueprint: true,
      page: 9, row: 2, col: 1,
      cell: [363.45, 170, 916.55, 719.72],
      ink: 900,
      faucets: [
        { x: 606.49, y: 192.25, dir: 'down', rate: 46, total: 110, spread: 0.55 },
      ],
      glasses: [
        { x: 709.24, y: 545.28, w: 73.8, h: 120.4, need: 0.72, fixed: true },
        { x: 478.45, y: 484.62, w: 73.8, h: 120.4, need: 0.72, fixed: true },
      ],
      platforms: [
        { kind: 'grey', pieces: [{ x: 483.98, y: 554.13, w: 17.46, h: 125.6, angle: -1.57 }] },
        { kind: 'grey', pieces: [{ x: 714.07, y: 617.21, w: 17.46, h: 125.04, angle: -1.57 }] },
      ],
      falls: [
        { kind: 'hot', pieces: [{ x: 658.9, y: 347.5, w: 51.59, h: 51.59, angle: 0, r: 25.8 }] },
      ],
      hots: [
        { kind: 'danger', pieces: [{ x: 568.19, y: 359.25, w: 42.61, h: 42.61, angle: -0.79 }] },
      ],
    },
    {
      name: 'Sheet 9 · 3,3',
      blueprint: true,
      page: 9, row: 2, col: 2,
      cell: [363.45, 170, 916.55, 719.72],
      ink: 900,
      faucets: [
        { x: 515.24, y: 308.84, dir: 'right', rate: 46, total: 110, spread: 0.55 },
      ],
      glasses: [
        { x: 623.57, y: 573.95, w: 73.8, h: 120.4, need: 0.72, fixed: true },
      ],
      platforms: [
        { kind: 'grey', pieces: [{ x: 636.06, y: 648.75, w: 17.46, h: 125.6, angle: -1.57 }] },
      ],
      falls: [
        { kind: 'hot', pieces: [{ x: 641.41, y: 403.74, w: 42.61, h: 42.61, angle: -0.79 }] },
      ],
      hots: [
        { kind: 'danger', pieces: [{ x: 566.53, y: 397.97, w: 47.82, h: 47.82, angle: 0, r: 23.91 }] },
      ],
    },
    {
      name: 'Sheet 10 · 1,1',
      blueprint: true,
      page: 10, row: 0, col: 0,
      cell: [351.82, 170, 914.71, 729.46],
      ink: 900,
      faucets: [
        { x: 821.28, y: 363.46, dir: 'left', rate: 46, total: 110, spread: 0.55 },
      ],
      glasses: [
        { x: 510.1, y: 613.73, w: 62.6, h: 103.2, need: 0.72, fixed: true },
      ],
      platforms: [
        { kind: 'grey', pieces: [{ x: 692.59, y: 599.34, w: 108.34, h: 237.88, angle: -1.57 }] },
        { kind: 'grey', pieces: [{ x: 643.87, y: 347.07, w: 47.58, h: 47.58, angle: 0, r: 23.79 }] },
        { kind: 'grey', pieces: [{ x: 508.3, y: 672.71, w: 13.18, h: 83.69, angle: -1.57 }] },
      ],
      falls: [
        { kind: 'hot', pieces: [{ x: 507.33, y: 406.45, w: 47.35, h: 47.35, angle: 0, r: 23.67 }] },
      ],
    },
    {
      name: 'Sheet 10 · 1,2',
      blueprint: true,
      page: 10, row: 0, col: 1,
      cell: [358.55, 170, 921.45, 729.46],
      ink: 900,
      faucets: [
        { x: 679.27, y: 211.27, dir: 'down', rate: 46, total: 110, spread: 0.55 },
      ],
      glasses: [
        { x: 560.27, y: 596.79, w: 62.6, h: 103.2, need: 0.72, fixed: true },
      ],
      platforms: [
        { kind: 'ink', pieces: [{ poly: [[597.87, 385.24], [597.87, 392.69], [770.41, 392.69], [765.82, 364.61], [758.94, 349.7], [750.34, 337.67], [737.73, 325.63], [722.26, 315.88], [706.78, 310.15], [689.01, 307.29], [659.2, 310.72], [642.58, 317.6], [628.82, 326.77], [616.78, 338.81], [607.61, 352.57], [601.88, 365.75]], ox: 678.37, oy: 343.36 }] },
        { kind: 'grey', pieces: [{ x: 762.41, y: 526.02, w: 281.74, h: 16.48, angle: -0.61 }] },
        { kind: 'grey', pieces: [{ x: 558.32, y: 656.95, w: 6.88, h: 141.01, angle: -1.57 }] },
      ],
      falls: [
        { kind: 'hot', pieces: [{ x: 802.45, y: 430.13, w: 34.51, h: 34.51, angle: 0, r: 17.25 }] },
        { kind: 'hot', pieces: [{ x: 738.82, y: 283.61, w: 34.51, h: 34.51, angle: 0, r: 17.25 }] },
      ],
    },
    {
      name: 'Sheet 10 · 1,3',
      blueprint: true,
      page: 10, row: 0, col: 2,
      cell: [358.55, 170, 921.45, 729.46],
      ink: 900,
      faucets: [
        { x: 646.59, y: 219.87, dir: 'down', rate: 46, total: 110, spread: 0.55 },
      ],
      glasses: [
        { x: 580.86, y: 458.34, w: 62.6, h: 103.2, need: 0.72, fixed: true },
      ],
      platforms: [
        { kind: 'ink', pieces: [{ x: 523.09, y: 393.07, w: 34.34, h: 34.34, angle: 0, r: 17.17 }] },
        { kind: 'ink', pieces: [{ x: 694.14, y: 454.11, w: 34.34, h: 34.34, angle: 0, r: 17.17 }] },
      ],
      falls: [
        { kind: 'hot', pieces: [{ x: 518.19, y: 367.76, w: 15.48, h: 141.01, angle: -1.57 }] },
      ],
    },
    {
      name: 'Sheet 10 · 2,1',
      blueprint: true,
      page: 10, row: 1, col: 0,
      cell: [356.69, 170, 910.07, 720],
      ink: 900,
      faucets: [
        { x: 495.32, y: 260.16, dir: 'right', rate: 46, total: 110, spread: 0.55 },
      ],
      glasses: [
        { x: 769.15, y: 592.01, w: 73.8, h: 120.5, need: 0.72, fixed: true },
      ],
      platforms: [
        { kind: 'grey', pieces: [{ x: 778.77, y: 664.21, w: 18.03, h: 137.5, angle: -1.57 }] },
        { kind: 'grey', pieces: [{ x: 671.42, y: 472.61, w: 45.03, h: 45.03, angle: -0.79 }] },
        { kind: 'grey', pieces: [{ x: 670.57, y: 369.49, w: 44.63, h: 44.63, angle: -0.79 }] },
        { kind: 'grey', pieces: [{ x: 586.89, y: 330.32, w: 44.63, h: 44.63, angle: -0.79 }] },
        { kind: 'grey', pieces: [{ x: 589.14, y: 415.41, w: 44.63, h: 44.63, angle: -0.79 }] },
      ],
      falls: [
        { kind: 'hot', pieces: [{ poly: [[644.09, 234.24], [605.2, 265.24], [607.46, 268.05], [643.52, 296.79], [646.34, 295.67], [682.97, 265.8]], ox: 638.26, oy: 270.96 }] },
      ],
    },
    {
      name: 'Sheet 10 · 2,2',
      blueprint: true,
      page: 10, row: 1, col: 1,
      noTap: true,
      cell: [363.31, 170, 916.69, 720],
      ink: 900,
      faucets: [],
      glasses: [],
    },
    {
      name: 'Sheet 10 · 2,3',
      blueprint: true,
      page: 10, row: 1, col: 2,
      noTap: true,
      cell: [363.31, 170, 916.69, 720],
      ink: 900,
      faucets: [],
      glasses: [],
      platforms: [
        { kind: 'grey', pieces: [{ x: 512.64, y: 655.19, w: 12.4, h: 160.6, angle: -1.57 }] },
      ],
    },
    {
      name: 'Sheet 10 · 3,1',
      blueprint: true,
      page: 10, row: 2, col: 0,
      noTap: true,
      cell: [356.69, 170, 910.07, 720],
      ink: 900,
      faucets: [],
      glasses: [
        { x: 608.65, y: 588.12, w: 73.8, h: 120.5, need: 0.72, fixed: true },
      ],
      platforms: [
        { kind: 'grey', pieces: [{ x: 604.36, y: 657.73, w: 17.47, h: 125.67, angle: -1.57 }] },
      ],
    },
    {
      name: 'Sheet 10 · 3,2',
      blueprint: true,
      page: 10, row: 2, col: 1,
      noTap: true,
      cell: [363.31, 170, 916.69, 720],
      ink: 900,
      faucets: [],
      glasses: [],
      platforms: [
        { kind: 'grey', pieces: [{ x: 714.1, y: 617.16, w: 17.47, h: 125.1, angle: -1.57 }] },
      ],
    },
    {
      name: 'Sheet 10 · 3,3',
      blueprint: true,
      page: 10, row: 2, col: 2,
      noTap: true,
      cell: [363.31, 170, 916.69, 720],
      ink: 900,
      faucets: [],
      glasses: [
        { x: 623.56, y: 574.1, w: 73.8, h: 120.5, need: 0.72, fixed: true },
      ],
      platforms: [
        { kind: 'grey', pieces: [{ x: 636.06, y: 649, w: 16.91, h: 125.67, angle: -1.57 }] },
      ],
    },
    {
      name: 'Sheet 11 · 1,1',
      blueprint: true,
      page: 11, row: 0, col: 0,
      cell: [351.82, 170, 914.71, 729.46],
      ink: 900,
      faucets: [
        { x: 643.58, y: 225.03, dir: 'down', rate: 46, total: 110, spread: 0.55 },
      ],
      glasses: [
        { x: 650.1, y: 463.07, w: 79.3, h: 129, need: 0.72, fixed: true },
      ],
      platforms: [
        { kind: 'grey', pieces: [{ x: 666.51, y: 628, w: 81.4, h: 363.42, angle: -1.57 }] },
      ],
      falls: [
        { kind: 'hot', pieces: [{ x: 635.41, y: 573.72, w: 27.8, h: 27.8, angle: 0, r: 13.9 }] },
        { kind: 'hot', pieces: [{ x: 667.46, y: 573.69, w: 27.8, h: 27.8, angle: 0, r: 13.9 }] },
      ],
    },
    {
      name: 'Sheet 11 · 1,2',
      blueprint: true,
      page: 11, row: 0, col: 1,
      cell: [358.55, 170, 921.45, 729.46],
      ink: 900,
      faucets: [
        { x: 652.61, y: 221.59, dir: 'down', rate: 46, total: 110, spread: 0.55 },
      ],
      glasses: [
        { x: 656.69, y: 454.03, w: 79.3, h: 129, need: 0.72, fixed: true },
      ],
      platforms: [
        { kind: 'grey', pieces: [{ x: 644.01, y: 623.41, w: 81.4, h: 362.85, angle: -1.57 }] },
      ],
      falls: [
        { kind: 'hot', pieces: [{ x: 649.6, y: 564.8, w: 24.73, h: 24.33, angle: -0.79 }] },
        { kind: 'hot', pieces: [{ x: 612.97, y: 569.04, w: 27.8, h: 27.8, angle: 0, r: 13.9 }] },
      ],
    },
    {
      name: 'Sheet 11 · 1,3',
      blueprint: true,
      page: 11, row: 0, col: 2,
      cell: [358.55, 170, 921.45, 729.46],
      ink: 900,
      faucets: [
        { x: 645.73, y: 213.56, dir: 'down', rate: 46, total: 110, spread: 0.55 },
      ],
      glasses: [
        { x: 647.24, y: 475.78, w: 79.3, h: 129, need: 0.72, fixed: true },
      ],
      platforms: [
        { kind: 'grey', pieces: [{ x: 753.24, y: 593.12, w: 56.81, h: 56.81, angle: 0, r: 28.4 }] },
        { kind: 'grey', pieces: [{ x: 542.87, y: 362.54, w: 56.86, h: 56.86, angle: 0, r: 28.43 }] },
      ],
    },
    {
      name: 'Sheet 11 · 2,1',
      blueprint: true,
      page: 11, row: 1, col: 0,
      cell: [356.69, 170, 910.07, 720],
      ink: 900,
      faucets: [
        { x: 657.89, y: 186.06, dir: 'down', rate: 46, total: 110, spread: 0.55 },
      ],
      glasses: [
        { x: 721.13, y: 456.69, w: 77.9, h: 126.8, need: 0.72, fixed: true },
      ],
      platforms: [
        { kind: 'grey', pieces: [{ x: 556.99, y: 332.21, w: 55.85, h: 55.85, angle: 0, r: 27.92 }] },
        { kind: 'grey', pieces: [{ x: 767.33, y: 577.37, w: 55.85, h: 55.85, angle: 0, r: 27.92 }] },
      ],
      falls: [
        { kind: 'hot', pieces: [{ x: 692.27, y: 524.18, w: 14.65, h: 303.74, angle: -1.57 }] },
      ],
    },
    {
      name: 'Sheet 11 · 2,2',
      blueprint: true,
      page: 11, row: 1, col: 1,
      cell: [363.31, 170, 916.69, 720],
      ink: 900,
      faucets: [
        { x: 567.59, y: 170, dir: 'down', rate: 46, total: 110, spread: 0.55 },
      ],
      glasses: [
        { x: 567.81, y: 421.88, w: 75.9, h: 124.7, need: 0.72, fixed: true },
      ],
      platforms: [
        { kind: 'grey', pieces: [{ x: 474.63, y: 505.35, w: 34.66, h: 34.66, angle: 0, r: 17.33 }] },
      ],
    },
    {
      name: 'Sheet 11 · 2,3',
      blueprint: true,
      page: 11, row: 1, col: 2,
      cell: [363.31, 170, 916.69, 720],
      ink: 900,
      faucets: [
        { x: 624.5, y: 251.43, dir: 'down', rate: 46, total: 110, spread: 0.55 },
      ],
      glasses: [
        { x: 625.35, y: 448.82, w: 75.9, h: 124.7, need: 0.72, fixed: true },
      ],
      platforms: [
        { kind: 'ink', pieces: [{ poly: [[472.35, 720], [808.21, 720], [796.94, 660.55], [783.42, 633.5], [763.13, 607.01], [738.9, 585.6], [708.47, 568.13], [650.99, 554.04], [622.81, 554.61], [591.82, 560.8], [557.44, 575.46], [530.96, 594.05], [503.91, 623.36], [486.44, 653.79], [476.3, 684.22]], ox: 632.81, oy: 619.67 }] },
      ],
    },
    {
      name: 'Sheet 11 · 3,1',
      blueprint: true,
      page: 11, row: 2, col: 0,
      cell: [356.69, 170, 910.07, 720],
      ink: 900,
      faucets: [
        { x: 637.32, y: 194.51, dir: 'down', rate: 46, total: 110, spread: 0.55 },
      ],
      glasses: [
        { x: 568.6, y: 421.13, w: 75.9, h: 124.7, need: 0.72, fixed: true },
        { x: 703.27, y: 418.7, w: 75.9, h: 124.7, need: 0.72, fixed: true },
      ],
      platforms: [
        { kind: 'ink', pieces: [{ poly: [[454.74, 720], [843.01, 720], [827.79, 647.02], [793.42, 593.49], [768.62, 570.38], [734.25, 548.97], [701.57, 536.57], [662.12, 529.81], [619.85, 531.5], [580.41, 541.64], [547.72, 557.42], [520.11, 577.71], [494.19, 605.32], [472.77, 640.26], [460.94, 672.38]], ox: 632.1, oy: 599.5 }] },
        { kind: 'ink', pieces: [{ poly: [[691.42, 339.34], [642.96, 276.79], [636.2, 277.35], [579.84, 339.9], [586.04, 344.97], [639.01, 286.93], [683.53, 344.41]], ox: 637, oy: 315.67 }] },
      ],
    },
    {
      name: 'Sheet 11 · 3,2',
      blueprint: true,
      page: 11, row: 2, col: 1,
      cell: [363.31, 170, 916.69, 720],
      ink: 900,
      faucets: [
        { x: 625.07, y: 222.13, dir: 'down', rate: 46, total: 110, spread: 0.55 },
      ],
      glasses: [
        { x: 594.54, y: 502.52, w: 77.9, h: 126.8, need: 0.72, fixed: true },
        { x: 676.76, y: 502.52, w: 77.9, h: 126.8, need: 0.72, fixed: true },
      ],
      platforms: [
        { kind: 'grey', pieces: [{ x: 752.7, y: 591.23, w: 31.56, h: 33.25, angle: -1.57 }] },
        { kind: 'grey', pieces: [{ x: 511.23, y: 591.23, w: 31.56, h: 32.68, angle: -1.57 }] },
      ],
    },
    {
      name: 'Sheet 11 · 3,3',
      blueprint: true,
      page: 11, row: 2, col: 2,
      cell: [363.31, 170, 916.69, 720],
      ink: 900,
      faucets: [
        { x: 663.39, y: 229.45, dir: 'down', rate: 46, total: 110, spread: 0.55 },
      ],
      glasses: [
        { x: 680.93, y: 565.93, w: 53.3, h: 88.8, need: 0.72, fixed: true },
      ],
      platforms: [
        { kind: 'grey', pieces: [{ x: 681.14, y: 615.18, w: 10.71, h: 140.32, angle: -1.57 }] },
        { kind: 'grey', pieces: [{ x: 599.71, y: 460.78, w: 25.36, h: 27.05, angle: -1.57 }] },
      ],
      falls: [
        { kind: 'hot', pieces: [{ x: 678.32, y: 411.75, w: 17.47, h: 211.32, angle: -1.57 }] },
        { kind: 'hot', pieces: [{ x: 751.89, y: 460.19, w: 36.01, h: 36.01, angle: 0, r: 18 }] },
      ],
    },
    {
      name: 'Sheet 12 · 1,1',
      blueprint: true,
      page: 12, row: 0, col: 0,
      cell: [351.82, 170, 914.71, 729.46],
      ink: 900,
      faucets: [
        { x: 642.72, y: 238.79, dir: 'down', rate: 46, total: 110, spread: 0.55 },
      ],
      glasses: [
        { x: 650.1, y: 463.23, w: 79.3, h: 129, need: 0.72, fixed: true },
      ],
      platforms: [
        { kind: 'grey', pieces: [{ x: 666.51, y: 628.29, w: 81.97, h: 363.42, angle: -1.57 }] },
      ],
      falls: [
        { kind: 'hot', pieces: [{ x: 745.33, y: 378.65, w: 11.46, h: 173.68, angle: -1.57 }] },
        { kind: 'hot', pieces: [{ x: 667.46, y: 573.83, w: 27.8, h: 27.8, angle: 0, r: 13.9 }] },
        { kind: 'hot', pieces: [{ x: 635.44, y: 573.86, w: 27.8, h: 27.8, angle: 0, r: 13.9 }] },
      ],
    },
    {
      name: 'Sheet 12 · 1,2',
      blueprint: true,
      page: 12, row: 0, col: 1,
      cell: [358.55, 170, 921.45, 729.46],
      ink: 900,
      faucets: [
        { x: 649.74, y: 181.46, dir: 'down', rate: 46, total: 110, spread: 0.55 },
      ],
      glasses: [
        { x: 650.65, y: 375.18, w: 79.3, h: 129, need: 0.72, fixed: true },
      ],
      platforms: [
        { kind: 'grey', pieces: [{ poly: [[815.69, 546.03], [462.59, 582.71], [462.59, 664.68], [825.44, 664.68]], ox: 641.58, oy: 614.52 }] },
      ],
      falls: [
        { kind: 'hot', pieces: [{ x: 642.29, y: 527.4, w: 12.04, h: 173.68, angle: -1.57 }] },
      ],
    },
    {
      name: 'Sheet 12 · 1,3',
      blueprint: true,
      page: 12, row: 0, col: 2,
      cell: [358.55, 170, 921.45, 729.46],
      ink: 900,
      faucets: [
        { x: 645.45, y: 213.56, dir: 'down', rate: 46, total: 110, spread: 0.55 },
      ],
      glasses: [
        { x: 647.24, y: 475.95, w: 79.3, h: 129, need: 0.72, fixed: true },
      ],
      platforms: [
        { kind: 'grey', pieces: [{ x: 542.9, y: 362.71, w: 56.81, h: 56.81, angle: 0, r: 28.4 }] },
        { kind: 'grey', pieces: [{ x: 753.27, y: 593.29, w: 56.81, h: 56.81, angle: 0, r: 28.4 }] },
      ],
      falls: [
        { kind: 'hot', pieces: [{ x: 553.24, y: 288.48, w: 43.79, h: 43.79, angle: 0, r: 21.9 }] },
      ],
    },
    {
      name: 'Sheet 12 · 2,1',
      blueprint: true,
      page: 12, row: 1, col: 0,
      cell: [356.69, 170, 910.07, 720],
      ink: 900,
      faucets: [
        { x: 657.89, y: 186.06, dir: 'down', rate: 46, total: 110, spread: 0.55 },
      ],
      glasses: [
        { x: 721.13, y: 456.86, w: 77.9, h: 126.8, need: 0.72, fixed: true },
      ],
      platforms: [
        { kind: 'grey', pieces: [{ x: 767.33, y: 577.51, w: 55.85, h: 55.85, angle: 0, r: 27.92 }] },
        { kind: 'grey', pieces: [{ x: 556.99, y: 332.35, w: 55.85, h: 55.85, angle: 0, r: 27.92 }] },
      ],
      falls: [
        { kind: 'hot', pieces: [{ x: 692.27, y: 524.46, w: 14.09, h: 303.74, angle: -1.57 }] },
      ],
    },
    {
      name: 'Sheet 12 · 2,2',
      blueprint: true,
      page: 12, row: 1, col: 1,
      cell: [363.31, 170, 916.69, 720],
      ink: 900,
      faucets: [
        { x: 567.59, y: 170, dir: 'down', rate: 46, total: 110, spread: 0.55 },
      ],
      glasses: [
        { x: 567.81, y: 422.04, w: 75.9, h: 124.7, need: 0.72, fixed: true },
      ],
      platforms: [
        { kind: 'grey', pieces: [{ x: 474.63, y: 505.52, w: 34.71, h: 34.71, angle: 0, r: 17.36 }] },
      ],
      falls: [
        { kind: 'hot', pieces: [{ x: 666.49, y: 329.48, w: 11.83, h: 170.75, angle: -1.57 }] },
      ],
    },
    {
      name: 'Sheet 12 · 2,3',
      blueprint: true,
      page: 12, row: 1, col: 2,
      cell: [363.31, 170, 916.69, 720],
      ink: 900,
      faucets: [
        { x: 523.63, y: 335.96, dir: 'right', rate: 46, total: 110, spread: 0.55 },
      ],
      glasses: [
        { x: 709.06, y: 466.86, w: 75.9, h: 124.7, need: 0.72, fixed: true },
      ],
      platforms: [
        { kind: 'ink', pieces: [{ poly: [[641.97, 339.9], [634.08, 339.9], [633.52, 397.95], [510.67, 397.95], [510.67, 405.84], [633.52, 405.84], [634.08, 463.88], [641.97, 463.88]], ox: 605.06, oy: 401.89 }] },
      ],
      falls: [
        { kind: 'hot', pieces: [{ x: 597.79, y: 244.22, w: 43.05, h: 43.05, angle: 0, r: 21.53 }] },
      ],
    },
    {
      name: 'Sheet 12 · 3,1',
      blueprint: true,
      page: 12, row: 2, col: 0,
      cell: [356.83, 170, 909.93, 719.72],
      ink: 900,
      faucets: [
        { x: 637.61, y: 194.5, dir: 'down', rate: 46, total: 110, spread: 0.55 },
      ],
      glasses: [
        { x: 568.64, y: 421.16, w: 75.8, h: 124.7, need: 0.72, fixed: true },
        { x: 703.24, y: 418.74, w: 75.9, h: 124.7, need: 0.72, fixed: true },
      ],
      platforms: [
        { kind: 'ink', pieces: [{ poly: [[454.84, 720], [842.91, 720], [838.4, 680.01], [827.14, 645.65], [791.65, 591.58], [764.62, 567.36], [730.26, 547.09], [691.96, 534.13], [659.85, 529.63], [624.93, 530.75], [585.51, 539.76], [552.84, 554.41], [519.05, 578.63], [491.45, 609.04], [470.61, 645.09]], ox: 656.4, oy: 599.54 }] },
        { kind: 'ink', pieces: [{ poly: [[691.4, 339.25], [642.96, 277.3], [635.63, 277.86], [579.87, 340.38], [585.51, 345.45], [639.01, 286.87], [682.95, 343.76]], ox: 636.76, oy: 315.84 }] },
      ],
    },
    {
      name: 'Sheet 12 · 3,2',
      blueprint: true,
      page: 12, row: 2, col: 1,
      cell: [363.45, 170, 916.55, 719.72],
      ink: 900,
      faucets: [
        { x: 625.07, y: 222.1, dir: 'down', rate: 46, total: 110, spread: 0.55 },
      ],
      glasses: [
        { x: 594.56, y: 502.51, w: 77.9, h: 126.8, need: 0.72, fixed: true },
        { x: 676.74, y: 502.51, w: 77.9, h: 126.8, need: 0.72, fixed: true },
      ],
      platforms: [
        { kind: 'grey', pieces: [{ x: 752.65, y: 591.58, w: 31.54, h: 33.23, angle: -1.57 }] },
        { kind: 'grey', pieces: [{ x: 511.3, y: 591.58, w: 31.54, h: 32.67, angle: -1.57 }] },
      ],
    },
    {
      name: 'Sheet 12 · 3,3',
      blueprint: true,
      page: 12, row: 2, col: 2,
      cell: [363.45, 170, 916.55, 719.72],
      ink: 900,
      faucets: [
        { x: 663.37, y: 229.42, dir: 'down', rate: 46, total: 110, spread: 0.55 },
      ],
      glasses: [
        { x: 680.91, y: 565.88, w: 53.3, h: 88.7, need: 0.72, fixed: true },
      ],
      platforms: [
        { kind: 'grey', pieces: [{ x: 681.12, y: 615.24, w: 11.26, h: 140.25, angle: -1.57 }] },
        { kind: 'grey', pieces: [{ x: 599.73, y: 460.63, w: 25.35, h: 27.04, angle: -1.57 }] },
      ],
      falls: [
        { kind: 'hot', pieces: [{ x: 678.3, y: 411.91, w: 18.02, h: 211.21, angle: -1.57 }] },
        { kind: 'hot', pieces: [{ x: 751.83, y: 460.21, w: 36.05, h: 36.05, angle: 0, r: 18.02 }] },
      ],
    },
    {
      name: 'Sheet 13 · 1,1',
      blueprint: true,
      page: 13, row: 0, col: 0,
      cell: [351.82, 170, 914.71, 729.46],
      ink: 900,
      faucets: [
        { x: 681.41, y: 238.21, dir: 'down', rate: 46, total: 110, spread: 0.55 },
      ],
      glasses: [
        { x: 605.18, y: 578.67, w: 52.2, h: 83.9, need: 0.72, fixed: true },
      ],
      platforms: [
        { kind: 'ink', pieces: [{ x: 694.31, y: 507.62, w: 8.03, h: 126.68, angle: -1.57 }] },
        { kind: 'ink', pieces: [{ x: 608.62, y: 625.13, w: 6.88, h: 83.69, angle: -1.57 }] },
      ],
      restrict: [
        { kind: 'grey', pieces: [{ x: 639, y: 527.69, w: 282.02, h: 417.3, angle: -1.57 }] },
      ],
    },
    {
      name: 'Sheet 13 · 1,2',
      blueprint: true,
      page: 13, row: 0, col: 1,
      cell: [358.55, 170, 921.45, 729.46],
      ink: 900,
      faucets: [
        { x: 615.07, y: 241.08, dir: 'down', rate: 46, total: 110, spread: 0.55 },
      ],
      glasses: [
        { x: 675.28, y: 569.89, w: 52.2, h: 83.9, need: 0.72, fixed: true },
      ],
      platforms: [
        { kind: 'ink', pieces: [{ x: 585.95, y: 495.59, w: 126.97, h: 8.43, angle: -0.44 }] },
        { kind: 'ink', pieces: [{ x: 674.97, y: 620.55, w: 6.88, h: 84.26, angle: -1.57 }] },
      ],
      restrict: [
        { kind: 'grey', pieces: [{ x: 667.23, y: 526.83, w: 282.6, h: 417.3, angle: -1.57 }] },
      ],
    },
    {
      name: 'Sheet 13 · 1,3',
      blueprint: true,
      page: 13, row: 0, col: 2,
      cell: [358.55, 170, 921.45, 729.46],
      ink: 900,
      faucets: [
        { x: 661.21, y: 266.3, dir: 'down', rate: 46, total: 110, spread: 0.55 },
      ],
      glasses: [
        { x: 661.25, y: 567.81, w: 52.1, h: 83.9, need: 0.72, fixed: true },
      ],
      platforms: [
        { kind: 'ink', pieces: [{ x: 660.92, y: 618.83, w: 6.88, h: 83.69, angle: -1.57 }] },
      ],
      falls: [
        { kind: 'hot', pieces: [{ x: 623.09, y: 525.68, w: 8.6, h: 127.25, angle: -1.57 }] },
      ],
      restrict: [
        { kind: 'grey', pieces: [{ x: 653.47, y: 524.82, w: 282.02, h: 417.3, angle: -1.57 }] },
      ],
    },
    {
      name: 'Sheet 13 · 2,1',
      blueprint: true,
      page: 13, row: 1, col: 0,
      cell: [356.69, 170, 910.07, 720],
      ink: 900,
      faucets: [
        { x: 703.82, y: 276.22, dir: 'down', rate: 46, total: 110, spread: 0.55 },
        { x: 530.25, y: 278.48, dir: 'down', rate: 46, total: 110, spread: 0.55 },
      ],
      glasses: [
        { x: 538.26, y: 563.62, w: 51.3, h: 82.4, need: 0.72, fixed: true },
        { x: 710.07, y: 563.71, w: 51.3, h: 82.4, need: 0.72, fixed: true },
      ],
      platforms: [
        { kind: 'ink', pieces: [{ x: 537.58, y: 604.76, w: 6.76, h: 82.27, angle: -1.57 }] },
        { kind: 'ink', pieces: [{ x: 709.17, y: 605.04, w: 6.2, h: 82.84, angle: -1.57 }] },
      ],
      falls: [
        { kind: 'hot', pieces: [{ x: 558.43, y: 524.18, w: 5.64, h: 125.1, angle: -1.57 }] },
        { kind: 'hot', pieces: [{ x: 688.04, y: 524.18, w: 5.64, h: 125.1, angle: -1.57 }] },
      ],
      restrict: [
        { kind: 'grey', pieces: [{ poly: [[418.68, 400.76], [418.68, 678.58], [828.92, 678.02], [828.92, 400.76]], ox: 623.8, oy: 539.53 }] },
      ],
    },
    {
      name: 'Sheet 13 · 2,2',
      blueprint: true,
      page: 13, row: 1, col: 1,
      cell: [363.31, 170, 916.69, 720],
      ink: 900,
      faucets: [
        { x: 631.27, y: 186.62, dir: 'down', rate: 46, total: 110, spread: 0.55 },
      ],
      glasses: [
        { x: 634.66, y: 357.6, w: 63.5, h: 103.6, need: 0.72, fixed: true },
      ],
      platforms: [
        { kind: 'ink', pieces: [{ x: 688.46, y: 432.88, w: 20.29, h: 21.98, angle: -1.57 }] },
        { kind: 'ink', pieces: [{ x: 575.48, y: 432.88, w: 20.29, h: 21.41, angle: -1.57 }] },
      ],
      restrict: [
        { kind: 'grey', pieces: [{ x: 762.57, y: 508.68, w: 248.51, h: 197.23, angle: -1.57 }] },
        { kind: 'grey', pieces: [{ x: 502.78, y: 510.37, w: 248.51, h: 197.23, angle: -1.57 }] },
      ],
    },
    {
      name: 'Sheet 13 · 2,3',
      blueprint: true,
      page: 13, row: 1, col: 2,
      cell: [363.31, 170, 916.69, 720],
      ink: 900,
      faucets: [
        { x: 724.25, y: 279.61, dir: 'left', rate: 46, total: 110, spread: 0.55 },
      ],
      glasses: [
        { x: 658.81, y: 365.32, w: 51.2, h: 82.4, need: 0.72, fixed: true },
      ],
      platforms: [
        { kind: 'ink', pieces: [{ x: 654.96, y: 545.53, w: 41.36, h: 41.36, angle: 0, r: 20.68 }] },
      ],
      falls: [
        { kind: 'hot', pieces: [{ x: 617.18, y: 510.93, w: 8.45, h: 125.1, angle: -1.57 }] },
      ],
      restrict: [
        { kind: 'grey', pieces: [{ x: 647.04, y: 562.21, w: 174.13, h: 410.25, angle: -1.57 }] },
      ],
    },
    {
      name: 'Sheet 13 · 3,1',
      blueprint: true,
      page: 13, row: 2, col: 0,
      cell: [356.69, 170, 910.07, 720],
      ink: 900,
      faucets: [
        { x: 721.85, y: 258.76, dir: 'down', rate: 46, total: 110, spread: 0.55 },
      ],
      glasses: [
        { x: 609.23, y: 591.54, w: 51.3, h: 82.4, need: 0.72, fixed: true },
      ],
      platforms: [
        { kind: 'ink', pieces: [{ x: 750.59, y: 490.36, w: 7.89, h: 123.98, angle: -1.57 }] },
        { kind: 'ink', pieces: [{ x: 612.53, y: 637.44, w: 6.76, h: 82.27, angle: -1.57 }] },
      ],
      restrict: [
        { kind: 'grey', pieces: [{ x: 642.39, y: 541.36, w: 277.82, h: 410.25, angle: -1.57 }] },
      ],
    },
    {
      name: 'Sheet 13 · 3,2',
      blueprint: true,
      page: 13, row: 2, col: 1,
      cell: [363.31, 170, 916.69, 720],
      ink: 900,
      faucets: [
        { x: 626.19, y: 267.77, dir: 'down', rate: 46, total: 110, spread: 0.55 },
      ],
      glasses: [
        { x: 630.24, y: 581.37, w: 51.2, h: 82.4, need: 0.72, fixed: true },
      ],
      platforms: [
        { kind: 'ink', pieces: [{ x: 733.66, y: 545.7, w: 124.85, h: 8.28, angle: -0.52 }] },
        { kind: 'ink', pieces: [{ x: 633.52, y: 627.3, w: 6.76, h: 82.27, angle: -1.57 }] },
      ],
      falls: [
        { kind: 'hot', pieces: [{ x: 748.59, y: 505.1, w: 36.18, h: 36.18, angle: 0, r: 18.09 }] },
      ],
      restrict: [
        { kind: 'grey', pieces: [{ x: 663.39, y: 531.22, w: 277.82, h: 410.25, angle: -1.57 }] },
      ],
    },
    {
      name: 'Sheet 13 · 3,3',
      blueprint: true,
      page: 13, row: 2, col: 2,
      cell: [363.31, 170, 916.69, 720],
      ink: 900,
      faucets: [
        { x: 623.38, y: 258.76, dir: 'down', rate: 46, total: 110, spread: 0.55 },
      ],
      glasses: [
        { x: 627.39, y: 572.44, w: 51.2, h: 82.4, need: 0.72, fixed: true },
      ],
      platforms: [
        { kind: 'ink', pieces: [{ x: 772.43, y: 465.01, w: 7.89, h: 124.54, angle: -1.57 }] },
        { kind: 'ink', pieces: [{ x: 730.81, y: 536.77, w: 124.85, h: 8.28, angle: -0.52 }] },
        { kind: 'ink', pieces: [{ x: 630.7, y: 618.28, w: 6.76, h: 82.27, angle: -1.57 }] },
      ],
      falls: [
        { kind: 'hot', pieces: [{ x: 745.77, y: 496.2, w: 36.12, h: 36.12, angle: 0, r: 18.06 }] },
      ],
      restrict: [
        { kind: 'grey', pieces: [{ x: 660.57, y: 522.2, w: 277.82, h: 410.25, angle: -1.57 }] },
      ],
    },
    {
      name: 'Sheet 14 · 1,1',
      blueprint: true,
      page: 14, row: 0, col: 0,
      cell: [351.82, 170, 914.71, 729.46],
      ink: 900,
      faucets: [
        { x: 681.41, y: 238.5, dir: 'down', rate: 46, total: 110, spread: 0.55 },
      ],
      glasses: [
        { x: 605.18, y: 578.85, w: 52.2, h: 83.9, need: 0.72, fixed: true },
      ],
      platforms: [
        { kind: 'ink', pieces: [{ x: 694.31, y: 507.91, w: 8.03, h: 126.68, angle: -1.57 }] },
        { kind: 'ink', pieces: [{ x: 608.62, y: 625.42, w: 6.88, h: 83.69, angle: -1.57 }] },
      ],
      restrict: [
        { kind: 'grey', pieces: [{ x: 639, y: 527.69, w: 282.6, h: 417.3, angle: -1.57 }] },
      ],
    },
    {
      name: 'Sheet 14 · 1,2',
      blueprint: true,
      page: 14, row: 0, col: 1,
      cell: [358.55, 170, 921.45, 729.46],
      ink: 900,
      faucets: [
        { x: 660.35, y: 247.1, dir: 'down', rate: 46, total: 110, spread: 0.55 },
      ],
      glasses: [
        { x: 563.48, y: 583.26, w: 52.2, h: 83.9, need: 0.72, fixed: true },
        { x: 783.16, y: 618.91, w: 52.2, h: 83.9, need: 0.72, fixed: true },
      ],
      platforms: [
        { kind: 'ink', pieces: [{ x: 718.47, y: 434.37, w: 121.98, h: 10.83, angle: -0.7 }] },
        { kind: 'ink', pieces: [{ x: 609.02, y: 438.26, w: 8.45, h: 127.02, angle: -0.97 }] },
        { kind: 'ink', pieces: [{ x: 568.63, y: 631.15, w: 6.88, h: 83.69, angle: -1.57 }] },
        { kind: 'ink', pieces: [{ x: 778.43, y: 666.4, w: 6.31, h: 83.69, angle: -1.57 }] },
      ],
      restrict: [
        { kind: 'grey', pieces: [{ poly: [[534.82, 368.05], [534.82, 486.7], [792.19, 486.7], [792.19, 368.05]], ox: 663.51, oy: 427.38 }] },
      ],
    },
    {
      name: 'Sheet 14 · 1,3',
      blueprint: true,
      page: 14, row: 0, col: 2,
      cell: [358.55, 170, 921.45, 729.46],
      ink: 900,
      faucets: [
        { x: 660.92, y: 266.59, dir: 'down', rate: 46, total: 110, spread: 0.55 },
      ],
      glasses: [
        { x: 661.25, y: 567.98, w: 52.1, h: 83.9, need: 0.72, fixed: true },
      ],
      platforms: [
        { kind: 'ink', pieces: [{ x: 660.92, y: 618.83, w: 6.31, h: 83.69, angle: -1.57 }] },
      ],
      falls: [
        { kind: 'hot', pieces: [{ x: 623.09, y: 525.68, w: 8.03, h: 127.25, angle: -1.57 }] },
      ],
      restrict: [
        { kind: 'grey', pieces: [{ x: 653.47, y: 524.82, w: 282.6, h: 417.3, angle: -1.57 }] },
      ],
    },
    {
      name: 'Sheet 14 · 2,1',
      blueprint: true,
      page: 14, row: 1, col: 0,
      cell: [356.69, 170, 910.07, 720],
      ink: 900,
      faucets: [
        { x: 703.82, y: 276.51, dir: 'down', rate: 46, total: 110, spread: 0.55 },
        { x: 530.25, y: 278.76, dir: 'down', rate: 46, total: 110, spread: 0.55 },
      ],
      glasses: [
        { x: 538.26, y: 563.79, w: 51.3, h: 82.4, need: 0.72, fixed: true },
        { x: 710.07, y: 563.85, w: 51.3, h: 82.4, need: 0.72, fixed: true },
      ],
      platforms: [
        { kind: 'ink', pieces: [{ x: 709.17, y: 605.04, w: 6.76, h: 82.84, angle: -1.57 }] },
        { kind: 'ink', pieces: [{ x: 537.58, y: 605.04, w: 6.76, h: 82.27, angle: -1.57 }] },
      ],
      falls: [
        { kind: 'hot', pieces: [{ x: 701.23, y: 352.84, w: 36.07, h: 36.07, angle: 0, r: 18.03 }] },
        { kind: 'hot', pieces: [{ x: 558.43, y: 524.18, w: 6.2, h: 125.1, angle: -1.57 }] },
        { kind: 'hot', pieces: [{ x: 688.04, y: 524.18, w: 6.2, h: 125.1, angle: -1.57 }] },
      ],
      restrict: [
        { kind: 'grey', pieces: [{ poly: [[418.68, 458.52], [418.68, 678.3], [828.92, 678.3], [828.92, 458.52]], ox: 623.8, oy: 568.41 }] },
      ],
    },
    {
      name: 'Sheet 14 · 2,2',
      blueprint: true,
      page: 14, row: 1, col: 1,
      cell: [363.31, 170, 916.69, 720],
      ink: 900,
      faucets: [
        { x: 631.27, y: 230.86, dir: 'down', rate: 46, total: 110, spread: 0.55 },
      ],
      glasses: [
        { x: 634.66, y: 357.75, w: 63.5, h: 103.6, need: 0.72, fixed: true },
      ],
      platforms: [
        { kind: 'ink', pieces: [{ x: 575.48, y: 433.17, w: 20.29, h: 21.41, angle: -1.57 }] },
      ],
      falls: [
        { kind: 'hot', pieces: [{ x: 688.46, y: 433.17, w: 20.29, h: 21.98, angle: -1.57 }] },
      ],
      restrict: [
        { kind: 'grey', pieces: [{ x: 762.57, y: 508.96, w: 248.51, h: 197.23, angle: -1.57 }] },
        { kind: 'grey', pieces: [{ x: 502.78, y: 510.65, w: 248.51, h: 197.23, angle: -1.57 }] },
      ],
    },
    {
      name: 'Sheet 14 · 2,3',
      blueprint: true,
      page: 14, row: 1, col: 2,
      cell: [363.31, 170, 916.69, 720],
      ink: 900,
      faucets: [
        { x: 714.1, y: 278.48, dir: 'left', rate: 46, total: 110, spread: 0.55 },
      ],
      glasses: [
        { x: 655.24, y: 387.41, w: 51.3, h: 82.4, need: 0.72, fixed: true },
      ],
      platforms: [
        { kind: 'ink', pieces: [{ x: 701.37, y: 545.25, w: 32.06, h: 32.06, angle: 0, r: 16.03 }] },
        { kind: 'ink', pieces: [{ x: 607.26, y: 546.27, w: 32.01, h: 32.01, angle: 0, r: 16 }] },
      ],
      restrict: [
        { kind: 'grey', pieces: [{ x: 647.04, y: 562.21, w: 173.57, h: 410.25, angle: -1.57 }] },
      ],
    },
    {
      name: 'Sheet 14 · 3,1',
      blueprint: true,
      page: 14, row: 2, col: 0,
      cell: [356.83, 170, 909.93, 719.72],
      ink: 900,
      faucets: [
        { x: 695.34, y: 260.68, dir: 'down', rate: 46, total: 110, spread: 0.55 },
      ],
      glasses: [
        { x: 609.25, y: 591.48, w: 51.2, h: 82.4, need: 0.72, fixed: true },
      ],
      platforms: [
        { kind: 'ink', pieces: [{ x: 719.22, y: 488.82, w: 124.73, h: 8.28, angle: -0.25 }] },
        { kind: 'ink', pieces: [{ x: 612.54, y: 637.2, w: 6.2, h: 82.23, angle: -1.57 }] },
      ],
      falls: [
        { kind: 'hot', pieces: [{ x: 600.55, y: 320.1, w: 35.99, h: 35.99, angle: 0, r: 18 }] },
      ],
      restrict: [
        { kind: 'grey', pieces: [{ x: 642.39, y: 541.45, w: 277.68, h: 410.04, angle: -1.57 }] },
      ],
    },
    {
      name: 'Sheet 14 · 3,2',
      blueprint: true,
      page: 14, row: 2, col: 1,
      cell: [363.45, 170, 916.55, 719.72],
      ink: 900,
      faucets: [
        { x: 626.48, y: 272.51, dir: 'down', rate: 46, total: 110, spread: 0.55 },
      ],
      glasses: [
        { x: 627.58, y: 548.23, w: 63.5, h: 103.6, need: 0.72, fixed: true },
      ],
      platforms: [
        { kind: 'ink', pieces: [{ poly: [[748.42, 420.64], [664.5, 500.62], [748.42, 500.62]], ox: 720.45, oy: 473.96 }] },
        { kind: 'ink', pieces: [{ poly: [[513.55, 418.95], [513.55, 502.87], [593.53, 502.87]], ox: 540.21, oy: 474.9 }] },
        { kind: 'ink', pieces: [{ poly: [[710.12, 368.82], [705.62, 362.06], [627.89, 406.56], [551.85, 368.26], [549.04, 375.02], [625.07, 413.88], [627.89, 409.94], [630.14, 413.88], [631.83, 414.44], [709, 370.51]], ox: 636.85, oy: 390.34 }] },
        { kind: 'ink', pieces: [{ x: 630.14, y: 606.51, w: 6.76, h: 82.23, angle: -1.57 }] },
      ],
      restrict: [
        { kind: 'grey', pieces: [{ x: 761.38, y: 464.57, w: 380.75, h: 190.37, angle: -1.57 }] },
        { kind: 'grey', pieces: [{ x: 489.33, y: 464.57, w: 384.13, h: 179.11, angle: -1.57 }] },
      ],
    },
    {
      name: 'Sheet 14 · 3,3',
      blueprint: true,
      page: 14, row: 2, col: 2,
      cell: [363.45, 170, 916.55, 719.72],
      ink: 900,
      faucets: [
        { x: 601.7, y: 260.68, dir: 'down', rate: 46, total: 110, spread: 0.55 },
      ],
      glasses: [
        { x: 611.87, y: 572.6, w: 51.2, h: 82.4, need: 0.72, fixed: true },
      ],
      platforms: [
        { kind: 'ink', pieces: [{ x: 772.36, y: 465.14, w: 7.89, h: 124.48, angle: -1.57 }] },
        { kind: 'ink', pieces: [{ x: 730.77, y: 536.72, w: 124.78, h: 8.28, angle: -0.52 }] },
        { kind: 'ink', pieces: [{ x: 614.65, y: 621.72, w: 6.76, h: 82.8, angle: -1.57 }] },
      ],
      falls: [
        { kind: 'hot', pieces: [{ x: 745.72, y: 496.17, w: 36.1, h: 36.1, angle: 0, r: 18.05 }] },
        { kind: 'hot', pieces: [{ x: 611.56, y: 522.3, w: 7.32, h: 82.23, angle: -1.57 }] },
      ],
      restrict: [
        { kind: 'grey', pieces: [{ poly: [[455.54, 383.47], [455.54, 661.14], [865.58, 661.14], [865.58, 383.47]], ox: 660.56, oy: 522.31 }] },
      ],
    },
    {
      name: 'Sheet 15 · 1,1',
      blueprint: true,
      page: 15, row: 0, col: 0,
      cell: [351.82, 170, 914.71, 729.46],
      ink: 900,
      faucets: [
        { x: 665.94, y: 237.93, dir: 'down', rate: 46, total: 110, spread: 0.55 },
      ],
      glasses: [
        { x: 667.77, y: 402.25, w: 83.6, h: 99.2, need: 0.72, fixed: true, tilt: 0.47 },
      ],
      platforms: [
        { kind: 'ink', pieces: [{ poly: [[829.88, 564.66], [737.02, 564.66], [736.44, 537.14], [711.8, 537.14], [711.22, 564.66], [551.87, 564.66], [551.87, 593.32], [829.88, 593.32]], ox: 707.5, oy: 564.94 }] },
      ],
      restrict: [
        { kind: 'grey', pieces: [{ poly: [[428.05, 509.63], [428.05, 654.65], [845.35, 654.65], [845.35, 509.63]], ox: 636.7, oy: 582.14 }] },
      ],
    },
    {
      name: 'Sheet 15 · 1,2',
      blueprint: true,
      page: 15, row: 0, col: 1,
      cell: [358.55, 170, 921.45, 729.46],
      ink: 900,
      faucets: [
        { x: 684.71, y: 243.08, dir: 'down', rate: 46, total: 110, spread: 0.55 },
      ],
      glasses: [
        { x: 686.99, y: 407.94, w: 83.6, h: 99.2, need: 0.72, fixed: true, tilt: 0.47 },
      ],
      platforms: [
        { kind: 'ink', pieces: [{ x: 710.05, y: 584.75, w: 278.3, h: 29.43, angle: -0.31 }] },
      ],
      restrict: [
        { kind: 'grey', pieces: [{ poly: [[447.11, 515.36], [447.11, 660.39], [864.99, 660.39], [864.99, 515.36]], ox: 656.05, oy: 587.88 }] },
      ],
    },
    {
      name: 'Sheet 15 · 1,3',
      blueprint: true,
      page: 15, row: 0, col: 2,
      cell: [358.55, 170, 921.45, 729.46],
      ink: 900,
      faucets: [
        { x: 660.92, y: 266.59, dir: 'down', rate: 46, total: 110, spread: 0.55 },
      ],
      glasses: [
        { x: 661.25, y: 567.98, w: 52.1, h: 83.9, need: 0.72, fixed: true },
      ],
      platforms: [
        { kind: 'ink', pieces: [{ x: 660.92, y: 618.83, w: 6.31, h: 83.69, angle: -1.57 }] },
      ],
      falls: [
        { kind: 'hot', pieces: [{ x: 623.09, y: 525.68, w: 8.03, h: 127.25, angle: -1.57 }] },
      ],
      restrict: [
        { kind: 'grey', pieces: [{ x: 653.47, y: 524.82, w: 282.6, h: 417.3, angle: -1.57 }] },
      ],
    },
    {
      name: 'Sheet 15 · 2,1',
      blueprint: true,
      page: 15, row: 1, col: 0,
      cell: [356.69, 170, 910.07, 720],
      ink: 900,
      faucets: [
        { x: 703.82, y: 276.51, dir: 'down', rate: 46, total: 110, spread: 0.55 },
        { x: 530.25, y: 278.76, dir: 'down', rate: 46, total: 110, spread: 0.55 },
      ],
      glasses: [
        { x: 538.26, y: 563.79, w: 51.3, h: 82.4, need: 0.72, fixed: true },
        { x: 710.07, y: 563.85, w: 51.3, h: 82.4, need: 0.72, fixed: true },
      ],
      platforms: [
        { kind: 'ink', pieces: [{ x: 709.17, y: 605.04, w: 6.76, h: 82.84, angle: -1.57 }] },
        { kind: 'ink', pieces: [{ x: 537.58, y: 605.04, w: 6.76, h: 82.27, angle: -1.57 }] },
      ],
      falls: [
        { kind: 'hot', pieces: [{ x: 701.23, y: 352.84, w: 36.07, h: 36.07, angle: 0, r: 18.03 }] },
        { kind: 'hot', pieces: [{ x: 558.43, y: 524.18, w: 6.2, h: 125.1, angle: -1.57 }] },
        { kind: 'hot', pieces: [{ x: 688.04, y: 524.18, w: 6.2, h: 125.1, angle: -1.57 }] },
      ],
      restrict: [
        { kind: 'grey', pieces: [{ poly: [[418.68, 458.52], [418.68, 678.3], [828.92, 678.3], [828.92, 458.52]], ox: 623.8, oy: 568.41 }] },
      ],
    },
    {
      name: 'Sheet 15 · 2,2',
      blueprint: true,
      page: 15, row: 1, col: 1,
      cell: [363.31, 170, 916.69, 720],
      ink: 900,
      faucets: [
        { x: 631.27, y: 230.86, dir: 'down', rate: 46, total: 110, spread: 0.55 },
      ],
      glasses: [
        { x: 634.66, y: 357.75, w: 63.5, h: 103.6, need: 0.72, fixed: true },
      ],
      platforms: [
        { kind: 'ink', pieces: [{ x: 575.48, y: 433.17, w: 20.29, h: 21.41, angle: -1.57 }] },
      ],
      falls: [
        { kind: 'hot', pieces: [{ x: 688.46, y: 433.17, w: 20.29, h: 21.98, angle: -1.57 }] },
      ],
      restrict: [
        { kind: 'grey', pieces: [{ x: 762.57, y: 508.96, w: 248.51, h: 197.23, angle: -1.57 }] },
        { kind: 'grey', pieces: [{ x: 502.78, y: 510.65, w: 248.51, h: 197.23, angle: -1.57 }] },
      ],
    },
    {
      name: 'Sheet 15 · 2,3',
      blueprint: true,
      page: 15, row: 1, col: 2,
      cell: [363.31, 170, 916.69, 720],
      ink: 900,
      faucets: [
        { x: 714.1, y: 278.48, dir: 'left', rate: 46, total: 110, spread: 0.55 },
      ],
      glasses: [
        { x: 655.24, y: 387.41, w: 51.3, h: 82.4, need: 0.72, fixed: true },
      ],
      platforms: [
        { kind: 'ink', pieces: [{ x: 701.37, y: 545.25, w: 32.06, h: 32.06, angle: 0, r: 16.03 }] },
        { kind: 'ink', pieces: [{ x: 607.26, y: 546.27, w: 32.01, h: 32.01, angle: 0, r: 16 }] },
      ],
      restrict: [
        { kind: 'grey', pieces: [{ x: 647.04, y: 562.21, w: 173.57, h: 410.25, angle: -1.57 }] },
      ],
    },
    {
      name: 'Sheet 15 · 3,1',
      blueprint: true,
      page: 15, row: 2, col: 0,
      cell: [356.83, 170, 909.93, 719.72],
      ink: 900,
      faucets: [
        { x: 695.34, y: 260.68, dir: 'down', rate: 46, total: 110, spread: 0.55 },
      ],
      glasses: [
        { x: 609.25, y: 591.48, w: 51.2, h: 82.4, need: 0.72, fixed: true },
      ],
      platforms: [
        { kind: 'ink', pieces: [{ x: 719.22, y: 488.82, w: 124.73, h: 8.28, angle: -0.25 }] },
        { kind: 'ink', pieces: [{ x: 612.54, y: 637.2, w: 6.2, h: 82.23, angle: -1.57 }] },
      ],
      falls: [
        { kind: 'hot', pieces: [{ x: 600.55, y: 320.1, w: 35.99, h: 35.99, angle: 0, r: 18 }] },
      ],
      restrict: [
        { kind: 'grey', pieces: [{ x: 642.39, y: 541.45, w: 277.68, h: 410.04, angle: -1.57 }] },
      ],
    },
    {
      name: 'Sheet 15 · 3,2',
      blueprint: true,
      page: 15, row: 2, col: 1,
      cell: [363.45, 170, 916.55, 719.72],
      ink: 900,
      faucets: [
        { x: 626.48, y: 272.51, dir: 'down', rate: 46, total: 110, spread: 0.55 },
      ],
      glasses: [
        { x: 627.58, y: 548.23, w: 63.5, h: 103.6, need: 0.72, fixed: true },
      ],
      platforms: [
        { kind: 'ink', pieces: [{ poly: [[748.42, 420.64], [664.5, 500.62], [748.42, 500.62]], ox: 720.45, oy: 473.96 }] },
        { kind: 'ink', pieces: [{ poly: [[513.55, 418.95], [513.55, 502.87], [593.53, 502.87]], ox: 540.21, oy: 474.9 }] },
        { kind: 'ink', pieces: [{ poly: [[710.12, 368.82], [705.62, 362.06], [627.89, 406.56], [551.85, 368.26], [549.04, 375.02], [625.07, 413.88], [627.89, 409.94], [630.14, 413.88], [631.83, 414.44], [709, 370.51]], ox: 636.85, oy: 390.34 }] },
        { kind: 'ink', pieces: [{ x: 630.14, y: 606.51, w: 6.76, h: 82.23, angle: -1.57 }] },
      ],
      restrict: [
        { kind: 'grey', pieces: [{ x: 761.38, y: 464.57, w: 380.75, h: 190.37, angle: -1.57 }] },
        { kind: 'grey', pieces: [{ x: 489.33, y: 464.57, w: 384.13, h: 179.11, angle: -1.57 }] },
      ],
    },
    {
      name: 'Sheet 15 · 3,3',
      blueprint: true,
      page: 15, row: 2, col: 2,
      cell: [363.45, 170, 916.55, 719.72],
      ink: 900,
      faucets: [
        { x: 601.7, y: 260.68, dir: 'down', rate: 46, total: 110, spread: 0.55 },
      ],
      glasses: [
        { x: 611.87, y: 572.6, w: 51.2, h: 82.4, need: 0.72, fixed: true },
      ],
      platforms: [
        { kind: 'ink', pieces: [{ x: 772.36, y: 465.14, w: 7.89, h: 124.48, angle: -1.57 }] },
        { kind: 'ink', pieces: [{ x: 730.77, y: 536.72, w: 124.78, h: 8.28, angle: -0.52 }] },
        { kind: 'ink', pieces: [{ x: 614.65, y: 621.72, w: 6.76, h: 82.8, angle: -1.57 }] },
      ],
      falls: [
        { kind: 'hot', pieces: [{ x: 745.72, y: 496.17, w: 36.1, h: 36.1, angle: 0, r: 18.05 }] },
        { kind: 'hot', pieces: [{ x: 611.56, y: 522.3, w: 7.32, h: 82.23, angle: -1.57 }] },
      ],
      restrict: [
        { kind: 'grey', pieces: [{ poly: [[455.54, 383.47], [455.54, 661.14], [865.58, 661.14], [865.58, 383.47]], ox: 660.56, oy: 522.31 }] },
      ],
    },
  ];

  // The sheet's rooms follow the forty authored ones, so the dial, the grid and
  // the arrow keys run straight on from 40 to 41 without a gap or a clash.
  const OFFSET = 40;
  ROOMS.forEach((lv, i) => {
    lv.id = OFFSET + i + 1;
    lv.name = 'Sheet ' + lv.page + ' · ' + (lv.row + 1) + '.' + (lv.col + 1);
    lv.platforms = lv.platforms || [];
    lv.crates = lv.crates || [];
    lv.balls = lv.balls || [];
    lv.spinners = lv.spinners || [];
    lv.seesaws = lv.seesaws || [];
    lv.fans = lv.fans || [];
    lv.pins = lv.pins || [];
    lv.falls = (lv.falls || []).map((f) => Object.assign({ angle: 0 }, f));
    lv.hots = (lv.hots || []).map((h) => Object.assign({ angle: 0 }, h));
    lv.restrict = (lv.restrict || []).map((r) => Object.assign({ angle: 0 }, r));
  });

  HG.PDF_LEVELS = ROOMS;
  HG.pdfLevelById = (id) => ROOMS.find((l) => l.id === id) || ROOMS[0];

  // The sheet's rooms are part of the game's level list, in sheet order, right
  // after the forty authored rooms, so nothing has to know about the seam.
  HG.SHEET_FIRST = OFFSET + 1;
  HG.LEVELS = (HG.LEVELS || []).concat(ROOMS);
  HG.levelById = (id) => HG.LEVELS.find((l) => l.id === id) || HG.LEVELS[0];
})(window);
