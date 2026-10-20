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
                name: "Unlock Square",
                price: 10,
                level: 0,
                maxLevel: 1,
                priceEquation: scaledPrice(1),
                valueEquation: linearValue(0, 1),
                effectKey: 'unlockSquare'
            },
            {
                name: "Unlock Triangle",
                price: 75,
                level: 0,
                maxLevel: 1,
                priceEquation: scaledPrice(1),
                valueEquation: linearValue(0, 1),
                effectKey: 'unlockTriangle'
            },
            {
                name: "Increase Base Circle Size",
                price: 20,
                level: 0,
                maxLevel: 10,
                priceEquation: scaledPrice(1.4, 0.1),
                valueEquation: linearValue(1, 0.1),
                effectKey: 'circleSize'
            },
            {
                name: "Increase Ball Speed",
                price: 40,
                maxLevel: 10,
                level: 0,
                priceEquation: scaledPrice(1.5, 0.1),
                valueEquation: linearValue(1, 2),
                effectKey: 'shapeSpeed'
            },
            {
                name: "Increase Ball Value",
                price: 50,
                maxLevel: 9,
                level: 0,
                priceEquation: scaledPrice(2, 0.5),
                valueEquation: linearValue(1, 1),
                effectKey: 'shapeValue'
            },
            {
                name: "Increase Click Value",
                price: 50,
                maxLevel: 9,
                level: 0,
                priceEquation: scaledPrice(2, 0.5),
                valueEquation: linearValue(1, 1),
                effectKey: 'clickValue'
            },
            {
                name: "Increase Prestige Gain",
                price: 100,
                maxLevel: 10,
                level: 0,
                priceEquation: scaledPrice(2, 0.5),
                valueEquation: prestigeGainMultiplier,
                effectKey: 'prestigeGain'
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
