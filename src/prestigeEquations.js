export const PRESTIGE_EQUATIONS = {
    minimumRunPoints: 1000,
    basePoints: (runPoints) => Math.floor(Math.max(0, runPoints) / 1000),
    collisionMultiplier: (totalCollisions) => 1 + Math.log10(Math.max(0, totalCollisions) + 1),
    finalAward: (runPoints, totalCollisions, upgradeMultiplier) => {
        const basePoints = PRESTIGE_EQUATIONS.basePoints(runPoints);
        const collisionMultiplier = PRESTIGE_EQUATIONS.collisionMultiplier(totalCollisions);
        const safeUpgradeMultiplier = Number.isFinite(upgradeMultiplier) && upgradeMultiplier >= 0
            ? upgradeMultiplier
            : 1;
        return Math.max(0, Math.floor(basePoints * collisionMultiplier * safeUpgradeMultiplier));
    },
};
