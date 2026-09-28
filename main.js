import { createInput } from "./input.js";
import { createLoop } from "./loop.js";
import { Asteroid } from "./sim/asteroid.js";
import { resolveCollisions } from "./sim/collision.js";
import { Pickup } from "./sim/pickup.js";
import { Ship } from "./sim/ship.js";
import { attachHoming } from "./sim/homing.js";
import { World } from "./sim/world.js";
import { createRenderer, resizeCanvas } from "./render.js";
import { loadAll, loadJson } from "./async/loaders.js";
import { GameAudio } from "./async/audio.js";
import { Lobby } from "./async/lobby.js";
import { createHud } from "./async/hud.js";
import { renderRooms, showScreen } from "./async/dom.js";

const loadingCanvas = document.querySelector("#loading-canvas");
const loadingText = document.querySelector("#loading-text");
const retryButton = document.querySelector("#retry");

function drawLoading(progress, label) {
  const context = loadingCanvas.getContext("2d");
  context.clearRect(0, 0, loadingCanvas.width, loadingCanvas.height);
  context.fillStyle = "#080d22";
  context.fillRect(0, 0, loadingCanvas.width, loadingCanvas.height);
  context.fillStyle = "#70e4d4";
  context.fillRect(32, 48, 416 * progress, 12);
  context.strokeStyle = "#4b5260";
  context.strokeRect(32, 48, 416, 12);
  context.fillStyle = "#cbd0d8";
  context.font = "14px system-ui";
  context.fillText(`${label} ${Math.round(progress * 100)}%`, 32, 32);
}

async function start() {
  showScreen("loading");
  retryButton.hidden = true;
  const controller = new AbortController();
  try {
    const manifest = await loadJson("/assets/manifest.json", {
      signal: controller.signal
    });
    const audioContext = typeof AudioContext === "function" ? new AudioContext() : null;
    const assets = await loadAll(manifest, {
      signal: controller.signal,
      audioContext,
      onProgress: ({ name, completed, total }) => {
        loadingText.textContent = `Завантажую ${name}...`;
        drawLoading(completed / total, name);
      }
    });
    const bus = new EventTarget();
    const audio = new GameAudio(
      bus,
      { shot: assets.shot, explosion: assets.explosion },
      audioContext
    );
    const lobby = new Lobby();
    const rooms = document.querySelector("#rooms");
    const message = document.querySelector("#lobby-message");
    const joinButton = document.querySelector("#join");
    let selectedRoom = null;
    lobby.addEventListener("rooms", (event) => {
      renderRooms(event.detail, rooms, (room) => {
        selectedRoom = room;
        joinButton.disabled = false;
      });
      message.textContent = "";
    });
    lobby.addEventListener("error", (event) => {
      message.textContent = `Не вдалося оновити список: ${event.detail.message}`;
    });
    joinButton.addEventListener("click", async () => {
      if (!selectedRoom) return;
      await audio.enable().catch(() => undefined);
      lobby.join(
        selectedRoom.id,
        document.querySelector("#player-name").value || "Гравець"
      );
      showGame(assets, bus);
    });
    showScreen("lobby");
    lobby.start();
  } catch (error) {
    loadingText.textContent = `Не вдалося завантажити гру: ${error.message}`;
    drawLoading(0, "Помилка");
    retryButton.hidden = false;
    retryButton.onclick = () => start();
  }
}

function showGame(assets, bus) {
  showScreen("game");
  const canvas = document.querySelector("#game-canvas");
  let arena = resizeCanvas(canvas);
  const input = createInput();
  const world = new World(arena.width, arena.height, input, bus);
  const ship = world.spawn(new Ship(arena.width / 2, arena.height / 2));
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
  const renderer = createRenderer(canvas, assets);
  const hud = createHud(bus);
  const measurement = { time: 0, frames: 0, steps: 0 };
  function update(dt) {
    world.step(dt);
    resolveCollisions(world);
  }
  function render(alpha, frameTimeMs, steps) {
    renderer.render(world, alpha);
    measurement.time += frameTimeMs / 1000;
    measurement.frames += 1;
    measurement.steps += steps;
    if (measurement.time >= 0.5) {
      hud.update({
        fps: Math.round(measurement.frames / measurement.time),
        steps: Math.round(measurement.steps / measurement.time),
        frameTime: frameTimeMs,
        hp: ship.hp,
        entities: world.size
      });
      measurement.time = 0;
      measurement.frames = 0;
      measurement.steps = 0;
    }
  }
  const loop = createLoop(update, render);
  window.addEventListener("resize", () => {
    arena = resizeCanvas(canvas);
    world.width = arena.width;
    world.height = arena.height;
  });
  loop.start();
}

start();
