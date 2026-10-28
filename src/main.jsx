import React, { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  ArrowDown, ArrowLeft, ArrowRight, ArrowUp, ArrowUpRight, Dices, Home,
  RotateCcw, Sparkles, Star, Trophy, Volume2, VolumeX, X,
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
import {
  COLORS, FINISH, PLAYERS, STORAGE_KEY, TRACK,
  createGame, isValidGame, movePiece, randomRoll, rollDice,
} from './game.js';
import { animationLabels, getMoveEffects, getVisualPieces } from './visuals.js';
import ErrorBoundary from './ErrorBoundary.jsx';

const ClassicCharacters = lazy(() => import('./ClassicCharacters.jsx'));
const ThreeBoard = lazy(() => import('./ThreeBoard.jsx'));

function loadGame() {
  try {
    const saved = JSON.parse(window.localStorage.getItem(STORAGE_KEY));
    return isValidGame(saved) ? saved : createGame();
  } catch {
    return createGame();
  }
}

function Logo() {
  return (
    <div className="logo" aria-label="Ludo Club">
      <span className="logo-mark" aria-hidden="true">
        <i /><i /><i /><i />
      </span>
      <span className="logo-word">ludo<span>club</span><b>.</b></span>
    </div>
  );
}

function Avatar({ color, size = 'normal' }) {
  const player = PLAYERS[color];
  return (
    <span className={`avatar avatar--${color} avatar--${size}`} aria-hidden="true">
      <img src={player.image} alt="" draggable="false" />
    </span>
  );
}

function PlayerCard({ color, game }) {
  const player = PLAYERS[color];
  const active = game.current === color && game.phase !== 'won';
  const finished = game.pieces[color].filter((piece) => piece === FINISH).length;
  return (
    <div className={`player-card player-card--${color} ${active ? 'is-active' : ''}`}>
      <Avatar color={color} />
      <div className="player-card-copy">
        <div className="player-card-heading">
          <strong>{player.name}</strong>
          {active && <span className="turn-pill"><span /> TURN</span>}
        </div>
        <span className="player-number">{player.label}</span>
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

function BoardTiles() {
  return (
    <div className="board-tiles" aria-hidden="true">
      {TRACK.map(([row, col], index) => {
        const start = starts[index];
        const entrance = entrances[`${row},${col}`];
        const star = stars[index];
        const Icon = start?.Icon || entrance?.Icon;
        const color = start?.color || entrance?.color || star;
        return (
          <div
            key={`track-${index}`}
            className={`board-tile ${start ? `board-tile--start board-tile--${color}` : ''}`}
            style={{ gridRow: row + 1, gridColumn: col + 1, '--tile-color': color ? PLAYERS[color].hex : undefined }}
          >
            {Icon && <Icon className={`tile-arrow ${start ? 'tile-arrow--start' : ''}`} strokeWidth={3} />}
            {star && <Star className="tile-star" fill="currentColor" strokeWidth={1} />}
          </div>
        );
      })}
      {COLORS.flatMap((color) => PLAYERS[color].lane.map(([row, col], i) => (
        <div
          key={`${color}-lane-${i}`}
          className={`board-tile board-tile--lane board-tile--${color}`}
          style={{ gridRow: row + 1, gridColumn: col + 1 }}
        >{i === 4 && <span className="lane-sparkle">✦</span>}</div>
      )))}
    </div>
  );
}

function BoardHome({ color, active }) {
  const [row, col] = PLAYERS[color].home;
  return (
    <div
      className={`board-home board-home--${color} ${active ? 'board-home--active' : ''}`}
      style={{ top: `${row / 15 * 100}%`, left: `${col / 15 * 100}%` }}
      aria-hidden="true"
    >
      <span className="home-label"><span /> {PLAYERS[color].name}</span>
      <span className="home-doodle home-doodle--one">✦</span>
      <span className="home-doodle home-doodle--two">✳</span>
      {[0, 1, 2, 3].map((i) => <span key={i} className={`home-slot home-slot--${i}`} />)}
    </div>
  );
}

function BoardCenter() {
  return (
    <div className="board-center" aria-hidden="true">
      <div className="center-triangle center-triangle--red" />
      <div className="center-triangle center-triangle--blue" />
      <div className="center-triangle center-triangle--green" />
      <div className="center-triangle center-triangle--yellow" />
      <span className="center-badge"><Home strokeWidth={2.5} /></span>
    </div>
  );
}

function Board({ game, pieces, onMove, reducedMotion }) {
  const [characterStatus, setCharacterStatus] = useState('loading');
  return (
    <div className="board-frame">
      <div className="board" aria-label="Ludo game board">
        <BoardTiles />
        {COLORS.map((color) => <BoardHome key={color} color={color} active={game.current === color} />)}
        <BoardCenter />
        {characterStatus !== 'failed' && <ErrorBoundary onError={() => setCharacterStatus('failed')}>
          <Suspense fallback={null}>
            <ClassicCharacters pieces={pieces} reducedMotion={reducedMotion} onStatus={setCharacterStatus} />
          </Suspense>
        </ErrorBoundary>}
        <div className="pieces-layer">
          {pieces.map(({ color, index, progress, row, col, stacked, selectable, pose, duration, heading, showReactionBubble }) => {
            const reaction = pose === 'dance' ? 'Yay!' : showReactionBubble && (pose === 'sad' || pose === 'sad-walk') ? 'Oh no!' : null;
            const position = progress < 0 ? 'in the yard' : progress === FINISH ? 'at home' : `on space ${progress + 1}`;
            return (
              <button
                type="button"
                key={`${color}-${index}`}
                data-character={`${color}-${index}`}
                data-pose={pose}
                data-heading={heading.toFixed(3)}
                className={`game-piece game-piece--${color} ${progress < 0 ? 'game-piece--yard' : 'game-piece--track'} ${selectable ? 'is-selectable' : ''} ${stacked ? 'is-stacked' : ''}`}
                style={{ left: `${col / 15 * 100}%`, top: `${row / 15 * 100}%`, zIndex: Math.round(row * 10) + (selectable || reaction ? 200 : 0), '--motion-duration': `${duration}ms` }}
                onClick={() => onMove(index)}
                disabled={!selectable}
                aria-label={`${PLAYERS[color].name} character ${index + 1}, ${position}${animationLabels[pose] ? `, ${animationLabels[pose]}` : ''}${selectable ? ', select to move' : ''}`}
              >
                <span className="piece-highlight" />
                <span className="piece-shadow" />
                {characterStatus !== 'ready' && <img src={PLAYERS[color].image} alt="" draggable="false" />}
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

function TurnCard({ game, rolling, moving, onRoll }) {
  const player = PLAYERS[game.current];
  const choosing = game.phase === 'choose';
  const ended = game.phase === 'won';
  return (
    <div className={`turn-card turn-card--${game.current}`}>
      <div className="turn-card-top">
        <div>
          <span className="section-eyebrow">IT’S GAME TIME</span>
          <h2>{ended ? 'Game over!' : <>{player.name}’s turn <span>✦</span></>}</h2>
          <p>{ended ? 'What a game!' : choosing ? 'Choose a character to move.' : 'Ready, set, roll!'}</p>
        </div>
        <Avatar color={game.current} size="small" />
      </div>
      <div className="dice-area">
        <span className="dice-confetti dice-confetti--one">✦</span>
        <span className="dice-confetti dice-confetti--two">✳</span>
        <Dice value={game.roll} rolling={rolling} />
        <span className="dice-caption">{rolling ? 'ROLLING...' : game.roll ? `LAST ROLL · ${game.roll}` : 'GOOD LUCK!'}</span>
      </div>
      <button
        className="roll-button"
        onClick={onRoll}
        disabled={rolling || Boolean(moving) || choosing || ended}
      >
        <Dices size={20} strokeWidth={2.2} />
        {rolling ? 'Rolling...' : choosing ? 'Choose a character' : ended ? 'Game finished' : game.sixes > 0 ? 'Roll again' : 'Roll the dice'}
        {!choosing && !ended && !rolling && <ArrowRight className="roll-arrow" size={18} />}
      </button>
      <p className="turn-helper">{choosing ? 'Tap one of the glowing characters on the board.' : ended ? 'Start a new game to play again.' : 'Roll a 6 to bring a character out.'}</p>
    </div>
  );
}

function RulesContent() {
  return (
    <div className="rules-list">
      <div><span className="rule-number rule-number--yellow">01</span><p><strong>Roll a six to start</strong><small>Choose a character in your yard to bring them onto the board. A six earns you another roll!</small></p></div>
      <div><span className="rule-number rule-number--red">02</span><p><strong>Make your way around</strong><small>Move clockwise. Land on an opponent to send them back, but star and starting squares are safe.</small></p></div>
      <div><span className="rule-number rule-number--blue">03</span><p><strong>Bring everyone home</strong><small>Follow your colored path to the middle. You need an exact roll; the first player to get all four home wins.</small></p></div>
      <div><span className="rule-number rule-number--green">04</span><p><strong>Keep an eye on those sixes</strong><small>Three sixes in a row ends your turn. Share the screen and pass the dice to the next player.</small></p></div>
    </div>
  );
}

function Modal({ type, winner, onClose, onReset }) {
  const modalRef = useRef(null);
  useEffect(() => {
    const previousFocus = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    modalRef.current?.querySelector('[data-initial-focus]')?.focus();
    const handler = (event) => {
      if (event.key === 'Escape' && type !== 'won') onClose();
      if (event.key !== 'Tab') return;
      const focusable = Array.from(modalRef.current?.querySelectorAll('button:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])') || []);
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
    <div className="modal-overlay" onMouseDown={(event) => { if (event.target === event.currentTarget && type !== 'won') onClose(); }}>
      <section ref={modalRef} className={`modal modal--${type}`} role="dialog" aria-modal="true" aria-labelledby="modal-title">
        {type !== 'won' && <button className="modal-close icon-button" onClick={onClose} aria-label="Close dialog"><X size={19} /></button>}
        {type === 'rules' && <>
          <div className="modal-symbol modal-symbol--yellow"><Dices size={25} /></div>
          <span className="section-eyebrow">A LITTLE HELPING HAND</span>
          <h2 id="modal-title">Here’s how to play.</h2>
          <p className="modal-intro">A classic game, made for good times. Here are the basics.</p>
          <RulesContent />
          <button className="modal-primary" onClick={onClose} data-initial-focus>Got it, let’s play! <ArrowRight size={18} /></button>
        </>}
        {type === 'reset' && <>
          <div className="modal-symbol modal-symbol--red"><RotateCcw size={24} /></div>
          <span className="section-eyebrow">A FRESH START</span>
          <h2 id="modal-title">Start a new game?</h2>
          <p className="modal-intro">Your current game will be cleared and all four characters will head back to their yards.</p>
          <div className="modal-actions">
            <button className="modal-secondary" onClick={onClose} data-initial-focus>Keep playing</button>
            <button className="modal-primary" onClick={onReset}>Yes, new game <ArrowRight size={18} /></button>
          </div>
        </>}
        {type === 'won' && winner && <>
          <div className={`winner-avatar winner-avatar--${winner}`}><Avatar color={winner} size="large" /><span>✦</span></div>
          <span className="section-eyebrow">WE HAVE A WINNER!</span>
          <h2 id="modal-title">{PLAYERS[winner].name} takes the crown!</h2>
          <p className="modal-intro">All four characters made it home. That was one for the books!</p>
          <button className="modal-primary" onClick={onReset} data-initial-focus><RotateCcw size={18} /> Play again</button>
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
  const [game, setGame] = useState(loadGame);
  const [rolling, setRolling] = useState(false);
  const [moving, setMoving] = useState(null);
  const [reactions, setReactions] = useState([]);
  const reducedMotion = useReducedMotion();
  const [modal, setModal] = useState(null);
  const [view, setView] = useState('classic');
  const [soundOn, setSoundOn] = useState(false);
  const busyRef = useRef(false);
  const timers = useRef([]);
  const audioContext = useRef(null);

  useEffect(() => {
    try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(game)); } catch { /* Storage is optional. */ }
  }, [game]);

  useEffect(() => () => {
    timers.current.forEach(window.clearTimeout);
    if (audioContext.current) audioContext.current.close().catch(() => {});
  }, []);

  const schedule = (callback, delay) => {
    const timer = window.setTimeout(() => {
      timers.current = timers.current.filter((item) => item !== timer);
      callback();
    }, delay);
    timers.current.push(timer);
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

  const handleRoll = () => {
    if (busyRef.current || game.phase !== 'roll') return;
    busyRef.current = true;
    setRolling(true);
    playSound('roll');
    const die = randomRoll();
    schedule(() => {
      setGame((previous) => rollDice(previous, die));
      setRolling(false);
      busyRef.current = false;
    }, reducedMotion ? 100 : 700);
  };

  const handleMove = (index) => {
    if (busyRef.current || game.phase !== 'choose' || !game.legal.includes(index)) return;
    busyRef.current = true;
    playSound('move');
    const color = game.current;
    const progress = game.pieces[color][index];
    const steps = progress === -1 ? [0] : Array.from({ length: game.roll }, (_, n) => progress + n + 1);
    const nextGame = movePiece(game, index);
    const effects = getMoveEffects(game, nextGame, color, index);
    const timings = reducedMotion
      ? { step: 75, leave: 100, celebrate: 650, sad: 500, return: 100, rest: 250 }
      : { step: 420, leave: 720, celebrate: 1900, sad: 1250, return: 900, rest: 550 };
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
      // The actual rule change happens once, after the visible reactions. Until
      // then the saved state is unchanged, so a refresh cannot corrupt a turn.
      setGame(nextGame);
      setReactions([]);
      setMoving(null);
      busyRef.current = false;
    };
    schedule(() => {
      if (effects.reachedHome) {
        const winning = nextGame.phase === 'won';
        setMoving({ ...finalMotion, phase: 'celebrate', winning });
        if (winning) {
          // The other teams react too, before the winner dialog covers the board.
          const defeated = COLORS.filter((other) => other !== color).flatMap((other) => {
            const firstVisible = game.pieces[other].findIndex((piece) => piece < FINISH);
            return game.pieces[other].flatMap((piece, pieceIndex) => piece < FINISH
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
        schedule(() => setReactions(effects.captured.map((piece) => ({ ...piece, phase: 'return', duration: timings.return }))), timings.sad);
        schedule(finishMove, timings.sad + timings.return + timings.rest);
      } else {
        finishMove();
      }
    }, elapsed + 35);
  };

  const resetGame = () => {
    timers.current.forEach(window.clearTimeout);
    timers.current = [];
    busyRef.current = false;
    setRolling(false);
    setMoving(null);
    setReactions([]);
    setGame(createGame());
    setModal(null);
  };
  const closeModal = useCallback(() => setModal(null), []);
  const winnerModal = game.phase === 'won' ? 'won' : modal;
  const disabled = rolling || Boolean(moving);
  const pieces = useMemo(() => getVisualPieces(game, moving, reactions, disabled), [game, moving, reactions, disabled]);
  const reactingTeams = [...new Set(reactions.map((reaction) => PLAYERS[reaction.color].name))];
  const reactionNames = reactingTeams.join(' and ');
  const boardMessage = rolling ? 'Rolling the dice... good luck!' :
    moving?.phase === 'celebrate' ? `${PLAYERS[moving.color].name} made it home${moving.winning ? ' and wins' : ''}! Time to celebrate!${moving.winning ? ' The other teams look sad.' : ''}` :
      reactions.length ? (reactions[0].phase === 'return' ? `${reactionNames} ${reactingTeams.length === 1 ? 'is' : 'are'} heading sadly back to the yard.` : `Oh no! ${reactionNames} got sent back.`) :
        moving ? `${PLAYERS[moving.color].name} is on the move!` : game.message;

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="topbar-inner">
          <Logo />
          <nav className="main-nav" aria-label="Main navigation">
            <a className="nav-active" href="#game">Play <span /></a>
            <button onClick={() => setModal('rules')}>How to play</button>
          </nav>
          <div className="top-actions">
            <span className="local-badge"><span /> LOCAL GAME</span>
            <span className="top-divider" />
            <button className="sound-button icon-button" onClick={() => setSoundOn(!soundOn)} aria-label={soundOn ? 'Mute sound' : 'Turn sound on'} title={soundOn ? 'Mute sound' : 'Turn sound on'}>
              {soundOn ? <Volume2 size={19} /> : <VolumeX size={19} />}
            </button>
            <button className="new-game-button" onClick={() => setModal('reset')}><RotateCcw size={16} /> <span>New game</span></button>
          </div>
        </div>
      </header>

      <main className="main-content" id="game">
        <div className="page-heading">
          <div>
            <div className="heading-kicker"><span className="kicker-star">✳</span> A LITTLE ROLL, A LOT OF FUN <span className="kicker-line" /></div>
            <h1>Let’s play <span>Ludo!</span><i>✦</i></h1>
            <p>Four colors. Four characters. One happy little race home.</p>
          </div>
          <div className="heading-note"><span>✦</span> MADE FOR GAME NIGHTS <span>✦</span></div>
        </div>

        <div className="game-layout">
          <aside className="players-column">
            <div className="column-heading">
              <div><span className="section-eyebrow">THE GANG’S ALL HERE</span><h2>Players <span className="player-count">4</span></h2></div>
              <span className="players-sparkle">✳</span>
            </div>
            <div className="player-list">
              {COLORS.map((color) => <PlayerCard key={color} color={color} game={game} />)}
            </div>
            <div className="winning-note">
              <div className="trophy-icon"><Trophy size={18} strokeWidth={2} /></div>
              <div><strong>Race you home!</strong><span>First to get all 4 home wins.</span></div>
            </div>
            <div className="players-footer"><span>✳</span> GOOD TIMES AHEAD <span>✳</span></div>
          </aside>

          <section className="board-column" aria-label="Game board">
            <div className="board-heading">
              <div className="board-heading-title"><span className="board-heading-icon"><Dices size={16} /></span><div><strong>The game board</strong><small>CLASSIC LUDO</small></div></div>
              <div className="view-switch" role="group" aria-label="Board view">
                <button className={view === 'classic' ? 'selected' : ''} onClick={() => setView('classic')} aria-pressed={view === 'classic'}>Classic</button>
                <button className={view === '3d' ? 'selected' : ''} onClick={() => setView('3d')} aria-pressed={view === '3d'}>3D view <span>✦</span></button>
              </div>
            </div>
            {view === 'classic' ? (
              <Board game={game} pieces={pieces} onMove={handleMove} reducedMotion={reducedMotion} />
            ) : (
              <ErrorBoundary fallback={<ThreeViewError onFallback={() => setView('classic')} />}>
                <Suspense fallback={<div className="board-loading">Getting the 3D board ready...</div>}>
                  <ThreeBoard game={game} pieces={pieces} onMove={handleMove} disabled={disabled} reducedMotion={reducedMotion} onFallback={() => setView('classic')} />
                </Suspense>
              </ErrorBoundary>
            )}
            <div className="board-message" role="status" aria-live="polite">
              <span className={`message-icon message-icon--${game.current}`}><Sparkles size={15} /></span>
              <span>{boardMessage}</span>
              <span className="board-message-end">✦</span>
            </div>
            <div className="board-bottomline"><span>✦ &nbsp; MADE FOR PLAYING TOGETHER</span><span>PASS, PLAY, REPEAT &nbsp; ✦</span></div>
          </section>

          <aside className="controls-column">
            <TurnCard game={game} rolling={rolling} moving={moving} onRoll={handleRoll} />
            <div className="tip-card">
              <span className="tip-icon"><Star size={16} fill="currentColor" /></span>
              <p><strong>A little tip</strong><span>Stars are safe spots. You can’t get sent back from here!</span></p>
            </div>
            <QuickGuide onOpenRules={() => setModal('rules')} />
          </aside>
        </div>
        <footer className="footer"><span>Made for a little friendly competition <span>♡</span></span><span>ROLL. PLAY. REPEAT.</span></footer>
      </main>
      {winnerModal && <Modal type={winnerModal} winner={game.winner} onClose={closeModal} onReset={resetGame} />}
    </div>
  );
}

function ThreeViewError({ onFallback }) {
  return <div className="three-board-frame"><div className="three-error">
    The 3D view couldn’t load, but you can keep playing in Classic.
    <button onClick={onFallback}>Return to classic board</button>
  </div></div>;
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
