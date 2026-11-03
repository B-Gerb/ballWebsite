import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { BRANCHES, PRESTIGE_NODES } from '../data/prestigeTree';
import { describePrestigeEffect } from '../prestigeEquations';
import NodeGraph from './whiteboard/NodeGraph.jsx';
import { normalizeRequirement } from './whiteboard/graphLayout.js';
import './PrestigePopup.css';

/** Full card footprint: everything (icon, label, level, cost) fits inside. */
const NODE_SIZE = { width: 128, height: 112 };
const NODE_GAP = 24;
const SHEET_SWIPE_CLOSE = 60;

const formatNumber = (value) => {
  if (value === undefined || value === null || Number.isNaN(value)) return '—';
  const abs = Math.abs(value);
  if (abs >= 1e12) return `${(value / 1e12).toFixed(2)}T`;
  if (abs >= 1e9) return `${(value / 1e9).toFixed(2)}B`;
  if (abs >= 1e6) return `${(value / 1e6).toFixed(2)}M`;
  if (abs >= 1e4) return `${(value / 1e3).toFixed(2)}K`;
  return value.toFixed(2);
};

const branchOf = (node) => BRANCHES[node.branch] ?? { label: 'Upgrade', color: '#94a3b8' };

const NODES_BY_ID = new Map(PRESTIGE_NODES.map((node) => [node.id, node]));
const itemNameOf = (node) => node.item ?? node.label ?? node.id;

const levelText = (item, maxed) =>
  maxed ? 'MAX' : `Lv ${item.level}${item.maxLevel ? `/${item.maxLevel}` : ''}`;

function PrestigeAction({ prestigeShop, isConfirming, onClick, onCancel }) {
  if (isConfirming) {
    return (
      <div className="pt-action is-confirming">
        <span className="pt-action-question">
          Reset this run for {formatNumber(prestigeShop?.estimatedAward)}?
        </span>
        <button type="button" className="pt-prestige-button" onClick={onClick}>
          Confirm
        </button>
        <button type="button" className="pt-ghost-button" onClick={onCancel}>
          Cancel
        </button>
      </div>
    );
  }
  return (
    <div className="pt-action">
      <button
        type="button"
        className="pt-prestige-button"
        onClick={onClick}
        disabled={!prestigeShop?.canPrestige}
      >
        {prestigeShop?.canPrestige ? 'Prestige now' : 'Not ready'}
      </button>
    </div>
  );
}

function Legend() {
  const [open, setOpen] = useState(false);
  return (
    <div className={`pt-legend ${open ? 'is-open' : ''}`}>
      <button
        type="button"
        className="pt-legend-toggle"
        aria-expanded={open}
        aria-label="Show legend"
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
      >
        ?
      </button>
      <div className="pt-legend-items">
        <span className="pt-legend-item is-affordable">Can buy</span>
        <span className="pt-legend-item is-unaffordable">Too costly</span>
        <span className="pt-legend-item is-maxed">Maxed</span>
      </div>
    </div>
  );
}

