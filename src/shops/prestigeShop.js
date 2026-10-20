import AShop from './AShop';
import {
    linearValue,
    prestigeGainMultiplier,
    scaledPrice,
} from '../prestigeEquations';

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
                priceEquation: scaledPrice(2, 0.5),
                valueEquation: linearValue(1, 0.25),
                effectKey: 'squareValue'
            },
            {
                name: "Increase Triangle Size",
                price: 45,
                maxLevel: 10,
                level: 0,
                priceEquation: scaledPrice(1.8, 0.5),
                valueEquation: linearValue(1, 0.1),
                effectKey: 'triangleSize'
            },
            {
                name: "Increase Triangle Speed",
                price: 50,
                maxLevel: 10,
                level: 0,
                priceEquation: scaledPrice(1.8, 0.5),
                valueEquation: linearValue(1, 0.25),
                effectKey: 'triangleSpeed'
            },
            {
                name: "Increase Triangle Collision Value",
                price: 60,
                maxLevel: 10,
                level: 0,
                priceEquation: scaledPrice(2, 0.5),
                valueEquation: linearValue(1, 0.25),
                effectKey: 'triangleCollisionValue'
            },
            {
                name: "Increase Square Size",
                price: 45,
                maxLevel: 10,
                level: 0,
                priceEquation: scaledPrice(1.8, 0.5),
                valueEquation: linearValue(1, 0.1),
                effectKey: 'squareSize'
            },
            {
                name: "Increase Square Speed",
                price: 50,
                maxLevel: 10,
                level: 0,
                priceEquation: scaledPrice(1.8, 0.5),
                valueEquation: linearValue(1, 0.25),
                effectKey: 'squareSpeed'
            },
            {
                name: "Increase Square Collision Value",
                price: 60,
                maxLevel: 10,
                level: 0,
                priceEquation: scaledPrice(2, 0.5),
                valueEquation: linearValue(1, 0.25),
                effectKey: 'squareCollisionValue'
            },
            {
                name: "Increase Click Value",
                price: 40,
                maxLevel: 10,
                level: 0,
                priceEquation: scaledPrice(1.7, 0.5),
                valueEquation: linearValue(1, 0.2),
                effectKey: 'clickValue'
            },
            {
                name: "Increase Click Upgrade Effectiveness",
                price: 75,
                maxLevel: 10,
                level: 0,
                priceEquation: scaledPrice(2, 0.5),
                valueEquation: linearValue(1, 0.25),
                effectKey: 'clickUpgradeEffectiveness'
            },
            {
                name: "Decrease Circle Cost Scaling",
                price: 50,
                maxLevel: 10,
                level: 0,
                priceEquation: scaledPrice(1.8, 0.5),
                valueEquation: linearValue(1, 0.05),
                effectKey: 'circleCostScaling'
            },
            {
                name: "Decrease Square Cost Scaling",
                price: 50,
                maxLevel: 10,
                level: 0,
                priceEquation: scaledPrice(1.8, 0.5),
                valueEquation: linearValue(1, 0.05),
                effectKey: 'squareCostScaling'
            },
            {
                name: "Decrease Triangle Cost Scaling",
                price: 50,
                maxLevel: 10,
                level: 0,
                priceEquation: scaledPrice(1.8, 0.5),
                valueEquation: linearValue(1, 0.05),
                effectKey: 'triangleCostScaling'
            },
            {
                name: "Global Currency Multiplier",
                price: 100,
                maxLevel: 10,
                level: 0,
                priceEquation: scaledPrice(2, 0.5),
                valueEquation: linearValue(1, 0.25),
                effectKey: 'currencyMultiplier'
            },
            {
                name: "Global Speed",
                price: 125,
                maxLevel: 10,
                level: 0,
                priceEquation: scaledPrice(2, 0.5),
                valueEquation: linearValue(1, 0.25),
                effectKey: 'globalSpeed'
            },
            {
                name: "Global Size",
                price: 125,
                maxLevel: 10,
                level: 0,
                priceEquation: scaledPrice(2, 0.5),
                valueEquation: linearValue(1, 0.1),
                effectKey: 'globalSize'
            },
            {
                name: "Prestige Value Increase",
                price: 150,
                maxLevel: 10,
                level: 0,
                priceEquation: scaledPrice(2, 0.5),
                valueEquation: prestigeGainMultiplier,
                effectKey: 'prestigeGain'
            },
            {
                name: "Collision Value From Speed",
                price: 175,
                maxLevel: 10,
                level: 0,
                priceEquation: scaledPrice(2, 0.5),
                valueEquation: linearValue(1, 0.2),
                effectKey: 'speedCollisionValue'
            },
            {
                name: "Collision Value From Size",
                price: 175,
                maxLevel: 10,
                level: 0,
                priceEquation: scaledPrice(2, 0.5),
                valueEquation: linearValue(1, 0.2),
                effectKey: 'sizeCollisionValue'
            },
            {
                name: "Collision Value From Mass",
                price: 250,
                maxLevel: 10,
                level: 0,
                priceEquation: scaledPrice(2.5, 0.5),
                valueEquation: linearValue(1, 0.25),
                effectKey: 'massCollisionValue'
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
