import React, { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  ArrowDown, ArrowLeft, ArrowRight, ArrowUp, ArrowUpRight, Dices, Home,
  RotateCcw, Sparkles, Star, Trophy, UsersRound, Volume2, VolumeX, X,
} from 'lucide-react';
import '@fontsource/fredoka/latin-400.css';
import '@fontsource/fredoka/latin-500.css';
import '@fontsource/fredoka/latin-600.css';
import '@fontsource/nunito-sans/latin-400.css';
import '@fontsource/nunito-sans/latin-600.css';
import '@fontsource/nunito-sans/latin-700.css';
import '@fontsource/nunito-sans/latin-800.css';
import '@fontsource/nunito-sans/latin-900.css';
import './styles.css';
import './compatibility.css';
import {
  COLORS, PLAYERS, TRACK,
  automaticMove, colorsFor, createGame, finishFor, gameModeFor, isComputerPlayer, movePiece,
  playerCountFor, randomRoll, rollDice, teamColorFor, trackLengthFor,
} from './game.js';
import { PLAYER_COUNTS, getRadialBoard } from './boards.js';
import { animationLabels, getMoveEffects, getVisualPieces, returnPath } from './visuals.js';
import ErrorBoundary from './ErrorBoundary.jsx';
import { CHARACTERS, CHARACTER_BY_ID, CHARACTER_STORAGE_KEY, TEAM_SYMBOLS, normalizeCharacterChoices } from './characters.js';
import { Avatar, CharacterImage, Logo, StorageWarning } from './ui.jsx';
import { HomeScreen, SetupScreen } from './Lobby.jsx';
import { charactersFromSetup, colorsFromSetup, createPlayerSetup, isValidPlayerSetup } from './playerSetup.js';
import { canStoreGame, clearPendingMove, loadSavedGame, pendingMoveMatches, saveGame, savePendingMove } from './gamePersistence.js';
import { createPausableScheduler } from './pausableScheduler.js';
import { chooseComputerMove } from './computerPlayer.js';
import { useOffline } from './useOffline.js';

const ClassicCharacters = lazy(() => import('./ClassicCharacters.jsx'));

const SCREEN_SESSION_KEY = 'ludo-club-screen-v1';

function gameStorage() {
  try { return window.localStorage; } catch { return null; }
}

function loadGame() { return loadSavedGame(gameStorage()); }

function initialScreen(savedGame) {
  try { return savedGame && window.sessionStorage.getItem(SCREEN_SESSION_KEY) === 'game' ? 'game' : 'home'; }
  catch { return 'home'; }
}

function loadCharacterChoices() {
  try { return normalizeCharacterChoices(JSON.parse(window.localStorage.getItem(CHARACTER_STORAGE_KEY))); }
  catch { return normalizeCharacterChoices(null); }
}

function PlayerCard({ color, game, character }) {
  const actualColor = teamColorFor(game, color);
  const player = PLAYERS[actualColor];
  const playerNumber = colorsFor(playerCountFor(game)).indexOf(color) + 1;
  const active = game.current === color && game.phase !== 'won';
  const finished = game.pieces[color].filter((piece) => piece === finishFor(playerCountFor(game))).length;
  return (
    <div className={`player-card player-card--${actualColor} ${active ? 'is-active' : ''}`}>
      <Avatar color={actualColor} character={character} />
      <div className="player-card-copy">
        <div className="player-card-heading">
          <strong>{player.name}</strong>
          {active && <span className="turn-pill"><span /> TURN</span>}
        </div>
        <span className="player-number">{gameModeFor(game) === 'computer' ? (isComputerPlayer(game, color) ? `Computer ${playerNumber - 1}` : 'You') : `Player ${playerNumber}`} · {CHARACTER_BY_ID[character].name}</span>
        <div className="player-progress" aria-label={`${finished} of 4 characters home`}>
          <span className="progress-dots" aria-hidden="true">
            {[0, 1, 2, 3].map((n) => <i key={n} className={n < finished ? 'is-filled' : ''} />)}
          </span>
          <span>{finished}/4 home</span>
        </div>
      </div>
    </div>
  );
}

const DICE_PIPS = {
  1: [4], 2: [0, 8], 3: [0, 4, 8], 4: [0, 2, 6, 8],
  5: [0, 2, 4, 6, 8], 6: [0, 2, 3, 5, 6, 8],
};

function DieFace({ number, className }) {
  return (
    <span className={`die-face ${className}`}>
      {Array.from({ length: 9 }, (_, i) => (
        <i key={i} className={DICE_PIPS[number].includes(i) ? 'show' : ''} />
      ))}
    </span>
  );
}

function Dice({ value, rolling }) {
  return (
    <div className={`dice-scene ${rolling ? 'is-rolling' : ''}`} aria-hidden="true">
      <div className="dice-shadow" />
      <div className="die">
        <DieFace number={value || 6} className="die-front" />
        <DieFace number={3} className="die-right" />
        <DieFace number={2} className="die-top" />
        <DieFace number={4} className="die-left" />
        <DieFace number={5} className="die-bottom" />
        <DieFace number={1} className="die-back" />
      </div>
    </div>
  );
}

const entrances = {
  '7,0': { color: 'yellow', Icon: ArrowRight },
  '0,7': { color: 'red', Icon: ArrowDown },
  '7,14': { color: 'blue', Icon: ArrowLeft },
  '14,7': { color: 'green', Icon: ArrowUp },
};

const starts = {
  1: { color: 'yellow', Icon: ArrowRight },
  14: { color: 'red', Icon: ArrowDown },
  27: { color: 'blue', Icon: ArrowLeft },
  40: { color: 'green', Icon: ArrowUp },
};

const stars = Object.fromEntries(COLORS.map((color) => [(PLAYERS[color].start + 8) % TRACK.length, color]));

function BoardTiles({ game }) {
  const seats = colorsFor(playerCountFor(game));
  const paint = (seat) => seat && seats.includes(seat) ? teamColorFor(game, seat) : null;
  return (
    <div className="board-tiles" aria-hidden="true">
      {TRACK.map(([row, col], index) => {
        const start = starts[index];
        const entrance = entrances[`${row},${col}`];
        const star = stars[index];
        const Icon = start?.Icon || entrance?.Icon;
        const color = paint(start?.color || entrance?.color || star);
        return (
          <div
            key={`track-${index}`}
            className={`board-tile ${start ? `board-tile--start board-tile--${color || 'empty'}` : ''}`}
            style={{ gridRow: row + 1, gridColumn: col + 1, '--tile-color': color ? PLAYERS[color].hex : '#c5ccc0' }}
          >
            {Icon && <Icon className={`tile-arrow ${start && color ? 'tile-arrow--start' : ''}`} strokeWidth={3} />}
            {star && <Star className="tile-star" fill="currentColor" strokeWidth={1} />}
          </div>
        );
      })}
      {COLORS.flatMap((seat) => PLAYERS[seat].lane.map(([row, col], i) => (
        <div
          key={`${seat}-lane-${i}`}
          className={`board-tile board-tile--lane board-tile--${paint(seat) || 'empty'}`}
          style={{ gridRow: row + 1, gridColumn: col + 1 }}
        >{i === 4 && <span className="lane-sparkle">✦</span>}</div>
      )))}
    </div>
  );
}

