/**
 * The eleven foldable fruits, smallest to largest.
 * `r` is the radius in world units. The jar is 364 units wide, so two
 * watermelons (2 x 168) only just fit side by side — like the real thing.
 */
export const FRUITS = [
  {
    key: 'cherry',
    name: 'Cherry',
    r: 16,
    base: '#e2565c',
    light: '#ff9b9f',
    dark: '#a8323c',
    leaf: '#6f9349',
    deco: 'stem',
    shape: 'cherry',
  },
  {
    key: 'grape',
    name: 'Grape',
    r: 20,
    base: '#9673cf',
    light: '#c9b1f0',
    dark: '#634696',
    leaf: '#7a9c55',
    deco: 'grapes',
    shape: 'grape',
  },
  {
    key: 'tangerine',
    name: 'Tangerine',
    r: 25,
    base: '#f19a45',
    light: '#ffc987',
    dark: '#bd6620',
    leaf: '#6f9349',
    deco: 'stem',
  },
  {
    key: 'lemon',
    name: 'Lemon',
    r: 30,
    base: '#f2cf58',
    light: '#fff0a0',
    dark: '#bd9a29',
    leaf: '#7a9c55',
    deco: 'stem',
    shape: 'lemon',
  },
  {
    key: 'kiwi',
    name: 'Kiwi',
    r: 36,
    base: '#a8c66c',
    light: '#e5f2bd',
    dark: '#759640',
    leaf: '#6f9349',
    deco: 'kiwi',
  },
  {
    key: 'peach',
    name: 'Peach',
    r: 43,
    base: '#f4a49b',
    light: '#ffd0c6',
    dark: '#c66e66',
    leaf: '#6f9349',
    deco: 'peach',
    shape: 'peach',
  },
  {
    key: 'apple',
    name: 'Apple',
    r: 50,
    base: '#dd5a4e',
    light: '#ff9a83',
    dark: '#a43930',
    leaf: '#6f9349',
    deco: 'stem',
    shape: 'apple',
    blush: 'blush',
  },
  {
    key: 'pear',
    name: 'Pear',
    r: 57,
    base: '#c1cd6c',
    light: '#e8f0a4',
    dark: '#8b9a3c',
    leaf: '#6f9349',
    deco: 'speckle',
    shape: 'pear',
  },
  {
    key: 'pineapple',
    name: 'Pineapple',
    r: 65,
    base: '#e7b64b',
    light: '#ffdd8f',
    dark: '#b08126',
    leaf: '#6f9349',
    deco: 'crown',
    skin: 'crosshatch',
    shape: 'pineapple',
  },
  {
    key: 'melon',
    name: 'Melon',
    r: 74,
    base: '#aecb7c',
    light: '#e0efb8',
    dark: '#7c9a4d',
    leaf: '#6f9349',
    deco: 'net',
  },
  {
    key: 'watermelon',
    name: 'Watermelon',
    r: 84,
    base: '#6ea45e',
    light: '#a9cd90',
    dark: '#3d6b3a',
    leaf: '#6f9349',
    deco: 'stripes',
  },
];

/** Only the first five are ever dropped into the jar. */
export const SPAWN_WEIGHTS = [34, 26, 19, 13, 8];

/** Points for folding two of tier N together (before the combo bonus). */
export const MERGE_SCORES = [0, 5, 10, 20, 35, 55, 80, 120, 170, 230, 300, 400];

export const MAX_MERGE_BONUS = 1000;
