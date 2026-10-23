# Paper Fold

A cosy fruit-merging game made of paper. Drop fruit into the jar, fold two of a
kind into the next fruit, and keep the pile below the limit line.

Built with vanilla JavaScript, Canvas 2D and [Matter.js](https://brm.io/matter-js/)
for the physics. Every fruit, label and texture is drawn procedurally at runtime —
there are no image or audio files in the repo.

## Play

```bash
npm install
npm run dev      # http://localhost:5173
```

```bash
npm run build    # static build in dist/
npm run preview  # serve the build
npm test         # game logic tests (node:test, no browser needed)
```

## How it works

- **Drop** — tap/click the jar, or use `←` `→` and `space`. The fruit hangs from a
  thread at the top and shows a dashed landing marker.
- **Fold** — two fruits of the same size become the next fruit in the chain.
  Cherry → grape → tangerine → lemon → kiwi → peach → apple → pear → pineapple →
  melon → watermelon.
- **Combos** — folds within 0.85 s of each other stack a multiplier (up to ×8).
  Points per fold: cherry 5, then 10, 20, 35, 55, 80, 120, 170, 230, 300, 400.
- **Limit line** — a settled fruit resting above the dashed line for ~1.2 s ends
  the run. Movement buys you time.
- Best score lives in `localStorage`.

### Files

| Path | Purpose |
| --- | --- |
| `src/game.js` | Physics world, folding rules, scoring, danger + game-over logic |
| `src/renderer.js` | Canvas layout (world → jar mapping), HUD, juice |
| `src/art.js` | Procedural paper-craft sprites, page texture, typography helpers |
| `src/fruits.js` | The eleven fruits: size, palette, silhouette, surface detail |
| `src/audio.js` | Synthesised sound effects (WebAudio, no assets) |
| `src/main.js` | DOM shell, input, overlay screens |
| `src/styles.css` | Paper card UI |

## Development tooling

`tools/` holds two scripts that helped while building this. They need extra
dev dependencies that aren't required to run the game:

```bash
npm i --no-save @napi-rs/canvas jsdom esbuild

node tools/preview.mjs          # renders preview-*.png straight from the canvas
W=360 H=640 TAG=-small node tools/preview.mjs
node tools/dom-smoke.mjs        # boots the real bundle in jsdom and plays it
```

`preview.mjs` renders the game's own `Renderer` offscreen, which is handy for
eyeballing art changes without a browser.

## Notes

- Mobile-first: the layout recomputes the jar from the viewport on resize, and
  the physics world is fixed-size, so behaviour is identical on every screen.
- Physics is stepped in ≤16.6 ms slices, so slow frames never make the pile
  deform or tunnel through the jar walls.
- `prefers-reduced-motion` is respected for UI animation.
