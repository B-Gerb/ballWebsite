class prestigeUpgradeShop extends AShop {
    constructor() {
        super();
        this.items = [
            {
                name: "Add Square",
                price: 1,
                level: 1,
                equation: price => price * 1.1 + 1,
            }
            ,
            {
                name: "Increase Square Size Range Min", 
                price: 20, 
                level: 1, 
                equation: price => (price + 10) ** 1.2,
                getValue: function() { return this.level + 4; }
            }
            ,
            {
                name: "Increase Square Size Range Max", 
                price: 20, 
                level: 1, 
                equation: price => (price + 10) ** 1.2,
                getValue: function() { return this.level + 14; }
            }
            ,
            {
                name: "Increase Square Speed Min", 
                price: 30, 
                level: 1, 
                equation: price => (price + 10) ** 1.4,
                getValue: function() { return this.level + 4; }
            }
            ,
            {
                name: "Increase Square Speed Max", 
                price: 30, 
                level: 1, 
                equation: price => (price + 10) ** 1.4,
                getValue: function() { return this.level + 14; }
            }
        ]   

    }
    resetShop() {
        this.balance = 0.00;
        
        // Reset all items to their initial state
        this.items.forEach(item => {
            // Reset price based on item name
            switch(item.name) {
                case "Add Square":
                    item.price = 1;
                    item.level = 1
                    break;
                case "Increase Square Size Range Min":
                    item.price = 20;
                    item.level = 1
                    break;
                case "Increase Square Size Range Max":
                    item.price = 20;
                    item.level = 1
                    break;
                case "Increase Square Speed Min":
                    item.price = 30;
                    item.level = 1
                    break;
                case "Increase Square Speed Max":
                    item.price = 30;
                    item.level = 1
                    break;
            }
        });
    }
}