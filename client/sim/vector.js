export class Vector2 {
  constructor(x = 0, y = 0) {
    this.x = x;
    this.y = y;
  }

  add(other) {
    return new Vector2(this.x + other.x, this.y + other.y);
  }

  sub(other) {
    return new Vector2(this.x - other.x, this.y - other.y);
  }

  scale(amount) {
    return new Vector2(this.x * amount, this.y * amount);
  }

  length() {
    return Math.hypot(this.x, this.y);
  }

  normalize() {
    const length = this.length();
    return length === 0 ? new Vector2() : this.scale(1 / length);
  }

  rotate(angle) {
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    return new Vector2(this.x * cos - this.y * sin, this.x * sin + this.y * cos);
  }

  dot(other) {
    return this.x * other.x + this.y * other.y;
  }

  addInPlace(other) {
    this.x += other.x;
    this.y += other.y;
    return this;
  }

  static fromAngle(angle, length = 1) {
    return new Vector2(Math.cos(angle) * length, Math.sin(angle) * length);
  }
}
