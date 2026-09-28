export function createHud(bus) {
  const scoreElement = document.querySelector("#score");
  bus.addEventListener("hit", (event) => {
    if (event.detail.score != null) scoreElement.textContent = event.detail.score;
  });
  return {
    update({ fps, steps, frameTime, hp, entities }) {
      document.querySelector("#fps").textContent = fps;
      document.querySelector("#steps").textContent = steps;
      document.querySelector("#frame-time").textContent = `${frameTime.toFixed(1)} мс`;
      document.querySelector("#hp").textContent = hp;
      document.querySelector("#entities").textContent = entities;
    }
  };
}
