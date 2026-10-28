import { ALL_COLORS, PLAYER_COUNTS } from './boards.js';
import { CHARACTER_BY_ID, normalizeCharacterChoices } from './characters.js';
import { colorsFor, isValidGame, playerCountFor, teamColorFor } from './game.js';

/** Make an editable crew without changing the game that may already be saved. */
export function createPlayerSetup(count, characterChoices, savedGame = null) {
  const playerCount = PLAYER_COUNTS.includes(count) ? count : 4;
  const seats = colorsFor(playerCount);
  const choices = normalizeCharacterChoices(characterChoices);
  const reuseColors = isValidGame(savedGame) && playerCountFor(savedGame) === playerCount;
  return seats.map((seat, index) => ({
    seat,
    character: choices[seat],
    // Player 2 sits opposite Player 1 on the classic two-player board, but
    // gets the familiar red by default instead of the seat's internal ID.
    color: reuseColors ? teamColorFor(savedGame, seat) : ALL_COLORS[index],
  }));
}

export function isValidPlayerSetup(players) {
  if (!Array.isArray(players) || !PLAYER_COUNTS.includes(players.length)) return false;
  const seats = colorsFor(players.length);
  return players.every((player, index) => player && player.seat === seats[index] &&
    ALL_COLORS.includes(player.color) && Object.hasOwn(CHARACTER_BY_ID, player.character)) &&
    new Set(players.map((player) => player.color)).size === players.length;
}

/** Colors stay unique. Choosing an occupied color swaps it with its owner. */
export function swapPlayerColor(players, index, nextColor) {
  if (!isValidPlayerSetup(players) || !Number.isInteger(index) || !players[index] || !ALL_COLORS.includes(nextColor)) return players;
  const previousColor = players[index].color;
  if (previousColor === nextColor) return players;
  const owner = players.findIndex((player) => player.color === nextColor);
  return players.map((player, playerIndex) => {
    if (playerIndex === index) return { ...player, color: nextColor };
    if (playerIndex === owner) return { ...player, color: previousColor };
    return player;
  });
}

export function colorsFromSetup(players) {
  if (!isValidPlayerSetup(players)) throw new Error('The player setup is incomplete.');
  return Object.fromEntries(players.map(({ seat, color }) => [seat, color]));
}

export function charactersFromSetup(players, previousChoices) {
  if (!isValidPlayerSetup(players)) throw new Error('The player setup is incomplete.');
  return { ...normalizeCharacterChoices(previousChoices), ...Object.fromEntries(players.map(({ seat, character }) => [seat, character])) };
}
