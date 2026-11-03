export class ObjectPool<T> {
  private readonly freeItems: T[] = [];
  private readonly create: () => T;

  public constructor(create: () => T) {
    this.create = create;
  }

  public acquire(): T {
    return this.freeItems.pop() ?? this.create();
  }

  public release(item: T): void {
    this.freeItems.push(item);
  }

  public get size(): number {
    return this.freeItems.length;
  }

  public clear(): void {
    this.freeItems.length = 0;
  }
}
