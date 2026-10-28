import { COLORS, FINISH, PLAYERS, piecePosition } from './game.js';

// Characters face their actual direction of travel, not a fixed camera-facing pose.
// Three.js characters face +Z at zero rotation: increasing row is +Z and
// increasing column is +X. The same convention is used in the overhead view.
export function headingBetween(from, to) {
  const deltaRow = to[0] - from[0];
  const deltaCol = to[1] - from[1];
  return deltaRow === 0 && deltaCol === 0 ? 0 : Math.atan2(deltaCol, deltaRow);
}

export function headingForProgress(color, index, progress) {
  const from = piecePosition(color, index, progress);
  const next = progress < 0 ? 0 : Math.min(progress + 1, FINISH);
  if (progress === FINISH) {
    return headingBetween(piecePosition(color, index, FINISH - 1), from);
  }
  return headingBetween(from, piecePosition(color, index, next));
}

export function getMoveEffects(before, after, color, index) {
  if (before === after) return { reachedHome: false, captured: [] };
  const captured = COLORS.filter((other) => other !== color).flatMap((other) =>
    before.pieces[other].flatMap((progress, pieceIndex) =>
      progress >= 0 && progress < FINISH && after.pieces[other][pieceIndex] === -1
        ? [{ color: other, index: pieceIndex, fromProgress: progress }]
        : []));
  return {
    reachedHome: before.pieces[color][index] !== FINISH && after.pieces[color][index] === FINISH,
    captured,
  };
}

/** A view-only description of pieces; no temporary animation state is persisted. */
export function getVisualPieces(game, moving, reactions = [], disabled = false) {
  const pieces = [];
  COLORS.forEach((color) => game.pieces[color].forEach((savedProgress, index) => {
    const motion = moving?.color === color && moving.index === index ? moving : null;
    const reaction = reactions.find((item) => item.color === color && item.index === index);
    const progress = reaction?.phase === 'return' ? -1 : motion ? motion.progress : savedProgress;
    if (progress === FINISH && !motion) return;
    const [row, col] = piecePosition(color, index, progress);
    let heading = headingForProgress(color, index, progress);
    let pose = 'idle';
    let duration = 160;
    if (reaction) {
      pose = reaction.phase === 'return' ? 'sad-walk' : 'sad';
      if (reaction.phase === 'return') {
        heading = headingBetween(piecePosition(color, index, reaction.fromProgress), [row, col]);
        duration = reaction.duration;
      }
    } else if (motion) {
      pose = motion.phase === 'walk' ? 'walk' : motion.phase === 'celebrate' ? 'dance' : 'cheer';
      if (motion.fromProgress !== motion.progress) {
        heading = headingBetween(piecePosition(color, index, motion.fromProgress), [row, col]);
      }
      duration = motion.duration || duration;
    }
    pieces.push({
      color, index, progress, row, col, heading, pose, duration, showReactionBubble: reaction?.showBubble !== false,
      selectable: !disabled && game.phase === 'choose' && game.current === color && game.legal.includes(index),
    });
  }));

  // Pieces may share a safe square. Fan them out so that they remain selectable.
  return pieces.map((piece) => {
    if (piece.progress < 0 || piece.progress === FINISH) return piece;
    const peers = pieces.filter((other) => other.progress >= 0 && other.progress < FINISH && other.row === piece.row && other.col === piece.col);
    if (peers.length < 2) return piece;
    const slot = peers.findIndex((other) => other.color === piece.color && other.index === piece.index);
    const offsets = [[-0.20, -0.10], [0.20, -0.10], [-0.20, 0.12], [0.20, 0.12]];
    return { ...piece, col: piece.col + offsets[slot % 4][0], row: piece.row + offsets[slot % 4][1], stacked: true };
  });
}

export const animationLabels = {
  walk: 'walking',
  dance: 'celebrating',
  cheer: 'celebrating a capture',
  sad: 'feeling sad',
  'sad-walk': 'walking sadly back to the yard',
};
