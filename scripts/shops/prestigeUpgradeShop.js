class prestigeShop extends AShop {
    constructor() {
        super();
        this.items = [
            {
                name: "Unlock Square",
                price: 1500,
            }
            ,
            {
                name: "Increase Base Square Value",
                price: 3000,
                level: 1,
                equation: price => function(price) {
                    if(this.level < 10){
                        return price + (this.level * 250);
                    }
                    if(this.level < 20){
                        return price + (this.level * 500);
                    }
                    if(this.level < 30){
                        return price + (this.level * 750);
                    }
                    if(this.level < 40){
                        return price + (this.level * 1000);
                    }
                    return price * 1.1;
                },
                getValue: function() {
                    return this.level * 0.5;
                }
            },
            {
                name: "Increase Base Square Speed",
                price: 3000,
                level: 1,
                equation: price => function(price) {
                    if(this.level < 10){
                        return price + (this.level * 250);
                    }
                    if(this.level < 20){
                        return price + (this.level * 500);
                    }
                    if(this.level < 30){
                        return price + (this.level * 750);
                    }
                    if(this.level < 40){
                        return price + (this.level * 1000);
                    }
                    return price * 1.05;
                },
                getValue: function() {
                    return this.level * 0.5;
                }
            },
            {
                name: "Increase Ball Value Multiplier",
                price: 5000,
                level: 1,
                equation: price => function(price) {
                    if(this.level < 10){
                        return price + (this.level * 500);
                    }
                    if(this.level < 20){
                        return price + (this.level * 1000);
                    }
                    if(this.level < 30){
                        return price + (this.level * 1500);
                    }
                    if(this.level < 40){
                        return price + (this.level * 2000);
                    }
                    return price * 1.1;
                },
                getValue: function() {
                    return this.level * 0.5;
                }
            },
            {
                name: "Increase Ball Speed Multiplier",
                price: 5000,
                level: 1,
                equation: price => function(price) {
                    if(this.level < 10){
                        return price + (this.level * 500);
                    }
                    if(this.level < 20){
                        return price + (this.level * 1000);
                    }
                    if(this.level < 30){
                        return price + (this.level * 1500);
                    }
                    if(this.level < 40){
                        return price + (this.level * 2000);
                    }
                    return price * 1.05;
                },
                getValue: function() {
                    return this.level * 0.5;
                }
            }

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
}