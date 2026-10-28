import React from 'react';
import { PLAYERS } from './game.js';
import { characterImage } from './characters.js';

export function CharacterImage({ character, color, ...props }) {
  return <img src={characterImage(character, color)} alt="" draggable="false"
    onError={(event) => {
      const image = event.currentTarget;
      // If even the original fallback is unavailable, do not retry forever.
      if (new URL(image.src, window.location.href).pathname !== PLAYERS[color].image) image.src = PLAYERS[color].image;
    }} {...props} />;
}

export function StorageWarning() {
  return <div className="storage-warning" role="alert">
    <strong>Game saving is unavailable.</strong> You can play, but progress may be lost if you reload or close this tab.
  </div>;
}

export function Logo() {
  return (
    <div className="logo" aria-label="Ludo Club">
      <span className="logo-mark" aria-hidden="true"><i /><i /><i /><i /></span>
      <span className="logo-word">ludo<span>club</span><b>.</b></span>
    </div>
  );
}

export function Avatar({ color, character, size = 'normal' }) {
  return (
    <span className={`avatar avatar--${color} avatar--${size}`} aria-hidden="true">
      <CharacterImage character={character} color={color} />
    </span>
  );
}
