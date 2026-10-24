# Fluffy Merge

A soft, cheerful Suika-style game about fuzzy animal friends. Drop a pal into
the cuddle jar, merge two matching buddies into a bigger one, and build a whole
collection—from tiny Bunbun to legendary Starlight.

Built with vanilla JavaScript, Canvas 2D and Matter.js. Character sprites are
procedurally drawn with plush shading, cheeky faces and fine fur strokes. The
home screen features a custom AI-generated bunny portrait.

## Run locally

```bash
npm install
npm run dev       # http://localhost:5173
npm test          # merge + physics regression tests
npm run build     # production bundle in dist/
npm run preview
```

## What’s in the game

- **11 fuzzy friends:** Bunbun, Peep, Momo, Puddle, Poppy, Twickle, Foxy, Panda,
  Lamby, Sprout and Starlight. Each has its own silhouette, palette and face.
- **Merge physics:** two identical pals become the next buddy. Combo chains,
  score, and a cloud danger line keep the pile lively.
- **Cuddle Trail:** 12 score-goal levels. Clear a level to unlock the next and
  earn stars and coins.
- **Pal Pouch:** collection gallery showing discovered and not-yet-found pals.
- **Daily snuggles:** a seven-day reward track for coins, stars and surprises,
  saved locally in the browser.
- **Screens & popups:** home, levels, collection, daily rewards, settings,
  how-to-play, pause, level complete and game-over reward screens.
- **Touch, pointer and keyboard controls**, sound toggle and optional haptics.

Progress is stored in browser `localStorage`; no account or server is needed.

## Source map

- `src/game.js` — Matter.js physics, merge chain, scoring and danger logic.
- `src/fruits.js` — pal roster, sizes, colors and progression order.
- `src/art.js` — cached fluffy character sprites and playroom background.
- `src/renderer.js` — gameplay canvas, jar, HUD and merge effects.
- `src/main.js` — screen flow, local progression, rewards and input.
- `src/styles.css` — responsive plush-toy UI.
- `public/fluffy-bunny.png` — home-screen character portrait.
- `tests/game.test.mjs` — dependency-free Node logic tests.
