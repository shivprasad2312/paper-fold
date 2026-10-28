import React, { useState } from 'react';
import { ArrowLeft, ArrowRight, Bot, CircleCheck, CircleHelp, CloudOff, Dices, Play, RotateCcw, Sparkles, UsersRound } from 'lucide-react';
import { ALL_COLORS, PLAYER_COUNTS } from './boards.js';
import { CHARACTERS, CHARACTER_BY_ID } from './characters.js';
import { PLAYERS, colorsFor, gameModeFor, playerCountFor, teamColorFor } from './game.js';
import { swapPlayerColor } from './playerSetup.js';
import { Avatar, CharacterImage, Logo, StorageWarning } from './ui.jsx';
import './lobby.css';

function LobbyHeader({ onRules }) {
  return <header className="topbar lobby-topbar">
    <div className="topbar-inner">
      <Logo />
      <div className="lobby-header-actions">
        <span className="local-badge"><span /> LOCAL GAME</span>
        <button type="button" className="lobby-help" onClick={onRules} aria-label="How to play">
          <CircleHelp size={17} /><span>How to play</span>
        </button>
      </div>
    </div>
  </header>;
}

function MiniBoard() {
  return <div className="welcome-mini-board" aria-hidden="true">
    <div className="mini-cross mini-cross--vertical" />
    <div className="mini-cross mini-cross--horizontal" />
    {['yellow', 'red', 'blue', 'green'].map((color) => <div key={color} className={`mini-yard mini-yard--${color}`}>
      {[0, 1, 2, 3].map((slot) => <i key={slot} />)}
    </div>)}
    <div className="mini-center"><span>✦</span></div>
  </div>;
}

function WelcomeArt() {
  return <div className="welcome-art" aria-hidden="true">
    <div className="welcome-art-glow welcome-art-glow--one" />
    <div className="welcome-art-glow welcome-art-glow--two" />
    <span className="welcome-art-spark welcome-art-spark--one">✦</span>
    <span className="welcome-art-spark welcome-art-spark--two">✳</span>
    <span className="welcome-art-spark welcome-art-spark--three">✦</span>
    <div className="welcome-board-wrap"><MiniBoard /></div>
    <div className="welcome-friend welcome-friend--one"><CharacterImage character="aarav" color="yellow" /></div>
    <div className="welcome-friend welcome-friend--two"><CharacterImage character="diya" color="red" /></div>
    <div className="welcome-friend welcome-friend--three"><CharacterImage character="dog" color="blue" /></div>
    <div className="welcome-art-caption"><span>✳</span><div><strong>A little friendly competition</strong><small>BIG SMILES. BIGGER MEMORIES.</small></div></div>
  </div>;
}

function OfflineStatus({ offline }) {
  if (offline.state === 'development') return null;
  const message = offline.state === 'preparing' ? 'Preparing offline play…' :
    offline.state === 'unavailable' ? 'Offline play is not ready in this browser.' :
      offline.state === 'update' ? 'Update ready · close all game tabs to finish updating.' :
        offline.online ? 'Ready to play offline' : 'You’re offline · ready to play';
  return <div className={`offline-status offline-status--${offline.state}`} role="status" aria-live="polite">
    {offline.state === 'unavailable' || !offline.online ? <CloudOff size={16} aria-hidden="true" /> : <CircleCheck size={16} aria-hidden="true" />}
    <span>{message}</span>
  </div>;
}

