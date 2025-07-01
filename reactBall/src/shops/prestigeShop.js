import AShop from './AShop';
class prestigeShop extends AShop{
    constructor() {
        super();
        this.items = [
            {
                name: "Unlock Square",
                price: 10,
                level: 0,
                maxLevel: 1
                

            },
            {
                name: "Increase Base Circle Size",
                price: 20,
                level: 0,
                maxLevel: 10,
                equation: function(price) {
                    if(this.level < 10) {
                        return price + ((this.level/10)+1*price*0.4);
                    }
                    if(this.level < 25) {
                        return price + ((this.level/10)+1*price*0.8);
                    }
                    if(this.level < 50) {
                        return price + ((this.level/10)+1*price*1.2);
                    }
                    else{
                        return price + ((this.level/10)+1*price*2);
                    }
                },
                getValue: function() { return this.level*3;}
            },
            {
                name: "Increase Ball Speed",
                price: 40,
                maxLevel: 10,
                level: 0,
                equation: function(price) {
                    if(this.level < 10) {
                        return price + ((this.level/10)+1*price*0.5);
                    }
                    if(this.level < 25) {
                        return price + ((this.level/10)+1*price*1);
                    }
                    if(this.level < 50) {
                        return price + ((this.level/10)+1*price*1.5);
                    }
                    else{
                        return price + ((this.level/10)+1*price*2.5);
                    }
                },
                getValue: function() { return this.level*3;}
            },
            {
                name: "Increase Ball Value",
                price: 50,
                maxLevel: 9,
                level: 0,
                equation: function(price) {
                    return price * (2 + this.level* .5);
                },
                getValue: function() { return this.level;}
            },
            {
                name: "Increase Click Value",
                price: 50,
                maxLevel: 9,
                level: 0,
                equation: function(price) {
                    return price * (2 + this.level* .5);
                },
                getValue: function() { return this.level;}
            },
            

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
    buyItemByName(itemName, amount = 1) {
        const item = this.getItem(itemName);

        if (item) {
            if(item.maxLevel == 1){
                //signle unlock item
                if (this.balance >= item.price) {
                    this.removeBalance(item.price);
                    item.level = 1;
                    return true; 
                }
            }
            
            return this.buyItem(item, amount);
        }
        return false;
    }
}

export default prestigeShop;
