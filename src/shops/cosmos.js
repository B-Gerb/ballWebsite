import {
  BLACK_HOLE_THRESHOLD_STEP,
  COSMIC_UPGRADES,
  SUPERNOVA_THRESHOLD_STEP,
} from '../data/cosmicUpgrades.js';

/**
 * Black holes and supernovas: the run-only "cosmic" layer.
 *
 *   black hole  the board's total shape mass reaches a threshold
 *   supernova   one collision between two shapes is fast enough
 *
 * Either one wipes the board back to a single circle (Server does that) and:
 *   - gives 1 of its currency (◉ black holes / ✷ supernovas),
 *   - multiplies all money earned from now on by ×9 (plus bonuses),
 *   - makes shapes bought from now on ÷10 mass (black hole) or ÷10 speed (supernova),
 *   - makes Add Ball/Square/Triangle cost ×10 (they also drop back to level 1).
 *
 * The multipliers are accumulated at the moment of each event, so an
 * upgrade bought later only changes events that happen after it.
 * Everything here resets on prestige except `discovered`, which keeps the
 * store's Cosmos tab visible once you have seen your first event.
 */

export const COSMIC_EVENTS = {
  blackHole: { currency: 'blackHoles', label: 'Black hole', icon: '◉' },
  supernova: { currency: 'supernovas', label: 'Supernova', icon: '✷' },
};

/** Total shape mass (logical units) that collapses into the first black hole. */
export const BLACK_HOLE_MASS = 60000;
/** Relative speed (logical units per frame) of one collision that goes supernova (the first one). */
export const SUPERNOVA_SPEED = 45;
/**
 * After each event its threshold follows the new spawn scale to this power:
 * shapes get ÷10 mass/speed but the threshold drops ÷√10, so each event of a
 * kind is about 3× harder than the last instead of 10×.
 */
export const THRESHOLD_FOLLOWS_SCALE = 0.5;
/** Money multiplier each event grants before bonuses. */
export const EVENT_CURRENCY_MULTIPLIER = 9;
/** Mass (black hole) or speed (supernova) of shapes bought afterwards. */
export const EVENT_SPAWN_SCALE = 0.1;
/** Add-shape price jump per event before Neutron Star. */
export const EVENT_ADD_SHAPE_PRICE = 10;
/** Upper bound for the accumulated multipliers (well below Number.MAX_VALUE). */
export const MAX_MULTIPLIER = 1e300;
/** Thresholds never drop below this fraction of the base. */
export const MIN_THRESHOLD_FRACTION = 1e-6;

const nonNegative = (value) => (Number.isFinite(value) && value > 0 ? value : 0);
const nonNegativeInteger = (value) => Math.floor(nonNegative(value));
const positiveOr = (value, fallback) => (Number.isFinite(value) && value > 0 ? value : fallback);

class Cosmos {
  constructor(upgrades = COSMIC_UPGRADES) {
    this.upgrades = upgrades;
    this.byId = new Map(upgrades.map((u) => [u.id, u]));
    this.discovered = false;
    this.reset();
  }

  /** Prestige: everything but `discovered`. */
  reset() {
    this.counts = { blackHoles: 0, supernovas: 0 };
    this.balance = { blackHoles: 0, supernovas: 0 };
    this.levels = {};
    this.currencyMultiplier = 1;
    this.spawnMassScale = 1;
    this.spawnSpeedScale = 1;
    this.addShapePriceMultiplier = 1;
  }

  get events() {
    return this.counts.blackHoles + this.counts.supernovas;
  }

  /**
   * Record one event. `bonus` is extra money multiplier from outside
   * (skills, prestige) added to the ×9.
   */
  record(kind, { bonus = 0 } = {}) {
    const event = COSMIC_EVENTS[kind];
    if (!event) return false;
    this.counts[event.currency] += 1;
    this.balance[event.currency] += 1;
    this.discovered = true;
    // Capped so a huge run can never overflow to Infinity (which would read back as ×1).
    this.currencyMultiplier = Math.min(MAX_MULTIPLIER, this.currencyMultiplier * this.nextEventMultiplier(bonus));
    this.addShapePriceMultiplier = Math.min(MAX_MULTIPLIER, this.addShapePriceMultiplier * this.nextAddShapePriceJump());
    if (kind === 'blackHole') this.spawnMassScale *= EVENT_SPAWN_SCALE;
    else this.spawnSpeedScale *= EVENT_SPAWN_SCALE;
    return true;
  }

