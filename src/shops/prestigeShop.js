/**
 * Prestige upgrade curves
 *
 * - Unlocks (maxLevel 1): flat price.
 * - 10-level stat upgrades: linear value (+0.05..+0.25 per level) with price
 *   growth softened to ×1.4–×1.8 per level (+0.5 × level), so late levels
 *   stay worth buying. Cheap/weak stats grow slowest; Mass Collision Value
 *   (the strongest) grows ×1.8.
 * - Cosmos (late game, 5k–50k start): steep ×2.5–×3 per level.
 *     blackHoleThreshold / supernovaThreshold / skillPointCost: 1 − 0.1·level
 *     cosmicMultiplier: +0.5·level added to the ×9 per-event money multiplier
 *     grandCurrency: 1.5^level global money multiplier
 * Prestige award itself is sublinear in run points: see prestigeEquations.js.
 */
import AShop from './AShop.js';
import {
    linearValue,
    prestigeGainMultiplier,
    scaledPrice,
} from '../prestigeEquations.js';

class prestigeShop extends AShop{
    constructor() {
        super();
        this.items = [
            {
                name: "Unlock Triangle",
                price: 10,
                level: 0,
                maxLevel: 1,
                priceEquation: scaledPrice(1),
                valueEquation: linearValue(0, 1),
                effectKey: 'unlockTriangle'
            },
            {
                name: "Unlock Square",
                price: 20,
                level: 0,
                maxLevel: 1,
                priceEquation: scaledPrice(1),
                valueEquation: linearValue(0, 1),
                effectKey: 'unlockSquare'
            },
            {
                name: "Increase Circle Wall Hit Value",
                price: 25,
                level: 0,
                maxLevel: 10,
                priceEquation: scaledPrice(1.4, 0.1),
                valueEquation: linearValue(1, 0.1),
                effectKey: 'circleWallValue'
            },
            {
                name: "Increase Triangle Value",
                price: 35,
                maxLevel: 10,
                level: 0,
                priceEquation: scaledPrice(1.5, 0.1),
                valueEquation: linearValue(1, 0.25),
                effectKey: 'triangleValue'
            },
            {
                name: "Increase Square Value",
                price: 35,
                maxLevel: 10,
                level: 0,
                priceEquation: scaledPrice(1.6, 0.5),
                valueEquation: linearValue(1, 0.25),
                effectKey: 'squareValue'
            },
            {
                name: "Increase Triangle Size",
                price: 45,
                maxLevel: 10,
                level: 0,
                priceEquation: scaledPrice(1.6, 0.5),
                valueEquation: linearValue(1, 0.1),
                effectKey: 'triangleSize'
            },
            {
                name: "Increase Triangle Speed",
                price: 50,
                maxLevel: 10,
                level: 0,
                priceEquation: scaledPrice(1.6, 0.5),
                valueEquation: linearValue(1, 0.25),
                effectKey: 'triangleSpeed'
            },
            {
                name: "Increase Triangle Collision Value",
                price: 60,
                maxLevel: 10,
                level: 0,
                priceEquation: scaledPrice(1.65, 0.5),
                valueEquation: linearValue(1, 0.25),
                effectKey: 'triangleCollisionValue'
            },
            {
                name: "Increase Square Size",
                price: 45,
                maxLevel: 10,
                level: 0,
                priceEquation: scaledPrice(1.6, 0.5),
                valueEquation: linearValue(1, 0.1),
                effectKey: 'squareSize'
            },
            {
                name: "Increase Square Speed",
                price: 50,
                maxLevel: 10,
                level: 0,
                priceEquation: scaledPrice(1.6, 0.5),
                valueEquation: linearValue(1, 0.25),
                effectKey: 'squareSpeed'
            },
            {
                name: "Increase Square Collision Value",
                price: 60,
                maxLevel: 10,
                level: 0,
                priceEquation: scaledPrice(1.65, 0.5),
                valueEquation: linearValue(1, 0.25),
                effectKey: 'squareCollisionValue'
            },
            {
                name: "Increase Click Value",
                price: 40,
                maxLevel: 10,
                level: 0,
                priceEquation: scaledPrice(1.55, 0.5),
                valueEquation: linearValue(1, 0.2),
                effectKey: 'clickValue'
            },
            {
                name: "Increase Click Upgrade Effectiveness",
                price: 75,
                maxLevel: 10,
                level: 0,
                priceEquation: scaledPrice(1.65, 0.5),
                valueEquation: linearValue(1, 0.25),
                effectKey: 'clickUpgradeEffectiveness'
            },
            {
                name: "Decrease Circle Cost Scaling",
                price: 50,
                maxLevel: 10,
                level: 0,
                priceEquation: scaledPrice(1.6, 0.5),
                valueEquation: linearValue(1, 0.05),
                effectKey: 'circleCostScaling'
            },
            {
                name: "Decrease Square Cost Scaling",
                price: 50,
                maxLevel: 10,
                level: 0,
                priceEquation: scaledPrice(1.6, 0.5),
                valueEquation: linearValue(1, 0.05),
                effectKey: 'squareCostScaling'
            },
            {
                name: "Decrease Triangle Cost Scaling",
                price: 50,
                maxLevel: 10,
                level: 0,
                priceEquation: scaledPrice(1.6, 0.5),
                valueEquation: linearValue(1, 0.05),
                effectKey: 'triangleCostScaling'
            },
            {
                name: "Global Currency Multiplier",
                price: 100,
                maxLevel: 10,
                level: 0,
                priceEquation: scaledPrice(1.7, 0.5),
                valueEquation: linearValue(1, 0.25),
                effectKey: 'currencyMultiplier'
            },
            {
                name: "Global Speed",
                price: 125,
                maxLevel: 10,
                level: 0,
                priceEquation: scaledPrice(1.7, 0.5),
                valueEquation: linearValue(1, 0.25),
                effectKey: 'globalSpeed'
            },
            {
                name: "Global Size",
                price: 125,
                maxLevel: 10,
                level: 0,
                priceEquation: scaledPrice(1.7, 0.5),
                valueEquation: linearValue(1, 0.1),
                effectKey: 'globalSize'
            },
            {
                name: "Prestige Value Increase",
                price: 150,
                maxLevel: 10,
                level: 0,
                priceEquation: scaledPrice(1.75, 0.5),
                valueEquation: prestigeGainMultiplier,
                effectKey: 'prestigeGain'
            },
            {
                name: "Collision Value From Speed",
                price: 175,
                maxLevel: 10,
                level: 0,
                priceEquation: scaledPrice(1.7, 0.5),
                valueEquation: linearValue(1, 0.2),
                effectKey: 'speedCollisionValue'
            },
            {
                name: "Collision Value From Size",
                price: 175,
                maxLevel: 10,
                level: 0,
                priceEquation: scaledPrice(1.7, 0.5),
                valueEquation: linearValue(1, 0.2),
                effectKey: 'sizeCollisionValue'
            },
            {
                name: "Collision Value From Mass",
                price: 250,
                maxLevel: 10,
                level: 0,
                priceEquation: scaledPrice(1.8, 0.5),
                valueEquation: linearValue(1, 0.25),
                effectKey: 'massCollisionValue'
            },
            // ── Cosmos: late-game black hole / supernova upgrades ──
            {
                name: "Event Horizon Theory",
                price: 5000,
                maxLevel: 5,
                level: 0,
                priceEquation: scaledPrice(2.75),
                valueEquation: linearValue(1, -0.1),
                effectKey: 'blackHoleThreshold'
            },
            {
                name: "Stellar Physics",
                price: 5000,
                maxLevel: 5,
                level: 0,
                priceEquation: scaledPrice(2.75),
                valueEquation: linearValue(1, -0.1),
                effectKey: 'supernovaThreshold'
            },
            {
                name: "Cosmic Dividend",
                price: 20000,
                maxLevel: 5,
                level: 0,
                priceEquation: scaledPrice(3),
                valueEquation: linearValue(0, 0.5),
                effectKey: 'cosmicMultiplier'
            },
            {
                name: "Skill Mentor",
                price: 15000,
                maxLevel: 5,
                level: 0,
                priceEquation: scaledPrice(2.75),
                valueEquation: linearValue(1, -0.1),
                effectKey: 'skillPointCost'
            },
            {
                name: "Grand Multiplier",
                price: 50000,
                maxLevel: 10,
                level: 0,
                priceEquation: scaledPrice(2.5),
                valueEquation: (level) => 1.5 ** level,
                effectKey: 'grandCurrency'
            },
        ];

    }
    resetShop() {
        this.balance = 0.00;
        const defaultShop = new prestigeShop();
        this.items = defaultShop.items;   
    }
    removeSquare() {
        this.items = this.items.filter(item => item.name !== "Unlock Square");
    }
    buyItemByName(itemName, amount = 1) {
        const item = this.getItem(itemName);

        if (item) {
            if(item.maxLevel == 1){
                //signle unlock item
                if (item.level >= item.maxLevel) return false;
                if (this.balance >= item.price) {
                    this.removeBalance(item.price);
                    item.level = 1;
                    return true; 
                }
            }
            
            return this.buyItem(item, amount);
        }
        return false;
    }
}

export default prestigeShop;
