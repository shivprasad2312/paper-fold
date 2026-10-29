// Pure rules for "Screw Puzzle" (original implementation, no DOM).
//
// Board: { cols, rows, pieces: [piece] }
// Piece: { id, color, cells: [[r,c]], screws: [[r,c]] }
//   - cells:  the squares the wooden piece covers
//   - screws: cells that still hold a screw into the board. A piece with no
//             screws left is free and can slide off the board.
// Rules:
//   - Tap a screw to remove it.
//   - Tap a free piece to slide it off the board. It must have a straight,
//     unobstructed path to the edge in some direction (ignoring its own cells).
//   - Clear every piece to win.
(function (root) {
  const DIRS = {
    up: [-1, 0],
    down: [1, 0],
    left: [0, -1],
    right: [0, 1],
  };
  const COLORS = ["#e4572e", "#29a19c", "#f3a712", "#6c5ce7", "#00b4d8", "#d1495b", "#7cb518", "#8e6c8a"];

  const SHAPES = [
    [[0, 0], [0, 1]],
    [[0, 0], [0, 1], [0, 2]],
    [[0, 0], [0, 1], [0, 2], [0, 3]],
    [[0, 0], [1, 0], [1, 1]],
    [[0, 0], [0, 1], [1, 1], [2, 1]],
    [[0, 0], [1, 0], [1, 1], [2, 1]],
    [[0, 0], [0, 1], [1, 0], [1, 1]],
    [[0, 1], [1, 0], [1, 1], [1, 2]],
  ];

  function clonePieces(pieces) {
    return pieces.map((p) => ({
      id: p.id,
      color: p.color,
      cells: p.cells.map((x) => x.slice()),
      screws: p.screws.map((x) => x.slice()),
    }));
  }

  function cloneBoard(board) {
    return { cols: board.cols, rows: board.rows, pieces: clonePieces(board.pieces) };
  }

  function sameCell(a, b) {
    return a[0] === b[0] && a[1] === b[1];
  }

  function occupancy(board) {
    const map = new Map();
    for (const p of board.pieces) {
      for (const [r, c] of p.cells) map.set(r + "," + c, p.id);
    }
    return map;
  }

  // Can this piece leave the board by sliding in direction `dir`?
  function canSlide(board, piece, dir) {
    const [dr, dc] = DIRS[dir];
    const occ = occupancy(board);
    return piece.cells.every(([r, c]) => {
      let nr = r + dr;
      let nc = c + dc;
      while (nr >= 0 && nr < board.rows && nc >= 0 && nc < board.cols) {
        const owner = occ.get(nr + "," + nc);
        if (owner !== undefined && owner !== piece.id) return false;
        nr += dr;
        nc += dc;
      }
      return true;
    });
  }

  function exitDirs(board, piece) {
    return Object.keys(DIRS).filter((d) => canSlide(board, piece, d));
  }

  function findPiece(board, id) {
    return board.pieces.find((p) => p.id === id) || null;
  }

  // Remove the screw at `screwIndex` of piece `id`. Returns a new board, or null.
  function unscrew(board, id, screwIndex) {
    const piece = findPiece(board, id);
    if (!piece || !piece.screws[screwIndex]) return null;
    const next = cloneBoard(board);
    const target = next.pieces.find((p) => p.id === id);
    target.screws.splice(screwIndex, 1);
    return next;
  }

  // Slide a free piece off the board in `dir`. Returns a new board, or null.
  function slide(board, id, dir) {
    const piece = findPiece(board, id);
    if (!piece || piece.screws.length > 0) return null;
    if (!canSlide(board, piece, dir)) return null;
    const next = cloneBoard(board);
    next.pieces = next.pieces.filter((p) => p.id !== id);
    return next;
  }

  // Which action would a tap on a free piece take? First clear direction, or null.
  function defaultSlideDir(board, id) {
    const piece = findPiece(board, id);
    if (!piece || piece.screws.length > 0) return null;
    const dirs = exitDirs(board, piece);
    return dirs.length ? dirs[0] : null;
  }

  function isSolved(board) {
    return board.pieces.length === 0;
  }

  // Screws can always be removed, so solvability only depends on the slide order.
  // Removing a piece never blocks another, so greedy removal is complete.
  function solvable(board) {
    const work = cloneBoard(board);
    work.pieces.forEach((p) => (p.screws = []));
    let progress = true;
    while (work.pieces.length && progress) {
      progress = false;
      for (const p of work.pieces) {
        if (exitDirs(work, p).length) {
          work.pieces = work.pieces.filter((q) => q.id !== p.id);
          progress = true;
          break;
        }
      }
    }
    return work.pieces.length === 0;
  }

  // Deterministic PRNG (mulberry32) so a level number always gives the same board.
  function rng(seed) {
    let a = seed >>> 0;
    return function () {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function rotate(cells) {
    // (r, c) -> (c, -r), then normalise so the minimum row/col is 0
    const rotated = cells.map(([r, c]) => [c, -r]);
    const minR = Math.min(...rotated.map((x) => x[0]));
    const minC = Math.min(...rotated.map((x) => x[1]));
    return rotated.map(([r, c]) => [r - minR, c - minC]);
  }

  function randomShape(random) {
    let shape = SHAPES[Math.floor(random() * SHAPES.length)];
    const turns = Math.floor(random() * 4);
    for (let i = 0; i < turns; i++) shape = rotate(shape);
    return shape;
  }

  function generateLevel(level, seed) {
    const random = rng(seed ?? level * 7919);
    const size = Math.min(4 + Math.ceil(level / 2), 8);
    let target = Math.min(2 + level, 12);

    for (let attempt = 0; attempt < 4000; attempt++) {
      if (attempt > 0 && attempt % 400 === 0) target = Math.max(2, target - 1);
      const occupied = new Set();
      const pieces = [];
      let tries = 0;
      while (pieces.length < target && tries < 300) {
        tries++;
        const shape = randomShape(random);
        const maxR = Math.max(...shape.map((x) => x[0]));
        const maxC = Math.max(...shape.map((x) => x[1]));
        const r0 = Math.floor(random() * (size - maxR));
        const c0 = Math.floor(random() * (size - maxC));
        const cells = shape.map(([r, c]) => [r + r0, c + c0]);
        if (cells.some(([r, c]) => occupied.has(r + "," + c))) continue;
        cells.forEach(([r, c]) => occupied.add(r + "," + c));
        pieces.push({ id: pieces.length, color: COLORS[pieces.length % COLORS.length], cells, screws: [] });
      }
      if (pieces.length < 2) continue;

      // Each piece gets one screw, and a second one on some levels.
      for (const p of pieces) {
        const count = Math.min(p.cells.length, random() < Math.min(level / 10, 0.7) ? 2 : 1);
        const pool = p.cells.map((x) => x.slice());
        for (let i = 0; i < count; i++) {
          const idx = Math.floor(random() * pool.length);
          p.screws.push(pool.splice(idx, 1)[0]);
        }
      }

      const board = { cols: size, rows: size, pieces };
      if (solvable(board) && !isSolved(board)) return board;
    }
    throw new Error("Could not generate level " + level);
  }

  const api = {
    DIRS,
    COLORS,
    cloneBoard,
    canSlide,
    exitDirs,
    unscrew,
    slide,
    defaultSlideDir,
    isSolved,
    solvable,
    generateLevel,
    rng,
  };

  if (typeof module === "object" && module.exports) module.exports = api;
  else root.ScrewLogic = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
