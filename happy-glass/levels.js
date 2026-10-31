/* levels.js -- hand-authored levels for the clone.
 *
 * Canvas is a fixed 720 x 1080 portrait field. Coordinates are in that space.
 *   pipe   { x: centre, y: mouth, w: mouth width }
 *   glass  { x, y, w, h }  interior box; walls are built around it
 *   ink    drawing budget, in pixels of stroke length
 *   targetH how high the water has to stack inside the glass (default h/2)
 *
 * These are my levels, not Lion Studios'. The layouts exist to exercise the same
 * three pressures the original uses: deflection, obstruction and ink scarcity.
 */

export const LEVELS = [
  {
    name: "First drop",
    pipe: { x: 150, y: 120, w: 56 },
    glass: { x: 300, y: 780, w: 150, h: 160 },
    ink: 640, total: 210,
    obstacles: [],
    hint: "A single slope under the pipe is enough.",
  },
  {
    name: "Other way round",
    pipe: { x: 560, y: 120, w: 56 },
    glass: { x: 250, y: 780, w: 150, h: 160 },
    ink: 640, total: 210,
    obstacles: [],
    hint: "Same trick, mirrored.",
  },
  {
    name: "Shelf",
    pipe: { x: 360, y: 120, w: 56 },
    glass: { x: 470, y: 800, w: 140, h: 155 },
    ink: 560, total: 210,
    obstacles: [{ x1: 300, y1: 520, x2: 430, y2: 556, r: 10 }],
    hint: "The shelf already pushes water right; help it the rest of the way.",
  },
  {
    name: "Over the wall",
    pipe: { x: 150, y: 110, w: 56 },
    glass: { x: 480, y: 800, w: 130, h: 150 },
    ink: 760, total: 210,
    obstacles: [{ x1: 380, y1: 600, x2: 380, y2: 900, r: 10 }],
    hint: "Arc over the wall, don't fight it.",
  },
  {
    name: "Awning",
    pipe: { x: 360, y: 110, w: 56 },
    glass: { x: 250, y: 820, w: 120, h: 145 },
    ink: 700, total: 210,
    obstacles: [{ x1: 200, y1: 700, x2: 340, y2: 700, r: 9 }],
    hint: "The awning covers the glass; come in from the right.",
  },
  {
    name: "Staircase",
    pipe: { x: 580, y: 110, w: 56 },
    glass: { x: 120, y: 820, w: 140, h: 150 },
    ink: 820, total: 220,
    obstacles: [{ x1: 250, y1: 600, x2: 450, y2: 636, r: 10 }],
    hint: "Two bounces beat one long line.",
  },
  {
    name: "Blind spot",
    pipe: { x: 360, y: 110, w: 56 },
    glass: { x: 470, y: 840, w: 130, h: 145 },
    ink: 660, total: 210,
    obstacles: [{ x1: 290, y1: 480, x2: 430, y2: 480, r: 10 }],
    hint: "The glass sits outside the shadow of the plate.",
  },
  {
    name: "Needle eye",
    pipe: { x: 200, y: 110, w: 56 },
    glass: { x: 520, y: 840, w: 108, h: 140 },
    ink: 800, total: 210,
    obstacles: [{ x1: 350, y1: 640, x2: 350, y2: 920, r: 9 }],
    hint: "Guide it through the gap on the right of the pillar.",
  },
  {
    name: "Long haul",
    pipe: { x: 360, y: 100, w: 72 },
    glass: { x: 100, y: 840, w: 150, h: 150 },
    ink: 880, total: 230,
    obstacles: [{ x1: 250, y1: 560, x2: 500, y2: 600, r: 10 }],
    hint: "Start the diversion high, before the shelf.",
  },
  {
    name: "Two shelves",
    pipe: { x: 120, y: 100, w: 56 },
    glass: { x: 500, y: 840, w: 130, h: 140 },
    ink: 900, total: 230,
    obstacles: [
      { x1: 250, y1: 520, x2: 430, y2: 520, r: 9 },
      { x1: 400, y1: 720, x2: 560, y2: 700, r: 9 },
    ],
    hint: "Step down shelf to shelf.",
  },
];

export const FIELD = { w: 720, h: 1080 };
