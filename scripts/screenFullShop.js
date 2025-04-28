class screenFullShop extends AShop {
    constructor() {
        super();
        this.items = [
            { 
                name: "Combine Two Same Shapes", 
                price: 1, 
                level: 1, 
                equation: price => price * 1.1 + 1,
                getValue: function() { return this.level == 1 ? 0 : this.level * 0.001 + .004; }
            },
            {
                name: "Circle Value Percent Increase",
                price: 2,
                level: 1,
                equation: price => price * 1.15 + 1,
                getValue: function() { return this.level == 1 ? 1 : (1 + (this.level/4))**1.25; }
            },
            {
                name: "Triangle Value Percent Increase",
                price: 5,
                level: 1,
                equation: price => price * 1.2 + 1,
                getValue: function() { return this.level == 1 ? 1 : (1 + (this.level/5))**1.15; }
            },
            {
                name: "Square Value Percent Increase",
                price: 10,
                level: 1,
                equation: price => price * 1.25 + 1,
                getValue: function() { return this.level == 1 ? 1 : (1 + (this.level/6))**1.1; }
            }
        ];
    }
    resetShop() {

        this.balance = 0.00;
        
        // Reset all items to their initial state
        this.items.forEach(item => {
            // Reset price based on item name
            switch(item.name) {
                case "Combine Two Same Shapes":
                    item.price = 1;
                    item.level = 1
                    break;
                case "Circle Value Percent Increase":
                    item.price = 2;
                    item.level = 1
                    break;
                case "Square Value Percent Increase":
                    item.price = 5;
                    item.level = 1
                    break;
                case "Triangle Value Percent Increase":
                    item.price = 10;
                    item.level = 1
                    break;
            }
        });
    }

}
