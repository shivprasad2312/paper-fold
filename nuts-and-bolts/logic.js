// Pure game logic for "Nuts & Bolts" (original implementation).
// A state is an array of bolts. Each bolt is an array of nut colour indices,
// index 0 = bottom, last index = top. A bolt holds at most CAPACITY nuts.
(function (root) {
  const CAPACITY = 4;

  function cloneState(state) {
    return state.map((b) => b.slice());
  }

  function top(bolt) {
    return bolt.length ? bolt[bolt.length - 1] : null;
  }

  function isComplete(bolt) {
    return bolt.length === 0 || (bolt.length === CAPACITY && bolt.every((c) => c === bolt[0]));
  }

  function isSolved(state) {
    return state.every(isComplete);
  }

  // A move is legal when the source has a nut, the target has room,
  // and the target is empty or its top nut has the same colour.
  function canMove(state, from, to) {
    if (from === to) return false;
    const src = state[from];
    const dst = state[to];
    if (!src || !dst || src.length === 0) return false;
    if (dst.length >= CAPACITY) return false;
    if (dst.length === 0) {
      // Moving a lone-colour bolt onto an empty bolt is a pointless shuffle.
      return !src.every((c) => c === src[0]) || src.length !== CAPACITY;
    }
    return top(dst) === top(src);
  }

  function applyMove(state, from, to) {
    if (!canMove(state, from, to)) return null;
    const next = cloneState(state);
    next[to].push(next[from].pop());
    return next;
  }

  function legalMoves(state) {
    const moves = [];
    for (let f = 0; f < state.length; f++) {
      for (let t = 0; t < state.length; t++) {
        if (canMove(state, f, t)) moves.push([f, t]);
      }
    }
    return moves;
  }

  // Canonical key: bolt order does not matter, so sort the bolt strings.
  function stateKey(state) {
    return state
      .map((b) => b.join(","))
      .sort()
      .join("|");
  }

  // Depth-first search with memoisation. Returns the list of moves that solves
  // the state, or null if no solution is found within the node budget.
  function solve(state, nodeLimit = 200000) {
    const seen = new Set();
    let nodes = 0;
    const path = [];

    function dfs(s) {
      if (isSolved(s)) return true;
      if (++nodes > nodeLimit) return false;
      const key = stateKey(s);
      if (seen.has(key)) return false;
      seen.add(key);
      for (const [f, t] of legalMoves(s)) {
        path.push([f, t]);
        if (dfs(applyMove(s, f, t))) return true;
        path.pop();
      }
      return false;
    }

    return dfs(cloneState(state)) ? path : null;
  }

  // Small deterministic PRNG (mulberry32) so levels can be reproduced by seed.
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

  // Build a solvable, unsolved level for `level` (1-based).
  // More colours and bolts as the level climbs; always two empty bolts to work with.
  function generateLevel(level, seed) {
    const random = rng(seed ?? level * 9973);
    const colors = Math.min(3 + Math.floor((level - 1) / 2), 8);
    const bolts = colors + 2;
    for (let attempt = 0; attempt < 500; attempt++) {
      const nuts = [];
      for (let c = 0; c < colors; c++) for (let i = 0; i < CAPACITY; i++) nuts.push(c);
      for (let i = nuts.length - 1; i > 0; i--) {
        const j = Math.floor(random() * (i + 1));
        [nuts[i], nuts[j]] = [nuts[j], nuts[i]];
      }
      const state = [];
      for (let b = 0; b < bolts; b++) state.push([]);
      nuts.forEach((c, idx) => state[Math.floor(idx / CAPACITY)].push(c));
      if (isSolved(state)) continue;
      const solution = solve(state, 60000);
      if (solution) return { state, colors, bolts, solutionLength: solution.length };
    }
    throw new Error("Could not generate a solvable level for " + level);
  }

  const api = {
    CAPACITY,
    cloneState,
    top,
    isComplete,
    isSolved,
    canMove,
    applyMove,
    legalMoves,
    solve,
    generateLevel,
    rng,
  };

  if (typeof module === "object" && module.exports) module.exports = api;
  else root.NutsLogic = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
