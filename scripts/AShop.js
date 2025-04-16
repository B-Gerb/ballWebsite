class AShop {

    constructor() {
        this.balance = 0.00;

        if (this.constructor === AShop) {
            throw new Error("Abstract class AShop cannot be instantiated directly");
        }
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
    resetShop() {
        throw new Error("Method 'resetShop()' must be implemented by child classes");
    }
    getItem(itemName) {
        return this.items.find(item => item.name === itemName);
    }


}