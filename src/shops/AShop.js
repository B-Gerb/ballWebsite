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
    /** Price after buying one more level while the item is at `level`. */
    nextPrice(item, price, level) {
        if (item.priceEquation) return item.priceEquation(price, level);
        // Legacy `equation`s read `this.level`, so give them the level the
        // item would have at that step of a bulk buy.
        return item.equation.call({ ...item, level }, price);
    }
    itemCost(item, amount) {
        let cost = 0;
        let currentPrice = item.price;
        const costScalingMultiplier = (item.costScalingMultiplier ?? 1) * (item.priceMultiplier ?? 1);
        for (let i = 0; i < amount; ++i) {
            cost += currentPrice * costScalingMultiplier;
            currentPrice = this.nextPrice(item, currentPrice, item.level + i);
        }
        return [cost, currentPrice];
    }
    /**
     * Most levels the balance covers in one go (respecting maxLevel), and
     * what they cost together. `limit` keeps a huge balance from looping forever.
     */
    maxAffordable(item, limit = 10000) {
        const room = item.maxLevel != null ? Math.max(0, item.maxLevel - item.level) : Infinity;
        const cap = Math.min(room, limit);
        const scaling = (item.costScalingMultiplier ?? 1) * (item.priceMultiplier ?? 1);
        let count = 0;
        let cost = 0;
        let price = item.price;
        while (count < cap) {
            const next = price * scaling;
            if (!Number.isFinite(next) || cost + next > this.balance) break;
            cost += next;
            price = this.nextPrice(item, price, item.level + count);
            count++;
        }
        return { count, cost };
    }

    /**
     * Set a freshly-built item to `level`, deriving its price from the
     * current price curve (so a save made under older, steeper curves
     * gets today's prices).
     */
    restoreLevel(item, level) {
        const steps = level - item.level;
        if (steps > 0) item.price = this.itemCost(item, steps)[1];
        item.level = level;
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
