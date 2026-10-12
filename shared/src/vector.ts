export class Vector2 {
  constructor(
    public readonly x: number,
    public readonly y: number
  ) {}

  add(other: Vector2): Vector2 {
    return new Vector2(this.x + other.x, this.y + other.y);
  }

  scale(factor: number): Vector2 {
    return new Vector2(this.x * factor, this.y * factor);
  }

  get length(): number {
    return Math.hypot(this.x, this.y);
  }
}
