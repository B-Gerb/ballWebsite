export const MINIMUM_RUN_POINTS = 1000;

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