export function HomeScreen({ selectedCount, selectedMode, onCountChange, onModeChange, onPlay, onResume, hasSavedGame, game, characterChoices, onRules, offline, canSave }) {
  const savedCount = playerCountFor(game);
  return <div className="app-shell lobby-shell" data-screen="home">
    <LobbyHeader onRules={onRules} />
    {!canSave && <StorageWarning />}
    <main className="welcome-layout">
      <div className="welcome-copy">
        <div className="welcome-kicker"><span>✳</span> MADE FOR PLAYING TOGETHER <i /></div>
        <h1 data-screen-title tabIndex={-1}>A little roll.<br /><span>A lot of fun.</span><i>✦</i></h1>
        <p className="welcome-description">Play with friends or challenge the computer, pick your characters, and race all the way home.</p>
        <section className="welcome-card" aria-labelledby="choose-count-title">
          <div className="welcome-card-heading">
            <div className="welcome-count-icon"><UsersRound size={20} strokeWidth={2.2} /></div>
            <div><h2 id="choose-count-title">Who’s playing?</h2><p>{selectedMode === 'computer' ? 'You and up to three computers' : 'Choose how you want to play'}</p></div>
            <span className="welcome-card-spark">✦</span>
          </div>
          <div className="lobby-mode-options" role="group" aria-label="Game mode">
            <button type="button" className={`lobby-mode-option ${selectedMode === 'local' ? 'is-selected' : ''}`}
              aria-label="Play with friends" aria-pressed={selectedMode === 'local'} onClick={() => onModeChange('local')}>
              <UsersRound size={19} aria-hidden="true" /><span><strong>With friends</strong><small>Pass & play</small></span>
            </button>
            <button type="button" className={`lobby-mode-option ${selectedMode === 'computer' ? 'is-selected' : ''}`}
              aria-label="Play with computer" aria-pressed={selectedMode === 'computer'} onClick={() => onModeChange('computer')}>
              <Bot size={19} aria-hidden="true" /><span><strong>Computer</strong><small>Play solo</small></span>
            </button>
          </div>
          <fieldset className="lobby-count-fieldset">
            <legend className="visually-hidden">Number of players</legend>
            <div className={`lobby-count-options ${selectedMode === 'computer' ? 'lobby-count-options--solo' : ''}`}>
              {PLAYER_COUNTS.filter((count) => selectedMode !== 'computer' || count <= 4).map((count) => <label key={count} className={`lobby-count-option ${selectedCount === count ? 'is-selected' : ''}`}>
                <input type="radio" name="lobby-player-count" value={count} checked={selectedCount === count}
                  onChange={() => onCountChange(count)} aria-label={`${count} players`} />
                <strong>{count}</strong><span>players</span>
              </label>)}
            </div>
          </fieldset>
          <div className="welcome-actions">
            <button type="button" className="welcome-play" onClick={onPlay}><Play size={18} fill="currentColor" /> Play <ArrowRight className="button-arrow" size={19} /></button>
            <button type="button" className="welcome-resume" onClick={onResume} disabled={!hasSavedGame}><RotateCcw size={17} /> Resume</button>
          </div>
          {hasSavedGame ? <div className="saved-game-note">
            <div className="saved-game-avatars" aria-hidden="true">{colorsFor(savedCount).map((seat) => <Avatar key={seat} color={teamColorFor(game, seat)} character={characterChoices[seat]} />)}</div>
            <span><strong>{canSave ? 'Your game is saved' : 'Game in progress'}</strong><small>{savedCount} players{gameModeFor(game) === 'computer' ? ' · vs computer' : ''} · pick up where you left off</small></span>
          </div> : <div className="welcome-save-hint"><span>✦</span> {canSave ? 'Your game will be saved on this device.' : 'You can still play in this tab.'}</div>}
        </section>
        <OfflineStatus offline={offline} />
        <div className="welcome-footnote"><Dices size={15} /> ONE DEVICE, LOTS OF GOOD TIMES <span>✦</span></div>
      </div>
      <WelcomeArt />
    </main>
  </div>;
}

const CATEGORIES = [['all', 'All'], ['family', 'Family'], ['animals', 'Animals'], ['adventure', 'On the go']];

