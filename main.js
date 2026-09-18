import { createInput } from "./input.js";
import { createLoop } from "./loop.js";
import { Asteroid } from "./sim/asteroid.js";
import { resolveCollisions } from "./sim/collision.js";
import { Pickup } from "./sim/pickup.js";
import { Ship } from "./sim/ship.js";
import { attachHoming } from "./sim/homing.js";
import { World } from "./sim/world.js";
import { createRenderer, resizeCanvas } from "./render.js";

const canvas = document.querySelector("#game-canvas");
const fpsElement = document.querySelector("#fps");
const stepsElement = document.querySelector("#steps");
const frameTimeElement = document.querySelector("#frame-time");
const scoreElement = document.querySelector("#score");
const hpElement = document.querySelector("#hp");
const entitiesElement = document.querySelector("#entities");

let arena = resizeCanvas(canvas);
const input = createInput();
const world = new World(arena.width, arena.height, input);
const ship = world.spawn(new Ship(arena.width / 2, arena.height / 2));
const renderer = createRenderer(canvas);

function addStartingEntities() {
  world.spawn(new Asteroid(arena.width * 0.25, arena.height * 0.3, 28));
  world.spawn(new Asteroid(arena.width * 0.75, arena.height * 0.65, 22));
  world.spawn(
    attachHoming(
      new Asteroid(arena.width * 0.75, arena.height * 0.25, 18),
      () => ship,
      18
    )
  );
  world.spawn(new Pickup(arena.width * 0.3, arena.height * 0.72, "shield"));
  world.spawn(new Pickup(arena.width * 0.7, arena.height * 0.35, "rapid"));
}

addStartingEntities();

const measurement = { time: 0, frames: 0, steps: 0 };

function handleResize() {
  arena = resizeCanvas(canvas);
  world.width = arena.width;
  world.height = arena.height;
}

function update(dt) {
  world.step(dt);
  resolveCollisions(world);
}

function render(alpha, frameTimeMs, steps) {
  renderer.render(world, alpha);
  measurement.time += frameTimeMs / 1000;
  measurement.frames += 1;
  measurement.steps += steps;
  frameTimeElement.textContent = `${frameTimeMs.toFixed(1)} мс`;
  scoreElement.textContent = world.score;
  hpElement.textContent = ship.hp;
  entitiesElement.textContent = world.size;

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
