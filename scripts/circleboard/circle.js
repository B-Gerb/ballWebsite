class Circle{
    constructor(x, y, radius, color, dx, dy) {
        this.center = { x, y};
        this.radius = radius;
        this.color = color;
        this.baseRadius = radius;
        this.mass = Math.PI * radius * radius;
        this.velocity = { x: dx, y: dy };

    }
    getName(){
        return "Circle";
    }
    draw(ctx) {
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.center.x, this.center.y, this.radius, 0, Math.PI * 2);
        ctx.fill();
    }

    axes(shape){
        const axises = [];
        const dx = shape.center.x - this.center.x;
        const dy = shape.center.y - this.center.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        if (distance === 0) return axises;
        axises.push({ x: dx / distance, y: dy / distance });
        return axises;
    }
    projection(axis){
        const centerProjection = this.center.x * axis.x + this.center.y * axis.y;
        return [centerProjection - this.radius, centerProjection + this.radius];

    }
    update(speedMultipler=1){
        this.center.x += this.velocity.x * speedMultipler;
        this.center.y += this.velocity.y * speedMultipler;
    }
    getInformation(){
        return {
            center: this.center,
            radius: this.radius,
            mass: this.mass,
            velocity: this.velocity,
            color: this.color,
            baseRadius: this.baseRadius
        };
    }
    static create(x, y, radius, color, dx, dy) {
        return new Circle(x, y, radius, color, dx, dy);
    }
    static create(x, y, radius, color, dx, dy, baseRadius) {
        const circle = new Circle(x, y, radius, color, dx, dy);
        circle.baseRadius = baseRadius;
        return circle;
    }
    

}