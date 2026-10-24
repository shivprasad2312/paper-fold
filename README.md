# Fluffy Merge

A soft, cheerful Suika-style game about fuzzy animal friends. Drop a pal into
the cuddle jar, merge two matching buddies into a bigger one, and build a whole
collection—from tiny Bunbun to legendary Starlight.

Built with vanilla JavaScript, Canvas 2D and Matter.js. Character sprites are
procedurally drawn with plush shading, cheeky faces and fine fur strokes. In play,
pals blink, glance toward the pointer, wobble on landing and celebrate nearby
merges. The home screen features a custom AI-generated bunny portrait.

## Run locally

```bash
npm install
npm run dev       # http://localhost:5173
npm test          # gameplay logic and deterministic-seed tests
npm run smoke     # DOM and canvas-shim screen-flow smoke test
npm run build     # production bundle in dist/
npm run preview
```

## What’s in the game

- **11 fuzzy friends:** Bunbun, Peep, Momo, Puddle, Poppy, Twickle, Foxy, Panda,
  Lamby, Sprout and Starlight. Each has its own silhouette, palette and face.
- **Merge physics:** two matching pals become the next buddy. Combo chains,
  score and a cloud danger line keep the pile lively.
- **Cuddle Trail:** 12 levels with score, pal-making, merge-combo and tier goals.
  Clear goals to unlock levels and earn replay-safe stars and coins.
- **Pal Neighborhood:** decorate Cloud Island, Forest Nook and Moonlit Den with
  coins and stars earned in play.
- **Weekly Puzzle:** a shared, week-seeded pal sequence and goal for everyone.
  Replays are always allowed and only the first clear earns the weekly reward.
- **Pal Passport:** discover each friend's personality, habitat, merge count and
  first-met milestone.
- **Daily snuggles:** a seven-day reward track for coins, stars and surprises,
  saved locally in the browser.
- **Touch, pointer and keyboard controls**, sound toggle and optional haptics.

Progress is stored in browser `localStorage`; no account or server is needed.

## Source map

- `src/game.js` — Matter.js physics, seeded spawn randomness, scoring and danger logic.
- `src/content.js` — level goals, habitats, pal profiles and weekly puzzle data.
- `src/fruits.js` — pal roster, sizes, colors and progression order.
- `src/art.js` — cached fluffy character sprites and playroom background.
- `src/renderer.js` — gameplay canvas, plush reactions and merge effects.
- `src/main.js` — screen flow, goals, local progression, rewards and input.
- `src/styles.css` — responsive plush-toy UI.
- `public/fluffy-bunny.png` — home-screen character portrait.
- `tests/game.test.mjs` — gameplay logic tests.
- `tools/dom-smoke.mjs` — DOM-level flow coverage for new and existing screens.
