import { useEffect, useMemo } from 'react';
import Whiteboard from './Whiteboard.jsx';
import { layoutGraph } from './graphLayout.js';
import './NodeGraph.css';

/** Last layout per board (session only), so reopening keeps node order stable. */
const previousLayouts = new Map();

const DEFAULT_SIZE = { width: 128, height: 112 };
const FIT_PADDING = 48;

/**
 * Layer 2: an automatically laid-out node graph on a Whiteboard.
 * Knows nothing about what the nodes mean: supply the data and a
 * `renderNode(node, { selected })` for the card contents.
 *
 * The layout only depends on which nodes are visible, so frequent parent
 * re-renders (e.g. a balance ticking) re-render the cards but never
 * re-run the layout.
 */
function NodeGraph({
  nodes,
  isVisible = () => true,
  nodeSize = DEFAULT_SIZE,
  gap = 24,
  renderNode,
  nodeLabel,
  edgeClassName,
  edgeStyle,
  selectedId = null,
  onSelect,
  onBackgroundClick,
  cameraKey = 'graph',
  initialFocusId = null,
  overlay,
  controls = true,
  minZoom,
  maxZoom,
  readableZoom,
}) {
  const visibleIds = nodes.filter((n) => isVisible(n)).map((n) => n.id);
  const visibleKey = visibleIds.join('|');
  const { width, height } = nodeSize;

  const layout = useMemo(() => {
    const visible = new Set(visibleKey ? visibleKey.split('|') : []);
    return layoutGraph(nodes, {
      isVisible: (n) => visible.has(n.id),
      nodeSize: { width, height },
      gap,
      previous: previousLayouts.get(cameraKey),
    });
  }, [nodes, visibleKey, width, height, gap, cameraKey]);

  useEffect(() => {
    previousLayouts.set(cameraKey, layout);
  }, [cameraKey, layout]);

  const byId = useMemo(() => new Map(layout.nodes.map((n) => [n.id, n])), [layout]);

  const centerOf = (id) => {
    const node = id ? byId.get(id) : null;
    return node ? { x: node.cx, y: node.cy } : null;
  };

  // Edge appearance is computed every render (cheap), but the SVG is only
  // rebuilt when the layout or an edge's class/style actually changes, so a
  // balance tick re-renders the cards and nothing else.
  const edgeLooks = layout.edges.map((edge) => {
    const info = { ...edge, fromNode: byId.get(edge.from)?.data, toNode: byId.get(edge.to)?.data };
    return {
      className: ['ng-edge', edgeClassName?.(info)].filter(Boolean).join(' '),
      style: edgeStyle?.(info),
    };
  });
  const edgeLooksKey = JSON.stringify(edgeLooks);

  const edgeLayer = useMemo(() => {
    const looks = JSON.parse(edgeLooksKey);
    const svgWidth = Math.max(1, layout.bounds.maxX);
    const svgHeight = Math.max(1, layout.bounds.maxY);
    return (
      <svg
        className="ng-edges"
        width={svgWidth}
        height={svgHeight}
        viewBox={`0 0 ${svgWidth} ${svgHeight}`}
        aria-hidden="true"
      >
        {layout.edges.map((edge, i) => (
          <path key={edge.id} d={edge.path} className={looks[i].className} style={looks[i].style} />
        ))}
      </svg>
    );
  }, [layout, edgeLooksKey]);

  return (
    <Whiteboard
      contentBounds={layout.bounds}
      fitPadding={FIT_PADDING}
      cameraKey={cameraKey}
      initialFocus={centerOf(initialFocusId)}
      focusPoint={centerOf(selectedId)}
      controls={controls}
      overlay={overlay}
      onBackgroundClick={onBackgroundClick}
      minZoom={minZoom}
      maxZoom={maxZoom}
      readableZoom={readableZoom}
    >
      {edgeLayer}

      {layout.nodes.map((placed) => {
        const selected = placed.id === selectedId;
        return (
          <button
            key={placed.id}
            type="button"
            className={`ng-node ${selected ? 'is-selected' : ''}`}
            style={{
              left: placed.x,
              top: placed.y,
              width: placed.width,
              height: placed.height,
            }}
            aria-pressed={selected}
            aria-label={nodeLabel?.(placed.data)}
            onClick={() => onSelect?.(selected ? null : placed.id)}
          >
            {renderNode(placed.data, { selected })}
          </button>
        );
      })}
    </Whiteboard>
  );
}

export default NodeGraph;
