/* ==========================================================================
   js/assets.js — the asset catalogue.

   Why this file exists: every solid in the game used to be drawn with the same
   artwork — a rounded box, plus an X brace if it was wood. A 240 x 18 plank, a
   100 x 180 column and a 22 x 150 post were therefore *the same picture at
   different sizes*, and because the corner radius was min(8, h / 2), a thin
   plank had its ends rounded clean off: it read shorter than the length it
   actually had. The physics never resized anything (1,316 measured solid-frames
   say so); the drawing did.

   So a solid now names its ASSET, and the asset decides two things:
     style  how it is drawn — one look per real object (plank, crate, column,
            post, rock, rubble, hay, barrel, beam, slab, mass)
     size   the canonical footprint. The same asset is the same size in every
            level; a piece that needs another length is a different asset or an
            explicit `custom`.

   Level data may set `style` explicitly. Anything without one is inferred from
   kind and aspect ratio, so old levels keep working and odd pieces get caught
   by tools/asset-audit.js instead of silently looking wrong.
   ========================================================================== */
(function (global) {
  'use strict';
  const HG = (global.HG = global.HG || {});

  // ---- the book -----------------------------------------------------------
  // An asset is a LOOK plus the one footprint it ships at. Anything that needs
  // another length is a different asset (a `ledge` is not a short `floor`) or is
  // declared custom — level structure cut to the room, not a catalogue object.
  //
  // `teal` is structural scenery: every teal box in a room is cut to that room,
  // so teal entries are canonical by name but allowed to be any length.
  const BOOK = {
    // structural (always custom length; the name only picks the look)
    floor:  { kind: 'teal',  style: 'slab',   w: 1100, h: 20,  custom: true },
    ledge:  { kind: 'teal',  style: 'slab',   w: 480,  h: 20,  custom: true },
    shelf:  { kind: 'teal',  style: 'slab',   w: 260,  h: 16,  custom: true },
    plinth: { kind: 'teal',  style: 'slab',   w: 200,  h: 40,  custom: true },
    post_teal: { kind: 'teal', style: 'slab', w: 60,   h: 150, custom: true },

    // wood — the sizes the rooms are allowed to use
    plank:  { kind: 'wood',  style: 'plank',  w: 240,  h: 18 },
    bench:  { kind: 'wood',  style: 'bench',  w: 120,  h: 60 },
    crate:  { kind: 'wood',  style: 'crate',  w: 96,   h: 96 },
    column: { kind: 'wood',  style: 'column', w: 100,  h: 180 },
    post:   { kind: 'wood',  style: 'post',   w: 22,   h: 150 },
    barrel: { kind: 'wood',  style: 'barrel', w: 76,   h: 92 },
    nub:    { kind: 'wood',  style: 'plank',  w: 60,   h: 20 },
    beam_wood: { kind: 'wood', style: 'plank', w: 260, h: 18 },

    // stone
    block:  { kind: 'stone', style: 'block',  w: 110,  h: 56 },
    pillar: { kind: 'stone', style: 'column', w: 100,  h: 180 },
    rock:   { kind: 'stone', style: 'rock',   w: 72,   h: 64 },
    rubble: { kind: 'stone', style: 'rubble', w: 56,   h: 44 },

    // metal, hay, ice
    beam:   { kind: 'metal', style: 'beam',   w: 220,  h: 20 },
    steel_post: { kind: 'metal', style: 'column', w: 100, h: 180 },
    hay:    { kind: 'sand',  style: 'hay',    w: 104,  h: 72 },
    ice:    { kind: 'ice',   style: 'ice',    w: 96,   h: 60 },
  };

  const CUSTOM_STYLES = new Set(['mass', 'slab']);
  const byKind = (kind) => Object.keys(BOOK)
    .filter((k) => BOOK[k].kind === kind)
    .map((k) => ({ key: k, ...BOOK[k] }));

  const sizeOf = (d) => ({ w: d.w || d.size || 0, h: d.h || d.size || 0 });
  const ratio = (d) => {
    const { w, h } = sizeOf(d);
    return w && h ? w / h : 1;
  };

  // ---- which look is this solid? ------------------------------------------
  function styleOf(d) {
    if (!d) return 'crate';
    if (d.style) return BOOK[d.style] ? BOOK[d.style].style : d.style;
    if (d.poly) return d.kind === 'teal' ? 'mass' : 'rock';
    const kind = d.kind || 'wood';
    const r = ratio(d);
    if (kind === 'metal') return r < 0.6 ? 'column' : 'beam';
    if (kind === 'ice') return 'ice';
    if (kind === 'sand') return 'hay';
    if (kind === 'teal') return 'slab';
    if (kind === 'stone') {
      if (r < 0.62) return 'column';            // a standing stone/pillar
      if (r > 1.8) return 'block';              // a lintel
      if (r > 1.2) return 'rock';               // a boulder (wider than tall)
      return 'column';                          // square-ish and tall reads as masonry
    }
    // wood: the aspect ratio picks the object, and each object has one art
    if (r >= 2.4) return 'plank';
    if (r <= 0.45) return 'post';
    if (r >= 0.72 && r <= 1.4) return 'crate';
    return d.h > d.w ? 'column' : 'bench';
  }

  // ---- which catalogue entry is it (or should be)? -------------------------
  // Nearest entry of the same kind and look. Ties break toward the entry whose
  // aspect ratio is closest, so a 120 x 130 block resolves to `column`, not to
  // `crate`.
  function assetOf(d) {
    const style = styleOf(d);
    const kind = d.kind || 'wood';
    const { w, h } = sizeOf(d);
    let best = null;
    for (const a of byKind(kind)) {
      if (a.style !== style) continue;
      const score = Math.abs(a.w - w) + Math.abs(a.h - h)
        + Math.abs(a.w / a.h - (h ? w / h : 1)) * 100;
      if (!best || score < best.score) best = { ...a, score };
    }
    return best;
  }

  function canonicalSize(d) {
    const a = assetOf(d);
    return a ? { w: a.w, h: a.h, key: a.key } : null;
  }

  // Is this solid the size its asset ships at? Teal structure is exempt: it is
  // cut to the room by design.
  function onModel(d, tol) {
    const t = tol == null ? 1 : tol;
    const a = assetOf(d);
    const { w, h } = sizeOf(d);
    if (!a) return { ok: false, why: 'no catalogue entry for kind ' + (d.kind || 'wood') + ' / look ' + styleOf(d) };
    if (a.custom || CUSTOM_STYLES.has(styleOf(d))) return { ok: true, why: a.key + ' (cut to the room)', key: a.key };
    const ok = Math.abs(w - a.w) <= t && Math.abs(h - a.h) <= t;
    return { ok, why: a.key + ' ships at ' + a.w + 'x' + a.h + ', this is ' + w + 'x' + h, key: a.key };
  }

  HG.Assets = { BOOK, CUSTOM: CUSTOM_STYLES, styleOf, assetOf, canonicalSize, onModel, ratio };
})(window);
