import { useEffect, useState } from 'react';
import { SKILL_BRANCHES, SKILL_CHOICES, SKILL_NODES } from '../data/skillTree';
import { formatNumber } from './formatNumber.js';
import './RunLevelBar.css';

const CHOICES_BY_ID = new Map(SKILL_CHOICES.map((c) => [c.id, c]));
const NODES_BY_ID = new Map(SKILL_NODES.map((n) => [n.id, n]));
const REFRESH_MS = 250;
/** Whole collisions below 10K, short form (12.34K) above. */
const formatCount = (n) => (n < 1e4 ? String(Math.floor(n)) : formatNumber(n));

const colorOf = (skillId) => SKILL_BRANCHES[NODES_BY_ID.get(skillId)?.branch]?.color ?? '#94a3b8';

function ChoiceCard({ view, onChoose }) {
  const choice = CHOICES_BY_ID.get(view.id);
  const skill = NODES_BY_ID.get(view.skillId);
  return (
    <button
      type="button"
      className="run-choice"
      style={{ '--skill': colorOf(view.skillId) }}
      onClick={() => onChoose(view.id)}
    >
      <span className="run-choice-skill">{skill?.label}</span>
      <span className="run-choice-icon" aria-hidden="true">{choice.icon}</span>
      <strong className="run-choice-label">{choice.label}</strong>
      <span className="run-choice-desc">{choice.description}</span>
      <span className="run-choice-next">
        {view.stacks > 0 ? <>{view.now} → <b>{view.next}</b></> : <b>{view.next}</b>}
      </span>
      <span className="run-choice-stacks">{view.stacks}/{view.maxStacks}</span>
    </button>
  );
}

/**
 * The per-prestige level bar under the board. Shape collisions fill it;
 * each level-up banks a pick from the unlocked skills' upgrades. The game
 * keeps running while the choices are open.
 */
function RunLevelBar({ serverRef }) {
  const [data, setData] = useState(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const refresh = () => setData(serverRef.current?.getRunLevelData() ?? null);
    refresh();
    const id = window.setInterval(refresh, REFRESH_MS);
    return () => window.clearInterval(id);
  }, [serverRef]);

  if (!data?.active) return null;

  const fraction = Math.min(1, data.xp / Math.max(1, data.xpToNext));
  const hasPick = data.pendingPicks > 0;
  const choose = (id) => {
    if (serverRef.current?.chooseLevelUpgrade(id)) {
      const next = serverRef.current.getRunLevelData();
      setData(next);
      if (next.pendingPicks <= 0) setOpen(false);
    }
  };

  return (
    <section className={`run-level ${hasPick ? 'has-pick' : ''}`} aria-label="Run level">
      <div className="run-level-row">
        <span className="run-level-badge" title="Run level (resets on prestige)">Lv {data.level}</span>
        <div
          className="run-level-track"
          role="progressbar"
          aria-label="Level progress"
          aria-valuemin={0}
          aria-valuemax={data.xpToNext}
          aria-valuenow={Math.floor(data.xp)}
        >
          <div className="run-level-fill" style={{ width: `${fraction * 100}%` }} />
          <span className="run-level-text">
            {formatCount(data.xp)} / {formatCount(data.xpToNext)} collisions
          </span>
        </div>
        {hasPick && (
          <button type="button" className="run-level-pick" onClick={() => setOpen((v) => !v)} aria-expanded={open}>
            {open ? 'Hide' : `Level up!${data.pendingPicks > 1 ? ` ×${data.pendingPicks}` : ''}`}
          </button>
        )}
      </div>

      {hasPick && open && (
        data.offer.length ? (
          <div className="run-choices">
            {data.offer.map((view) => <ChoiceCard key={view.id} view={view} onChoose={choose} />)}
          </div>
        ) : (
          <p className="run-level-note">Every upgrade for your unlocked skills is maxed this run.</p>
        )
      )}

      {data.picks.length > 0 && (
        <ul className="run-picks" aria-label="Upgrades this run">
          {data.picks.map((view) => (
            <li key={view.id} style={{ '--skill': colorOf(view.skillId) }} title={view.now}>
              <span aria-hidden="true">{CHOICES_BY_ID.get(view.id)?.icon}</span>
              {CHOICES_BY_ID.get(view.id)?.label} <b>×{view.stacks}</b>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export default RunLevelBar;
