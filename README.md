# Mango Gulail: Rooftop Challenge

A side-view, Indian-inspired slingshot physics game with Snowy Village, Desert Village and Jungle Canopy chapters. Choose a chapter with the theme button; each saves its unlocked levels separately in the browser.

## How to play

Pull the stone or mango back from the sling and release. Clear every structural piece and bird or frog below the height of its own original rooftop. Fixed bases and bomb casings do not count. Falling pieces remain physical, and an incomplete collapse does not win the level.

- Snow levels 1–14: three stones, no bomb. Levels 15–30: five stones and an optional bomb.
- Desert levels 31–60: seven stones and an optional bomb.
- Jungle levels 61–90: seven mangoes and two swinging bombs.

A direct bomb hit drops it; hitting the rope releases it with its swinging momentum. The bomb explodes after falling. There is no bomb-use or shot-count victory gate. Jungle block-to-fixed-base friction is reduced by 30% relative to Matter's normal contact coefficient; other contact types are unchanged. Desert water jars spill on a hard impact and temporarily reduce nearby block friction.

Rooftops are fixed, separated and rise towards the right. Jungle levels use varied physical structures; levels 75 and 79 include taller open-frame towers, and levels 82, 85, 88 and 90 have four bases. Use the restart, level selector and sound controls as needed. Mouse and touch are supported.

## Run locally

```sh
npm install
npm run dev
```

```sh
npm run build
npm run preview
```

## Tests and reconstruction note

This version is an **approximate reconstruction** of the game before the later chain-reaction artwork, tower rollout and mango-on-impact changes. No exact snapshot of that earlier state was available. Some structure dimensions and placements were inferred, so earlier gameplay and balance cannot be guaranteed. The historical research and test notes in [jungle level design](docs/jungle-level-design.md) describe earlier versions, not proof that this reconstruction has the same results. Real player testing and further balance validation are needed.

Run `npm run test:physics` for the jungle friction regression. With the development server running and Chromium or Chrome installed, run:

```sh
CHROME_PATH=/path/to/chromium npm run test:browser
CHROME_PATH=/path/to/chromium npm run test:reachability
CHROME_PATH=/path/to/chromium npm run test:playthroughs
```

The browser tests exercise layout stability, controls, bombs, clearance, progress and mobile behavior. The reachability test isolates targets and does not establish full-level solvability. The playthrough search uses real pointer shots and is finite: failure to find a win does not prove that a level is impossible, and a found win does not prove it requires a particular number of shots.

### Reconstruction validation

The production build, friction regression, browser smoke suite and isolated reachability checks pass. A real-pointer search found bomb-assisted wins for all 30 jungle levels (a 40-attempt sweep found 28; focused retries found levels 69 and 82) and bomb-free wins for all 30 desert levels in a 12-attempt sweep. For snow, the 12-attempt sweep found 27 wins; focused retries also found wins for levels 10 and 14. **Level 12 remains unverified:** the focused search left one piece after up to 150 attempts. That is not proof it cannot be completed. The search results are not a substitute for human playtesting.
