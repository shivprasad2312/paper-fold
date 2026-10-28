import { ALL_COLORS } from './game.js';

// Character identity and team color are deliberately independent: two players
// can use the same character without sharing their collar/shirt or team marker.
export const CHARACTERS = [
  { id: 'aarav', name: 'Aarav', description: 'The explorer', category: 'family', kind: 'child', style: 'yellow' },
  { id: 'diya', name: 'Diya', description: 'The dreamer', category: 'family', kind: 'child', style: 'red' },
  { id: 'tara', name: 'Tara', description: 'The adventurer', category: 'family', kind: 'child', style: 'blue' },
  { id: 'kabir', name: 'Kabir', description: 'The little captain', category: 'family', kind: 'child', style: 'green' },
  { id: 'grandma', name: 'Grandma', description: 'A little wisdom', category: 'family', kind: 'elder', style: 'grandma' },
  { id: 'grandpa', name: 'Grandpa', description: 'A gentle guide', category: 'family', kind: 'elder', style: 'grandpa' },
  { id: 'skater', name: 'Skater', description: 'Aarav on skates', category: 'adventure', kind: 'child', style: 'yellow', ride: 'skates' },
  { id: 'cyclist', name: 'Cyclist', description: 'Tara on a bicycle', category: 'adventure', kind: 'child', style: 'blue', ride: 'bike' },
  { id: 'dog', name: 'Dog', description: 'The loyal friend', category: 'animals', kind: 'animal' },
  { id: 'cat', name: 'Cat', description: 'The curious one', category: 'animals', kind: 'animal' },
  { id: 'lion', name: 'Lion', description: 'The gentle roar', category: 'animals', kind: 'animal' },
  { id: 'horse', name: 'Horse', description: 'The happy trotter', category: 'animals', kind: 'animal' },
  { id: 'elephant', name: 'Elephant', description: 'The gentle giant', category: 'animals', kind: 'animal' },
  { id: 'parrot', name: 'Parrot', description: 'The colorful chatterbox', category: 'animals', kind: 'bird' },
];
export const CHARACTER_BY_ID = Object.fromEntries(CHARACTERS.map((character) => [character.id, character]));
export const DEFAULT_CHARACTERS = { yellow: 'aarav', red: 'diya', blue: 'tara', green: 'kabir', purple: 'grandpa', orange: 'grandma' };
export const CHARACTER_STORAGE_KEY = 'ludo-club-characters-v1';
export const TEAM_SYMBOLS = { yellow: '●', red: '▲', blue: '◆', green: '✿', purple: '✦', orange: '⬟' };

// Older saves have no selection; invalid or partially written preferences are
// recovered per team without resetting the game itself.
export function normalizeCharacterChoices(value) {
  return Object.fromEntries(ALL_COLORS.map((color) => [color,
    typeof value?.[color] === 'string' && Object.hasOwn(CHARACTER_BY_ID, value[color])
      ? value[color] : DEFAULT_CHARACTERS[color],
  ]));
}

export function characterImage(id, color) {
  const character = CHARACTER_BY_ID[id] || CHARACTER_BY_ID[DEFAULT_CHARACTERS[color]];
  return `/assets/characters/${character.id}-${color}.webp`;
}
