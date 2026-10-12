import { decodeSnapshot, type WireSnapshot } from "../shared/src/codec.ts";

export type JsonMessage = { readonly type: string; readonly [key: string]: unknown };

export class GameConnection extends EventTarget {
  #socket: WebSocket | null = null;
  #queue: Array<string | ArrayBuffer> = [];
  #attempt = 0;
  #closed = false;
  readonly url: string;

  constructor(
    url = `${location.protocol === "https:" ? "wss" : "ws"}://${location.host}/ws?delay=100&jitter=30&drop=0.02`
  ) {
    super();
    this.url = url;
  }

  connect(): void {
    this.#closed = false;
    this.#open();
  }

  #open(): void {
    if (this.#closed) return;
    this.#socket = new WebSocket(this.url);
    this.#socket.binaryType = "arraybuffer";
    this.#socket.addEventListener("open", () => {
      this.#attempt = 0;
      this.#flush();
      this.dispatchEvent(new Event("open"));
    });
    this.#socket.addEventListener(
      "message",
      (event: MessageEvent<string | ArrayBuffer>) => {
        try {
          if (event.data instanceof ArrayBuffer) {
            this.dispatchEvent(
              new CustomEvent<WireSnapshot>("snapshot", {
                detail: decodeSnapshot(event.data)
              })
            );
            return;
          }
          const message: unknown = JSON.parse(event.data);
          if (!message || typeof message !== "object" || !("type" in message))
            throw new Error("invalid server message");
          if (message.type === "snapshot")
            this.dispatchEvent(new CustomEvent("snapshot", { detail: message }));
          else
            this.dispatchEvent(
              new CustomEvent<JsonMessage>("message", { detail: message as JsonMessage })
            );
        } catch {
          this.dispatchEvent(new Event("error"));
        }
      }
    );
    this.#socket.addEventListener("error", () => this.dispatchEvent(new Event("error")));
    this.#socket.addEventListener("close", () => {
      this.dispatchEvent(new Event("close"));
      if (!this.#closed) {
        const delay = Math.min(5000, 250 * 2 ** this.#attempt++);
        setTimeout(() => this.#open(), delay);
      }
    });
  }

  send(message: JsonMessage): void {
    this.#send(JSON.stringify(message));
  }

  sendBinary(packet: ArrayBuffer): void {
    this.#send(packet);
  }

  #send(data: string | ArrayBuffer): void {
    if (this.#socket?.readyState === WebSocket.OPEN) this.#socket.send(data);
    else this.#queue.push(data);
  }

  #flush(): void {
    while (
      this.#queue.length &&
      this.#socket &&
      this.#socket.bufferedAmount < 64 * 1024
    ) {
      const data = this.#queue.shift();
      if (data !== undefined) this.#socket.send(data);
    }
  }

  close(): void {
    this.#closed = true;
    this.#socket?.close();
  }
}
