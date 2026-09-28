export class Lobby extends EventTarget {
  #timer = null;
  #controller = null;

  constructor({ url = "/api/rooms", interval = 4000 } = {}) {
    super();
    this.url = url;
    this.interval = interval;
    this.rooms = [];
  }

  async refresh() {
    this.#controller?.abort();
    this.#controller = new AbortController();
    const signal = AbortSignal.timeout
      ? AbortSignal.any([this.#controller.signal, AbortSignal.timeout(2500)])
      : this.#controller.signal;
    const response = await fetch(this.url, { signal });
    if (!response.ok) throw new Error(`Список кімнат: ${response.status}`);
    this.rooms = await response.json();
    this.dispatchEvent(new CustomEvent("rooms", { detail: this.rooms }));
    return this.rooms;
  }

  start() {
    this.stop();
    this.refresh().catch((error) => {
      if (error.name !== "AbortError" && error.name !== "TimeoutError") {
        this.dispatchEvent(new CustomEvent("error", { detail: error }));
      }
    });
    this.#timer = setInterval(() => {
      this.refresh().catch((error) => {
        if (error.name !== "AbortError" && error.name !== "TimeoutError") {
          this.dispatchEvent(new CustomEvent("error", { detail: error }));
        }
      });
    }, this.interval);
  }

  join(roomId, name = "Гравець") {
    this.dispatchEvent(new CustomEvent("join", { detail: { name, roomId } }));
    this.stop();
  }

  stop() {
    if (this.#timer) clearInterval(this.#timer);
    this.#timer = null;
    this.#controller?.abort();
    this.#controller = null;
  }
}
