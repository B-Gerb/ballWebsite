import { useCallback, useEffect, useMemo, useState } from 'react';
import { SKILL_BRANCHES, SKILL_NODES } from '../data/skillTree';
import NodeGraph from './whiteboard/NodeGraph.jsx';
import { formatNumber } from './formatNumber.js';

const NODE_SIZE = { width: 128, height: 112 };
const NODE_GAP = 24;
const NODES_BY_ID = new Map(SKILL_NODES.map((node) => [node.id, node]));

const branchOf = (node) => SKILL_BRANCHES[node.branch] ?? { label: 'Skill', color: '#94a3b8' };

const costText = (cost) => {
  if (!cost) return '—';
  return cost.currency === 'skillPoints'
    ? `${cost.amount} skill point${cost.amount === 1 ? '' : 's'}`
    : `${formatNumber(cost.amount)} collisions`;
};
const shortCostText = (cost) =>
  !cost ? '' : cost.currency === 'skillPoints' ? `${cost.amount} SP` : `${formatNumber(cost.amount)} 💥`;

function UnlockPanel({ skills, prestigeBalance, onUnlock }) {
  const affordable = prestigeBalance >= skills.unlockCost;
  return (
    <section className="pt-skills-unlock" aria-label="Unlock skills">
      <span className="pt-skills-unlock-icon" aria-hidden="true">🧬</span>
      <h3>Skills</h3>
      <p>
        Skills are a permanent layer above prestige. Unlock them once, buy skill points with
        prestige points, then use each skill point to unlock a skill. After that, collisions
        level skills up.
      </p>
      <button type="button" className="pt-prestige-button" disabled={!affordable} onClick={onUnlock}>
        Unlock Skills · {formatNumber(skills.unlockCost)} prestige points
      </button>
      {!affordable && (
        <p className="pt-details-hint">
          You have {formatNumber(prestigeBalance)} / {formatNumber(skills.unlockCost)} prestige points.
        </p>
      )}
    </section>
  );
}

function SkillDetails({ state, onClose, onBuy }) {
  const { node, level, cost, available, canAfford } = state;
  const maxed = level >= node.maxLevel;
  const branch = branchOf(node);
  return (
    <aside className="pt-details" aria-label={`${node.label} details`}>
      <div className="pt-details-head">
        <span className="pt-branch-tag" style={{ '--branch': branch.color }}>{branch.label}</span>
        <h3>{node.label}</h3>
        <button className="pt-details-close" onClick={onClose} aria-label="Close details">×</button>
      </div>
      <p className="pt-details-description">{node.description}</p>

      <div className="pt-level">
        <div className="pt-level-row">
          <span>Level</span>
          <span>{level} / {node.maxLevel}</span>
        </div>
        <div className="pt-level-bar">
          <div className="pt-level-fill" style={{ width: `${(level / node.maxLevel) * 100}%`, '--branch': branch.color }} />
        </div>
      </div>

      <dl className="pt-effects">
        <div>
          <dt>Now</dt>
          <dd>{node.describe(level)}</dd>
        </div>
        {!maxed && (
          <div>
            <dt>Next</dt>
            <dd className="pt-effect-next">{node.describe(level + 1)}</dd>
          </div>
        )}
      </dl>

      <div className="pt-buy">
        <div className="pt-cost">
          <span>Cost</span>
          <strong className={canAfford ? '' : 'is-short'}>{maxed ? '—' : costText(cost)}</strong>
        </div>
        <button
          className="pt-buy-button"
          onClick={onBuy}
          disabled={!available || maxed || !canAfford}
        >
          {maxed
            ? 'Maxed out'
            : !available
              ? 'Locked'
              : !canAfford
                ? cost.currency === 'skillPoints' ? 'Need a skill point' : 'Not enough collisions'
                : level === 0 ? 'Unlock skill' : 'Level up'}
        </button>
      </div>
    </aside>
  );
}

/**
 * The Skills tab: unlock panel until Skills are bought, then a radial skill
 * tree plus the skill-point / collision balances.
 */
function SkillsBoard({ skills, prestigeBalance, onUnlock, onBuySkillPoint, onBuySkill }) {
  const [selectedId, setSelectedId] = useState(null);

  const states = useMemo(() => {
    const map = new Map();
    (skills?.skills ?? []).forEach((s) => {
      const node = NODES_BY_ID.get(s.id);
      if (!node) return;
      const maxed = s.level >= node.maxLevel;
      map.set(s.id, {
        ...s,
        node,
        status: !s.available ? 'locked' : maxed ? 'maxed' : s.canAfford ? 'affordable' : 'unaffordable',
      });
    });
    return map;
  }, [skills]);

  const isVisible = useCallback((node) => Boolean(states.get(node.id)?.available), [states]);
  const selected = selectedId ? states.get(selectedId) : null;

  useEffect(() => {
    if (selectedId && !states.get(selectedId)?.available) setSelectedId(null);
  }, [selectedId, states]);

  if (!skills) return null;
  if (!skills.unlocked) {
    return <UnlockPanel skills={skills} prestigeBalance={prestigeBalance} onUnlock={onUnlock} />;
  }

  const canBuyPoint = prestigeBalance >= skills.skillPointPrice;

  const renderNode = (node, { selected: isSelected }) => {
    const state = states.get(node.id);
    const maxed = state.status === 'maxed';
    return (
      <div
        className={['pt-card', `is-${state.status}`, state.level > 0 ? 'is-owned' : '', isSelected ? 'is-selected' : '']
          .filter(Boolean).join(' ')}
        style={{ '--branch': branchOf(node).color }}
        title={node.label}
      >
        <span className="pt-card-icon" aria-hidden="true">{node.icon}</span>
        <span className="pt-card-label">{node.label}</span>
        <span className="pt-card-meta">
          <span className="pt-card-level">{maxed ? 'MAX' : `Lv ${state.level}/${node.maxLevel}`}</span>
          {!maxed && <span className="pt-card-cost">{shortCostText(state.cost)}</span>}
        </span>
      </div>
    );
  };

  return (
    <div className="pt-skills">
      <div className="pt-skills-bar">
        <div className="pt-chip pt-chip--gold">
          <span>Skill points</span>
          <strong>{skills.skillPoints}</strong>
        </div>
        <div className="pt-chip">
          <span>Collisions</span>
          <strong>{formatNumber(skills.collisionBank)}</strong>
        </div>
        <button type="button" className="pt-ghost-button" disabled={!canBuyPoint} onClick={onBuySkillPoint}>
          Buy skill point · {formatNumber(skills.skillPointPrice)} prestige
        </button>
      </div>
      <div className={`pt-board ${selected ? 'has-selection' : ''}`}>
        <NodeGraph
          nodes={SKILL_NODES}
          isVisible={isVisible}
          nodeSize={NODE_SIZE}
          gap={NODE_GAP}
          layout="radial"
          renderNode={renderNode}
          nodeLabel={(node) => `${node.label}, level ${states.get(node.id).level}`}
          edgeClassName={(edge) => `pt-link ${states.get(edge.to)?.level > 0 ? 'is-owned' : 'is-ready'}`}
          edgeStyle={(edge) => ({ '--branch': branchOf(edge.toNode).color })}
          selectedId={selectedId}
          onSelect={setSelectedId}
          onBackgroundClick={() => setSelectedId(null)}
          cameraKey="skills"
        />
        {selected && (
          <SkillDetails
            key={selected.id}
            state={selected}
            onClose={() => setSelectedId(null)}
            onBuy={() => onBuySkill?.(selected.id)}
          />
        )}
      </div>
    </div>
  );
}

export default SkillsBoard;
