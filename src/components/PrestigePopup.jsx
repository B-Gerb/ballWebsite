import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { BRANCHES, LAYOUT, buildTree, edgePath } from '../data/prestigeTree';
import { describePrestigeEffect } from '../prestigeEquations';
import './PrestigePopup.css';

const MIN_ZOOM = 0.35;
const MAX_ZOOM = 1.8;
const DRAG_THRESHOLD = 6;

const clamp = (value, lo, hi) => Math.max(lo, Math.min(hi, value));

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

const PrestigePopup = ({ isOpen, onClose, prestigeShop, onPurchase, onPrestige }) => {
  const tree = useMemo(() => buildTree(), []);
  const [selectedId, setSelectedId] = useState(null);
  const [view, setView] = useState({ x: 0, y: 0, zoom: 1 });

  const viewportRef = useRef(null);
  const pointers = useRef(new Map());
  const panRef = useRef(null);
  const pinchRef = useRef(null);
  const movedRef = useRef(false);
  const userMovedViewRef = useRef(false);

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

    tree.nodes.forEach((node) => {
      const item = itemsByName.get(node.item);
      if (!item) return; // upgrade not present in this save (e.g. removed) — hide the node

      const requirements = node.requires.map((req) => {
        const dep = tree.byId.get(req.id);
        const depItem = dep ? itemsByName.get(dep.item) : null;
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
  }, [tree, itemsByName, balance]);

  const visibleNodes = useMemo(
    () =>
      tree.nodes.filter((node) => {
        const state = nodeStates.get(node.id);
        return Boolean(state?.unlocked);
      }),
    [tree, nodeStates],
  );

  const visibleKey = visibleNodes.map((node) => node.id).join('|');

  const contentBox = useMemo(() => {
    const half = LAYOUT.nodeSize / 2;
    const pad = 64;
    if (visibleNodes.length === 0) {
      return { minX: 0, minY: 0, width: tree.width, height: tree.height };
    }
    const xs = visibleNodes.map((node) => node.x);
    const ys = visibleNodes.map((node) => node.y);
    const minX = Math.min(...xs) - half - pad;
    const maxX = Math.max(...xs) + half + pad;
    const minY = Math.min(...ys) - half - pad;
    const maxY = Math.max(...ys) + half + pad;
    return { minX, minY, width: Math.max(1, maxX - minX), height: Math.max(1, maxY - minY) };
  }, [visibleNodes, tree.width, tree.height]);

  const selected = selectedId ? nodeStates.get(selectedId) : null;

  /* ── view helpers ─────────────────────────────────────────────────── */

  const clampView = useCallback(
    (x, y, zoom) => {
      const el = viewportRef.current;
      if (!el) return { x, y, zoom };

      const vw = el.clientWidth;
      const vh = el.clientHeight;
      const w = contentBox.width * zoom;
      const h = contentBox.height * zoom;
      const margin = 48;
      const minX = contentBox.minX * zoom;
      const minY = contentBox.minY * zoom;
      const maxX = minX + w;
      const maxY = minY + h;

      return {
        zoom,
        x: w <= vw ? (vw - w) / 2 - minX : clamp(x, vw - maxX - margin, margin - minX),
        y: h <= vh ? (vh - h) / 2 - minY : clamp(y, vh - maxY - margin, margin - minY),
      };
    },
    [contentBox],
  );

  const fitToView = useCallback(() => {
    const el = viewportRef.current;
    if (!el) return;
    const zoom = clamp(
      Math.min(el.clientWidth / contentBox.width, el.clientHeight / contentBox.height),
      MIN_ZOOM,
      1,
    );
    userMovedViewRef.current = false;
    setView(clampView(0, 0, zoom));
  }, [clampView, contentBox.width, contentBox.height]);

  const zoomBy = useCallback(
    (factor) => {
      const el = viewportRef.current;
      if (!el) return;
      userMovedViewRef.current = true;
      setView((v) => {
        const zoom = clamp(v.zoom * factor, MIN_ZOOM, MAX_ZOOM);
        const ax = el.clientWidth / 2;
        const ay = el.clientHeight / 2;
        const ratio = zoom / v.zoom;
        return clampView(ax - (ax - v.x) * ratio, ay - (ay - v.y) * ratio, zoom);
      });
    },
    [clampView],
  );

  /* ── open / resize / escape ───────────────────────────────────────── */

  useLayoutEffect(() => {
    if (isOpen) fitToView();
  }, [isOpen, visibleKey, fitToView]);

  useEffect(() => {
    if (!selectedId) return;
    const stillVisible = visibleNodes.some((node) => node.id === selectedId);
    if (!stillVisible) setSelectedId(null);
  }, [selectedId, visibleNodes]);

  useEffect(() => {
    if (!isOpen) return undefined;

    const onKeyDown = (e) => {
      if (e.key === 'Escape') onClose?.();
    };
    window.addEventListener('keydown', onKeyDown);

    const el = viewportRef.current;
    const syncView = () => {
      if (userMovedViewRef.current) setView((v) => clampView(v.x, v.y, v.zoom));
      else fitToView();
    };

    window.addEventListener('resize', syncView);
    const observer = el ? new ResizeObserver(syncView) : null;
    observer?.observe(el);

    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('resize', syncView);
      observer?.disconnect();
    };
  }, [isOpen, fitToView, clampView, onClose]);

  /* ── pan & pinch (pointer events cover mouse, touch and pen) ──────── */

  const handlePointerDown = (e) => {
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    movedRef.current = false;

    if (pointers.current.size === 1) {
      panRef.current = { startX: e.clientX, startY: e.clientY, viewX: view.x, viewY: view.y };
      pinchRef.current = null;
    } else if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      pinchRef.current = {
        distance: Math.hypot(a.x - b.x, a.y - b.y) || 1,
        centerX: (a.x + b.x) / 2,
        centerY: (a.y + b.y) / 2,
        zoom: view.zoom,
        viewX: view.x,
        viewY: view.y,
      };
      panRef.current = null;
      movedRef.current = true;
    }
  };

  useEffect(() => {
    if (!isOpen) return undefined;

    const activePointers = pointers.current;

    const handleMove = (e) => {
      if (!activePointers.has(e.pointerId)) return;
      activePointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      const el = viewportRef.current;
      if (!el) return;

      if (activePointers.size >= 2 && pinchRef.current) {
        const [a, b] = [...activePointers.values()];
        const pinch = pinchRef.current;
        const zoom = clamp(
          (pinch.zoom * Math.hypot(a.x - b.x, a.y - b.y)) / pinch.distance,
          MIN_ZOOM,
          MAX_ZOOM,
        );
        const rect = el.getBoundingClientRect();
        const ax = pinch.centerX - rect.left;
        const ay = pinch.centerY - rect.top;
        const ratio = zoom / pinch.zoom;
        userMovedViewRef.current = true;
        setView(clampView(ax - (ax - pinch.viewX) * ratio, ay - (ay - pinch.viewY) * ratio, zoom));
        return;
      }

      const pan = panRef.current;
      if (!pan) return;
      const dx = e.clientX - pan.startX;
      const dy = e.clientY - pan.startY;
      if (Math.hypot(dx, dy) > DRAG_THRESHOLD) movedRef.current = true;
      if (!movedRef.current) return;
      userMovedViewRef.current = true;
      setView((v) => clampView(pan.viewX + dx, pan.viewY + dy, v.zoom));
    };

    const handleUp = (e) => {
      activePointers.delete(e.pointerId);
      if (activePointers.size < 2) pinchRef.current = null;
      if (activePointers.size === 0) panRef.current = null;
    };

    window.addEventListener('pointermove', handleMove);
    window.addEventListener('pointerup', handleUp);
    window.addEventListener('pointercancel', handleUp);
    return () => {
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', handleUp);
      window.removeEventListener('pointercancel', handleUp);
      activePointers.clear();
      panRef.current = null;
      pinchRef.current = null;
    };
  }, [isOpen, clampView]);

  useEffect(() => {
    const el = viewportRef.current;
    if (!isOpen || !el) return undefined;

    const handleWheel = (e) => {
      if (e.ctrlKey) return; // leave browser zoom alone
      e.preventDefault();
      const rect = el.getBoundingClientRect();
      const ax = e.clientX - rect.left;
      const ay = e.clientY - rect.top;
      userMovedViewRef.current = true;
      setView((v) => {
        const zoom = clamp(v.zoom * Math.exp(-e.deltaY * 0.0015), MIN_ZOOM, MAX_ZOOM);
        const ratio = zoom / v.zoom;
        return clampView(ax - (ax - v.x) * ratio, ay - (ay - v.y) * ratio, zoom);
      });
    };

    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  }, [isOpen, clampView]);

  /* ── actions ──────────────────────────────────────────────────────── */

  const handleNodeClick = (nodeId) => {
    if (movedRef.current) return; // the click was the end of a drag
    setSelectedId((current) => (current === nodeId ? null : nodeId));
  };

  const handlePurchase = () => {
    if (!selected || !selected.unlocked || selected.maxed || !selected.affordable) return;
    onPurchase?.(selected.item.name);
  };

  if (!isOpen) return null;

  const totalLevels = [...nodeStates.values()].reduce((sum, s) => sum + s.item.level, 0);
  const maxLevels = [...nodeStates.values()].reduce((sum, s) => sum + (s.item.maxLevel ?? 0), 0);

  return (
    <div className="pt-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose?.()}>
      <div className="pt-popup" role="dialog" aria-modal="true" aria-label="Prestige upgrades">
        <header className="pt-header">
          <div className="pt-title">
            <h2>Prestige Upgrades</h2>
            <span className="pt-progress">
              {totalLevels}/{maxLevels} levels
            </span>
          </div>
          <div className="pt-header-actions">
            <div className="pt-balance">
              <span className="pt-balance-label">Prestige points</span>
              <span className="pt-balance-value">{formatNumber(balance)}</span>
            </div>
            <button className="pt-close" onClick={onClose} aria-label="Close prestige shop">
              ×
            </button>
          </div>
        </header>

        <section className="pt-summary" aria-label="Prestige preview">
          <div><span>Prestige points</span><strong>{formatNumber(balance)}</strong></div>
          <div><span>Estimated award</span><strong>{formatNumber(prestigeShop?.estimatedAward)}</strong></div>
          <div><span>Run points</span><strong>{formatNumber(prestigeShop?.totalPointsEarned)}</strong></div>
          <div><span>Collisions</span><strong>{formatNumber(prestigeShop?.totalCollisions)}</strong></div>
          <div><span>Collision multiplier</span><strong>×{formatNumber(prestigeShop?.collisionMultiplier)}</strong></div>
          <div><span>Minimum run</span><strong>{formatNumber(prestigeShop?.minimumRunPoints)}</strong></div>
          <button
            className="pt-prestige-button"
            onClick={onPrestige}
            disabled={!prestigeShop?.canPrestige}
          >
            {prestigeShop?.canPrestige ? 'Prestige now' : 'Not ready'}
          </button>
        </section>

        <div className="pt-body">
          <div className="pt-tree">
            <div
              className="pt-viewport"
              ref={viewportRef}
              onPointerDown={handlePointerDown}
              role="presentation"
            >
              <div
                className="pt-canvas"
                style={{
                  width: tree.width,
                  height: tree.height,
                  transform: `translate(${view.x}px, ${view.y}px) scale(${view.zoom})`,
                }}
              >
                <svg
                  className="pt-links"
                  width={tree.width}
                  height={tree.height}
                  viewBox={`0 0 ${tree.width} ${tree.height}`}
                  aria-hidden="true"
                >
                  {tree.edges.map((edge) => {
                    const toState = nodeStates.get(edge.to.id);
                    const fromState = nodeStates.get(edge.from.id);
                    if (!toState?.unlocked || !fromState?.unlocked) return null;

                    const state = toState.owned
                      ? 'owned'
                      : toState.unlocked
                        ? 'ready'
                        : 'locked';

                    return (
                      <path
                        key={edge.id}
                        d={edgePath(edge.from, edge.to)}
                        className={`pt-link is-${state}`}
                        style={{ '--branch': branchOf(edge.to).color }}
                      />
                    );
                  })}
                </svg>

                {visibleNodes.map((node) => {
                  const state = nodeStates.get(node.id);
                  const { item, status, owned, maxed, unlocked } = state;
                  const branch = branchOf(node);

                  return (
                    <button
                      key={node.id}
                      type="button"
                      className={[
                        'pt-node',
                        `is-${status}`,
                        owned ? 'is-owned' : '',
                        selectedId === node.id ? 'is-selected' : '',
                      ]
                        .filter(Boolean)
                        .join(' ')}
                      style={{
                        left: node.x - LAYOUT.nodeSize / 2,
                        top: node.y - LAYOUT.nodeSize / 2,
                        width: LAYOUT.nodeSize,
                        height: LAYOUT.nodeSize,
                        '--branch': branch.color,
                      }}
                      onClick={() => handleNodeClick(node.id)}
                      aria-pressed={selectedId === node.id}
                    >
                      <span className="pt-node-icon">{unlocked ? node.icon : '🔒'}</span>
                      <span className="pt-node-label">{node.label}</span>
                      <span className="pt-node-level">
                        {maxed ? 'MAX' : `Lv ${item.level}${item.maxLevel ? `/${item.maxLevel}` : ''}`}
                      </span>
                      {!maxed && unlocked && (
                        <span className="pt-node-cost">{formatNumber(item.price)}</span>
                      )}
                    </button>
                  );
                })}
              </div>

              <div className="pt-controls">
                <button type="button" onClick={() => zoomBy(1.2)} aria-label="Zoom in">
                  +
                </button>
                <button type="button" onClick={() => zoomBy(1 / 1.2)} aria-label="Zoom out">
                  −
                </button>
                <button type="button" onClick={fitToView} aria-label="Fit tree to view">
                  ⤢
                </button>
              </div>

              <div className="pt-legend">
                <span className="pt-legend-item is-affordable">Can buy</span>
                <span className="pt-legend-item is-unaffordable">Too costly</span>
                <span className="pt-legend-item is-maxed">Maxed</span>
              </div>
            </div>
          </div>

          <aside className={`pt-details ${selected ? '' : 'is-empty'}`}>
            {!selected ? (
              <div className="pt-details-placeholder">
                <p className="pt-details-hint">Select an upgrade to see what it does.</p>
                <p className="pt-details-hint pt-details-hint--muted">
                  Drag to pan · scroll or pinch to zoom
                </p>
              </div>
            ) : (
              <>
                <div className="pt-details-head">
                  <span className="pt-branch-tag" style={{ '--branch': branchOf(selected.node).color }}>
                    {branchOf(selected.node).label}
                  </span>
                  <h3>{selected.node.label}</h3>
                  <button
                    className="pt-details-close"
                    onClick={() => setSelectedId(null)}
                    aria-label="Close details"
                  >
                    ×
                  </button>
                </div>

                <p className="pt-details-description">{selected.node.description}</p>

                {selected.item.maxLevel ? (
                  <div className="pt-level">
                    <div className="pt-level-row">
                      <span>Level</span>
                      <span>
                        {selected.item.level} / {selected.item.maxLevel}
                      </span>
                    </div>
                    <div className="pt-level-bar">
                      <div
                        className="pt-level-fill"
                        style={{
                          width: `${(selected.item.level / selected.item.maxLevel) * 100}%`,
                          '--branch': branchOf(selected.node).color,
                        }}
                      />
                    </div>
                  </div>
                ) : (
                  <div className="pt-level-row">
                    <span>Level</span>
                    <span>{selected.item.level}</span>
                  </div>
                )}

                {selected.item.valueEquation && (
                  <dl className="pt-effects">
                    <div>
                      <dt>Now</dt>
                      <dd>{describePrestigeEffect(
                        selected.item.effectKey,
                        selected.item.valueEquation(selected.item.level),
                      )}</dd>
                    </div>
                    {!selected.maxed && (
                      <div>
                        <dt>Next</dt>
                        <dd className="pt-effect-next">
                          {describePrestigeEffect(
                            selected.item.effectKey,
                            selected.item.valueEquation(selected.item.level + 1),
                          )}
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
                      {selected.maxed ? '—' : formatNumber(selected.item.price)}
                    </strong>
                  </div>
                  <button
                    className="pt-buy-button"
                    onClick={handlePurchase}
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
              </>
            )}
          </aside>
        </div>
      </div>
    </div>
  );
};

export default PrestigePopup;
