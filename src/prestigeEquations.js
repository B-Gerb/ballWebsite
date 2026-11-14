export const MINIMUM_RUN_POINTS = 1000;
/**
 * Base prestige points grow sublinearly with run points:
 * floor((runPoints / 1000) ** 0.8). Still 1 point at exactly 1000 run points,
 * and a black hole / supernova (×9 money) is worth about ×5.8 prestige instead of ×9.
 * Each event also makes the next one ~10× harder, which keeps runs bounded.
 */
export const PRESTIGE_BASE_EXPONENT = 0.8;

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
        case 'circleWallValue':
            return `×${value.toFixed(2)} circle wall-hit value`;
        case 'clickUpgradeEffectiveness':
            return `×${value.toFixed(2)} click upgrade effectiveness`;
        case 'currencyMultiplier':
            return `×${value.toFixed(2)} global currency`;
        case 'globalSpeed':
            return `×${value.toFixed(2)} global speed`;
        case 'globalSize':
            return `×${value.toFixed(2)} global size`;
        case 'prestigeGain':
            return `×${value.toFixed(2)} prestige value`;
        case 'speedCollisionValue':
            return `×${value.toFixed(2)} speed collision value`;
        case 'sizeCollisionValue':
            return `×${value.toFixed(2)} size collision value`;
        case 'massCollisionValue':
            return `×${value.toFixed(2)} mass collision value`;
        case 'circleCostScaling':
        case 'squareCostScaling':
        case 'triangleCostScaling':
            return `−${((1 - 1 / value) * 100).toFixed(1)}% cost scaling`;
        case 'blackHoleThreshold':
            return `×${value.toFixed(2)} black hole mass threshold`;
        case 'supernovaThreshold':
            return `×${value.toFixed(2)} supernova speed threshold`;
        case 'cosmicMultiplier':
            return `×${(9 + value).toFixed(1)} money per black hole / supernova`;
        case 'skillPointCost':
            return `×${value.toFixed(2)} skill point cost`;
        case 'grandCurrency':
            return `×${value.toFixed(2)} grand currency multiplier`;
        default:
            return String(value);
    }
};

const nonNegativeFinite = (value) => (
    Number.isFinite(value) && value > 0 ? value : 0
);

export const basePrestigePoints = (runPoints) =>
    Math.floor((nonNegativeFinite(runPoints) / MINIMUM_RUN_POINTS) ** PRESTIGE_BASE_EXPONENT);

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
    baseExponent: PRESTIGE_BASE_EXPONENT,
    basePoints: basePrestigePoints,
    collisionMultiplier,
    finalAward: prestigeAward,
};
