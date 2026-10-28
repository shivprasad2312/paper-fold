# Ludo Club

A local pass-and-play Ludo game for four, five or six players, inspired by the reference board. The game features animated characters, and both the game and each team's character choice are saved in the current browser.

## Run locally

Requires Node.js 20 or later.

```sh
npm ci
npm run dev
```

Open the URL printed by Vite. `npm run build` creates a production build, and `npm run preview` serves it. Run the rules, board, character and animation unit tests with `npm test`. For browser tests, install Playwright Chromium with `npx playwright install chromium`, then run `npm run test:e2e`. The tests start a separate development server on port 5174.

## How to play

- Select **New game** and choose **4**, **5** or **6 players**. Four players use the original cross-shaped Classic board; five and six have separate, symmetric radial boards with one yard and home lane per team. Choosing a new game replaces the current game but keeps character choices. A rematch uses the same number of players.
- Share one device and take turns: yellow, red, blue and green, then purple for five players and orange for six. Each team has four characters. Within each board, all teams travel the same number of spaces before reaching their home lane.
- Select **Choose characters** above the board. Pick a team and any character; all four of that team's pieces use the choice. Teams may pick the same or different characters, and changing a character does not reset the game. The collection includes four children, two grandparents, a skater, a cyclist and six animal friends.
- Roll a **6** to bring a character out of its yard. If none of your characters are on the board, the first one comes out automatically. When exactly one is on the board and can move, it moves automatically unless you roll a 6. If you roll a 6 with a character already on the board, or have multiple active characters, select a character with a glowing halo. If pieces overlap on a space, use the numbered move buttons below the board. Every 6 earns another roll, including consecutive 6s.
- Travel clockwise around the board and into your color's home lane. Landing on an opponent sends them back to their yard, except on a starting square or a starred safe square.
- Roll the exact number needed to enter the center. The first player to bring all four characters home wins.
- All characters follow the same rules and face their route. They move from space to space and celebrate when reaching the center; captured characters show a sad expression and walk back along their own route, square by square, to their yard. On the final win, the other teams react before the winner is announced. Team-colored clothing or collars distinguish pieces even when teams select the same character.

Animation respects the system's **reduced motion** setting, and important reactions are also announced in the status message. A move is saved after its animation completes; if the page is refreshed during an animation, automatic moves replay and manual choices can be selected again. Resetting cancels pending animation but retains character choices. Older saved games without a player count continue as four-player Classic games; older character selections keep their existing choices and use defaults for the added teams.

The game is local multiplayer only: it does not need an account or server, and does not include online matchmaking or computer opponents. Animated figures use WebGL internally; the board and controls remain usable if WebGL or the character module fails. In that case, team-colored static character images and text reactions are used, with an option to retry.

## Character artwork

The character rigs are original procedural Three.js models. Their static picker and fallback images in `public/assets/characters` are rendered from the same rigs, including all six team colors. To regenerate them after changing a rig, install Playwright Chromium and run `npm run portraits` (or set `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` to a compatible Chromium executable). Pass team names, e.g. `npm run portraits -- purple orange`, to render only those teams. This development-only command does not run in the game.
