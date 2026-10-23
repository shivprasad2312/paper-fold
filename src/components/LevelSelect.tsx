import { useMemo } from 'react';
import { LEVEL_DATA } from '../game/levels.data';
import { SHAPE_LABELS } from '../game/shapes';
import { maxUnlocked, totalStars } from '../game/progress';

interface Props {
  stars: Record<number, number>;
  onPick: (id: number) => void;
}

const TIER_NAMES = [
  'First Knots',
  'Loose Threads',
  'Loom Rings',
  'Star Spindle',
  'Heartstrings',
  'Arrow Weave',
  'Cross Stitch',
  'Grand Tangle',
  'Master Loom',
  "Weaver's Nightmare",
];

export default function LevelSelect({ stars, onPick }: Props) {
  const unlocked = useMemo(() => maxUnlocked(LEVEL_DATA.length), [stars]);
  const earned = useMemo(() => totalStars(), [stars]);

  return (
    <div className="select-screen">
      <div className="select-head">
        <div>
          <p className="eyebrow">Rope Untangle</p>
          <h1>Choose a puzzle</h1>
        </div>
        <div className="star-total">⭐ {earned} / {LEVEL_DATA.length * 3}</div>
      </div>

      <div className="select-scroll">
        {TIER_NAMES.map((tierName, tier) => {
          const levels = LEVEL_DATA.filter((l) => l.tier === tier);
          return (
            <section className="tier" key={tier}>
              <div className="tier-head">
                <span className="tier-badge">{tier + 1}</span>
                <h2>{tierName}</h2>
                <span className="tier-meta">
                  {levels[0].pairs.length} ropes · {SHAPE_LABELS[levels[0].shape]}
                </span>
              </div>
              <div className="level-grid">
                {levels.map((l) => {
                  const locked = l.id > unlocked;
                  const s = stars[l.id] ?? 0;
                  return (
                    <button
                      key={l.id}
                      className={`level-card ${locked ? 'level-locked' : ''}`}
                      disabled={locked}
                      onClick={() => onPick(l.id)}
                    >
                      <span className="level-no">{l.id + 1}</span>
                      <span className="level-shape">{SHAPE_LABELS[l.shape]}</span>
                      <span className="level-stars">
                        {locked ? '🔒' : [0, 1, 2].map((i) => (i < s ? '★' : '☆')).join('')}
                      </span>
                    </button>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
