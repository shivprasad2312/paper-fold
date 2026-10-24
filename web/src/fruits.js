/**
 * Puffy pals, smallest to legendary. Radius is the Matter.js collision radius;
 * `species` gives each buddy its own silhouette/details in the sprite painter.
 */
export const FRUITS = [
  { key: 'bunbun', name: 'Bunbun', species: 'bunny', r: 16, base: '#f5d9ee', light: '#fff4fd', dark: '#c78fbd', accent: '#ef9db8', belly: '#fff7ef', fur: '#fffafd' },
  { key: 'peep', name: 'Peep', species: 'chick', r: 20, base: '#ffd966', light: '#fff0a6', dark: '#e8a840', accent: '#ff9e72', belly: '#fff5cf', fur: '#fff0a0' },
  { key: 'momo', name: 'Momo', species: 'bear', r: 25, base: '#d69a67', light: '#f4c69a', dark: '#9a5c43', accent: '#f3a0a5', belly: '#fff0df', fur: '#f2c69e' },
  { key: 'puddle', name: 'Puddle', species: 'penguin', r: 30, base: '#699fe8', light: '#a7d7ff', dark: '#3d5caa', accent: '#ffd86b', belly: '#fffaf1', fur: '#a9d0ff' },
  { key: 'poppy', name: 'Poppy', species: 'cat', r: 36, base: '#ef9fc4', light: '#ffd4e4', dark: '#bd6694', accent: '#ffadc0', belly: '#fff3f2', fur: '#ffd1e3' },
  { key: 'twickle', name: 'Twickle', species: 'owl', r: 43, base: '#9e82d9', light: '#d3b9ff', dark: '#6751a6', accent: '#ffd66c', belly: '#fff2d9', fur: '#cbb6ff' },
  { key: 'foxy', name: 'Foxy', species: 'fox', r: 50, base: '#ed9556', light: '#ffc382', dark: '#b8543f', accent: '#f6c1a1', belly: '#fff4e6', fur: '#ffc18a' },
  { key: 'panda', name: 'Panda', species: 'panda', r: 57, base: '#fff4e8', light: '#ffffff', dark: '#d8c9c0', accent: '#373143', belly: '#ffffff', fur: '#fff8ef' },
  { key: 'lamby', name: 'Lamby', species: 'lamb', r: 65, base: '#e9c5ee', light: '#fff0ff', dark: '#b184c9', accent: '#df9caf', belly: '#fff8ed', fur: '#f3ddf5' },
  { key: 'sprout', name: 'Sprout', species: 'dragon', r: 74, base: '#91c98c', light: '#c4f0ac', dark: '#558b71', accent: '#f4bc71', belly: '#fff3d9', fur: '#c4eaa7' },
  { key: 'starlight', name: 'Starlight', species: 'unicorn', r: 84, base: '#c8a6f3', light: '#fff0ff', dark: '#8061c0', accent: '#ffcf73', belly: '#fff8fa', fur: '#f4deff' },
];

/** Only the first five pals are offered as drops. */
export const SPAWN_WEIGHTS = [34, 26, 19, 13, 8];

/** Points for merging two pals of tier N (before combo bonus). */
export const MERGE_SCORES = [0, 5, 10, 20, 35, 55, 80, 120, 170, 230, 300, 400];
export const MAX_MERGE_BONUS = 1000;
