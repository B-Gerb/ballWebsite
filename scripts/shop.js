class baseUpgradeShop extends AShop {
    constructor() {
        super();
        this.items = [
            { 
                name: "Add Ball", 
                price: 1, 
                level: 1, 
                equation: price => price * 1.1 + 1,
                getValue: function() { return (this.level) +1; }
            },
            { 
                name: "Increase Ball Size Range Min", 
                price: 20, 
                level: 1, 
                equation: price => (price + 10) ** 1.2,
                getValue: function() { return this.level + 4; }
            },
            { 
                name: "Increase Ball Size Range Max", 
                price: 20, 
                level: 1, 
                equation: price => (price + 10) ** 1.2,
                getValue: function() { return this.level + 14; }
            },
            { 
                name: "Increase Ball Speed Min", 
                price: 30, 
                level: 1, 
                equation: price => (price + 10) ** 1.4,
                getValue: function() { return this.level + 4; }
            },
            { 
                name: "Increase Ball Speed Max", 
                price: 30, 
                level: 1, 
                equation: price => (price + 10) ** 1.4,
                getValue: function() { return this.level + 14; }
            },
            { 
                name: "Decrease Large Circle Size", 
                price: 50, 
                level: 1, 
                equation: price => (price + 10) ** 1.2,
                getValue: function() { return 750 - (this.level * 5); }
            },
        ];
    }

    resetShop() {

        this.balance = 0.00;
        
        // Reset all items to their initial state
        this.items.forEach(item => {
            // Reset price based on item name
            item.price = item.name === "Add Ball" ? 1 : 
                        (item.name.includes("Ball Size") ? 20 : 
                        (item.name.includes("Ball Speed") ? 30 : 50));
            item.level = 1;
        });
        
    }

    
}