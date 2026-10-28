/** Pure rules and board coordinates for the local four-player game. */
export const COLORS = ['yellow', 'red', 'blue', 'green'];

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

export const FINISH = 56;
export const STORAGE_KEY = 'ludo-club-game-v1';

export function createGame() {
  return {
    version: 1,
    current: 'yellow',
    pieces: Object.fromEntries(COLORS.map((color) => [color, [-1, -1, -1, -1]])),
    phase: 'roll',
    roll: null,
    lastRollBy: null,
    sixes: 0,
    legal: [],
    winner: null,
    turns: 0,
    message: 'Roll a 6 to bring your first character out!',
    history: ['A new game has begun. Good luck!'],
  };
}

export function isValidGame(game) {
  const shapeIsValid = Boolean(
    game && game.version === 1 && COLORS.includes(game.current) &&
    ['roll', 'choose', 'won'].includes(game.phase) &&
    (game.roll === null || (Number.isInteger(game.roll) && game.roll >= 1 && game.roll <= 6)) &&
    (game.lastRollBy === null || COLORS.includes(game.lastRollBy)) &&
    COLORS.every((color) => Array.isArray(game.pieces?.[color]) && game.pieces[color].length === 4 &&
      game.pieces[color].every((p) => Number.isInteger(p) && p >= -1 && p <= FINISH)) &&
    Array.isArray(game.legal) && game.legal.every((i) => Number.isInteger(i) && i >= 0 && i < 4) &&
    Array.isArray(game.history) && game.history.every((entry) => typeof entry === 'string') &&
    typeof game.message === 'string' &&
    Number.isInteger(game.sixes) && game.sixes >= 0 && game.sixes <= 2 &&
    Number.isInteger(game.turns) && game.turns >= 0 &&
    (game.winner === null || COLORS.includes(game.winner))
  );
  if (!shapeIsValid || (game.roll === null) !== (game.lastRollBy === null)) return false;
  if (game.phase === 'won') {
    return game.winner === game.current && game.legal.length === 0 &&
      game.pieces[game.winner].every((piece) => piece === FINISH);
  }
  if (game.winner !== null) return false;
  if (game.phase === 'roll') return game.legal.length === 0;
  if (game.roll === null || game.lastRollBy !== game.current) return false;
  const expected = legalMoves(game.pieces[game.current], game.roll);
  return expected.length > 0 && game.legal.length === expected.length &&
    expected.every((index, position) => game.legal[position] === index);
}

export function nextColor(color) {
  return COLORS[(COLORS.indexOf(color) + 1) % COLORS.length];
}

export function legalMoves(pieces, die) {
  return pieces.flatMap((progress, index) => {
    if ((progress === -1 && die === 6) || (progress >= 0 && progress < FINISH && progress + die <= FINISH)) {
      return [index];
    }
    return [];
  });
}

function addHistory(history, text) {
  return [text, ...history].slice(0, 4);
}

export function rollDice(game, die) {
  if (game.phase !== 'roll' || !Number.isInteger(die) || die < 1 || die > 6) return game;
  const color = game.current;
  const name = PLAYERS[color].name;
  const common = { ...game, roll: die, lastRollBy: color, turns: game.turns + 1 };

  // A third six in a row forfeits the turn before a piece is moved.
  if (die === 6 && game.sixes === 2) {
    const next = nextColor(color);
    return {
      ...common, current: next, sixes: 0, legal: [], phase: 'roll',
      message: `Three 6s in a row! ${PLAYERS[next].name} is up next.`,
      history: addHistory(game.history, `${name} rolled three 6s. Turn passed.`),
    };
  }

  const legal = legalMoves(game.pieces[color], die);
  if (legal.length === 0) {
    const next = nextColor(color);
    return {
      ...common, current: next, sixes: 0, legal: [], phase: 'roll',
      message: `${name} rolled a ${die}. No move this time — ${PLAYERS[next].name} is up!`,
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
  const name = PLAYERS[color].name;
  const previous = game.pieces[color][index];
  const progress = previous === -1 ? 0 : previous + game.roll;
  const pieces = Object.fromEntries(COLORS.map((c) => [c, [...game.pieces[c]]]));
  pieces[color][index] = progress;

  let captured = 0;
  if (progress <= 50) {
    const trackIndex = (PLAYERS[color].start + progress) % TRACK.length;
    if (!SAFE_INDEXES.has(trackIndex)) {
      for (const opponent of COLORS.filter((c) => c !== color)) {
        pieces[opponent] = pieces[opponent].map((p) => {
          if (p >= 0 && p <= 50 && (PLAYERS[opponent].start + p) % TRACK.length === trackIndex) {
            captured += 1;
            return -1;
          }
          return p;
        });
      }
    }
  }

  const won = pieces[color].every((p) => p === FINISH);
  let event = previous === -1 ? `${name} brought a character out.`
    : progress === FINISH ? `${name} brought a character home!`
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
  const next = extraTurn ? color : nextColor(color);
  return {
    ...game, pieces, current: next, phase: 'roll', legal: [],
    sixes: extraTurn ? game.sixes : 0,
    message: extraTurn ? 'You rolled a 6, so you get another turn!' :
      captured ? `${name} made a capture! ${PLAYERS[next].name} is up next.` :
        progress === FINISH ? `${name} made it home! ${PLAYERS[next].name} is up next.` :
          `${PLAYERS[next].name}, it's your turn to roll!`,
    history: addHistory(game.history, event),
  };
}

// Returns the centre of a piece on the 15x15 grid, in grid units.
export function piecePosition(color, index, progress) {
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

export function randomRoll() {
  if (globalThis.crypto?.getRandomValues) {
    const value = new Uint8Array(1);
    do { globalThis.crypto.getRandomValues(value); } while (value[0] >= 252);
    return (value[0] % 6) + 1;
  }
  return Math.floor(Math.random() * 6) + 1;
}
