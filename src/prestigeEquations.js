export const MINIMUM_RUN_POINTS = 1000;

export const linearValue = (base, perLevel) => (level) =>
    base + level * perLevel;

export const scaledPrice = (multiplier, additive = 0) => (currentPrice, level) =>
    currentPrice * multiplier + level * additive;

export const prestigeGainMultiplier = linearValue(1, 0.25);

export const describePrestigeEffect = (effectKey, value) => {
    switch (effectKey) {
        case 'unlockSquare':
            return value > 0 ? 'Squares available' : 'Squares locked';
        case 'unlockTriangle':
            return value > 0 ? 'Triangle route available' : 'Triangle route locked';
        case 'circleSize':
            return `×${value.toFixed(2)} arena size`;
        case 'shapeSpeed':
            return `×${value} shape speed`;
        case 'shapeValue':
            return `×${value} collision value`;
        case 'clickValue':
            return `×${value} click value`;
        case 'prestigeGain':
            return `×${value.toFixed(2)} prestige gain`;
        default:
            return String(value);
    }
};

const nonNegativeFinite = (value) => (
    Number.isFinite(value) && value > 0 ? value : 0
);

export const basePrestigePoints = (runPoints) =>
    Math.floor(nonNegativeFinite(runPoints) / MINIMUM_RUN_POINTS);

export const collisionMultiplier = (totalCollisions) =>
    1 + Math.log10(nonNegativeFinite(totalCollisions) + 1);

export const prestigeAward = (runPoints, totalCollisions, upgradeMultiplier) => {
    const safeUpgradeMultiplier = Number.isFinite(upgradeMultiplier) && upgradeMultiplier >= 0
        ? upgradeMultiplier
        : 1;
    const result = Math.floor(
        basePrestigePoints(runPoints)
        * collisionMultiplier(totalCollisions)
        * safeUpgradeMultiplier
    );

    return Number.isFinite(result) ? Math.max(0, result) : 0;
};

export const PRESTIGE_EQUATIONS = {
    minimumRunPoints: MINIMUM_RUN_POINTS,
    basePoints: basePrestigePoints,
    collisionMultiplier,
    finalAward: prestigeAward,
};
