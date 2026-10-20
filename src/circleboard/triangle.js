class Triangle {
    constructor(x, y, side, rotation, color, dx, dy) {
        this.center = { x, y };
        this.side = side;
        this.rotation = rotation;
        this.color = color;
        this.mass = (Math.sqrt(3) / 4) * side * side;
        this.velocity = { x: dx, y: dy };
        this.baseSide = side;
    }

    getName() {
        return 'Triangle';
    }

    getVertices() {
        const radius = this.side / Math.sqrt(3);
        const radians = (this.rotation * Math.PI) / 180;
        return Array.from({ length: 3 }, (_, index) => {
            const angle = radians - Math.PI / 2 + (index * 2 * Math.PI) / 3;
            return {
                x: this.center.x + radius * Math.cos(angle),
                y: this.center.y + radius * Math.sin(angle),
            };
        });
    }

    draw(ctx) {
        const vertices = this.getVertices();
        ctx.beginPath();
        ctx.moveTo(vertices[0].x, vertices[0].y);
        vertices.slice(1).forEach((vertex) => ctx.lineTo(vertex.x, vertex.y));
        ctx.closePath();
        ctx.fillStyle = this.color;
        ctx.fill();
    }

    axes() {
        const vertices = this.getVertices();
        return vertices.map((vertex, index) => {
            const next = vertices[(index + 1) % vertices.length];
            const dx = next.x - vertex.x;
            const dy = next.y - vertex.y;
            const length = Math.hypot(dx, dy) || 1;
            return { x: -dy / length, y: dx / length };
        });
    }

    projection(axis) {
        const values = this.getVertices().map((vertex) => vertex.x * axis.x + vertex.y * axis.y);
        return [Math.min(...values), Math.max(...values)];
    }

    update(speedMultiplier = 1) {
        this.center.x += this.velocity.x * speedMultiplier;
        this.center.y += this.velocity.y * speedMultiplier;
    }

    getInformation() {
        return {
            name: this.getName(),
            rotation: this.rotation,
            center: this.center,
            side: this.side,
            baseSide: this.baseSide,
            mass: this.mass,
            velocity: this.velocity,
            color: this.color,
        };
    }

    static create(x, y, side, rotation, color, dx, dy, baseSide = side) {
        const triangle = new Triangle(x, y, side, rotation, color, dx, dy);
        triangle.baseSide = baseSide;
        return triangle;
    }
}

export default Triangle;
