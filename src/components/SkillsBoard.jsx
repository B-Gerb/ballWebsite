import { useCallback, useEffect, useMemo, useState } from 'react';
import { MAX_RANK, SKILL_BRANCHES, SKILL_NODES, choiceScale, describeBaseAt } from '../data/skillTree';
import NodeGraph from './whiteboard/NodeGraph.jsx';
import { formatNumber } from './formatNumber.js';

const NODE_SIZE = { width: 128, height: 112 };
const NODE_GAP = 24;
const NODES_BY_ID = new Map(SKILL_NODES.map((node) => [node.id, node]));

const branchOf = (node) => SKILL_BRANCHES[node.branch] ?? { label: 'Skill', color: '#94a3b8' };

const pointsText = (amount) => `${amount} SP`;
const costText = (cost) => (cost ? `${cost.amount} skill point${cost.amount === 1 ? '' : 's'}` : '—');

function UnlockPanel({ skills, prestigeBalance, onUnlock }) {
  const affordable = prestigeBalance >= skills.unlockCost;
  return (
    <section className="pt-skills-unlock" aria-label="Unlock skills">
      <span className="pt-skills-unlock-icon" aria-hidden="true">⊕</span>
      <h3>Skills</h3>
      <p>
        Skills are a permanent layer above prestige. Unlock them once, buy skill points with
        prestige points, then use each skill point to unlock a skill. Every prestige run then
        has a level bar: shape collisions fill it, and each level-up lets you pick an upgrade
        for one of your skills.
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

function SkillDetails({ state, picks, onClose, onBuy }) {
  const { node, unlocked, rank, maxRank, cost, available, canAfford } = state;
  const branch = branchOf(node);
  const maxed = unlocked && rank >= maxRank;
  return (
    <aside className="pt-details" aria-label={`${node.label} details`}>
      <div className="pt-details-head">
        <span className="pt-branch-tag" style={{ '--branch': branch.color }}>{branch.label}</span>
        <h3>{node.label}</h3>
        <button className="pt-details-close" onClick={onClose} aria-label="Close details">×</button>
      </div>
      <p className="pt-details-description">{node.description}</p>

      <dl className="pt-effects">
        {unlocked && (
          <div>
            <dt>Rank</dt>
            <dd>{rank}/{maxRank}{rank > 1 ? ` · level-bar picks +${(rank - 1) * 25}%` : ''}</dd>
          </div>
        )}
        <div>
          <dt>{unlocked ? 'Base now' : 'Base'}</dt>
          <dd>{describeBaseAt(node, rank)}</dd>
        </div>
        {unlocked && !maxed && (
          <div>
            <dt>Rank {rank + 1}</dt>
            <dd>{describeBaseAt(node, rank + 1)} · picks +{rank * 25}%</dd>
          </div>
        )}
      </dl>

      <div className="pt-skill-choices">
        <h4>Level-bar upgrades</h4>
        <ul>
          {node.choices.map((choice) => {
            const stacks = picks?.[choice.id] ?? 0;
            return (
              <li key={choice.id} className={stacks > 0 ? 'is-picked' : ''}>
                <span className="pt-skill-choice-icon" aria-hidden="true">{choice.icon}</span>
                <span className="pt-skill-choice-text">
                  <strong>{choice.label}</strong>
                  <small>{stacks > 0 ? choice.describe(stacks * choiceScale(state.rank ?? 1)) : choice.description}</small>
                </span>
                <span className="pt-skill-choice-stacks">{stacks}/{choice.maxStacks}</span>
              </li>
            );
          })}
        </ul>
        <p className="pt-details-hint">Picks this run reset when you prestige.</p>
      </div>

      {!unlocked ? (
        <div className="pt-buy">
          <div className="pt-cost">
            <span>Cost</span>
            <strong className={canAfford ? '' : 'is-short'}>{costText(cost)}</strong>
          </div>
          <button className="pt-buy-button" onClick={onBuy} disabled={!available || !canAfford}>
            {!available ? 'Locked' : !canAfford ? 'Need more skill points' : 'Unlock skill'}
          </button>
        </div>
      ) : (
        <div className="pt-buy">
          <div className="pt-cost">
            <span>Next rank</span>
            <strong className={maxed || canAfford ? '' : 'is-short'}>{maxed ? '—' : costText(cost)}</strong>
          </div>
          <button className="pt-buy-button" onClick={onBuy} disabled={maxed || !canAfford}>
            {maxed ? 'Max rank' : `Rank up · ${pointsText(cost?.amount ?? 0)}`}
          </button>
        </div>
      )}
    </aside>
  );
}

/**
 * The Skills tab: unlock panel until Skills are bought, then a radial skill
 * tree plus the skill-point balance and this run's level.
 */
/** "Reset skills" with a confirm step, since it locks every skill at once. */
function ResetSkillsButton({ spent, onReset }) {
  const [confirming, setConfirming] = useState(false);
  if (confirming) {
    return (
      <span className="pt-skills-reset">
        <span>Lock every skill and refund {spent} SP?</span>
        <button type="button" className="pt-prestige-button" onClick={() => { onReset?.(); setConfirming(false); }}>
          Reset
        </button>
        <button type="button" className="pt-ghost-button" onClick={() => setConfirming(false)}>Cancel</button>
      </span>
    );
  }
  return (
    <button type="button" className="pt-ghost-button" disabled={!(spent > 0)} onClick={() => setConfirming(true)}
      title="Lock every skill and get back all the skill points you spent on them">
      Reset skills · refund {spent} SP
    </button>
  );
}

function SkillsBoard({ skills, prestigeBalance, onUnlock, onBuySkillPoint, onBuySkill, onResetSkills }) {
  const [selectedId, setSelectedId] = useState(null);

  const states = useMemo(() => {
    const map = new Map();
    (skills?.skills ?? []).forEach((s) => {
      const node = NODES_BY_ID.get(s.id);
      if (!node) return;
      const rank = s.rank ?? (s.unlocked ? 1 : 0);
      const maxRank = s.maxRank ?? MAX_RANK;
      const maxed = s.unlocked && rank >= maxRank;
      map.set(s.id, {
        ...s,
        rank,
        maxRank,
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
  const pickCount = (node) => node.choices.reduce((sum, c) => sum + (skills.picks?.[c.id] ?? 0), 0);

  const renderNode = (node, { selected: isSelected }) => {
    const state = states.get(node.id);
    return (
      <div
        className={['pt-card', `is-${state.status}`, state.unlocked ? 'is-owned' : '', isSelected ? 'is-selected' : '']
          .filter(Boolean).join(' ')}
        style={{ '--branch': branchOf(node).color }}
        title={node.label}
      >
        <span className="pt-card-icon" aria-hidden="true">{node.icon}</span>
        <span className="pt-card-label">{node.label}</span>
        <span className="pt-card-meta">
          {state.unlocked
            ? <span className="pt-card-level">R{state.rank}/{state.maxRank} · {pickCount(node)} picks</span>
            : <span className="pt-card-cost">{pointsText(state.cost?.amount ?? 1)}</span>}
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
          <span>Run level</span>
          <strong>{skills.runLevel}</strong>
        </div>
        <button type="button" className="pt-ghost-button" disabled={!canBuyPoint} onClick={onBuySkillPoint}>
          Buy skill point · {formatNumber(skills.skillPointPrice)} prestige
        </button>
        <ResetSkillsButton spent={skills.spentSkillPoints ?? 0} onReset={onResetSkills} />
      </div>
      <div className={`pt-board ${selected ? 'has-selection' : ''}`}>
        <NodeGraph
          nodes={SKILL_NODES}
          isVisible={isVisible}
          nodeSize={NODE_SIZE}
          gap={NODE_GAP}
          layout="radial"
          renderNode={renderNode}
          nodeLabel={(node) => {
            const state = states.get(node.id);
            return `${node.label}, ${state.unlocked ? `rank ${state.rank} of ${state.maxRank}` : 'locked'}`;
          }}
          edgeClassName={(edge) => `pt-link ${states.get(edge.to)?.unlocked ? 'is-owned' : 'is-ready'}`}
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
            picks={skills.picks}
            onClose={() => setSelectedId(null)}
            onBuy={() => onBuySkill?.(selected.id)}
          />
        )}
      </div>
    </div>
  );
}

export default SkillsBoard;
