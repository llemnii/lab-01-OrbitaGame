export function createInput() {
  const keys = new Set();

  function handleKeyDown(event) {
    const key = event.key.toLowerCase();
    keys.add(key);
    if (key.startsWith("arrow")) {
      event.preventDefault();
    }
  }

  function handleKeyUp(event) {
    keys.delete(event.key.toLowerCase());
  }

  window.addEventListener("keydown", handleKeyDown);
  window.addEventListener("keyup", handleKeyUp);

  return {
    isDown(key) {
      return keys.has(key.toLowerCase());
    },
    state() {
      return {
        forward: keys.has("w") || keys.has("arrowup"),
        reverse: keys.has("s") || keys.has("arrowdown"),
        left: keys.has("a") || keys.has("arrowleft"),
        right: keys.has("d") || keys.has("arrowright"),
        fire: keys.has(" ") || keys.has("f")
      };
    },
    destroy() {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      keys.clear();
    }
  };
}
