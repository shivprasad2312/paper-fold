import { colorsFor, finishFor, playerCountFor, piecePosition } from './game.js';

// Characters face their actual direction of travel, not a fixed camera-facing pose.
// Three.js characters face +Z at zero rotation: increasing row is +Z and
// increasing column is +X. The same convention is used in the overhead view.
export function headingBetween(from, to) {
  const deltaRow = to[0] - from[0];
  const deltaCol = to[1] - from[1];
  return deltaRow === 0 && deltaCol === 0 ? 0 : Math.atan2(deltaCol, deltaRow);
}

export function headingForProgress(color, index, progress, playerCount = 4) {
  const finish = finishFor(playerCount);
  const from = piecePosition(color, index, progress, playerCount);
  const next = progress < 0 ? 0 : Math.min(progress + 1, finish);
  if (progress === finish) {
    return headingBetween(piecePosition(color, index, finish - 1, playerCount), from);
  }
  return headingBetween(from, piecePosition(color, index, next, playerCount));
}

export function getMoveEffects(before, after, color, index) {
  if (before === after) return { reachedHome: false, captured: [] };
  const playerCount = playerCountFor(before);
  const finish = finishFor(playerCount);
  const captured = colorsFor(playerCount).filter((other) => other !== color).flatMap((other) =>
    before.pieces[other].flatMap((progress, pieceIndex) =>
      progress >= 0 && progress < finish && after.pieces[other][pieceIndex] === -1
        ? [{ color: other, index: pieceIndex, fromProgress: progress }]
        : []));
  return {
    reachedHome: before.pieces[color][index] !== finish && after.pieces[color][index] === finish,
    captured,
  };
}

/** Reverse a captured piece's own progress, one square at a time, then its yard. */
export function returnPath(progress, trackLength = 52) {
  if (!Number.isInteger(progress) || progress < 0 || progress > trackLength - 2) return [];
  return Array.from({ length: progress + 1 }, (_, step) => ({
    fromProgress: progress - step,
    progress: progress - step - 1,
  }));
}

/** A view-only description of pieces; no temporary animation state is persisted. */
export function getVisualPieces(game, moving, reactions = [], disabled = false) {
  const pieces = [];
  const playerCount = playerCountFor(game);
  const finish = finishFor(playerCount);
  colorsFor(playerCount).forEach((color) => game.pieces[color].forEach((savedProgress, index) => {
    const motion = moving?.color === color && moving.index === index ? moving : null;
    const reaction = reactions.find((item) => item.color === color && item.index === index);
    const progress = reaction?.phase === 'return' || reaction?.phase === 'returned'
      ? reaction.progress : motion ? motion.progress : savedProgress;
    if (progress === finish && !motion) return;
    const [row, col] = piecePosition(color, index, progress, playerCount);
    let heading = headingForProgress(color, index, progress, playerCount);
    let pose = 'idle';
    let duration = 160;
    if (reaction) {
      pose = reaction.phase === 'return' ? 'sad-walk' : reaction.phase === 'returned' ? 'idle' : 'sad';
      if (reaction.phase === 'return') {
        heading = headingBetween(piecePosition(color, index, reaction.fromProgress, playerCount), [row, col]);
        duration = reaction.duration;
      }
    } else if (motion) {
      pose = motion.phase === 'walk' ? 'walk' : motion.phase === 'celebrate' ? 'dance' : motion.phase === 'cheer' ? 'cheer' : 'idle';
      if (motion.fromProgress !== motion.progress) {
        heading = headingBetween(piecePosition(color, index, motion.fromProgress, playerCount), [row, col]);
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
    if (piece.progress < 0 || piece.progress === finish) return piece;
    const peers = pieces.filter((other) => other.progress >= 0 && other.progress < finish && other.row === piece.row && other.col === piece.col);
    if (peers.length < 2) return piece;
    const slot = peers.findIndex((other) => other.color === piece.color && other.index === piece.index);
    const columns = peers.length <= 4 ? 2 : Math.ceil(Math.sqrt(peers.length));
    const rows = Math.ceil(peers.length / columns);
    const spacing = peers.length <= 4 ? 0.4 : Math.min(0.20, 0.65 / (columns - 1));
    return { ...piece,
      col: piece.col + (slot % columns - (columns - 1) / 2) * spacing,
      row: piece.row + (Math.floor(slot / columns) - (rows - 1) / 2) * spacing * 0.55,
      stacked: true,
    };
  });
}

export const animationLabels = {
  walk: 'walking',
  dance: 'celebrating',
  cheer: 'celebrating a capture',
  sad: 'feeling sad',
  'sad-walk': 'walking sadly back to the yard',
};
