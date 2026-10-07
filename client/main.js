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
import { GameConnection } from "./connection.js";
import { NetworkGame } from "./network.js";

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
      showGame(assets, bus, {
        room: selectedRoom.id,
        name: document.querySelector("#player-name").value || "Гравець"
      });
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

function showGame(assets, bus, player) {
  showScreen("game");
  const canvas = document.querySelector("#game-canvas");
  let arena = resizeCanvas(canvas);
  const input = createInput();
  const world = new World(arena.width, arena.height, input, bus);
  const ship = new Ship(arena.width / 2, arena.height / 2);
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
  const connection = new GameConnection();
  const netStats = {
    rtt: document.querySelector("#net-rtt"),
    age: document.querySelector("#net-age"),
    bytes: document.querySelector("#net-bytes"),
    pending: document.querySelector("#net-pending"),
    correction: document.querySelector("#net-correction")
  };
  const network = new NetworkGame(connection, 900, 560, (stats) => {
    netStats.rtt.textContent = `${Math.round(stats.rtt)} мс`;
    netStats.age.textContent = `${Math.round(stats.age)} мс`;
    netStats.bytes.textContent = Math.round(stats.bytesIn + stats.bytesOut);
    netStats.pending.textContent = stats.pending;
    netStats.correction.textContent = `${stats.correction.toFixed(1)} px`;
  });
  const chatLog = document.querySelector("#chat-log");
  const addChat = (line) => {
    const item = document.createElement("div");
    item.textContent = line;
    chatLog.append(item);
    chatLog.scrollTop = chatLog.scrollHeight;
  };
  connection.addEventListener("open", () => {
    connection.send({ type: "join", room: player.room, name: player.name });
    chatLog.textContent = "Підключено";
  });
  connection.addEventListener("message", (event) => {
    const data = event.detail;
    if (data.type === "roster")
      addChat(`У кімнаті: ${data.players.map((item) => item.name).join(", ")}`);
    if (data.type === "chat") addChat(`${data.player}: ${data.text}`);
  });
  document.querySelector("#chat-form").addEventListener("submit", (event) => {
    event.preventDefault();
    const inputElement = document.querySelector("#chat-input");
    if (inputElement.value.trim()) {
      connection.send({ type: "chat", text: inputElement.value.trim() });
      inputElement.value = "";
    }
  });
  connection.connect();
  const measurement = { time: 0, frames: 0, steps: 0 };
  let networkTime = 0;
  function update(dt) {
    world.step(dt);
    resolveCollisions(world);
    networkTime += dt;
    if (networkTime >= 1 / 30) {
      networkTime -= 1 / 30;
      const state = input.state();
      network.step({
        thrust: state.forward ? 1 : state.reverse ? -1 : 0,
        turn: state.right ? 1 : state.left ? -1 : 0,
        fire: state.fire
      });
    }
  }
  function render(alpha, frameTimeMs, steps) {
    renderer.render(world, alpha, { skipEntity: ship });
    const context = canvas.getContext("2d");
    context.save();
    context.globalAlpha = 0.7;
    for (const entity of network.renderEntities()) {
      context.save();
      context.translate(entity.x, entity.y);
      context.rotate(entity.angle);
      if (entity.kind === 2) {
        context.fillStyle = "#ffbd69";
        context.beginPath();
        context.arc(0, 0, 3, 0, Math.PI * 2);
        context.fill();
      } else {
        context.fillStyle =
          entity.id === network.selfId ? "#70e4d4" : "#ffbd69";
        context.beginPath();
        context.moveTo(14, 0);
        context.lineTo(-10, -8);
        context.lineTo(-10, 8);
        context.closePath();
        context.fill();
      }
      context.restore();
    }
    context.restore();
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
