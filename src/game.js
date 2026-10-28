/** Pure rules and board coordinates for local two- to six-player Ludo. */
import { ALL_COLORS, MODE_COLORS, PLAYER_COUNTS, getRadialBoard } from './boards.js';
export { ALL_COLORS } from './boards.js';
// Kept as the classic order for compatibility with existing four-player saves.
export const COLORS = MODE_COLORS[4];

export const PLAYERS = {
  yellow: {
    id: 'yellow', name: 'Yellow', label: 'Player 1', start: 1,
    home: [0, 0], lane: [[7, 1], [7, 2], [7, 3], [7, 4], [7, 5]],
    hex: '#f6bf38', light: '#fff2c8', dark: '#d99417',
    image: '/assets/yellow-player-cutout.webp',
  },
  red: {
    id: 'red', name: 'Red', label: 'Player 2', start: 14,
    home: [0, 9], lane: [[1, 7], [2, 7], [3, 7], [4, 7], [5, 7]],
    hex: '#ef7068', light: '#ffe4df', dark: '#d95450',
    image: '/assets/red-player-cutout.webp',
  },
  blue: {
    id: 'blue', name: 'Blue', label: 'Player 3', start: 27,
    home: [9, 9], lane: [[7, 13], [7, 12], [7, 11], [7, 10], [7, 9]],
    hex: '#55c2cf', light: '#dff7f7', dark: '#329eae',
    image: '/assets/blue-player-cutout.webp',
  },
  green: {
    id: 'green', name: 'Green', label: 'Player 4', start: 40,
    home: [9, 0], lane: [[13, 7], [12, 7], [11, 7], [10, 7], [9, 7]],
    hex: '#62c987', light: '#e1f6e5', dark: '#41a965',
    image: '/assets/green-player-cutout.webp',
  },
  purple: {
    id: 'purple', name: 'Purple', label: 'Player 5',
    hex: '#ad8cd9', light: '#f1e8fb', dark: '#8160b5',
    image: '/assets/purple-player-cutout.webp',
  },
  orange: {
    id: 'orange', name: 'Orange', label: 'Player 6',
    hex: '#efa65f', light: '#fff0dd', dark: '#c87c36',
    image: '/assets/orange-player-cutout.webp',
  },
};

// Clockwise around the cross. Each coordinate is [row, column].
export const TRACK = [
  ...Array.from({ length: 6 }, (_, c) => [6, c]),
  ...Array.from({ length: 6 }, (_, n) => [5 - n, 6]),
  [0, 7], [0, 8],
  ...Array.from({ length: 5 }, (_, n) => [1 + n, 8]),
  ...Array.from({ length: 6 }, (_, n) => [6, 9 + n]),
  [7, 14], [8, 14],
  ...Array.from({ length: 5 }, (_, n) => [8, 13 - n]),
  ...Array.from({ length: 6 }, (_, n) => [9 + n, 8]),
  [14, 7], [14, 6],
  ...Array.from({ length: 5 }, (_, n) => [13 - n, 6]),
  ...Array.from({ length: 6 }, (_, n) => [8, 5 - n]),
  [7, 0],
];

export const SAFE_INDEXES = new Set(COLORS.flatMap((color) => {
  const start = PLAYERS[color].start;
  return [start, (start + 8) % TRACK.length];
}));

export const FINISH = 56; // Legacy/classic finish index.
export const STORAGE_KEY = 'ludo-club-game-v1';

export function playerCountFor(game) { return game?.playerCount === undefined ? 4 : game.playerCount; }
export function colorsFor(playerCount = 4) { return MODE_COLORS[playerCount] || COLORS; }
export function trackLengthFor(playerCount = 4) { return getRadialBoard(playerCount)?.track.length ?? TRACK.length; }
export function finishFor(playerCount = 4) { return trackLengthFor(playerCount) + 4; }
export function startFor(color, playerCount = 4) { return getRadialBoard(playerCount)?.starts[color] ?? PLAYERS[color].start; }
export function safeIndexesFor(playerCount = 4) { return getRadialBoard(playerCount)?.safeIndexes ?? SAFE_INDEXES; }

// Logical seats own routes and game state. A player's chosen display color is
// independent of that seat so changing colors cannot change the board rules.
export function teamColorFor(game, seat) { return game?.teamColors?.[seat] ?? seat; }