function DetailsPanel({ selected, onClose, onPurchase }) {
  const sheetDrag = useRef(null);
  const [dragOffset, setDragOffset] = useState(0);
  const { node, item } = selected;
  const branch = branchOf(node);

  // Bottom-sheet swipe-to-close (phones). Harmless on desktop.
  const onHandleDown = (e) => {
    sheetDrag.current = { startY: e.clientY };
    e.currentTarget.setPointerCapture?.(e.pointerId);
  };
  const onHandleMove = (e) => {
    if (!sheetDrag.current) return;
    setDragOffset(Math.max(0, e.clientY - sheetDrag.current.startY));
  };
  const onHandleUp = () => {
    if (!sheetDrag.current) return;
    sheetDrag.current = null;
    if (dragOffset > SHEET_SWIPE_CLOSE) onClose();
    setDragOffset(0);
  };

  return (
    <aside
      className="pt-details"
      aria-label={`${node.label} details`}
      style={dragOffset ? { transform: `translateY(${dragOffset}px)` } : undefined}
    >
      <div
        className="pt-sheet-handle"
        onPointerDown={onHandleDown}
        onPointerMove={onHandleMove}
        onPointerUp={onHandleUp}
        onPointerCancel={onHandleUp}
        aria-hidden="true"
      />
      <div className="pt-details-head">
        <span className="pt-branch-tag" style={{ '--branch': branch.color }}>
          {branch.label}
        </span>
        <h3>{node.label}</h3>
        <button className="pt-details-close" onClick={onClose} aria-label="Close details">
          ×
        </button>
      </div>

      <p className="pt-details-description">{node.description}</p>

      {item.maxLevel ? (
        <div className="pt-level">
          <div className="pt-level-row">
            <span>Level</span>
            <span>{item.level} / {item.maxLevel}</span>
          </div>
          <div className="pt-level-bar">
            <div
              className="pt-level-fill"
              style={{ width: `${(item.level / item.maxLevel) * 100}%`, '--branch': branch.color }}
            />
          </div>
        </div>
      ) : (
        <div className="pt-level-row">
          <span>Level</span>
          <span>{item.level}</span>
        </div>
      )}

      {item.valueEquation && (
        <dl className="pt-effects">
          <div>
            <dt>Now</dt>
            <dd>{describePrestigeEffect(item.effectKey, item.valueEquation(item.level))}</dd>
          </div>
          {!selected.maxed && (
            <div>
              <dt>Next</dt>
              <dd className="pt-effect-next">
                {describePrestigeEffect(item.effectKey, item.valueEquation(item.level + 1))}
              </dd>
            </div>
          )}
        </dl>
      )}

      {!selected.unlocked && (
        <ul className="pt-requirements">
          {selected.requirements.map((req) => (
            <li key={req.id} className={req.met ? 'is-met' : ''}>
              {req.met ? '✔' : '✖'} {req.label}
              {req.level > 1 ? ` — level ${req.current}/${req.level}` : ''}
            </li>
          ))}
        </ul>
      )}

      <div className="pt-buy">
        <div className="pt-cost">
          <span>Cost</span>
          <strong className={selected.affordable ? '' : 'is-short'}>
            {selected.maxed ? '—' : formatNumber(item.price)}
          </strong>
        </div>
        <button
          className="pt-buy-button"
          onClick={onPurchase}
          disabled={!selected.unlocked || selected.maxed || !selected.affordable}
        >
          {selected.maxed
            ? 'Maxed out'
            : !selected.unlocked
              ? 'Locked'
              : selected.affordable
                ? 'Purchase'
                : 'Not enough points'}
        </button>
      </div>
    </aside>
  );
}