function BoardHome({ seat, color, active }) {
  const [row, col] = PLAYERS[seat].home;
  return (
    <div
      className={`board-home board-home--${color || 'empty'} ${active ? 'board-home--active' : ''}`}
      data-home-seat={seat} data-home-color={color || 'empty'}
      style={{ top: `${row / 15 * 100}%`, left: `${col / 15 * 100}%` }}
      aria-hidden="true"
    >
      <span className="home-label"><span /> {color ? PLAYERS[color].name : 'Open'}</span>
      <span className="home-doodle home-doodle--one">✦</span>
      <span className="home-doodle home-doodle--two">✳</span>
      {[0, 1, 2, 3].map((i) => <span key={i} className={`home-slot home-slot--${i}`} />)}
    </div>
  );
}

function BoardCenter({ game }) {
  const seats = colorsFor(playerCountFor(game));
  return (
    <div className="board-center" aria-hidden="true">
      {COLORS.map((seat) => <div key={seat} className={`center-triangle center-triangle--${seat}`}
        style={{ background: seats.includes(seat) ? PLAYERS[teamColorFor(game, seat)].hex : '#e5e9df' }} />)}
      <span className="center-badge"><Home strokeWidth={2.5} /></span>
    </div>
  );
}

// The five- and six-player boards have their own evenly spaced arms, yards,
// and routes. They use the same 15×15 coordinates as the character overlay.
function RadialBoard({ board, game }) {
  const { colors, playerCount, arms, yards, lanes, track, starts, safeIndexes } = board;
  const playerFor = (seat) => PLAYERS[teamColorFor(game, seat)];
  const step = Math.PI * 2 / playerCount;
  const point = (angle, radius) => [7.5 + Math.cos(angle) * radius, 7.5 + Math.sin(angle) * radius];
  const wedge = (angle) => {
    const a = angle + step * 0.09, b = angle + step * 0.91;
    const [x1, y1] = point(a, 7.2), [x2, y2] = point(b, 7.2);
    const [x3, y3] = point(b, 3.65), [x4, y4] = point(a, 3.65);
    return `M ${x1} ${y1} A 7.2 7.2 0 0 1 ${x2} ${y2} L ${x3} ${y3} A 3.65 3.65 0 0 0 ${x4} ${y4} Z`;
  };
  const startsByIndex = Object.fromEntries(colors.map((color) => [starts[color], color]));
  const starsByIndex = Object.fromEntries(colors.map((color) => [(starts[color] + 5) % track.length, color]));
  return (
    <svg className="radial-board" viewBox="0 0 15 15" aria-hidden="true">
      <rect width="15" height="15" fill="#f8f5ed" />
      <circle cx="7.5" cy="7.5" r="7.26" fill="#fffdf8" stroke="#ece7dc" strokeWidth=".06" />
      {colors.map((color) => {
        const player = playerFor(color), yard = yards[color], angle = arms[color];
        let [labelX, labelY] = point(angle + step / 2, 6.85);
        let labelAnchor = 'middle';
        // Keep the top captions clear of the figures' heads; the left caption
        // sits below its yard instead of being hidden behind the outer pieces.
        if (labelY < 3.5) {
          const left = labelX < 7.5;
          labelX += left ? -0.45 : 0.45;
          labelAnchor = left ? 'end' : 'start';
        } else if (playerCount === 6 && (color === 'orange' || color === 'blue')) {
          labelX = color === 'orange' ? 0.45 : 14.55;
          labelY = yard.row + 1.67;
          labelAnchor = color === 'orange' ? 'start' : 'end';
        }
        return <g key={color} data-yard={color}>
          <path d={wedge(angle)} fill={player.light} stroke={player.hex} strokeOpacity=".28" strokeWidth=".055" />
          <circle cx={yard.col} cy={yard.row} r="1.52" fill={player.hex} fillOpacity=".62" stroke="#fff" strokeOpacity=".72" strokeWidth=".055" />
          <circle cx={yard.col} cy={yard.row} r="1.36" fill="none" stroke="#fff" strokeOpacity=".38" strokeWidth=".035" />
          {yard.slots.map(([row, col], index) => <circle key={index} cx={col} cy={row} r=".45" fill="#fffdf5" stroke="#fff" strokeWidth=".08" />)}
          <text x={labelX} y={labelY} textAnchor={labelAnchor} dominantBaseline="middle" fill={player.dark} fontFamily="Nunito Sans, sans-serif" fontWeight="900" fontSize=".30" letterSpacing=".025">{player.name.toUpperCase()}</text>
        </g>;
      })}
      <path d={`${track.map(({ row, col }, index) => `${index ? 'L' : 'M'} ${col} ${row}`).join(' ')} Z`} fill="none" stroke="#e9e6dc" strokeWidth=".54" strokeLinecap="round" strokeLinejoin="round" />
      {track.map(({ row, col, rotation }, index) => {
        const startColor = startsByIndex[index], starColor = starsByIndex[index];
        return <g key={index} data-track-cell={index} transform={`translate(${col} ${row}) rotate(${rotation})`}>
          <rect x="-.40" y="-.40" width=".80" height=".80" rx=".105" fill={startColor ? playerFor(startColor).hex : '#fffefa'} stroke={startColor ? '#ffffff' : '#deddd3'} strokeWidth=".045" />
          {startColor ? <path d="M .21 0 H -.21 M -.06 -.16 L -.22 0 L -.06 .16" fill="none" stroke="#fff" strokeLinecap="round" strokeLinejoin="round" strokeWidth=".075" /> :
            safeIndexes.has(index) && <path d="M 0 -.25 L .07 -.08 L .25 -.08 L .105 .035 L .16 .21 L 0 .11 L -.16 .21 L -.105 .035 L -.25 -.08 L -.07 -.08 Z" fill={playerFor(starColor).hex} />}
        </g>;
      })}
      {colors.flatMap((color) => lanes[color].map(({ row, col, rotation }, index) =>
        <g key={`${color}-${index}`} data-lane={color} transform={`translate(${col} ${row}) rotate(${rotation})`}>
          <rect x="-.40" y="-.40" width=".80" height=".80" rx=".105" fill={playerFor(color).hex} stroke="#fff" strokeOpacity=".8" strokeWidth=".045" />
          {index === 1 && <path d="M 0 -.20 L .055 -.055 L .20 0 L .055 .055 L 0 .20 L -.055 .055 L -.20 0 L -.055 -.055 Z" fill="#fff" fillOpacity=".8" />}
        </g>
      ))}
      {colors.map((color) => {
        const angle = arms[color];
        const [x1, y1] = point(angle - step / 2, .88), [x2, y2] = point(angle + step / 2, .88);
        return <path key={color} d={`M 7.5 7.5 L ${x1} ${y1} L ${x2} ${y2} Z`} fill={playerFor(color).hex} stroke="#fff" strokeWidth=".035" />;
      })}
      <circle cx="7.5" cy="7.5" r=".29" fill="#fffdf5" stroke="#fff" strokeWidth=".06" />
      <path d="M 7.36 7.48 L 7.5 7.36 L 7.64 7.48 M 7.39 7.47 V 7.63 H 7.61 V 7.47" fill="none" stroke="#d6a843" strokeWidth=".04" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function Board({ game, pieces, characterChoices, onMove, reducedMotion }) {
  const [characterStatus, setCharacterStatus] = useState('loading');
  const playerCount = playerCountFor(game);
  const radial = getRadialBoard(playerCount);
  const finish = finishFor(playerCount);
  return (
    <div className="board-frame">
      <div className={`board ${radial ? 'board--radial' : 'board--classic'}`} data-player-count={playerCount} aria-label={`Ludo game board, ${playerCount} players`}>
        {radial ? <RadialBoard board={radial} game={game} /> : <>
          <BoardTiles game={game} />
          {COLORS.map((seat) => <BoardHome key={seat} seat={seat} color={colorsFor(playerCount).includes(seat) ? teamColorFor(game, seat) : null} active={game.current === seat} />)}
          <BoardCenter game={game} />
        </>}
        {characterStatus !== 'failed' && <ErrorBoundary onError={() => setCharacterStatus('failed')}>
          <Suspense fallback={null}>
            <ClassicCharacters pieces={pieces} characterChoices={characterChoices} playerCount={playerCount} teamColors={game.teamColors} reducedMotion={reducedMotion} onStatus={setCharacterStatus} />
          </Suspense>
        </ErrorBoundary>}
        <div className="pieces-layer">
          {pieces.map(({ color, index, progress, row, col, stacked, selectable, pose, duration, heading, showReactionBubble }) => {
            const actualColor = teamColorFor(game, color);
            const reaction = pose === 'dance' ? 'Yay!' : showReactionBubble && (pose === 'sad' || pose === 'sad-walk') ? 'Oh no!' : null;
            const position = progress < 0 ? 'in the yard' : progress === finish ? 'at home' : `on space ${progress + 1}`;
            // Fan number markers independently of closely stacked figures so
            // each matching choice remains identifiable on a small board.
            const peers = stacked && selectable ? pieces.filter((other) => other.selectable && other.stacked && other.color === color && other.progress === progress) : [];
            let markerStyle;
            if (peers.length > 1) {
              const rank = peers.findIndex((other) => other.index === index);
              const meanCol = peers.reduce((sum, peer) => sum + peer.col, 0) / peers.length;
              const meanRow = peers.reduce((sum, peer) => sum + peer.row, 0) / peers.length;
              const spread = (peers.length - 1) * 0.525;
              const center = Math.min(14.5 - spread, Math.max(0.5 + spread, meanCol));
              const markerCol = center + (rank - (peers.length - 1) / 2) * 1.05;
              markerStyle = { left: `${50 + (markerCol - col) * 100 / (15 * 0.053)}%`, '--marker-row-offset': `${(meanRow - row) * 100 / (15 * 0.093)}%` };
            }
            return (
              <button
                type="button"
                key={`${color}-${index}`}
                data-character={`${color}-${index}`}
                data-color={actualColor}
                data-character-type={characterChoices[color]}
                data-progress={progress}
                data-pose={pose}
                data-heading={heading.toFixed(3)}
                className={`game-piece game-piece--${actualColor} ${progress < 0 ? 'game-piece--yard' : 'game-piece--track'} ${selectable ? 'is-selectable' : ''} ${stacked ? 'is-stacked' : ''} ${characterStatus === 'ready' && ['animal', 'bird'].includes(CHARACTER_BY_ID[characterChoices[color]].kind) ? 'game-piece--compact' : ''}`}
                style={{ left: `${col / 15 * 100}%`, top: `${row / 15 * 100}%`, zIndex: Math.round(row * 10) + (selectable || reaction ? 200 : 0), '--motion-duration': `${duration}ms` }}
                onClick={() => onMove(index)}
                disabled={!selectable}
                aria-label={`${PLAYERS[actualColor].name} character ${index + 1}, ${position}, ${CHARACTER_BY_ID[characterChoices[color]].name}${animationLabels[pose] ? `, ${animationLabels[pose]}` : ''}${selectable ? ', select to move' : ''}`}
              >
                <span className="piece-highlight" />
                {selectable && <span className={`piece-choice-number ${row < 1.5 ? 'piece-choice-number--edge' : ''}`} style={markerStyle} aria-hidden="true">{index + 1}</span>}
                <span className="piece-shadow" />
                {characterStatus !== 'ready' && <CharacterImage character={characterChoices[color]} color={actualColor} />}
                {(pose === 'dance' || pose === 'cheer') && <span className="piece-confetti" aria-hidden="true"><i>✦</i><i>✦</i><i>✦</i></span>}
                {reaction && <span className={`piece-reaction ${row < 2 ? 'piece-reaction--below' : ''} ${pose === 'sad' || pose === 'sad-walk' ? 'piece-reaction--sad' : ''}`} aria-hidden="true">{reaction}</span>}
              </button>
            );
          })}
        </div>
        {characterStatus === 'failed' && <div className="character-fallback-note">
          Character animation unavailable. <button type="button" onClick={() => window.location.reload()}>Retry</button>
        </div>}
      </div>
    </div>
  );
}

function MoveChoices({ game, pieces, onMove, elementRef }) {
  const actualColor = teamColorFor(game, game.current);
  const player = PLAYERS[actualColor];
  const stacked = pieces.some((piece) => piece.selectable && piece.stacked);
  const trackLength = trackLengthFor(playerCountFor(game));
  return <div id="move-choices" ref={elementRef} className="stacked-choices move-choices" role="group"
    aria-label={stacked ? 'Choose a stacked character to move' : 'Choose a character to move'}
    style={{ '--move-color': player.hex, '--move-pale': player.light }}>
    <div className="move-choices-heading"><Sparkles size={16} /><span><strong>Choose a character</strong><small>Match a number on the board</small></span></div>
    <div className="move-choices-list">
      {game.legal.map((index) => {
        const progress = game.pieces[game.current][index];
        const location = progress < 0 ? 'In yard' : progress >= trackLength - 1 ? 'Home lane' : 'On track';
        return <button type="button" key={index} onClick={() => onMove(index)}
          aria-label={`Move ${player.name} character ${index + 1}`} aria-describedby={`move-location-${index}`}>
          <span className="move-choice-number">{index + 1}</span><small id={`move-location-${index}`}>{location}</small>
        </button>;
      })}
    </div>
  </div>;
}

function QuickGuide({ onOpenRules }) {
  return (
    <div className="guide-card">
      <div className="guide-card-top">
        <span className="section-eyebrow">THE SHORT VERSION</span>
        <span className="guide-icon"><Sparkles size={15} /></span>
      </div>
      <h3>New around here?</h3>
      <p>It’s the Ludo you love, with a little extra personality.</p>
      <button className="text-link" onClick={onOpenRules}>How to play <ArrowUpRight size={15} strokeWidth={2.5} /></button>
      <div className="guide-decoration" aria-hidden="true"><span>✳</span><span>✦</span></div>
    </div>
  );
}

function TurnCard({ game, character, rolling, moving, onRoll, onChoose }) {
  const actualColor = teamColorFor(game, game.current);
  const player = PLAYERS[actualColor];
  const choosing = game.phase === 'choose';
  const ended = game.phase === 'won';
  const computer = !ended && isComputerPlayer(game, game.current);
  const dieLabel = rolling ? 'Dice rolling' : game.roll ? `Last roll: ${game.roll}` : 'No roll yet';
  return (
    <div className={`turn-card turn-card--${actualColor}`}>
      <div className="turn-card-top">
        <div>
          <span className="section-eyebrow">IT’S GAME TIME</span>
          <h2>{ended ? 'Game over!' : <>{player.name}’s turn <span>✦</span></>}</h2>
          <p>{ended ? 'What a game!' : moving ? 'On the move!' : computer ? (choosing ? 'Computer is choosing a move.' : 'Computer is getting ready to roll.') : choosing ? 'Choose a character to move.' : 'Ready, set, roll!'}</p>
        </div>
        <Avatar color={actualColor} character={character} size="small" />
      </div>
      <div className="dice-area" role="img" aria-label={dieLabel}>
        <span className="dice-confetti dice-confetti--one">✦</span>
        <span className="dice-confetti dice-confetti--two">✳</span>
        <Dice value={game.roll} rolling={rolling} />
        <span className="dice-caption">{rolling ? 'ROLLING...' : game.roll ? `LAST ROLL · ${game.roll}` : 'GOOD LUCK!'}</span>
      </div>
      <span className="compact-die" role="img" aria-label={dieLabel}>{rolling ? '·' : game.roll ?? '–'}</span>
      <button
        className="roll-button"
        onClick={choosing ? onChoose : onRoll}
        aria-controls={choosing && !moving && !computer ? 'move-choices' : undefined}
        aria-label={choosing && !moving && !rolling && !computer ? 'Choose a character' : undefined}
        disabled={rolling || Boolean(moving) || ended || computer}
      >
        <Dices size={20} strokeWidth={2.2} />
        {rolling ? 'Rolling...' : moving ? 'Moving...' : ended ? 'Game finished' : computer ? (choosing ? 'Thinking...' : 'Computer’s turn') : choosing ? <><span className="choose-label-full">Choose a character</span><span className="choose-label-short" aria-hidden="true">Choose</span></> : game.sixes > 0 ? 'Roll again' : 'Roll the dice'}
        {!choosing && !ended && !rolling && !moving && !computer && <ArrowRight className="roll-arrow" size={18} />}
      </button>
      <p className="turn-helper">{computer ? 'The computer plays its turn automatically.' : moving ? 'Your character is on the move.' : choosing ? 'Tap one of the glowing characters on the board.' : ended ? 'Start a new game to play again.' : 'Roll a 6 to bring a character out.'}</p>
    </div>
  );
}

function RulesContent({ mode }) {
  return (
    <div className="rules-list">
      <div><span className="rule-number rule-number--yellow">01</span><p><strong>Roll a six to start</strong><small>Your first character comes out automatically. A six earns you another roll!</small></p></div>
      <div><span className="rule-number rule-number--red">02</span><p><strong>Make your way around</strong><small>Move clockwise. Land on an opponent to send them back, but star and starting squares are safe.</small></p></div>
      <div><span className="rule-number rule-number--blue">03</span><p><strong>Bring everyone home</strong><small>Follow your colored path to the middle. You need an exact roll; the first player to get all four home wins.</small></p></div>
      <div><span className="rule-number rule-number--green">04</span><p><strong>Take turns together</strong><small>A 6 earns another roll. {mode === 'computer' ? 'You go first and the computer takes its turns automatically.' : 'Share the screen and pass the dice to the next player.'}</small></p></div>
    </div>
  );
}

function Modal({ type, winner, currentTeam, playerCount, mode, teamColors, characterChoices, onChooseCharacter, onClose, onReset, onHome }) {
  const [selectedTeam, setSelectedTeam] = useState(currentTeam);
  const [newPlayerCount, setNewPlayerCount] = useState(playerCount);
  const [category, setCategory] = useState('all');
  const paint = (seat) => teamColors?.[seat] ?? seat;
  const modalRef = useRef(null);
  useEffect(() => {
    const previousFocus = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    modalRef.current?.querySelector('[data-initial-focus]')?.focus();
    const handler = (event) => {
      if (event.key === 'Escape' && type !== 'won') onClose();
      if (event.key !== 'Tab') return;
      const focusable = Array.from(modalRef.current?.querySelectorAll('button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])') || []);
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', handler);
    return () => {
      document.removeEventListener('keydown', handler);
      document.body.style.overflow = previousOverflow;
      if (previousFocus instanceof HTMLElement && previousFocus.isConnected) previousFocus.focus();
    };
  }, [onClose, type]);
  return (
    <div className={`modal-overlay modal-overlay--${type}`} onMouseDown={(event) => { if (event.target === event.currentTarget && type !== 'won') onClose(); }}>
      <section ref={modalRef} className={`modal modal--${type}`} role="dialog" aria-modal="true" aria-labelledby="modal-title">
        {type !== 'won' && <button className="modal-close icon-button" onClick={onClose} aria-label="Close dialog"><X size={19} /></button>}
        {type === 'characters' && <>
          <span className="section-eyebrow picker-eyebrow">MEET YOUR PLAYING PIECES <span>✦</span></span>
          <h2 id="modal-title">Choose your characters.</h2>
          <p className="modal-intro">Pick a team, then a character. Each team’s four pieces will match. You can change them anytime!</p>
          <div className="picker-section-label"><span>01</span> CHOOSE A TEAM</div>
          <div className="team-picker" role="group" aria-label="Choose a team">
            {colorsFor(playerCount).map((seat) => <button type="button" key={seat} data-team={seat}
              className={`team-option team-option--${paint(seat)} ${selectedTeam === seat ? 'is-selected' : ''}`}
              aria-pressed={selectedTeam === seat} onClick={() => setSelectedTeam(seat)}
              data-initial-focus={seat === currentTeam ? true : undefined}>
              <span className="team-symbol" aria-hidden="true">{TEAM_SYMBOLS[paint(seat)]}</span>
              <span><strong>{PLAYERS[paint(seat)].name}</strong><small>{CHARACTER_BY_ID[characterChoices[seat]].name}</small></span>
            </button>)}
          </div>
          <div className="picker-subheading"><div className="picker-section-label"><span>02</span> PICK FOR <b>{PLAYERS[paint(selectedTeam)].name.toUpperCase()}</b></div><small>Everyone can pick the same!</small></div>
          <div className="character-filters" role="group" aria-label="Character categories">
            {[['all', 'All', CHARACTERS.length], ['family', 'Family'], ['animals', 'Animals'], ['adventure', 'On the go']].map(([id, label, count]) =>
              <button type="button" key={id} className={category === id ? 'is-selected' : ''} aria-pressed={category === id} onClick={() => setCategory(id)}>{label}{count ? <span>{count}</span> : null}</button>
            )}
          </div>
          <div className="character-grid" aria-label={`${PLAYERS[paint(selectedTeam)].name} character choices`}>
            {CHARACTERS.filter((character) => category === 'all' || character.category === category).map((character) => {
              const selected = characterChoices[selectedTeam] === character.id;
              return <button type="button" key={character.id} data-choice={character.id}
                className={`character-option character-option--${paint(selectedTeam)} ${selected ? 'is-selected' : ''}`}
                aria-label={`Choose ${character.name} for ${PLAYERS[paint(selectedTeam)].name}`} aria-pressed={selected}
                onClick={() => onChooseCharacter(selectedTeam, character.id)}>
                <span className="character-option-art"><CharacterImage character={character.id} color={paint(selectedTeam)} />{selected && <span className="character-check" aria-hidden="true">✓</span>}</span>
                <strong>{character.name}</strong><small>{character.description}</small>
              </button>;
            })}
          </div>
          <div className="picker-footer"><span><span aria-hidden="true">✳</span> Your game stays just as it is.</span><button type="button" className="modal-primary" onClick={onClose}>Done, let’s play <ArrowRight size={17} /></button></div>
          <span className="visually-hidden" aria-live="polite">{PLAYERS[paint(selectedTeam)].name} team: {CHARACTER_BY_ID[characterChoices[selectedTeam]].name} selected</span>
        </>}
        {type === 'rules' && <>
          <div className="modal-symbol modal-symbol--yellow"><Dices size={25} /></div>
          <span className="section-eyebrow">A LITTLE HELPING HAND</span>
          <h2 id="modal-title">Here’s how to play.</h2>
          <p className="modal-intro">A classic game, made for good times. Here are the basics.</p>
          <RulesContent mode={mode} />
          <button className="modal-primary" onClick={onClose} data-initial-focus>Got it, let’s play! <ArrowRight size={18} /></button>
        </>}
        {type === 'reset' && <>
          <div className="modal-symbol modal-symbol--red"><RotateCcw size={24} /></div>
          <span className="section-eyebrow">A FRESH START</span>
          <h2 id="modal-title">Start a new game?</h2>
          <p className="modal-intro">Choose your players and set up their characters. Your saved game stays until the new one starts.</p>
          <fieldset className="player-count-selector">
            <legend>How many players?</legend>
            <div className="player-count-options">
              {PLAYER_COUNTS.filter((count) => mode !== 'computer' || count <= 4).map((count) => <label key={count} className={`player-count-option ${newPlayerCount === count ? 'is-selected' : ''}`}>
                <input type="radio" name="player-count" value={count} checked={newPlayerCount === count}
                  onChange={() => setNewPlayerCount(count)} aria-label={`${count} players`} />
                <span className="player-count-number">{count}</span>
                <span><strong>Players</strong><small>{count <= 4 ? 'Classic board' : count === 5 ? 'Five-arm board' : 'Six-arm board'}</small></span>
              </label>)}
            </div>
          </fieldset>
          <div className="modal-actions">
            <button className="modal-secondary" onClick={onClose} data-initial-focus>Keep playing</button>
            <button className="modal-primary" onClick={() => onReset(newPlayerCount)}>Yes, new game <ArrowRight size={18} /></button>
          </div>
        </>}
        {type === 'won' && winner && <>
          <div className={`winner-avatar winner-avatar--${paint(winner)}`}><Avatar color={paint(winner)} character={characterChoices[winner]} size="large" /><span>✦</span></div>
          <span className="section-eyebrow">WE HAVE A WINNER!</span>
          <h2 id="modal-title">{mode === 'computer' && winner === colorsFor(playerCount)[0] ? 'You take' : `${PLAYERS[paint(winner)].name}${mode === 'computer' ? ' computer' : ''} takes`} the crown!</h2>
          <p className="modal-intro">All four characters made it home. That was one for the books!</p>
          <button className="modal-primary" onClick={() => onReset(playerCount)} data-initial-focus><RotateCcw size={18} /> Play again</button>
          <button className="modal-secondary winner-home" onClick={onHome}>Back to home</button>
        </>}
      </section>
    </div>
  );
}

function motionQuery() {
  try { return window.matchMedia?.('(prefers-reduced-motion: reduce)') ?? null; }
  catch { return null; } // Some embedded browsers restrict media queries.
}

function useReducedMotion() {
  const [reduced, setReduced] = useState(() => motionQuery()?.matches ?? false);
  useEffect(() => {
    const query = motionQuery();
    if (!query) return undefined;
    const update = () => setReduced(query.matches);
    query.addEventListener?.('change', update);
    return () => query.removeEventListener?.('change', update);
  }, []);
  return reduced;
}

function App() {
  const [initialSavedGame] = useState(loadGame);
  const [game, setGame] = useState(() => initialSavedGame || createGame());
  const [hasSavedGame, setHasSavedGame] = useState(Boolean(initialSavedGame));
  const [canSave, setCanSave] = useState(() => canStoreGame(gameStorage()));
  const offline = useOffline();
  const [screen, setScreen] = useState(() => initialScreen(initialSavedGame));
  const [selectedCount, setSelectedCount] = useState(() => initialSavedGame ? playerCountFor(initialSavedGame) : 4);
  const [selectedMode, setSelectedMode] = useState(() => gameModeFor(initialSavedGame));
  const [draftPlayers, setDraftPlayers] = useState(null);
  const [characterChoices, setCharacterChoices] = useState(loadCharacterChoices);
  const [rolling, setRolling] = useState(false);
  const [rollFrom, setRollFrom] = useState(null);
  const [moving, setMoving] = useState(null);
  const [reactions, setReactions] = useState([]);
  const reducedMotion = useReducedMotion();
  const [modal, setModal] = useState(null);
  const [soundOn, setSoundOn] = useState(false);
  const busyRef = useRef(false);
  const gameRef = useRef(game);
  const pendingMoveRef = useRef(null);
  const moveChoicesRef = useRef(null);
  const audioContext = useRef(null);
  const activityRef = useRef({ screen, modal });
  activityRef.current = { screen, modal };
  const [scheduler] = useState(() => {
    const queue = createPausableScheduler();
    if (document.hidden) queue.pause();
    return queue;
  });

  useEffect(() => {
    try { window.sessionStorage.setItem(SCREEN_SESSION_KEY, screen === 'game' ? 'game' : 'home'); } catch { /* Storage is optional. */ }
    try { window.scrollTo({ top: 0, behavior: 'instant' }); }
    catch { try { window.scrollTo(0, 0); } catch { /* Scrolling is optional. */ } }
    if (!document.querySelector('[role="dialog"]')) {
      const title = document.querySelector(`[data-screen="${screen}"] [data-screen-title]`);
      try { title?.focus({ preventScroll: true }); } catch { title?.focus(); }
    }
  }, [screen]);

  useEffect(() => {
    try { window.localStorage.setItem(CHARACTER_STORAGE_KEY, JSON.stringify(characterChoices)); }
    catch { setCanSave(false); }
  }, [characterChoices]);

  useEffect(() => {
    const pause = () => {
      scheduler.pause();
      const pending = pendingMoveRef.current;
      if (pending && !savePendingMove(gameStorage(), pending.before, pending.index)) setCanSave(false);
      if (audioContext.current?.state === 'running') audioContext.current.suspend().catch(() => {});
    };
    const resume = () => {
      if (!document.hidden && activityRef.current.screen === 'game' && !activityRef.current.modal) scheduler.resume();
    };
    const visibilityChanged = () => { if (document.hidden) pause(); else resume(); };
    document.addEventListener('visibilitychange', visibilityChanged);
    window.addEventListener('pagehide', pause);
    window.addEventListener('pageshow', resume);
    return () => {
      document.removeEventListener('visibilitychange', visibilityChanged);
      window.removeEventListener('pagehide', pause);
      window.removeEventListener('pageshow', resume);
      scheduler.clear();
      if (audioContext.current) audioContext.current.close().catch(() => {});
    };
  }, [scheduler]);

  // A dialog or leaving the board pauses both animation and computer timers.
  // Visibility/page lifecycle events use the same queue and resume only when
  // the board is active again.
  useEffect(() => {
    if (screen === 'game' && !modal && !document.hidden) scheduler.resume();
    else scheduler.pause();
  }, [screen, modal, scheduler]);

  const schedule = (callback, delay) => scheduler.schedule(callback, delay);
  const commitGame = (next) => {
    gameRef.current = next;
    const saved = saveGame(gameStorage(), next);
    if (!saved) setCanSave(false);
    setGame(next);
    return saved;
  };

  const playSound = (kind) => {
    if (!soundOn) return;
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      const ctx = audioContext.current || new AudioContext();
      audioContext.current = ctx;
      if (ctx.state === 'suspended') ctx.resume().catch(() => {});
      const notes = kind === 'roll' ? [300, 430, 360] : kind === 'sad' ? [420, 330, 260] : kind === 'celebrate' ? [520, 660, 780, 1040] : [520, 700];
      notes.forEach((frequency, i) => {
        const oscillator = ctx.createOscillator();
        const gain = ctx.createGain();
        oscillator.type = 'sine';
        oscillator.frequency.value = frequency;
        const start = ctx.currentTime + i * 0.07;
        gain.gain.setValueAtTime(0.0001, start);
        gain.gain.exponentialRampToValueAtTime(0.055, start + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.09);
        oscillator.connect(gain).connect(ctx.destination);
        oscillator.start(start);
        oscillator.stop(start + 0.1);
      });
    } catch { /* Sound is progressive enhancement. */ }
  };

  const startMove = (position, index) => {
    if (position.phase !== 'choose' || !position.legal.includes(index)) {
      busyRef.current = false;
      return;
    }
    busyRef.current = true;
    // A selected move is journaled before its animation starts. The normal
    // save stays at the rolled position until the visible sequence completes.
    pendingMoveRef.current = { version: 1, before: position, index };
    const savedPosition = saveGame(gameStorage(), position);
    const savedSelection = savePendingMove(gameStorage(), position, index);
    if (!savedPosition || !savedSelection) setCanSave(false);
    playSound('move');
    const color = position.current;
    const progress = position.pieces[color][index];
    const steps = progress === -1 ? [0] : Array.from({ length: position.roll }, (_, n) => progress + n + 1);
    const nextGame = movePiece(position, index);
    const effects = getMoveEffects(position, nextGame, color, index);
    const timings = reducedMotion
      ? { step: 75, leave: 100, celebrate: 650, sad: 500, returnStep: 35, returnYard: 100, rest: 250 }
      : { step: 420, leave: 720, celebrate: 1900, sad: 1250, returnStep: 140, returnYard: 500, rest: 550 };
    setMoving({ color, index, progress, fromProgress: progress, phase: 'walk', duration: timings.step });
    let elapsed = 0;
    steps.forEach((step, stepIndex) => {
      const fromProgress = stepIndex === 0 ? progress : steps[stepIndex - 1];
      const duration = progress === -1 ? timings.leave : timings.step;
      schedule(() => setMoving({ color, index, progress: step, fromProgress, phase: 'walk', duration }), elapsed);
      elapsed += duration;
    });
    const finalMotion = { color, index, progress: steps[steps.length - 1], fromProgress: steps.length > 1 ? steps[steps.length - 2] : progress };
    const finishMove = () => {
      // Save the complete outcome before removing its journal. Reloading
      // between the two writes can therefore never apply the move twice.
      if (commitGame(nextGame)) clearPendingMove(gameStorage());
      pendingMoveRef.current = null;
      setReactions([]);
      setMoving(null);
      busyRef.current = false;
    };
    schedule(() => {
      if (effects.reachedHome) {
        const winning = nextGame.phase === 'won';
        setMoving({ ...finalMotion, phase: 'celebrate', winning });
        if (winning) {
          const finish = finishFor(playerCountFor(position));
          const defeated = colorsFor(playerCountFor(position)).filter((other) => other !== color).flatMap((other) => {
            const firstVisible = position.pieces[other].findIndex((piece) => piece < finish);
            return position.pieces[other].flatMap((piece, pieceIndex) => piece < finish
              ? [{ color: other, index: pieceIndex, fromProgress: piece, phase: 'sad', showBubble: pieceIndex === firstVisible }]
              : []);
          });
          setReactions(defeated);
        }
        playSound('celebrate');
        schedule(finishMove, timings.celebrate);
      } else if (effects.captured.length) {
        setMoving({ ...finalMotion, phase: 'cheer' });
        setReactions(effects.captured.map((piece) => ({ ...piece, phase: 'sad' })));
        playSound('sad');
        schedule(() => setMoving({ ...finalMotion, phase: 'wait' }), timings.sad);
        // Each victim retraces its own route, even when several are captured
        // on the same square but have different distances to their yards.
        let returning = effects.captured.length;
        effects.captured.forEach((piece) => {
          const path = returnPath(piece.fromProgress, trackLengthFor(playerCountFor(position)));
          const updateVictim = (update) => setReactions((current) => current.map((reaction) =>
            reaction.color === piece.color && reaction.index === piece.index ? { ...reaction, ...update } : reaction));
          // Schedule each step after the previous one, instead of queuing the
          // whole path at once. A busy or backgrounded browser won't compress
          // all of a long return into one burst when its timers resume.
          const walkBack = (stepIndex) => {
            if (stepIndex >= path.length) {
              updateVictim({ progress: -1, phase: 'returned', showBubble: false });
              returning -= 1;
              if (returning === 0) schedule(finishMove, timings.rest);
              return;
            }
            const step = path[stepIndex];
            const duration = step.progress === -1 ? timings.returnYard : timings.returnStep;
            updateVictim({ ...step, phase: 'return', duration });
            schedule(() => walkBack(stepIndex + 1), duration);
          };
          schedule(() => walkBack(0), timings.sad);
        });
      } else {
        finishMove();
      }
    }, elapsed + 35);
  };

  const performRoll = (computer = false) => {
    const before = gameRef.current;
    if (busyRef.current || scheduler.paused || activityRef.current.screen !== 'game' || activityRef.current.modal ||
        before.phase !== 'roll' || isComputerPlayer(before, before.current) !== computer) return;
    busyRef.current = true;
    setRollFrom(before);
    setRolling(true);
    playSound('roll');
    // Commit the die result immediately, even if the device is interrupted
    // while the dice are still spinning. The old view remains until it stops.
    const rolled = rollDice(before, randomRoll(before));
    commitGame(rolled);
    schedule(() => {
      setRolling(false);
      setRollFrom(null);
      const index = automaticMove(rolled);
      if (index !== null) startMove(rolled, index);
      else busyRef.current = false;
    }, reducedMotion ? 100 : 700);
  };

  const handleRoll = () => performRoll(false);
  const handleMove = (index) => {
    const position = gameRef.current;
    if (!busyRef.current && !scheduler.paused && activityRef.current.screen === 'game' && !activityRef.current.modal &&
        !isComputerPlayer(position, position.current)) startMove(position, index);
  };

  // Returning from home replays an interrupted selection; after a reload the
  // journal is recovered on startup. Rolled automatic moves still replay.
  const resumedAuto = useRef(false);
  useEffect(() => {
    if (screen !== 'game') { resumedAuto.current = false; return; }
    if (resumedAuto.current) return;
    resumedAuto.current = true;
    const position = gameRef.current;
    const pending = pendingMoveRef.current;
    const index = pendingMoveMatches(pending, position) ? pending.index : automaticMove(position);
    if (index === null || busyRef.current) return undefined;
    // Recovery also waits when the tab is hidden or a dialog is open, rather
    // than choosing and journaling a new automatic move in the background.
    return scheduler.schedule(() => {
      if (gameRef.current === position && !busyRef.current && activityRef.current.screen === 'game' && !activityRef.current.modal) {
        startMove(position, index);
      }
    }, 0);
  }, [screen]);

  // Only one cancellable computer action is queued for a settled position.
  // It uses exactly the same roll/move pipeline, journal and animation as a
  // person; changing screens, opening a dialog or rerendering cancels it.
  useEffect(() => {
    const position = gameRef.current;
    if (screen !== 'game' || modal || rolling || moving || busyRef.current || position !== game ||
        position.phase === 'won' || !isComputerPlayer(position, position.current)) return undefined;
    return scheduler.schedule(() => {
      if (activityRef.current.screen !== 'game' || activityRef.current.modal || document.hidden || scheduler.paused ||
          busyRef.current || gameRef.current !== position || !isComputerPlayer(position, position.current)) return;
      if (position.phase === 'roll') performRoll(true);
      else if (position.phase === 'choose') {
        const choice = chooseComputerMove(position);
        if (choice !== null) startMove(position, choice);
      }
    }, reducedMotion ? 250 : 650);
  }, [screen, modal, game, rolling, moving, reducedMotion, soundOn, scheduler]);

  const cancelAnimation = () => {
    scheduler.clear();
    busyRef.current = false;
    setRolling(false);
    setRollFrom(null);
    setMoving(null);
    setReactions([]);
  };
  const goHome = () => {
    cancelAnimation();
    setSelectedCount(playerCountFor(game));
    setSelectedMode(gameModeFor(game));
    setDraftPlayers(null);
    setModal(null);
    setScreen('home');
  };
  const openSetup = (count, mode = selectedMode) => {
    cancelAnimation();
    setSelectedCount(count);
    setSelectedMode(mode);
    setDraftPlayers((previous) => previous?.length === count ? previous : createPlayerSetup(count, characterChoices, hasSavedGame ? game : null));
    setModal(null);
    setScreen('setup');
  };
  const startNewGame = () => {
    if (!isValidPlayerSetup(draftPlayers)) return;
    cancelAnimation();
    setCharacterChoices((previous) => charactersFromSetup(draftPlayers, previous));
    if (commitGame(createGame(draftPlayers.length, colorsFromSetup(draftPlayers), selectedMode))) clearPendingMove(gameStorage());
    pendingMoveRef.current = null;
    setHasSavedGame(true);
    setDraftPlayers(null);
    setModal(null);
    setScreen('game');
  };
  const resetGame = () => {
    cancelAnimation();
    if (commitGame(createGame(playerCountFor(game), game.teamColors, gameModeFor(game)))) clearPendingMove(gameStorage());
    pendingMoveRef.current = null;
    setHasSavedGame(true);
    setModal(null);
  };
  const openModal = (type) => { scheduler.pause(); setModal(type); };
  const closeModal = useCallback(() => setModal(null), []);
  const winnerModal = screen === 'game' && game.phase === 'won' ? 'won' : modal;
  const computerTurn = isComputerPlayer(game, game.current) && game.phase !== 'won';
  const disabled = rolling || Boolean(moving) || computerTurn;
  const shownGame = rolling && rollFrom ? rollFrom : game;
  const playerCount = playerCountFor(game);
  const colors = colorsFor(playerCount);
  const pieces = useMemo(() => getVisualPieces(shownGame, moving, reactions, disabled), [shownGame, moving, reactions, disabled]);
  const playerName = (seat) => PLAYERS[teamColorFor(game, seat)].name;
  const reactingTeams = [...new Set(reactions.map((reaction) => playerName(reaction.color)))];
  const reactionNames = reactingTeams.join(' and ');
  const boardMessage = rolling ? 'Rolling the dice... good luck!' :
    moving?.phase === 'celebrate' ? `${playerName(moving.color)} made it home${moving.winning ? ' and wins' : ''}! Time to celebrate!${moving.winning ? ' The other teams look sad.' : ''}` :
      reactions.length ? (reactions.some((reaction) => reaction.phase === 'return' || reaction.phase === 'returned') ? `${reactionNames} ${reactingTeams.length === 1 ? 'is' : 'are'} heading sadly back to the yard.` : `Oh no! ${reactionNames} got sent back.`) :
        moving ? `${playerName(moving.color)} is on the move!` :
          computerTurn ? `${playerName(game.current)} computer is ${game.phase === 'choose' ? 'choosing a character' : 'getting ready to roll'}...` : game.message;
  const modalView = winnerModal && <Modal key={winnerModal} type={winnerModal} winner={game.winner} currentTeam={game.current} playerCount={playerCount} mode={screen === 'game' ? gameModeFor(game) : selectedMode} teamColors={game.teamColors} characterChoices={characterChoices}
    onChooseCharacter={(color, character) => setCharacterChoices((previous) => ({ ...previous, [color]: character }))}
    onClose={closeModal} onReset={winnerModal === 'won' ? resetGame : (count) => openSetup(count, gameModeFor(game))} onHome={goHome} />;

  if (screen === 'home') return <>
    <HomeScreen selectedCount={selectedCount} selectedMode={selectedMode} onCountChange={(count) => { setSelectedCount(count); setDraftPlayers(null); }}
      onModeChange={(mode) => { setSelectedMode(mode); setSelectedCount((count) => mode === 'computer' ? Math.min(count, 4) : count); setDraftPlayers(null); }}
      onPlay={() => openSetup(selectedCount)} onResume={() => { if (hasSavedGame) { setDraftPlayers(null); setSelectedCount(playerCountFor(game)); setSelectedMode(gameModeFor(game)); setModal(null); setScreen('game'); } }}
      hasSavedGame={hasSavedGame} game={game} characterChoices={characterChoices} onRules={() => openModal('rules')} offline={offline} canSave={canSave} />
    {modalView}
  </>;
  if (screen === 'setup' && draftPlayers) return <>
    <SetupScreen players={draftPlayers} mode={selectedMode} onPlayersChange={setDraftPlayers} onBack={() => { setModal(null); setScreen('home'); }}
      onStart={startNewGame} hasSavedGame={hasSavedGame} onRules={() => openModal('rules')} canSave={canSave} />
    {modalView}
  </>;

  return (
    <div className="app-shell" data-screen="game">
      <header className="topbar">
        <div className="topbar-inner">
          <Logo />
          <nav className="main-nav" aria-label="Main navigation">
            <a className="nav-active" href="#game">Play <span /></a>
            <button onClick={() => openModal('rules')}>How to play</button>
          </nav>
          <div className="top-actions">
            <span className="local-badge"><span /> {gameModeFor(game) === 'computer' ? 'VS COMPUTER' : 'LOCAL GAME'}</span>
            <span className="top-divider" />
            <button className="home-game-button" onClick={goHome} aria-label="Home"><Home size={17} /><span>Home</span></button>
            <button className="landscape-characters icon-button" onClick={() => openModal('characters')} aria-label="Choose characters" title="Choose characters"><UsersRound size={19} /></button>
            <button className="sound-button icon-button" onClick={() => setSoundOn(!soundOn)} aria-label={soundOn ? 'Mute sound' : 'Turn sound on'} title={soundOn ? 'Mute sound' : 'Turn sound on'}>
              {soundOn ? <Volume2 size={19} /> : <VolumeX size={19} />}
            </button>
            <button className="new-game-button" onClick={() => openModal('reset')} aria-label="New game" title="New game"><RotateCcw size={16} /> <span>New game</span></button>
          </div>
        </div>
      </header>
      {!canSave && <StorageWarning />}

      <main className="main-content" id="game">
        <div className="page-heading">
          <div>
            <div className="heading-kicker"><span className="kicker-star">✳</span> A LITTLE ROLL, A LOT OF FUN <span className="kicker-line" /></div>
            <h1 data-screen-title tabIndex={-1}>Let’s play <span>Ludo!</span><i>✦</i></h1>
            <p>{({ 2: 'Two', 3: 'Three', 4: 'Four', 5: 'Five', 6: 'Six' })[playerCount]} colors. So many characters. One happy little race home.</p>
          </div>
          <div className="heading-note"><span>✦</span> MADE FOR GAME NIGHTS <span>✦</span></div>
        </div>

        <div className="game-layout">
          <aside className="players-column">
            <div className="column-heading">
              <div><span className="section-eyebrow">THE GANG’S ALL HERE</span><h2>Players <span className="player-count">{playerCount}</span></h2></div>
              <span className="players-sparkle">✳</span>
            </div>
            <div className={`player-list ${playerCount > 4 ? 'player-list--extended' : ''}`}>
              {colors.map((color) => <PlayerCard key={color} color={color} game={shownGame} character={characterChoices[color]} />)}
            </div>
            <div className="winning-note">
              <div className="trophy-icon"><Trophy size={18} strokeWidth={2} /></div>
              <div><strong>Race you home!</strong><span>First to get all 4 home wins.</span></div>
            </div>
            <div className="players-footer"><span>✳</span> GOOD TIMES AHEAD <span>✳</span></div>
          </aside>

          <section className="board-column" aria-label="Game board">
            <div className="board-heading">
              <div className="board-heading-title"><span className="board-heading-icon"><Dices size={16} /></span><div><strong>The game board</strong><small>{playerCount <= 4 ? 'CLASSIC LUDO' : `${playerCount}-PLAYER LUDO`}</small></div></div>
              <button className="character-picker-trigger" onClick={() => openModal('characters')}><UsersRound size={15} /> Choose characters <span aria-hidden="true">✦</span></button>
            </div>
            <Board game={shownGame} pieces={pieces} characterChoices={characterChoices} onMove={handleMove} reducedMotion={reducedMotion} />
            <div className="board-message" role="status" aria-live="polite">
              <span className={`message-icon message-icon--${teamColorFor(game, game.current)}`}><Sparkles size={15} /></span>
              <span>{boardMessage}</span>
              <span className="board-message-end">✦</span>
            </div>
            <div className="board-bottomline"><span>✦ &nbsp; MADE FOR PLAYING TOGETHER</span><span>PASS, PLAY, REPEAT &nbsp; ✦</span></div>
          </section>

          <aside className="controls-column">
            <TurnCard game={shownGame} character={characterChoices[shownGame.current]} rolling={rolling} moving={moving} onRoll={handleRoll}
              onChoose={() => {
                const choice = moveChoicesRef.current?.querySelector('button');
                if (!choice) return;
                choice.scrollIntoView({ block: 'nearest', behavior: reducedMotion ? 'auto' : 'smooth' });
                choice.focus({ preventScroll: true });
              }} />
            {game.phase === 'choose' && !disabled && <MoveChoices game={game} pieces={pieces} onMove={handleMove} elementRef={moveChoicesRef} />}
            <div className="tip-card">
              <span className="tip-icon"><Star size={16} fill="currentColor" /></span>
              <p><strong>A little tip</strong><span>Stars are safe spots. You can’t get sent back from here!</span></p>
            </div>
            <QuickGuide onOpenRules={() => openModal('rules')} />
          </aside>
        </div>
        <footer className="footer"><span>Made for a little friendly competition <span>♡</span></span><span>ROLL. PLAY. REPEAT.</span></footer>
      </main>
      {modalView}
    </div>
  );
}

function GameError() {
  return <main className="app-error-screen">
    <div className="app-error-card">
      <span className="app-error-icon" aria-hidden="true">✦</span>
      <h1>Let’s try that again.</h1>
      <p>The game couldn’t finish loading. Your saved game is still here.</p>
      <button onClick={() => window.location.reload()}>Reload game</button>
    </div>
  </main>;
}

createRoot(document.getElementById('root')).render(<ErrorBoundary fallback={<GameError />}><App /></ErrorBoundary>);
