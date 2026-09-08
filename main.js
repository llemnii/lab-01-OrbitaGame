import { createInput } from "./input.js";
import { createLoop } from "./loop.js";
import { copyShipPosition, createShip, integrate } from "./physics.js";
import { createRenderer, resizeCanvas } from "./render.js";

const canvas = document.querySelector("#game-canvas");
const fpsElement = document.querySelector("#fps");
const stepsElement = document.querySelector("#steps");
const frameTimeElement = document.querySelector("#frame-time");

let arena = resizeCanvas(canvas);
const ship = createShip(arena.width, arena.height);
const input = createInput();
const renderer = createRenderer(canvas);

const measurement = {
  time: 0,
  frames: 0,
  steps: 0
};

function handleResize() {
  arena = resizeCanvas(canvas);
  ship.arenaWidth = arena.width;
  ship.arenaHeight = arena.height;
}

function update(dt) {
  copyShipPosition(ship);
  integrate(ship, input, dt);
}

function render(alpha, frameTimeMs, steps) {
  renderer.render(ship, alpha);

  measurement.time += frameTimeMs / 1000;
  measurement.frames += 1;
  measurement.steps += steps;
  frameTimeElement.textContent = `${frameTimeMs.toFixed(1)} мс`;

  if (measurement.time >= 0.5) {
    fpsElement.textContent = Math.round(measurement.frames / measurement.time);
    stepsElement.textContent = Math.round(measurement.steps / measurement.time);
    measurement.time = 0;
    measurement.frames = 0;
    measurement.steps = 0;
  }
}

const loop = createLoop(update, render);
window.addEventListener("resize", handleResize);
loop.start();
