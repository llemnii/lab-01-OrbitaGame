export class GameAudio {
  #context = null;
  #buffers = {};
  #ready = false;

  constructor(bus, buffers = {}, context = null) {
    this.bus = bus;
    this.#buffers = buffers;
    this.#context = context;
    this.#ready = Boolean(context);
    bus.addEventListener("fired", () => this.play("shot"));
    bus.addEventListener("exploded", () => this.play("explosion"));
  }

  enable() {
    if (!this.#context) {
      this.#context ??= new AudioContext();
      this.#ready = true;
    }
    return this.#context.resume();
  }

  play(name) {
    if (!this.#ready || !this.#context || !this.#buffers[name]) return;
    const source = this.#context.createBufferSource();
    source.buffer = this.#buffers[name];
    source.connect(this.#context.destination);
    source.start();
  }
}
