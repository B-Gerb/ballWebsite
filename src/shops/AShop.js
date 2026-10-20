class AShop {
    constructor() {
        this.balance = 0.00;
        if (this.constructor === AShop) {
            throw new Error("Abstract class AShop cannot be instantiated directly");
        }
    }
    addBalance(amount) {
        if (!Number.isFinite(amount)) {
            console.warn('Ignored non-finite shop balance update:', amount);
            return this.balance;
        }
        this.balance += amount;
    }
    removeBalance(amount) {
        this.balance -= amount;
        if (this.balance < 0) this.balance = 0;
    }
    getBalance() {
        if (!Number.isFinite(this.balance) || this.balance < 0) {
            console.warn('Resetting invalid shop balance:', this.balance);
            this.balance = 0;
        }
        return this.balance;
    }
    itemCost(item, amount) {
        let cost = 0;
        let currentPrice = item.price;
        const costScalingMultiplier = item.costScalingMultiplier ?? 1;
        for (let i = 0; i < amount; ++i) {
            cost += currentPrice * costScalingMultiplier;
            const priceEquation = item.priceEquation ?? ((price) => item.equation(price));
            currentPrice = priceEquation(currentPrice, item.level + i);
        }
        return [cost, currentPrice];
    }
    buyItem(item, amount = 1) {
        if (!Number.isInteger(amount) || amount < 1 ||
            (item.maxLevel != null && item.level + amount > item.maxLevel)) {
            return false;
        }
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
        const found = this.items.find(item => item.name === itemName);
        if (found) return found;
    }
}

export default AShop;
