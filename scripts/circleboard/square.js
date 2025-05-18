class Square{
    constructor(x, y, side, rotation, color, dx, dy){
        if(side%2 !== 0){
            side += 1;
        }  
        this.center = { x, y};
        this.side = side;
        this.rotation = rotation;
        this.color = color;
        this.mass = Math.PI * side * side;
        this.velocity = { x: dx, y: dy };
    }
    getName(){
        return "Square";
    }
    draw(ctx) {
        ctx.save();
        
        ctx.translate(this.center.x, this.center.y);
        
        ctx.rotate((this.rotation * Math.PI) / 180);
        

        const topLeftX = -this.side / 2;
        const topLeftY = -this.side / 2;
        
        ctx.fillStyle = this.color;
        ctx.fillRect(topLeftX, topLeftY, this.side, this.side);
        
        ctx.restore();
    }
    axes(shape){

        const setAxises = new Set();
        const radians = (this.rotation * Math.PI) / 180;

        setAxises.add({ x: Math.cos(radians), y: Math.sin(radians) });
        setAxises.add({ x: Math.cos(radians + Math.PI / 2), y: Math.sin(radians + Math.PI / 2) });
        setAxises.add({ x: Math.cos(radians + Math.PI), y: Math.sin(radians + Math.PI) });
        setAxises.add({ x: Math.cos(radians + (3 * Math.PI) / 2), y: Math.sin(radians + (3 * Math.PI) / 2) });

        return Array.from(setAxises);
    }
    projection(axis){
        const axises = this.getVertices();
        let min = Infinity;
        let max = -Infinity;
        for (const vertex of axises) {
            const projection = vertex.x * axis.x + vertex.y * axis.y;
            min = Math.min(min, projection);
            max = Math.max(max, projection);
        }
        return [min, max];

    }
    getVertices(){
        const halfSide = this.side / 2;
        const radians = (this.rotation * Math.PI) / 180;

        const vertices = [
            { x: this.center.x - halfSide * Math.cos(radians) - halfSide * Math.sin(radians), y: this.center.y - halfSide * Math.sin(radians) + halfSide * Math.cos(radians) },
            { x: this.center.x + halfSide * Math.cos(radians) - halfSide * Math.sin(radians), y: this.center.y + halfSide * Math.sin(radians) + halfSide * Math.cos(radians) },
            { x: this.center.x + halfSide * Math.cos(radians) + halfSide * Math.sin(radians), y: this.center.y + halfSide * Math.sin(radians) - halfSide * Math.cos(radians) },
            { x: this.center.x - halfSide * Math.cos(radians) + halfSide * Math.sin(radians), y: this.center.y - halfSide * Math.sin(radians) - halfSide * Math.cos(radians) }
        ];

        return vertices;
    }

    update(speedMultipler=1){
        this.center.x += this.velocity.x * speedMultipler;
        this.center.y += this.velocity.y * speedMultipler;
    }
    getInformation(){
        return {
            center: this.center,
            side: this.side,
            mass: this.mass,
            velocity: this.velocity,
            color: this.color,
            baseDistVertex: this.baseDistVertex
        };
    }
    static create(x, y, side, rotation, color, dx, dy) {
        return new Square(x, y, side, rotation, color, dx, dy);
    }
    static create(x, y, side, rotation, color, dx, dy, baseSide) {
        const square = new Square(x, y, side, rotation, color, dx, dy);
        square.baseSide = baseSide;
        return square;
    }

}