export function createGameBus() {
  return new EventTarget();
}

export function emit(bus, type, detail = {}) {
  bus.dispatchEvent(new CustomEvent(type, { detail }));
}
