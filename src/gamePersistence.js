import { STORAGE_KEY, isValidGame, movePiece } from './game.js';

// The normal save remains a valid complete game during a visible animation.
// This tiny journal records a chosen move so an interrupted page can finish it
// exactly once, without needing to serialize partial animation frames.
export const PENDING_MOVE_KEY = 'ludo-club-pending-move-v1';

export function canStoreGame(storage) {
  try {
    const key = 'ludo-club-storage-probe';
    storage.setItem(key, '1');
    storage.removeItem(key);
    return true;
  } catch { return false; }
}

export function saveGame(storage, game) {
  try { storage.setItem(STORAGE_KEY, JSON.stringify(game)); return true; }
  catch { return false; } // The game remains playable when storage is blocked.
}

export function savePendingMove(storage, before, index) {
  try { storage.setItem(PENDING_MOVE_KEY, JSON.stringify({ version: 1, before, index })); return true; }
  catch { return false; }
}

export function clearPendingMove(storage) {
  try { storage.removeItem(PENDING_MOVE_KEY); }
  catch { /* Storage is optional. */ }
}

const sameGame = (a, b) => JSON.stringify(a) === JSON.stringify(b);

export function pendingMoveMatches(pending, game) {
  return Boolean(pending && pending.version === 1 && Number.isInteger(pending.index) &&
    isValidGame(pending.before) && pending.before.phase === 'choose' &&
    pending.before.legal.includes(pending.index) && sameGame(pending.before, game));
}

export function loadSavedGame(storage) {
  let saved;
  try { saved = JSON.parse(storage.getItem(STORAGE_KEY)); }
  catch { return null; }
  if (!isValidGame(saved)) return null;

  let pending;
  try { pending = JSON.parse(storage.getItem(PENDING_MOVE_KEY)); }
  catch { clearPendingMove(storage); return saved; }
  if (!pending) return saved;

  if (!pendingMoveMatches(pending, pending.before)) {
    clearPendingMove(storage);
    return saved;
  }
  const completed = movePiece(pending.before, pending.index);
  if (!isValidGame(completed)) {
    clearPendingMove(storage);
    return saved;
  }
  if (sameGame(saved, pending.before)) {
    // Save the outcome before removing the journal. If the page is closed
    // between those writes, the next load recognizes the completed game below.
    if (saveGame(storage, completed)) clearPendingMove(storage);
    return completed;
  }
  // Either the outcome was already saved, or this journal belongs to an old
  // game. In both cases it must not be applied to the current game.
  clearPendingMove(storage);
  return saved;
}