// Older games without a mode remain local pass-and-play. In solo mode the
// first logical seat belongs to the person; all remaining seats are computers.
export function gameModeFor(game) { return game?.mode === 'computer' ? 'computer' : 'local'; }
export function isComputerPlayer(game, seat) {
  return gameModeFor(game) === 'computer' && colorsFor(playerCountFor(game)).slice(1).includes(seat);
}

export function validTeamColors(playerCount, teamColors) {
  if (!teamColors || typeof teamColors !== 'object' || Array.isArray(teamColors)) return false;
  const seats = colorsFor(playerCount);
  const values = seats.map((seat) => teamColors[seat]);
  return Object.keys(teamColors).length === seats.length &&
    values.every((color) => ALL_COLORS.includes(color)) && new Set(values).size === seats.length;
}

export function createGame(requestedCount = 4, teamColors, mode = 'local') {
  const playerCount = PLAYER_COUNTS.includes(requestedCount) ? requestedCount : 4;
  if (teamColors !== undefined && !validTeamColors(playerCount, teamColors)) {
    throw new Error('Each player must have a different valid color.');
  }
  if (!['local', 'computer'].includes(mode) || (mode === 'computer' && ![2, 3, 4].includes(requestedCount))) {
    throw new Error('Computer games use the classic board with two to four players.');
  }
  return {
    version: 1,
    playerCount,
    ...(mode === 'computer' ? { mode } : {}),
    ...(teamColors === undefined ? {} : { teamColors: { ...teamColors } }),
    current: colorsFor(playerCount)[0],
    pieces: Object.fromEntries(colorsFor(playerCount).map((color) => [color, [-1, -1, -1, -1]])),
    phase: 'roll',
    roll: null,
    lastRollBy: null,
    sixes: 0,
    rollsWithoutSix: Object.fromEntries(colorsFor(playerCount).map((color) => [color, 0])),
    legal: [],
    winner: null,
    turns: 0,
    message: 'Roll a 6 to bring your first character out!',
    history: ['A new game has begun. Good luck!'],
  };
}

export function isValidGame(game) {
  const playerCount = playerCountFor(game);
  if (!PLAYER_COUNTS.includes(playerCount)) return false;
  const colors = colorsFor(playerCount);
  const finish = finishFor(playerCount);
  const shapeIsValid = Boolean(
    game && game.version === 1 && colors.includes(game.current) &&
    (game.mode === undefined || game.mode === 'local' || (game.mode === 'computer' && [2, 3, 4].includes(game.playerCount))) &&
    (game.teamColors === undefined || validTeamColors(playerCount, game.teamColors)) &&
    ['roll', 'choose', 'won'].includes(game.phase) &&
    (game.roll === null || (Number.isInteger(game.roll) && game.roll >= 1 && game.roll <= 6)) &&
    (game.lastRollBy === null || colors.includes(game.lastRollBy)) &&
    colors.every((color) => Array.isArray(game.pieces?.[color]) && game.pieces[color].length === 4 &&
      game.pieces[color].every((p) => Number.isInteger(p) && p >= -1 && p <= finish)) &&
    Array.isArray(game.legal) && game.legal.every((i) => Number.isInteger(i) && i >= 0 && i < 4) &&
    Array.isArray(game.history) && game.history.every((entry) => typeof entry === 'string') &&
    typeof game.message === 'string' &&
    Number.isSafeInteger(game.sixes) && game.sixes >= 0 &&
    // The counter was added after the original saves; absent means all zero.
    (game.rollsWithoutSix === undefined || (game.rollsWithoutSix !== null &&
      typeof game.rollsWithoutSix === 'object' && !Array.isArray(game.rollsWithoutSix) &&
      colors.every((color) => Number.isSafeInteger(game.rollsWithoutSix[color]) && game.rollsWithoutSix[color] >= 0))) &&
    Number.isInteger(game.turns) && game.turns >= 0 &&
    (game.winner === null || colors.includes(game.winner))
  );
  if (!shapeIsValid || (game.roll === null) !== (game.lastRollBy === null)) return false;
  if (game.phase === 'won') {
    return game.winner === game.current && game.legal.length === 0 &&
      game.pieces[game.winner].every((piece) => piece === finish);
  }
  if (game.winner !== null) return false;
  if (game.phase === 'roll') return game.legal.length === 0;
  if (game.roll === null || game.lastRollBy !== game.current) return false;
  const expected = legalMoves(game.pieces[game.current], game.roll, finish);
  return expected.length > 0 && game.legal.length === expected.length &&
    expected.every((index, position) => game.legal[position] === index);
}

