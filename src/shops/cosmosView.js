import { COSMIC_EVENTS } from './cosmos.js';
import { formatNumber } from '../components/formatNumber.js';

/**
 * The store's Cosmos tab (plain DOM, like the rest of the store):
 *
 *   ◉ 2 black holes   ✷ 1 supernova   ×81 money
 *   Black hole  ▓▓▓▓▓░░░  42K / 100K mass
 *   Supernova   ▓▓░░░░░░  18 / 60 impact speed
 *   [upgrade rows: icon · name · effect · ◉ cost ✷ cost · level]
 *
 * `data` comes from Server.getCosmosData(). setupCosmosPanel builds the DOM
 * once; updateCosmosPanel is cheap enough to call every UI tick.
 */

const ICON = { blackHoles: COSMIC_EVENTS.blackHole.icon, supernovas: COSMIC_EVENTS.supernova.icon };

const el = (tag, className, text) => {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text != null) node.textContent = text;
  return node;
};

const plural = (count, one, many) =>
  `${count < 1000 ? String(count) : formatNumber(count)} ${count === 1 ? one : many}`;

export const costText = (cost) => {
  if (!cost) return 'MAX';
  const parts = [];
  if (cost.blackHoles > 0) parts.push(`${ICON.blackHoles} ${cost.blackHoles}`);
  if (cost.supernovas > 0) parts.push(`${ICON.supernovas} ${cost.supernovas}`);
  return parts.join('  ');
};

function meter(kind, label) {
  const row = el('div', 'cosmos-meter');
  row.dataset.meter = kind;
  row.appendChild(el('span', 'cosmos-meter-label', label));
  const bar = el('span', 'cosmos-meter-bar');
  bar.appendChild(el('span', 'cosmos-meter-fill'));
  row.appendChild(bar);
  row.appendChild(el('span', 'cosmos-meter-text'));
  return row;
}

export function setupCosmosPanel(container, data, onBuy) {
  const panel = el('section', 'cosmos-panel');
  panel.setAttribute('aria-label', 'Black holes and supernovas');

  const summary = el('div', 'cosmos-summary');
  summary.appendChild(el('span', 'cosmos-stat')).dataset.stat = 'blackHoles';
  summary.appendChild(el('span', 'cosmos-stat')).dataset.stat = 'supernovas';
  summary.appendChild(el('span', 'cosmos-stat cosmos-stat--money')).dataset.stat = 'money';
  panel.appendChild(summary);

  panel.appendChild(meter('blackHole', `${ICON.blackHoles} Black hole`));
  panel.appendChild(meter('supernova', `${ICON.supernovas} Supernova`));
  panel.appendChild(el('p', 'cosmos-hint'));

  const list = el('div', 'cosmos-upgrades');
  for (const upgrade of data.upgrades) {
    const row = el('button', 'store-row cosmos-row');
    row.type = 'button';
    row.dataset.upgradeId = upgrade.id;
    row.appendChild(el('span', 'store-row-icon', upgrade.icon)).setAttribute('aria-hidden', 'true');
    const body = el('span', 'store-row-body');
    body.appendChild(el('span', 'store-row-name', upgrade.name));
    body.appendChild(el('span', 'store-row-desc', upgrade.description));
    body.appendChild(el('span', 'cosmos-row-effect'));
    body.appendChild(el('span', 'store-row-price cosmos-row-cost'));
    row.appendChild(body);
    row.appendChild(el('span', 'store-row-level'));
    row.addEventListener('click', () => onBuy(upgrade.id));
    list.appendChild(row);
  }
  panel.appendChild(list);
  container.appendChild(panel);
  updateCosmosPanel(container, data);
  return panel;
}

function updateMeter(container, kind, value, threshold, unit) {
  const row = container.querySelector(`[data-meter="${kind}"]`);
  if (!row) return;
  const fraction = threshold > 0 ? Math.min(1, value / threshold) : 0;
  row.querySelector('.cosmos-meter-fill').style.width = `${(fraction * 100).toFixed(1)}%`;
  row.querySelector('.cosmos-meter-text').textContent =
    `${formatNumber(value)} / ${formatNumber(threshold)} ${unit}`;
}

export function updateCosmosPanel(container, data) {
  const stat = (key) => container.querySelector(`[data-stat="${key}"]`);
  if (!stat('money')) return;
  stat('blackHoles').textContent = `${ICON.blackHoles} ${plural(data.balance.blackHoles, 'black hole', 'black holes')}`;
  stat('supernovas').textContent = `${ICON.supernovas} ${plural(data.balance.supernovas, 'supernova', 'supernovas')}`;
  stat('money').textContent = `×${formatNumber(data.currencyMultiplier)} money`;

  container.querySelector('.cosmos-hint').textContent =
    `Either one wipes the board to a single circle, multiplies all money ×${formatNumber(data.nextEventMultiplier)} `
    + `and makes Add Ball/Square/Triangle ×${formatNumber(data.nextAddShapePriceJump)} pricier. `
    + 'A black hole makes shapes bought afterwards ÷10 mass; a supernova makes them ÷10 speed. Everything here resets on prestige.';

  updateMeter(container, 'blackHole', data.totalMass, data.thresholds.blackHole, 'mass');
  updateMeter(container, 'supernova', data.peakImpactSpeed, data.thresholds.supernova, 'impact speed');

  for (const upgrade of data.upgrades) {
    const row = container.querySelector(`[data-upgrade-id="${upgrade.id}"]`);
    if (!row) continue;
    row.hidden = !upgrade.available;
    row.classList.toggle('is-maxed', upgrade.maxed);
    row.classList.toggle('cannot-afford', !upgrade.canAfford && !upgrade.maxed);
    row.querySelector('.cosmos-row-effect').textContent = upgrade.level > 0 ? `Now: ${upgrade.describe(upgrade.level)}` : '';
    row.querySelector('.cosmos-row-cost').textContent = costText(upgrade.cost);
    row.querySelector('.store-row-level').textContent = upgrade.level;
    row.setAttribute('aria-label', upgrade.maxed
      ? `${upgrade.name}, level ${upgrade.level}, maxed out`
      : `Buy ${upgrade.name}, level ${upgrade.level}, costs ${costText(upgrade.cost)}${upgrade.canAfford ? '' : ', cannot afford'}`);
  }
}