const PrestigePopup = ({
  isOpen,
  onClose,
  mode = 'shop',
  onModeChange,
  prestigeShop,
  onPurchase,
  onPrestige,
}) => {
  const [selectedId, setSelectedId] = useState(null);
  const [isConfirmingPrestige, setIsConfirmingPrestige] = useState(false);
  const [showStats, setShowStats] = useState(false);

  const balance = prestigeShop?.balance ?? 0;
  const upgrades = prestigeShop?.upgrades;

  const itemsByName = useMemo(() => {
    const map = new Map();
    (upgrades ?? []).forEach((item) => map.set(item.name, item));
    return map;
  }, [upgrades]);

  /**
   * Everything the UI needs per node, derived straight from props so a
   * purchase re-render is automatically reflected here (no mirrored state).
   */
  const nodeStates = useMemo(() => {
    const map = new Map();

    PRESTIGE_NODES.forEach((node) => {
      const item = itemsByName.get(itemNameOf(node));
      if (!item) return; // upgrade not present in this save — hide the node

      const requirements = (node.requires ?? []).map(normalizeRequirement).map((req) => {
        const dep = NODES_BY_ID.get(req.id);
        const depItem = dep ? itemsByName.get(itemNameOf(dep)) : null;
        return {
          id: req.id,
          level: req.level,
          label: dep?.label ?? req.id,
          current: depItem?.level ?? 0,
          // A requirement whose upgrade no longer exists is treated as met so a
          // consumed one-off unlock can never dead-end the rest of the tree.
          met: !dep || !depItem || depItem.level >= req.level,
        };
      });

      const unlocked = requirements.every((req) => req.met);
      const maxed = item.maxLevel != null && item.level >= item.maxLevel;
      const affordable = balance >= item.price;

      map.set(node.id, {
        node,
        item,
        requirements,
        unlocked,
        maxed,
        affordable,
        owned: item.level > 0,
        status: !unlocked ? 'locked' : maxed ? 'maxed' : affordable ? 'affordable' : 'unaffordable',
      });
    });

    return map;
  }, [itemsByName, balance]);

  const isVisible = useCallback((node) => Boolean(nodeStates.get(node.id)?.unlocked), [nodeStates]);

  const visibleKey = PRESTIGE_NODES.filter(isVisible).map((n) => n.id).join('|');

  // Where to look when the whole tree doesn't fit: the newest node you can
  // still buy. Keyed on the visible set only, so balance ticks don't move it.
  const initialFocusId = useMemo(() => {
    const visible = visibleKey ? visibleKey.split('|') : [];
    const open = visible.filter((id) => !nodeStates.get(id)?.maxed);
    return open.at(-1) ?? visible[0] ?? null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visibleKey]);

  const selected = selectedId ? nodeStates.get(selectedId) : null;

  useEffect(() => {
    if (selectedId && !nodeStates.get(selectedId)?.unlocked) setSelectedId(null);
  }, [selectedId, nodeStates]);

  useEffect(() => {
    if (!isOpen) {
      setIsConfirmingPrestige(false);
      setSelectedId(null);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return undefined;
    const onKeyDown = (e) => {
      if (e.key !== 'Escape') return;
      if (selectedId) setSelectedId(null);
      else onClose?.();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, selectedId, onClose]);

  /* ── graph callbacks ──────────────────────────────────────────────── */

  const renderNode = (node, { selected: isSelected }) => {
    const state = nodeStates.get(node.id);
    const { item, status, owned, maxed } = state;
    return (
      <div
        className={[
          'pt-card',
          `is-${status}`,
          owned ? 'is-owned' : '',
          isSelected ? 'is-selected' : '',
        ].filter(Boolean).join(' ')}
        style={{ '--branch': branchOf(node).color }}
        title={node.label}
      >
        <span className="pt-card-icon" aria-hidden="true">{state.unlocked ? node.icon : '🔒'}</span>
        <span className="pt-card-label">{node.label}</span>
        <span className="pt-card-meta">
          <span className="pt-card-level">{levelText(item, maxed)}</span>
          {!maxed && <span className="pt-card-cost">{formatNumber(item.price)}</span>}
        </span>
      </div>
    );
  };

  const nodeLabel = (node) => {
    const { item, maxed } = nodeStates.get(node.id);
    return `${node.label}, ${levelText(item, maxed)}${maxed ? '' : `, costs ${formatNumber(item.price)}`}`;
  };

  const edgeClassName = (edge) =>
    `pt-link ${nodeStates.get(edge.to)?.owned ? 'is-owned' : 'is-ready'}`;

  const edgeStyle = (edge) => ({ '--branch': branchOf(edge.toNode).color });

  /* ── actions ──────────────────────────────────────────────────────── */

  const handlePurchase = () => {
    if (!selected || !selected.unlocked || selected.maxed || !selected.affordable) return;
    onPurchase?.(selected.item.name);
  };

  const handlePrestigeClick = () => {
    if (!prestigeShop?.canPrestige) return;
    if (!isConfirmingPrestige) {
      setIsConfirmingPrestige(true);
      return;
    }
    const success = onPrestige?.();
    if (success) setIsConfirmingPrestige(false);
  };

  if (!isOpen) return null;

  const states = [...nodeStates.values()];
  const totalLevels = states.reduce((sum, s) => sum + s.item.level, 0);
  const maxLevels = states.reduce((sum, s) => sum + (s.item.maxLevel ?? 0), 0);

  return (
    <div className="pt-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose?.()}>
      <div className="pt-popup" role="dialog" aria-modal="true" aria-label="Prestige upgrades">
        <header className="pt-topbar">
          <div className="pt-title">
            <h2>Prestige</h2>
            <span className="pt-progress">{totalLevels}/{maxLevels} levels</span>
          </div>

          <div className="pt-points">
            <div className="pt-chip pt-chip--gold">
              <span>Points</span>
              <strong>{formatNumber(balance)}</strong>
            </div>
            <div className="pt-chip" aria-live="polite">
              <span>Award</span>
              <strong>+{formatNumber(prestigeShop?.estimatedAward)}</strong>
            </div>
            <PrestigeAction
              prestigeShop={prestigeShop}
              isConfirming={isConfirmingPrestige}
              onClick={handlePrestigeClick}
              onCancel={() => setIsConfirmingPrestige(false)}
            />
          </div>

          <div className="pt-topbar-end">
            <button
              type="button"
              className="pt-ghost-button"
              aria-expanded={showStats}
              aria-controls="pt-stats"
              onClick={() => setShowStats((v) => !v)}
            >
              Details {showStats ? '▴' : '▾'}
            </button>
            <button className="pt-close" onClick={onClose} aria-label="Close prestige shop">
              ×
            </button>
          </div>
        </header>

        {showStats && (
          <section id="pt-stats" className="pt-stats" aria-label="Run statistics">
            <div><span>Run points</span><strong>{formatNumber(prestigeShop?.totalPointsEarned)}</strong></div>
            <div><span>Collisions</span><strong>{formatNumber(prestigeShop?.totalCollisions)}</strong></div>
            <div><span>Collision multiplier</span><strong>×{formatNumber(prestigeShop?.collisionMultiplier)}</strong></div>
            <div><span>Minimum run</span><strong>{formatNumber(prestigeShop?.minimumRunPoints)}</strong></div>
          </section>
        )}

        {mode === 'buffs' ? (
          <section className="pt-buffs-panel" aria-label="Active prestige buffs">
            <div className="pt-buffs-heading">
              <div>
                <h3>Active prestige buffs</h3>
                <p>Permanent effects from your purchased upgrades.</p>
              </div>
              <button type="button" className="pt-ghost-button" onClick={() => onModeChange?.('shop')}>
                Open upgrade shop
              </button>
            </div>
            <div className="pt-buffs-grid">
              {(upgrades ?? []).filter((item) => item.level > 0).map((item) => (
                <article className="pt-buff-card" key={item.name}>
                  <strong>{item.name}</strong>
                  <span>Level {item.level}{item.maxLevel ? ` / ${item.maxLevel}` : ''}</span>
                  <p>{describePrestigeEffect(item.effectKey, item.valueEquation?.(item.level))}</p>
                </article>
              ))}
              {(upgrades ?? []).every((item) => item.level === 0) && (
                <p className="pt-details-hint">Purchase an upgrade to see its active buff here.</p>
              )}
            </div>
          </section>
        ) : (
          <div className={`pt-board ${selected ? 'has-selection' : ''}`}>
            <NodeGraph
              nodes={PRESTIGE_NODES}
              isVisible={isVisible}
              nodeSize={NODE_SIZE}
              gap={NODE_GAP}
              renderNode={renderNode}
              nodeLabel={nodeLabel}
              edgeClassName={edgeClassName}
              edgeStyle={edgeStyle}
              selectedId={selectedId}
              onSelect={setSelectedId}
              onBackgroundClick={() => setSelectedId(null)}
              cameraKey="prestige"
              initialFocusId={initialFocusId}
              overlay={<Legend />}
            />
            {selected && (
              <DetailsPanel
                key={selected.node.id}
                selected={selected}
                onClose={() => setSelectedId(null)}
                onPurchase={handlePurchase}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default PrestigePopup;
