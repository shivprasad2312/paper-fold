# Ludo Club

A local Ludo game inspired by the reference board: pass-and-play for two to six players, or solo against one to three computer opponents. A responsive lobby and player setup lead into the animated game, with progress and character choices saved in the current browser.

## Run locally

Requires Node.js 20 or later.

```sh
npm ci
npm run dev
```

Open the URL printed by Vite. `npm run build` creates a production build, including its offline cache, and `npm run preview` serves it. Run the rules, board, character, animation and offline-build unit tests with `npm test`. For browser tests, install Playwright Chromium with `npx playwright install chromium`, then run `npm run test:e2e` and `npm run test:e2e:offline`. The offline suite builds and serves the production app on port 5175. The development server defaults to port 5174, separate from a production preview, to avoid an installed service worker serving cached production files to Vite's development server.

## How to play

- On the home screen, choose **With friends** for two to six players sharing a device, or **Computer** for one person against one, two or three computers (two to four total players). Select **Play**, or choose **Resume** to continue a saved game. The existing save is not replaced until a new game actually starts.
- On the setup screen, select each player and choose a character and color. Players can choose the same character, but colors are unique: selecting an occupied color swaps it with the other player. Every player's four pieces wear that player's color. Select **Start game** when the crew is ready.
- Two to four players use the original cross-shaped Classic board. Two players sit opposite one another; unused corners in two- and three-player games are neutral. Five and six have separate, symmetric radial boards with one yard and home lane per player. Within each board, all players travel the same number of spaces before reaching their home lane.
- Take turns in the order shown during setup. In solo play, you go first and computers roll and move automatically; in pass-and-play, share the device. Computers use the same dice and rules, considering captures, safety, progress and possible follow-up rolls when choosing moves. **Choose characters** above the board lets a player change any team's character without resetting the game. The collection includes four children, two grandparents, a skater, a cyclist and six animal friends. A rematch retains the mode, player count, colors and characters.
- Roll a **6** to bring a character out of its yard. If none of your characters are on the board, the first one comes out automatically. When exactly one is on the board and can move, it moves automatically unless you roll a 6. If you roll a 6 with a character already on the board, or have multiple active characters, select a character with a glowing halo. The large numbered move buttons match the numbers above legal characters, making overlapping or closely spaced pieces easier to select. Every 6 earns another roll, including consecutive 6s.
- Travel clockwise around the board and into your color's home lane. Landing on an opponent sends them back to their yard, except on a starting square or a starred safe square.
- Roll the exact number needed to enter the center. The first player to bring all four characters home wins.
- All characters follow the same rules and face their route. They move from space to space and celebrate when reaching the center; captured characters show a sad expression and walk back along their own route, square by square, to their yard. On the final win, the other teams react before the winner is announced. Team-colored clothing or collars distinguish pieces even when teams select the same character.

Animation respects the system's **reduced motion** setting, and important reactions are also announced in the status message. Dice results are saved when rolled. A selected move, including a computer's move, is recorded before its animation and committed when it finishes; after a refresh the recorded move is recovered once, and returning from Home resumes it. Animations and computer actions pause when a dialog is open or the page is backgrounded. The game remains playable if browser storage is blocked, but cannot retain progress between sessions in that case. Setup is non-destructive until **Start game** is selected. Older saved games remain pass-and-play, and those without a player count or custom colors continue with their original four-player Classic layout; older character selections retain their existing choices.

Both modes run locally: neither needs an account or online matchmaking. Animated figures use WebGL internally; the board and controls remain usable if WebGL or the character module fails. In that case, team-colored static character images and text reactions are used, with an option to retry.

## Offline play and saves

- Offline play is available in a production build on **HTTPS** or localhost in a browser that supports service workers. The first visit needs a connection: leave the game open until the home screen says **Ready to play offline**. The game, fonts, animated-character module and all fallback portraits are then cached on the device.
- After preparation, the game can be opened, played, refreshed and resumed without a network connection. The development server deliberately does not enable offline caching; use `npm run build && npm run preview` to test it.
- Saves and character selections stay in that browser's local storage, tied to the same site address. They do not sync between devices or different preview URLs. Clearing site data, using temporary/private browsing, storage restrictions or browser eviction can remove them; the game warns if it cannot write saves. This is not a backup or a guarantee against data loss.
- Updates download in the background but do not interrupt a game. When the home screen reports an update is ready, close all tabs for this game and reopen it to use the new version. An incomplete update leaves the previous offline version in place. If cached files are evicted, reconnect and reload the game so they can be prepared again.

## Character artwork

The character rigs are original procedural Three.js models. Their static picker and fallback images in `public/assets/characters` are rendered from the same rigs, including all six team colors. To regenerate them after changing a rig, install Playwright Chromium and run `npm run portraits` (or set `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` to a compatible Chromium executable). Pass team names, e.g. `npm run portraits -- purple orange`, to render only those teams. This development-only command does not run in the game.
