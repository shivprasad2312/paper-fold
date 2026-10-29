// Physics core for "Screw Puzzle" (original implementation).
//
// Model:
//  - Pieces are rigid planks simulated by Matter.js.
//  - A piece is held in place by one or more screws. Each pinned screw is a
//    constraint between a fixed point on the board and a point on the piece.
//  - Holes are fixed points on the board. A screw sits in a hole.
//  - Tap a pinned screw: it is unscrewed and goes into a free tray slot.
//    The piece loses that pin. A piece with no pins swings or falls.
//  - Tap a loose screw (in the tray or a hole) to pick it up, then tap an
//    empty hole to drop it there. If a piece covers that hole, the screw pins
//    the piece at that point again.
//  - Pieces that fall below the board are gone. Clear them all to win.
//
// Works in the browser (pass window.Matter) and in Node (pass require('./vendor/matter.min.js')).
(function (root) {
  function createGame(Matter, def) {
    const { Engine, World, Bodies, Constraint } = Matter;
    const engine = Engine.create();
    const world = engine.world;
    const W = def.width;
    const H = def.height;

    const pieces = new Map(); // id -> piece
    const holes = new Map(); // id -> { id, x, y, screw }
    const screws = new Map(); // id -> { id, hole, slot, pinned, piece }
    const tray = new Array(def.tray).fill(null);
    let selected = null;
    let status = "playing";

    function rotate(lx, ly, angle) {
      const c = Math.cos(angle);
      const s = Math.sin(angle);
      return { x: lx * c - ly * s, y: lx * s + ly * c };
    }

    function toWorld(piece, lx, ly) {
      const p = rotate(lx, ly, piece.body.angle);
      return { x: piece.body.position.x + p.x, y: piece.body.position.y + p.y };
    }

    function toLocal(piece, wx, wy) {
      const dx = wx - piece.body.position.x;
      const dy = wy - piece.body.position.y;
      const c = Math.cos(piece.body.angle);
      const s = Math.sin(piece.body.angle);
      return { x: dx * c + dy * s, y: -dx * s + dy * c };
    }

    function covers(piece, wx, wy) {
      const l = toLocal(piece, wx, wy);
      return Math.abs(l.x) <= piece.w / 2 && Math.abs(l.y) <= piece.h / 2;
    }

    function pin(piece, lx, ly, wx, wy) {
      return Constraint.create({
        pointA: { x: wx, y: wy },
        bodyB: piece.body,
        pointB: { x: lx, y: ly },
        length: 0,
        stiffness: 1,
        damping: 0,
      });
    }

    function unpin(screw) {
      if (screw.pinned) {
        World.remove(world, screw.pinned);
        screw.pinned = null;
        screw.piece = null;
      }
    }

    // --- build the level -------------------------------------------------
    for (const p of def.pieces) {
      const body = Bodies.rectangle(p.x, p.y, p.w, p.h, {
        angle: p.angle || 0,
        density: 0.002,
        friction: 0.5,
        frictionAir: 0.01,
        chamfer: { radius: 5 },
      });
      const piece = { id: p.id, body, w: p.w, h: p.h, kind: p.kind || "wood", fallen: false };
      pieces.set(p.id, piece);
      World.add(world, body);
    }
    for (const st of def.storage || []) {
      holes.set(st.id, { id: st.id, x: st.x, y: st.y, screw: null });
    }
    for (const p of def.pieces) {
      const piece = pieces.get(p.id);
      for (const s of p.screws) {
        const world_ = toWorld(piece, s.lx, s.ly);
        holes.set(s.id, { id: s.id, x: world_.x, y: world_.y, screw: s.id });
        const screw = { id: s.id, hole: s.id, slot: null, pinned: null, piece: piece.id };
        screw.pinned = pin(piece, s.lx, s.ly, world_.x, world_.y);
        World.add(world, screw.pinned);
        screws.set(s.id, screw);
      }
    }

    // --- actions ---------------------------------------------------------
    function freeSlot() {
      return tray.indexOf(null);
    }

    function tapScrew(id) {
      if (status !== "playing") return { ok: false, reason: "finished" };
      const s = screws.get(id);
      if (!s) return { ok: false, reason: "unknown screw" };

      if (s.pinned) {
        const slot = freeSlot();
        if (slot < 0) {
          selected = null;
          return { ok: false, reason: "tray full: place a screw in an open hole first" };
        }
        holes.get(s.hole).screw = null;
        s.hole = null;
        unpin(s);
        s.slot = slot;
        tray[slot] = id;
        selected = null;
        return { ok: true, action: "unscrew" };
      }

      selected = selected === id ? null : id;
      return { ok: true, action: selected ? "select" : "deselect" };
    }

    function tapHole(hid) {
      if (status !== "playing") return { ok: false, reason: "finished" };
      const h = holes.get(hid);
      if (!h) return { ok: false, reason: "unknown hole" };
      if (!selected) return { ok: false, reason: "pick up a screw first" };
      if (h.screw) return { ok: false, reason: "that hole is occupied" };

      const s = screws.get(selected);
      if (s.hole) holes.get(s.hole).screw = null;
      if (s.slot !== null) {
        tray[s.slot] = null;
        s.slot = null;
      }
      unpin(s);

      h.screw = s.id;
      s.hole = hid;
      let pinned = false;
      for (const piece of pieces.values()) {
        if (!piece.fallen && covers(piece, h.x, h.y)) {
          const l = toLocal(piece, h.x, h.y);
          s.pinned = pin(piece, l.x, l.y, h.x, h.y);
          s.piece = piece.id;
          World.add(world, s.pinned);
          pinned = true;
          break;
        }
      }
      selected = null;
      return { ok: true, action: "place", pinned };
    }

    // --- simulation ------------------------------------------------------
    function step(ms) {
      if (status !== "playing") return;
      Matter.Engine.update(engine, ms === undefined ? 1000 / 60 : ms);
      for (const piece of pieces.values()) {
        if (piece.fallen) continue;
        const { x, y } = piece.body.position;
        if (y > H + 200 || x < -300 || x > W + 300) {
          piece.fallen = true;
          World.remove(world, piece.body);
        }
      }
      if ([...pieces.values()].every((p) => p.fallen)) status = "won";
    }

    function snapshot() {
      return {
        status,
        selected,
        tray: tray.slice(),
        pieces: [...pieces.values()].map((p) => ({
          id: p.id,
          kind: p.kind,
          w: p.w,
          h: p.h,
          x: p.body.position.x,
          y: p.body.position.y,
          angle: p.body.angle,
          fallen: p.fallen,
        })),
        holes: [...holes.values()].map((h) => ({ id: h.id, x: h.x, y: h.y, screw: h.screw })),
        screws: [...screws.values()].map((s) => ({ id: s.id, pinned: !!s.pinned, hole: s.hole, slot: s.slot })),
      };
    }

    return {
      W,
      H,
      tray: def.tray,
      tapScrew,
      tapHole,
      step,
      snapshot,
      get status() {
        return status;
      },
    };
  }

  const api = { createGame };
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.ScrewGame = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
