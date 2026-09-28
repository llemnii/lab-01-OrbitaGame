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
    const gain = this.#context.createGain();
    const now = this.#context.currentTime;
    source.buffer = this.#buffers[name];
    source.playbackRate.value = name === "explosion" ? 0.65 : 1.15;
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(name === "explosion" ? 0.1 : 0.06, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(
      0.0001,
      now + (name === "explosion" ? 0.25 : 0.1)
    );
    source.connect(gain);
    gain.connect(this.#context.destination);
    source.start();
  }
}
