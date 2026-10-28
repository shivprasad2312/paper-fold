/** Geometry for the dedicated five- and six-player boards.
 * Positions use the same 15-by-15 coordinate space as the classic board.
 * Each arm has ten track cells, so every team travels the same distance.
 */
const BOARD_CENTER = 7.5;
const SIDES = [2.65, 3.55, 4.45, 5.35];
const OFFSET = 0.85;
const LANE_RADII = [4.85, 3.95, 3.05, 2.15, 1.25];
export const EXTRA_COLORS = ['purple', 'orange'];
export const ALL_COLORS = ['yellow', 'red', 'blue', 'green', ...EXTRA_COLORS];
export const PLAYER_COUNTS = [4, 5, 6];
export const MODE_COLORS = Object.fromEntries(PLAYER_COUNTS.map((count) => [count, ALL_COLORS.slice(0, count)]));

const rounded = (value) => Math.round(value * 100000) / 100000;
function radialPoint(angle, radius, offset = 0) {
  const x = BOARD_CENTER + Math.cos(angle) * radius - Math.sin(angle) * offset;
  const y = BOARD_CENTER + Math.sin(angle) * radius + Math.cos(angle) * offset;
  return [rounded(y), rounded(x)];
}

function createRadialBoard(playerCount) {
  const colors = MODE_COLORS[playerCount];
  const angleStep = Math.PI * 2 / playerCount;
  const startAngle = -Math.PI / 2 - angleStep;
  const track = [];
  const starts = {};
  const lanes = {};
  const yards = {};
  const arms = {};
  colors.forEach((color, index) => {
    const angle = startAngle + index * angleStep;
    const rotation = angle * 180 / Math.PI;
    arms[color] = angle;
    const addCell = (radius, offset, cellRotation = rotation) => {
      const [row, col] = radialPoint(angle, radius, offset);
      track.push({ row, col, rotation: cellRotation });
    };
    SIDES.forEach((radius) => addCell(radius, -OFFSET));
    addCell(6.25, 0);
    [...SIDES].reverse().forEach((radius) => addCell(radius, OFFSET));
    const [row, col] = radialPoint(angle + angleStep / 2, 3.7);
    track.push({ row, col, rotation: rotation + angleStep * 90 / Math.PI });
    // A player enters from the yard next to the inward side of this arm.
    starts[color] = index * 10 + 5;
    lanes[color] = LANE_RADII.map((radius) => {
      const [laneRow, laneCol] = radialPoint(angle, radius);
      return { row: laneRow, col: laneCol, rotation };
    });
    const yardAngle = angle + angleStep / 2;
    const [yardRow, yardCol] = radialPoint(yardAngle, 5.5);
    // Rotate the slots with their sector so no corner intrudes on the track.
    const slots = [[-0.64, -0.64], [-0.64, 0.64], [0.64, -0.64], [0.64, 0.64]]
      .map(([radiusOffset, sideOffset]) => radialPoint(yardAngle, 5.5 + radiusOffset, sideOffset));
    yards[color] = { row: yardRow, col: yardCol, slots };
  });
  const safeIndexes = new Set(colors.flatMap((color) => [starts[color], (starts[color] + 5) % track.length]));
  return { playerCount, colors, track, starts, lanes, yards, arms, safeIndexes, center: [BOARD_CENTER, BOARD_CENTER] };
}

const radialBoards = { 5: createRadialBoard(5), 6: createRadialBoard(6) };
export function getRadialBoard(playerCount) {
  return radialBoards[playerCount] || null;
}
