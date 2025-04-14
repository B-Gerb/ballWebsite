class Shop {
    constructor() {
        this.balance = 0.00;
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

    addBalance(amount) {
        this.balance += amount;
    }

    removeBalance(amount) {
        this.balance -= amount;
        if (this.balance < 0) this.balance = 0;
    }

    getBalance() {
        return this.balance;
    }

    itemCost(item, amount) {
        let cost = 0;
        let currentPrice = item.price;
        
        for (let i = 0; i < amount; ++i) {
            cost += currentPrice;
            currentPrice = item.equation(currentPrice);
        }
        
        return [cost, currentPrice];
    }

    buyItem(item, amount = 1) {
        const [cost, newPrice] = this.itemCost(item, amount);
        
        if (this.balance >= cost) {
            this.removeBalance(cost);
            item.level += amount;
            item.price = newPrice;
            return true; 
        } else {
            return false; 
        }
    }
    
    getItem(itemName) {
        return this.items.find(item => item.name === itemName);
    }
}