export function nextColor(color, playerCount = 4) {
  const colors = colorsFor(playerCount);
  return colors[(colors.indexOf(color) + 1) % colors.length];
}

export function legalMoves(pieces, die, finish = FINISH) {
  return pieces.flatMap((progress, index) => {
    if ((progress === -1 && die === 6) || (progress >= 0 && progress < finish && progress + die <= finish)) {
      return [index];
    }
    return [];
  });
}

/** Choose only the automatic moves requested for a pass-and-play turn.
 * Finished pieces are no longer on the board; an unplayable active piece is
 * never moved. A six requires a choice if any piece is already on the board.
 */
export function automaticMove(game) {
  if (game.phase !== 'choose') return null;
  const pieces = game.pieces[game.current];
  const finish = finishFor(playerCountFor(game));
  const active = pieces.flatMap((progress, index) => progress >= 0 && progress < finish ? [index] : []);
  if (active.length === 0 && game.roll === 6) {
    return game.legal.find((index) => pieces[index] === -1) ?? null;
  }
  if (game.roll !== 6 && active.length === 1 && game.legal.includes(active[0])) return active[0];
  return null;
}

function addHistory(history, text) {
  return [text, ...history].slice(0, 4);
}

export function rollDice(game, die) {
  if (game.phase !== 'roll' || !Number.isInteger(die) || die < 1 || die > 6) return game;
  const color = game.current;
  const playerCount = playerCountFor(game);
  const name = PLAYERS[teamColorFor(game, color)].name;
  // Count each player's rolls independently, even while their pieces are out.
  // Older games are initialized lazily without disturbing their saved pieces.
  const rollsWithoutSix = Object.fromEntries(colorsFor(playerCount).map((team) => [team, game.rollsWithoutSix?.[team] ?? 0]));
  rollsWithoutSix[color] = die === 6 ? 0 : rollsWithoutSix[color] + 1;
  const common = { ...game, roll: die, lastRollBy: color, turns: game.turns + 1, rollsWithoutSix };

  const legal = legalMoves(game.pieces[color], die, finishFor(playerCount));
  if (legal.length === 0) {
    // Every six grants another roll, even when the exact-roll rule prevents a move.
    if (die === 6) {
      return {
        ...common, current: color, sixes: game.sixes + 1, legal: [], phase: 'roll',
        message: 'No character can use that 6, but you get another roll!',
        history: addHistory(game.history, `${name} rolled 6. No moves available; roll again.`),
      };
    }
    const next = nextColor(color, playerCount);
    return {
      ...common, current: next, sixes: 0, legal: [], phase: 'roll',
      message: `${name} rolled a ${die}. No move this time — ${PLAYERS[teamColorFor(game, next)].name} is up!`,
      history: addHistory(game.history, `${name} rolled ${die}. No moves available.`),
    };
  }

  return {
    ...common, phase: 'choose', legal,
    sixes: die === 6 ? game.sixes + 1 : 0,
    message: die === 6 && game.pieces[color].some((piece) => piece === -1)
      ? 'Nice roll! Choose a glowing character to move.'
      : `You rolled a ${die}! Choose a glowing character to move.`,
    history: addHistory(game.history, `${name} rolled a ${die}.`),
  };
}

