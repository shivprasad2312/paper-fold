# Ludo Club

A four-player, pass-and-play Ludo game inspired by the reference board. The classic board and the draggable **3D view** share four articulated Three.js character designs. Games are saved in the current browser, so a refresh won't lose your turn.

## Run locally

Requires Node.js 20 or later.

```sh
npm ci
npm run dev
```

Open the URL printed by Vite. To make a production build, run `npm run build`; `npm run preview` serves that build. Run the rules and animation unit tests with `npm test`. For browser tests, install Playwright Chromium with `npx playwright install chromium`, then run `npm run test:e2e`. The tests start a separate development server on port 5174.

## How to play

- Four people take turns on the same device. Yellow goes first, followed by red, blue, and green.
- Roll a **6** to bring a character out of its yard. Select a glowing character to move it. A 6 earns another roll; three consecutive 6s end the turn.
- Travel clockwise around the board and into your color's home lane. Landing on an opponent sends them back to their yard, except on a starting square or a starred safe square.
- Roll the exact number needed to enter the center. The first player to bring all four characters home wins.
- The 3D view supports dragging to rotate and selecting pieces by tapping them. The numbered controls above the 3D board offer a keyboard-accessible alternative.
- Characters turn along their route and walk from space to space. They dance when reaching the center; captured characters show a sad expression and walk back to their yard. On the final win, the other teams react before the winner is announced.

Animation respects the system's **reduced motion** setting, and important reactions are also announced in the status message. A move is saved after its animation completes; if the page is refreshed during an animation, select the character again to replay that move. Resetting cancels any pending animation.

The game is local multiplayer only: it does not need an account or server, and it does not include online matchmaking or computer opponents. Animated characters and the 3D view require WebGL. If it is unavailable, the classic board remains playable using the original character images and text reactions. A failed graphics or character-module load falls back to the classic pieces and offers a retry; a failed 3D view offers a return to Classic without clearing your saved game.
