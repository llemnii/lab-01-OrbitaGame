import { decodeSnapshot } from "../shared/src/codec.js";

export class GameConnection extends EventTarget {
  #socket = null;
  #queue = [];
  #attempt = 0;
  #closed = false;

  constructor(
    url = `${location.protocol === "https:" ? "wss" : "ws"}://${location.host}/ws?delay=100&jitter=30&drop=0.02`
  ) {
    super();
    this.url = url;
  }
  connect() {
    this.#closed = false;
    this.#open();
  }
  #open() {
    if (this.#closed) return;
    this.#socket = new WebSocket(this.url);
    this.#socket.addEventListener("open", () => {
      this.#attempt = 0;
      this.#flush();
      this.dispatchEvent(new Event("open"));
    });
    this.#socket.binaryType = "arraybuffer";
    this.#socket.addEventListener("message", async (event) => {
      try {
        if (event.data instanceof ArrayBuffer) {
          this.dispatchEvent(
            new CustomEvent("snapshot", { detail: decodeSnapshot(event.data) })
          );
          return;
        }
        const message = JSON.parse(event.data);
        if (message.type === "snapshot")
          this.dispatchEvent(new CustomEvent("snapshot", { detail: message }));
        else this.dispatchEvent(new CustomEvent("message", { detail: message }));
      } catch {
        this.dispatchEvent(new Event("error"));
      }
    });
    this.#socket.addEventListener("error", () => this.dispatchEvent(new Event("error")));
    this.#socket.addEventListener("close", () => {
      this.dispatchEvent(new Event("close"));
      if (!this.#closed) {
        const delay = Math.min(5000, 250 * 2 ** this.#attempt++);
        setTimeout(() => this.#open(), delay);
      }
    });
  }
  send(message) {
    const data = JSON.stringify(message);
    if (this.#socket?.readyState === WebSocket.OPEN) this.#socket.send(data);
    else this.#queue.push(data);
  }
  sendBinary(packet) {
    if (this.#socket?.readyState === WebSocket.OPEN) this.#socket.send(packet);
    else this.#queue.push(packet);
  }
  #flush() {
    while (this.#queue.length && this.#socket.bufferedAmount < 64 * 1024)
      this.#socket.send(this.#queue.shift());
  }
  close() {
    this.#closed = true;
    this.#socket?.close();
  }
}