export function movePiece(game, index) {
  if (game.phase !== 'choose' || !game.legal.includes(index)) return game;
  const color = game.current;
  const playerCount = playerCountFor(game);
  const colors = colorsFor(playerCount);
  const finish = finishFor(playerCount);
  const trackLength = trackLengthFor(playerCount);
  const name = PLAYERS[teamColorFor(game, color)].name;
  const previous = game.pieces[color][index];
  const progress = previous === -1 ? 0 : previous + game.roll;
  const pieces = Object.fromEntries(colors.map((c) => [c, [...game.pieces[c]]]));
  pieces[color][index] = progress;

  let captured = 0;
  if (progress <= trackLength - 2) {
    const trackIndex = (startFor(color, playerCount) + progress) % trackLength;
    if (!safeIndexesFor(playerCount).has(trackIndex)) {
      for (const opponent of colors.filter((c) => c !== color)) {
        pieces[opponent] = pieces[opponent].map((p) => {
          if (p >= 0 && p <= trackLength - 2 && (startFor(opponent, playerCount) + p) % trackLength === trackIndex) {
            captured += 1;
            return -1;
          }
          return p;
        });
      }
    }
  }

  const won = pieces[color].every((p) => p === finish);
  let event = previous === -1 ? `${name} brought a character out.`
    : progress === finish ? `${name} brought a character home!`
      : `${name} moved ${game.roll} ${game.roll === 1 ? 'space' : 'spaces'}.`;
  if (captured) event = `${name} sent ${captured === 1 ? 'a character' : `${captured} characters`} back to the yard!`;

  if (won) {
    return {
      ...game, pieces, phase: 'won', legal: [], winner: color,
      message: `${name} brought everyone home and won the game!`,
      history: addHistory(game.history, `${name} wins the game!`),
    };
  }

  const extraTurn = game.roll === 6;
  const next = extraTurn ? color : nextColor(color, playerCount);
  return {
    ...game, pieces, current: next, phase: 'roll', legal: [],
    sixes: extraTurn ? game.sixes : 0,
    message: extraTurn ? 'You rolled a 6, so you get another turn!' :
      captured ? `${name} made a capture! ${PLAYERS[teamColorFor(game, next)].name} is up next.` :
        progress === finish ? `${name} made it home! ${PLAYERS[teamColorFor(game, next)].name} is up next.` :
          `${PLAYERS[teamColorFor(game, next)].name}, it's your turn to roll!`,
    history: addHistory(game.history, event),
  };
}

// Returns the centre of a piece on the 15x15 grid, in grid units.
export function piecePosition(color, index, progress, playerCount = 4) {
  const radial = getRadialBoard(playerCount);
  if (radial) {
    if (progress === -1) return radial.yards[color].slots[index];
    if (progress <= radial.track.length - 2) {
      const cell = radial.track[(radial.starts[color] + progress) % radial.track.length];
      return [cell.row, cell.col];
    }
    if (progress < finishFor(playerCount)) {
      const cell = radial.lanes[color][progress - (radial.track.length - 1)];
      return [cell.row, cell.col];
    }
    return radial.center;
  }
  const player = PLAYERS[color];
  if (progress === -1) {
    const [row, col] = player.home;
    const slots = [[1.75, 1.75], [1.75, 4.25], [4.25, 1.75], [4.25, 4.25]];
    return [row + slots[index][0], col + slots[index][1]];
  }
  if (progress <= 50) {
    const [row, col] = TRACK[(player.start + progress) % TRACK.length];
    return [row + 0.5, col + 0.5];
  }
  if (progress < FINISH) {
    const [row, col] = player.lane[progress - 51];
    return [row + 0.5, col + 0.5];
  }
  return [7.5, 7.5];
}

// Rejection sampling keeps every integer in [0, max) equally likely.
function randomBelow(max) {
  if (globalThis.crypto?.getRandomValues) {
    const value = new Uint8Array(1);
    const limit = Math.floor(256 / max) * max;
    do { globalThis.crypto.getRandomValues(value); } while (value[0] >= limit);
    return value[0] % max;
  }
  return Math.floor(Math.random() * max);
}

/** Generate a die result; `randomIndex` is injectable for deterministic tests. */
export function randomRoll(game, randomIndex = randomBelow) {
  const color = game?.current;
  const pieces = game?.pieces?.[color];
  const finish = finishFor(playerCountFor(game));
  const needsEntry = Array.isArray(pieces) && pieces.some((progress) => progress === -1) &&
    !pieces.some((progress) => progress >= 0 && progress < finish);
  const misses = game?.rollsWithoutSix?.[color] ?? 0;
  if (needsEntry && misses >= 6) {
    if (misses >= 9) return 6;
    // Attempts 7/8/9 have a 1/4, 1/3, 1/2 chance of a six. In the
    // remaining outcomes each of 1–5 has exactly the same probability.
    const buckets = (10 - misses) * 5;
    const value = randomIndex(buckets);
    return value < 5 ? 6 : ((value - 5) % 5) + 1;
  }
  return randomIndex(6) + 1;
}