export function SetupScreen({ players, mode, onPlayersChange, onBack, onStart, hasSavedGame, onRules, canSave }) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [category, setCategory] = useState('all');
  const [announcement, setAnnouncement] = useState('');
  const player = players[selectedIndex];
  const selectedCharacter = CHARACTER_BY_ID[player.character];
  const playerName = (index) => mode === 'computer' ? (index === 0 ? 'You' : `Computer ${index}`) : `Player ${index + 1}`;

  const chooseCharacter = (character) => {
    onPlayersChange((current) => current.map((entry, index) => index === selectedIndex ? { ...entry, character: character.id } : entry));
    setAnnouncement(`${character.name} selected for ${playerName(selectedIndex)}.`);
  };
  const chooseColor = (color) => {
    const previousOwner = players.findIndex((entry) => entry.color === color);
    const previousColor = player.color;
    onPlayersChange((current) => swapPlayerColor(current, selectedIndex, color));
    setAnnouncement(previousOwner >= 0 && previousOwner !== selectedIndex
      ? `${playerName(selectedIndex)} is ${PLAYERS[color].name}. ${playerName(previousOwner)} is now ${PLAYERS[previousColor].name}.`
      : `${playerName(selectedIndex)} is ${PLAYERS[color].name}.`);
  };

  return <div className="app-shell lobby-shell" data-screen="setup">
    <LobbyHeader onRules={onRules} />
    {!canSave && <StorageWarning />}
    <main className="setup-layout">
      <div className="setup-topline">
        <button type="button" className="setup-back" onClick={onBack}><ArrowLeft size={17} /> Back</button>
        <div className="setup-steps" aria-label="Step 2 of 3: choose characters and colors">
          <span className="is-complete"><i>✓</i> Players</span><b />
          <span className="is-current"><i>2</i> Your crew</span><b />
          <span><i>3</i> Play</span>
        </div>
        <span className="setup-topline-spacer" />
      </div>
      <div className="setup-heading">
        <div><div className="welcome-kicker"><span>✳</span> YOUR GAME, YOUR CREW <i /></div>
          <h1 data-screen-title tabIndex={-1}>Let’s meet the <span>players.</span><i>✦</i></h1>
          <p>Choose a player, pick their character, then choose their color.</p>
        </div>
        <div className="setup-count-pill"><UsersRound size={15} /> {players.length} PLAYERS</div>
      </div>

      <section className="crew-section" aria-label="Choose a player to customize">
        <div className="setup-section-heading"><span><b>01</b> THE PLAYERS</span><small>Choose someone to customize</small></div>
        <div className="crew-list">
          {players.map((entry, index) => <button type="button" key={entry.seat} data-player-index={index}
            className={`crew-card crew-card--${entry.color} ${selectedIndex === index ? 'is-selected' : ''}`}
            aria-label={`Customize ${playerName(index)}, ${CHARACTER_BY_ID[entry.character].name}, ${PLAYERS[entry.color].name}`}
            aria-pressed={selectedIndex === index} onClick={() => { setSelectedIndex(index); setCategory('all'); }}>
            <Avatar color={entry.color} character={entry.character} />
            <span className="crew-card-copy"><strong>{playerName(index)}</strong><small>{CHARACTER_BY_ID[entry.character].name}</small><em><i /> {PLAYERS[entry.color].name}</em></span>
            {selectedIndex === index && <span className="crew-selected-check" aria-hidden="true">✓</span>}
          </button>)}
        </div>
      </section>

      <section className={`customize-card customize-card--${player.color}`} aria-labelledby="customize-title">
        <div className="customize-header">
          <div className="customize-header-avatar"><Avatar color={player.color} character={player.character} size="large" /></div>
          <div className="customize-header-copy"><span className="section-eyebrow">NOW PICKING FOR</span><h2 id="customize-title">{playerName(selectedIndex)} <span>✦</span></h2><p>{selectedCharacter.name} in {PLAYERS[player.color].name.toLowerCase()} · {player.seat === players[0].seat ? 'first to roll' : mode === 'computer' ? 'computer opponent' : `player ${selectedIndex + 1} of ${players.length}`}</p></div>
          <div className="customize-header-note"><Sparkles size={15} /> Everyone can choose the same character!</div>
        </div>

        <div className="setup-picker-heading"><div className="setup-section-heading"><span><b>02</b> CHOOSE A CHARACTER</span></div><small>Pick your favorite little teammate</small></div>
        <div className="character-filters setup-filters" role="group" aria-label="Character categories">
          {CATEGORIES.map(([id, label]) => <button type="button" key={id} className={category === id ? 'is-selected' : ''}
            aria-pressed={category === id} onClick={() => setCategory(id)}>{label}{id === 'all' && <span>{CHARACTERS.length}</span>}</button>)}
        </div>
        <div className="character-grid setup-character-grid" role="group" aria-label={`Character choices for ${playerName(selectedIndex)}`}>
          {CHARACTERS.filter((character) => category === 'all' || character.category === category).map((character) => {
            const selected = player.character === character.id;
            return <button type="button" key={character.id} data-choice={character.id}
              className={`character-option character-option--${player.color} ${selected ? 'is-selected' : ''}`}
              aria-label={`Choose ${character.name} for ${playerName(selectedIndex)}`} aria-pressed={selected}
              onClick={() => chooseCharacter(character)}>
              <span className="character-option-art"><CharacterImage character={character.id} color={player.color} />{selected && <span className="character-check" aria-hidden="true">✓</span>}</span>
              <strong>{character.name}</strong><small>{character.description}</small>
            </button>;
          })}
        </div>

        <div className="setup-color-heading"><div className="setup-section-heading"><span><b>03</b> CHOOSE A COLOR</span></div><small>Each player gets their own color</small></div>
        <div className="color-options" role="group" aria-label={`Colors for ${playerName(selectedIndex)}`}>
          {ALL_COLORS.map((color) => {
            const owner = players.findIndex((entry) => entry.color === color);
            const selected = player.color === color;
            return <button type="button" key={color} data-color-option={color}
              className={`color-option color-option--${color} ${selected ? 'is-selected' : ''}`}
              aria-label={`Choose ${PLAYERS[color].name} for ${playerName(selectedIndex)}${owner >= 0 && owner !== selectedIndex ? `, swaps with ${playerName(owner)}` : ''}`}
              aria-pressed={selected} onClick={() => chooseColor(color)}>
              <span className="color-option-swatch">{selected && <span aria-hidden="true">✓</span>}</span>
              <span><strong>{PLAYERS[color].name}</strong><small>{selected ? 'Selected' : owner >= 0 ? playerName(owner) : 'Available'}</small></span>
            </button>;
          })}
        </div>
        <p className="color-swap-hint">Picking an already-used color swaps it with that player.</p>
        <span className="visually-hidden" aria-live="polite">{announcement}</span>
      </section>

      <div className="setup-bottom">
        <div><strong>Everyone ready?</strong><span>{hasSavedGame ? 'Starting a new game replaces your saved game.' : 'You can change characters during the game, too.'}</span></div>
        <button type="button" className="welcome-play setup-start" onClick={onStart}>Start game <ArrowRight size={19} /></button>
      </div>
      <div className="setup-footer">PASS, PLAY, REPEAT <span>✦</span> MADE FOR GOOD TIMES</div>
    </main>
  </div>;
}
