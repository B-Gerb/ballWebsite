/**
 * Hand-drawn store icons as inline SVG strings (the store is plain DOM).
 *
 * Sticker style: thick ink outline, a hard offset shadow, and the body
 * filled with the section's `--accent` colour so every icon picks up the
 * store's colour scheme. Keys look like "circle:speed-max"; see
 * SHOP_CATALOG for which item uses which.
 */

const INK = '#1c1108';
const PAPER = '#fdf6e3';
const GOLD = '#f5c542';
const LINE = `stroke="${INK}" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"`;

const svg = (body, size = 40) =>
  `<svg viewBox="0 0 40 40" width="${size}" height="${size}" aria-hidden="true" focusable="false">${body}</svg>`;

/** One shape, with its shadow, centred on (cx, cy) with "radius" r. */
function shape(kind, cx, cy, r, fill = 'var(--accent, #94a3b8)') {
  const draw = (x, y, attrs) => {
    if (kind === 'circle') return `<circle cx="${x}" cy="${y}" r="${r}" ${attrs}/>`;
    if (kind === 'square') {
      const s = r * 1.7;
      return `<rect x="${x - s / 2}" y="${y - s / 2}" width="${s}" height="${s}" rx="2" transform="rotate(-8 ${x} ${y})" ${attrs}/>`;
    }
    const pts = [[x, y - r * 1.15], [x + r * 1.1, y + r * 0.8], [x - r * 1.1, y + r * 0.8]];
    return `<path d="M${pts.map((p) => p.join(' ')).join(' L')} Z" ${attrs}/>`;
  };
  return draw(cx + 2, cy + 2, `fill="${INK}" opacity="0.4"`)
    + draw(cx, cy, `fill="${fill}" ${LINE}`)
    // a single highlight stroke, like a marker shine
    + (kind === 'circle'
      ? `<path d="M${cx - r * 0.55} ${cy - r * 0.2} q${r * 0.15} ${-r * 0.4} ${r * 0.5} ${-r * 0.5}" fill="none" stroke="${PAPER}" stroke-width="2" stroke-linecap="round" opacity="0.7"/>`
      : '');
}

const badge = (inner) =>
  `<circle cx="31" cy="10" r="7.5" fill="${PAPER}" ${LINE}/>${inner}`;
const plusBadge = badge(`<path d="M31 6.5 V13.5 M27.5 10 H34.5" ${LINE}/>`);
const clockBadge = badge(`<path d="M31 6.8 V10 L33.4 11.6" fill="none" ${LINE} stroke-width="2"/>`);

const arrow = (x1, y1, x2, y2) => {
  const a = Math.atan2(y2 - y1, x2 - x1);
  const head = (da) => `${x2 - 5 * Math.cos(a + da)} ${y2 - 5 * Math.sin(a + da)}`;
  return `<path d="M${x1} ${y1} L${x2} ${y2} M${head(0.6)} L${x2} ${y2} L${head(-0.6)}" fill="none" ${LINE}/>`;
};

const speedLines = (count) => [13, 20, 27].slice(0, count === 1 ? 1 : 3)
  .map((y, i) => {
    const yy = count === 1 ? 20 : y;
    const x1 = 3 + (i % 2) * 3;
    return `<path d="M${x1} ${yy} H${count === 1 ? 13 : 15 - (i % 2) * 2}" ${LINE}/>`;
  })
  .join('');

const cursor = (fill = 'var(--accent, #94a3b8)') =>
  `<path d="M13 7 L13 31 L19 25.5 L23 34 L27.5 32 L23.5 23.5 L31 23 Z" transform="translate(2 2)" fill="${INK}" opacity="0.4"/>`
  + `<path d="M13 7 L13 31 L19 25.5 L23 34 L27.5 32 L23.5 23.5 L31 23 Z" fill="${fill}" ${LINE}/>`;

const coin = (cx, cy, r) =>
  `<circle cx="${cx + 1.5}" cy="${cy + 1.5}" r="${r}" fill="${INK}" opacity="0.4"/>`
  + `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${GOLD}" ${LINE}/>`
  + `<circle cx="${cx}" cy="${cy}" r="${r * 0.6}" fill="none" stroke="${INK}" stroke-width="1.6" opacity="0.55"/>`;

function shapeIcon(kind, mark) {
  switch (mark) {
    case 'add': return shape(kind, 17, 23, 11) + plusBadge;
    case 'size-min':
      return `<circle cx="20" cy="21" r="14" fill="none" stroke="${INK}" stroke-width="2" stroke-dasharray="3 3.5" opacity="0.7"/>`
        + shape(kind, 20, 21, 7);
    case 'size-max': return shape(kind, 16, 24, 11) + arrow(25, 15, 35, 5);
    case 'speed-min': return speedLines(1) + shape(kind, 25, 20, 9);
    case 'speed-max': return speedLines(3) + shape(kind, 27, 20, 9);
    default: return null;
  }
}

const ICONS = {
  arena: () =>
    `<circle cx="21" cy="21" r="15" fill="none" stroke="${INK}" stroke-width="7" opacity="0.4"/>`
    + `<circle cx="20" cy="20" r="15" fill="none" stroke="${INK}" stroke-width="7"/>`
    + `<circle cx="20" cy="20" r="15" fill="none" stroke="var(--accent, #94a3b8)" stroke-width="3.5"/>`
    + arrow(8, 20, 15, 20) + arrow(32, 20, 25, 20)
    + `<circle cx="20" cy="20" r="2.5" fill="${PAPER}" ${LINE} stroke-width="1.5"/>`,
  click: () => cursor(),
  'boost:click': () => cursor() + clockBadge,
  'boost:value': () => coin(17, 23, 12) + clockBadge,
  'boost:speed': () => speedLines(3) + shape('circle', 26, 23, 8) + clockBadge,
  coin: () => coin(20, 20, 15),
  cursor: () => cursor(GOLD),
  lock: () =>
    `<path d="M13 18 V13 a7 7 0 0 1 14 0 V18" fill="none" ${LINE} stroke-width="3.5"/>`
    + `<rect x="9" y="18" width="22" height="17" rx="3" fill="${GOLD}" ${LINE}/>`
    + `<path d="M20 24 V29" ${LINE} stroke-width="3"/>`,
  unlock: () =>
    `<path d="M13 18 V13 a7 7 0 0 1 13.5 -2.5" fill="none" ${LINE} stroke-width="3.5"/>`
    + `<rect x="9" y="18" width="22" height="17" rx="3" fill="${GOLD}" ${LINE}/>`
    + `<path d="M20 24 V29" ${LINE} stroke-width="3"/>`,
};

const FALLBACK = () => shape('circle', 20, 20, 12) + arrow(20, 30, 20, 10);

/** SVG markup for an icon key; unknown keys get a generic "upgrade" icon. */
export function storeIcon(key, size) {
  const [kind, mark] = String(key).split(':');
  const body = ['circle', 'square', 'triangle'].includes(kind) ? shapeIcon(kind, mark) : ICONS[key]?.();
  return svg(body ?? FALLBACK(), size);
}