  /** Money multiplier the next event will grant. */
  nextEventMultiplier(bonus = 0) {
    return EVENT_CURRENCY_MULTIPLIER + nonNegative(bonus) + this.effect('eventMultiplierBonus');
  }

  /** How much the next event will raise add-shape prices. */
  nextAddShapePriceJump() {
    return Math.max(1, EVENT_ADD_SHAPE_PRICE - this.effect('addShapePriceCut'));
  }

  level(id) {
    return this.levels[id] ?? 0;
  }

  /** Dual-currency upgrades show up once the run has had one of each event. */
  isAvailable(id) {
    const upgrade = this.byId.get(id);
    if (!upgrade) return false;
    return !upgrade.requiresBoth || (this.counts.blackHoles > 0 && this.counts.supernovas > 0);
  }

  /** `{ blackHoles, supernovas }` for the next level, or null when maxed / unknown. */
  cost(id) {
    const upgrade = this.byId.get(id);
    if (!upgrade || this.level(id) >= upgrade.maxLevel) return null;
    const { blackHoles = 0, supernovas = 0 } = upgrade.cost(this.level(id));
    return { blackHoles, supernovas };
  }

  canAfford(cost) {
    return Boolean(cost)
      && this.balance.blackHoles >= cost.blackHoles
      && this.balance.supernovas >= cost.supernovas;
  }

  buy(id) {
    const cost = this.cost(id);
    if (!this.isAvailable(id) || !this.canAfford(cost)) return false;
    this.balance.blackHoles -= cost.blackHoles;
    this.balance.supernovas -= cost.supernovas;
    this.levels[id] = this.level(id) + 1;
    return true;
  }

  /**
   * Total shape mass that makes a black hole. `cut` is a fraction from
   * skills (capped at 90%), `multiplier` comes from prestige upgrades.
   */
  blackHoleThreshold({ cut = 0, multiplier = 1 } = {}) {
    return this.threshold(BLACK_HOLE_MASS,
      BLACK_HOLE_THRESHOLD_STEP ** this.effect('blackHoleThresholdLevels')
        * this.spawnMassScale ** THRESHOLD_FOLLOWS_SCALE, cut, multiplier);
  }

  /** Relative collision speed that makes a supernova (same options). */
  supernovaThreshold({ cut = 0, multiplier = 1 } = {}) {
    return this.threshold(SUPERNOVA_SPEED,
      SUPERNOVA_THRESHOLD_STEP ** this.effect('supernovaThresholdLevels')
        * this.spawnSpeedScale ** THRESHOLD_FOLLOWS_SCALE, cut, multiplier);
  }

  threshold(base, upgradeFactor, cut, multiplier) {
    const kept = 1 - Math.min(0.9, nonNegative(cut));
    const factor = upgradeFactor * kept * positiveOr(multiplier, 1);
    return base * Math.max(MIN_THRESHOLD_FRACTION, factor);
  }

  toJSON() {
    return {
      discovered: this.discovered,
      counts: { ...this.counts },
      balance: { ...this.balance },
      levels: { ...this.levels },
      currencyMultiplier: this.currencyMultiplier,
      spawnMassScale: this.spawnMassScale,
      spawnSpeedScale: this.spawnSpeedScale,
      addShapePriceMultiplier: this.addShapePriceMultiplier,
    };
  }

  load(saved) {
    this.reset();
    if (!saved || typeof saved !== 'object') return;
    this.discovered = saved.discovered === true;
    for (const key of ['blackHoles', 'supernovas']) {
      this.counts[key] = nonNegativeInteger(saved.counts?.[key]);
      this.balance[key] = Math.min(this.counts[key], nonNegativeInteger(saved.balance?.[key]));
    }
    for (const [id, level] of Object.entries(saved.levels ?? {})) {
      const upgrade = this.byId.get(id);
      if (upgrade) this.levels[id] = Math.min(upgrade.maxLevel, nonNegativeInteger(level));
    }
    this.currencyMultiplier = positiveOr(saved.currencyMultiplier, 1);
    this.spawnMassScale = positiveOr(saved.spawnMassScale, 1);
    this.spawnSpeedScale = positiveOr(saved.spawnSpeedScale, 1);
    this.addShapePriceMultiplier = positiveOr(saved.addShapePriceMultiplier, 1);
  }

  /** Sum of one effect key over every bought upgrade. */
  effect(key) {
    let total = 0;
    for (const upgrade of this.upgrades) {
      const level = this.level(upgrade.id);
      if (level > 0) total += upgrade.effect(level)[key] ?? 0;
    }
    return total;
  }
}

export default Cosmos;
