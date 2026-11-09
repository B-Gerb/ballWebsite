import { catalogEntry } from '../data/shopCatalog.js';
import { formatNumber } from '../components/formatNumber.js';

/**
 * Cookie-Clicker-style store rows for the regular shop (plain DOM, since
 * the shop lives outside React).
 *
 *   ┌──────┬──────────────────────────────┬─────┐
 *   │ icon │ Name                         │  12 │  ← level, big and faint
 *   │      │ what it does                 │     │
 *   │      │ 🪙 1.23K for 10 (green / red) │     │
 *   └──────┴──────────────────────────────┴─────┘
 */

const el = (tag, className, text) => {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text != null) node.textContent = text;
  return node;
};

/** Section header with its accent colour. */
export function createStoreSection(title, accent) {
  const section = el('section', 'store-section');
  section.style.setProperty('--accent', accent);
  section.appendChild(el('h3', 'store-section-title', title));
  return section;
}

export function createStoreRow({ item, className, amount = 1, cost, canAfford, maxed, currencyIcon, onBuy }) {
  const { icon, description } = catalogEntry(item.name);
  const row = el('button', `store-row ${className}`);
  row.type = 'button';
  row.dataset.itemName = item.name;

  row.appendChild(el('span', 'store-row-icon', icon)).setAttribute('aria-hidden', 'true');

  const body = el('span', 'store-row-body');
  body.appendChild(el('span', 'store-row-name', item.name));
  if (description) body.appendChild(el('span', 'store-row-desc', description));
  const price = el('span', 'store-row-price');
  price.appendChild(el('span', 'store-row-coin', currencyIcon)).setAttribute('aria-hidden', 'true');
  price.appendChild(el('span', 'store-row-cost'));
  price.appendChild(el('span', 'store-row-amount'));
  body.appendChild(price);
  row.appendChild(body);

  row.appendChild(el('span', 'store-row-level'));
  row.addEventListener('click', onBuy);

  refreshStoreRow(row, { item, amount, cost, canAfford, maxed });
  return row;
}

/** `cost` is the total for `amount` levels. Cheap enough to call every UI tick. */
export function refreshStoreRow(row, { item, amount = 1, cost, canAfford, maxed = false }) {
  row.classList.toggle('cannot-afford', !canAfford && !maxed);
  row.classList.toggle('is-maxed', maxed);
  row.querySelector('.store-row-cost').textContent = maxed ? 'MAX' : formatNumber(cost);
  row.querySelector('.store-row-amount').textContent = !maxed && amount > 1 ? `for ${amount}` : '';
  row.querySelector('.store-row-level').textContent = item.level;
  row.setAttribute(
    'aria-label',
    maxed
      ? `${item.name}, level ${item.level}, maxed out`
      : `Buy ${amount} ${item.name}, level ${item.level}, costs ${formatNumber(cost)}${canAfford ? '' : ', cannot afford'}`,
  );
}
