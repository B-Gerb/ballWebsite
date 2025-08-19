import AShop from './AShop';

class clickShop extends AShop {
    constructor(){
        super();
        this.items = [
            {
                name: "Increase Click Value",
                price: 10,
                level: 1,
                equation: function(price) {
                    return price + (Math.floor(this.level/10)+1)*price*.5;
                },
                getValue: function() { return this.level; }
            },
            {
                name: "Temporary Click Value Multiplier",
                price: 20,
                level: 1,
                equation: function(price) {
                    return price + (Math.floor(this.level/10)+1)*price*0.2;
                },
                getValue: function() { 
                    if (this.level < 10){
                        return 1.5;
                    }
                    if(this.level < 25){
                        return 1.75;
                    }
                    if(this.level< 50){
                        return 2;
                    }
                    if(this.level < 100){
                        return 2.5;
                    }
                    if(this.level < 200){
                        return 3;
                    }
                    if(this.level < 500){
                        return 3.5;
                    }
                    if(this.level < 1000){
                        return 4;
                    }
                    else{
                        return 0;
                    }
                }
            },
            {
                name: "Temporary Ball Value Multiplier",
                price: 50,
                level: 1,
                equation: function(price) {
                    return price + (Math.floor(this.level/10)+1)*price*0.3;
                },
                getValue: function() { 
                    /* rest of the getValue function remains the same */
                    if (this.level < 10){
                        return 1.25;
                    }
                    if(this.level < 25){
                        return 1.5;
                    }
                    if(this.level< 50){
                        return 1.75;
                    }
                    if(this.level < 100){
                        return 2;
                    }
                    if(this.level < 200){
                        return 2.5;
                    }
                    if(this.level < 500){
                        return 3;
                    }
                    if(this.level < 1000){
                        return 4;
                    }
                    else{
                        return 0;
                    }
                }
            },
            {
                name: "Temporary Speed Multiplier",
                price: 50,
                level: 1,
                equation: function(price) {
                    return price + (Math.floor(this.level/10)+1)*price*0.3;
                },
                getValue: function() { 
                    /* rest of the getValue function remains the same */
                    if (this.level < 10){
                        return 2.25;
                    }
                    if(this.level < 25){
                        return 2.5;
                    }
                    if(this.level< 50){
                        return 2.75;
                    }
                    if(this.level < 100){
                        return 3;
                    }
                    if(this.level < 200){
                        return 3.5;
                    }
                    if(this.level < 500){
                        return 4;
                    }
                    if(this.level < 1000){
                        return 5;
                    }
                    else{
                        return 0;
                    }
                }
            }
        ];
    }
    
    // resetShop method remains the same
    resetShop() {
        this.balance = 0.00;
        
        // Reset all items to their initial state
        this.items.forEach(item => {
            // Reset price based on item name
            switch(item.name) {
                case "Increase Click Value":
                    item.price = 10;
                    item.level = 1
                    break;
                case "Temporary Click Value Multiplier":
                    item.price = 20;
                    item.level = 1
                    break;
                case "Temporary Ball Value Multiplier":
                    item.price = 50;
                    item.level = 1
                    break;
                case "Temporary Speed Multiplier":
                    item.price = 50;
                    item.level = 1
                    break;
            }
        });
    }
}

export default clickShop;
