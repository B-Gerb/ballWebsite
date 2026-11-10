/**
 * Read-only view of the temporary click-shop boosts for the UI.
 *
 * Server keeps `temporaryMultipliersActiveFrames` as
 *   { tclickValue: { name, multiplier, frames, total }, ... }
 * where `frames` counts down once per fixed 60 Hz game step and `total`
 * is the duration it was last topped up to (older saves don't have it).
 */

export const FRAMES_PER_SECOND = 60;

/** Store order; `key` is Server's internal name for the boost. */
export const BOOSTS = [
  { key: 'tclickValue', item: 'Temporary Click Value Multiplier', label: 'Click value' },
  { key: 'tcircleValue', item: 'Temporary Ball Value Multiplier', label: 'Shape value' },
  { key: 'tcircleSpeed', item: 'Temporary Speed Multiplier', label: 'Speed' },
];

export function activeBoosts(activeFrames) {
  if (!activeFrames) return [];
  return BOOSTS.flatMap(({ key, item, label }) => {
    const entry = activeFrames[key];
    if (!entry || !(entry.frames > 0)) return [];
    const total = Math.max(entry.total ?? 0, entry.frames);
    return [{
      key,
      item,
      label,
      multiplier: entry.multiplier,
      secondsLeft: entry.frames / FRAMES_PER_SECOND,
      fraction: entry.frames / total,
    }];
  });
}

export function boostForItem(activeFrames, itemName) {
  return activeBoosts(activeFrames).find((boost) => boost.item === itemName) ?? null;
}

/** 7.5 → "0:08", 3725 → "1:02:05". Rounds up so "0:00" only shows at the end. */
export function formatDuration(seconds) {
  const total = Math.max(0, Math.ceil(seconds));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = String(total % 60).padStart(2, '0');
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${s}` : `${m}:${s}`;
}
