// Hand-designed levels for the physics screw puzzle (original layouts).
// Coordinates are logical pixels on a 420 x 640 board.
//  - pieces: rigid planks. Each screw has a local position (lx, ly) on its piece.
//  - storage: empty board holes where removed screws can be parked.
//  - tray: number of screw slots at the bottom.
(function (root) {
  const LEVELS = [
    {
      name: "Level 1",
      width: 420,
      height: 640,
      tray: 2,
      pieces: [
        {
          id: "a",
          x: 210,
          y: 260,
          w: 200,
          h: 22,
          kind: "wood",
          screws: [
            { id: "a1", lx: -80, ly: 0 },
            { id: "a2", lx: 80, ly: 0 },
          ],
        },
      ],
      storage: [],
    },
    {
      name: "Level 2",
      width: 420,
      height: 640,
      tray: 2,
      pieces: [
        {
          id: "a",
          x: 150,
          y: 200,
          w: 160,
          h: 22,
          kind: "wood",
          screws: [
            { id: "a1", lx: -60, ly: 0 },
            { id: "a2", lx: 60, ly: 0 },
          ],
        },
        {
          id: "b",
          x: 330,
          y: 380,
          w: 160,
          h: 22,
          kind: "metal",
          screws: [
            { id: "b1", lx: -60, ly: 0 },
            { id: "b2", lx: 60, ly: 0 },
          ],
        },
      ],
      storage: [
        { id: "st1", x: 50, y: 520 },
        { id: "st2", x: 50, y: 570 },
      ],
    },
    {
      name: "Level 3",
      width: 420,
      height: 640,
      tray: 2,
      pieces: [
        {
          id: "f",
          x: 210,
          y: 300,
          w: 240,
          h: 22,
          kind: "wood",
          screws: [
            { id: "f1", lx: -100, ly: 0 },
            { id: "f2", lx: 100, ly: 0 },
          ],
        },
        {
          id: "g",
          x: 210,
          y: 420,
          w: 240,
          h: 22,
          kind: "metal",
          screws: [
            { id: "g1", lx: -100, ly: 0 },
            { id: "g2", lx: 100, ly: 0 },
          ],
        },
      ],
      storage: [
        { id: "st1", x: 40, y: 560 },
        { id: "st2", x: 40, y: 610 },
      ],
    },
  ];

  const api = { LEVELS };
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.ScrewLevels = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
