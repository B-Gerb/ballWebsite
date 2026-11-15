import AShop from './AShop.js';

/*
 * Size upgrades stop where new shapes reach their spawn cap in the default
 * arena (see SHAPE_SIZE_LIMITS in CircleBoard.js): circles radius 25, squares
 * side 43, triangles side 46. Bigger shapes would take over the board.
 *
 * Price curves: each level costs a steady percentage more (×1.35 size,
 * ×1.45 speed, ×1.5 arena) plus a small flat amount, so prices climb
 * smoothly instead of exploding. Add-shape items stay at ×1.1 + 1.
 */
class baseUpgradeShop extends AShop {
    constructor() {
        super();
        this.items = {
            ballShop: [
                { 
                    name: "Add Ball", 
                    price: 1, 
                    level: 1, 
                    equation: price => price * 1.1 + 1,
                    getValue: function() { return (this.level) + 1; }
                },
                { 
                    name: "Increase Ball Size Range Min", maxLevel: 21, 
                    price: 20, 
                    level: 1, 
                    equation: price => price * 1.35 + 5,
                    getValue: function() { return this.level + 4; }
                },
                { 
                    name: "Increase Ball Size Range Max", maxLevel: 11, 
                    price: 20, 
                    level: 1, 
                    equation: price => price * 1.35 + 5,
                    getValue: function() { return this.level + 14; }
                },
                { 
                    name: "Increase Ball Speed Min", 
                    price: 30, 
                    level: 1, 
                    equation: price => price * 1.45 + 5,
                    getValue: function() { return this.level + 4; }
                },
                { 
                    name: "Increase Ball Speed Max", 
                    price: 30, 
                    level: 1, 
                    equation: price => price * 1.45 + 5,
                    getValue: function() { return this.level + 14; }
                },
                { 
                    name: "Decrease Large Circle Size", 
                    price: 50, 
                    level: 1, 
                    maxLevel: 100, // 750 - 5 * level must stay well above 0
                    equation: price => price * 1.5 + 10,
                    getValue: function() { return 750 - (this.level * 5); }
                }
            ]
        };
    }

    resetShop() {
        this.balance = 0.00;

        // Reset all items to their initial state
        const replacements = new baseUpgradeShop();
        this.items = replacements.items; 
        // this.items.forEach(item => {
        //     // Reset price based on item name
        //     item.price = item.name === "Add Ball" ? 1 : 
        //                 (item.name.includes("Ball Size") ? 20 : 
        //                 (item.name.includes("Ball Speed") ? 30 : 50));
        //     item.level = 1;
        // });

    }
    /** The "Add Ball / Square / Triangle" item of every shape section. */
    addShapeItems() {
        return Object.values(this.items).flat().filter((item) => item.name.startsWith('Add '));
    }

    /**
     * Every add-shape item costs `multiplier` × its normal price (black holes
     * and supernovas raise it). Used after an event and when loading a save.
     */
    setAddShapePriceMultiplier(multiplier = 1) {
        const value = Number.isFinite(multiplier) && multiplier > 0 ? multiplier : 1;
        for (const item of this.addShapeItems()) item.priceMultiplier = value;
    }

    /** Black hole / supernova: add-shape items go back to level 1 at the new price. */
    resetAddShapeItems(multiplier = 1) {
        const fresh = new baseUpgradeShop();
        fresh.addSquaresToShop();
        fresh.addTrianglesToShop();
        for (const item of this.addShapeItems()) {
            const [start] = fresh.getItem(item.name);
            item.level = start.level;
            item.price = start.price;
        }
        this.setAddShapePriceMultiplier(multiplier);
    }

    getItem(itemName) {
        for(const shop in this.items) {
            const found =  this.items[shop].find(item => item.name === itemName);
            if (found) return [found, shop];
        }
        
        throw new Error(`Item ${itemName} not found in the shop`);
    }
    addSquaresToShop() {
        this.items.squareShop = [
            { 
                name: "Add Square", 
                price: 1, 
                level: 1, 
                equation: price => price * 1.1 + 1,
                getValue: function() { return (this.level) + 1; }
            },
            { 
                name: "Increase Square Size Range Min", maxLevel: 39, 
                price: 20, 
                level: 1, 
                equation: price => price * 1.35 + 5,
                getValue: function() { return this.level + 4; }
            },
            { 
                name: "Increase Square Size Range Max", maxLevel: 29, 
                price: 20, 
                level: 1, 
                equation: price => price * 1.35 + 5,
                getValue: function() { return this.level + 14; }
            },
            { 
                name: "Increase Square Speed Min", 
                price: 30, 
                level: 1, 
                equation: price => price * 1.45 + 5,
                getValue: function() { return this.level + 4; }
            },
            { 
                name: "Increase Square Speed Max", 
                price: 30, 
                level: 1, 
                equation: price => price * 1.45 + 5,
                getValue: function() { return this.level + 14; }
            }
        ];
    }

    addTrianglesToShop() {
        if (this.items.triangleShop) return;
        this.items.triangleShop = [
            { name: "Add Triangle", price: 1, level: 1, equation: price => price * 1.1 + 1, getValue() { return this.level + 1; } },
            { name: "Increase Triangle Size Range Min", maxLevel: 42, price: 20, level: 1, equation: price => price * 1.35 + 5, getValue() { return this.level + 4; } },
            { name: "Increase Triangle Size Range Max", maxLevel: 32, price: 20, level: 1, equation: price => price * 1.35 + 5, getValue() { return this.level + 14; } },
            { name: "Increase Triangle Speed Min", price: 30, level: 1, equation: price => price * 1.45 + 5, getValue() { return this.level + 4; } },
            { name: "Increase Triangle Speed Max", price: 30, level: 1, equation: price => price * 1.45 + 5, getValue() { return this.level + 14; } },
        ];
    }

}

export default baseUpgradeShop;
