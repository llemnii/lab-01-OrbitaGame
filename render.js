export function resizeCanvas(canvas) {
  const rect = canvas.getBoundingClientRect();
  const width = Math.max(1, Math.floor(rect.width));
  const height = Math.max(1, Math.floor(rect.height));
  const devicePixelRatio = window.devicePixelRatio || 1;

  canvas.width = Math.floor(width * devicePixelRatio);
  canvas.height = Math.floor(height * devicePixelRatio);

  const context = canvas.getContext("2d");
  context.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
  return { width, height };
}

export function createRenderer(canvas, assets = {}) {
  const context = canvas.getContext("2d");
  const stars = [];

  for (let index = 0; index < 80; index += 1) {
    stars.push({
      x: ((index * 47) % 100) / 100,
      y: ((index * 83) % 100) / 100,
      size: index % 3 === 0 ? 2 : 1
    });
  }

  function drawShip(ship, alpha) {
    const x = ship.previousPos.x + (ship.pos.x - ship.previousPos.x) * alpha;
    const y = ship.previousPos.y + (ship.pos.y - ship.previousPos.y) * alpha;
    context.save();
    context.translate(x, y);
    context.rotate(ship.angle);
    if (ship.respawnTimer > 0) context.globalAlpha = 0.35;
    if (ship.thrusting) {
      context.fillStyle = "#ffbd69";
      context.beginPath();
      context.moveTo(-16, 0);
      context.lineTo(-28, -6);
      context.lineTo(-24, 0);
      context.lineTo(-28, 6);
      context.closePath();
      context.fill();
    }
    if (assets.ship) {
      context.shadowColor = "#70e4d4";
      context.shadowBlur = 16;
      context.drawImage(assets.ship, 0, 0, 64, 64, -32, -32, 64, 64);
      context.restore();
      return;
    }
    context.shadowColor = "#70e4d4";
    context.shadowBlur = 16;
    context.fillStyle = "#d9fffb";
    context.strokeStyle = "#70e4d4";
    context.lineWidth = 2;
    context.beginPath();
    context.moveTo(22, 0);
    context.lineTo(-14, -13);
    context.lineTo(-9, 0);
    context.lineTo(-14, 13);
    context.closePath();
    context.fill();
    context.stroke();
    context.shadowBlur = 0;
    context.restore();
  }

  function drawEntity(entity, alpha) {
    const x = entity.previousPos.x + (entity.pos.x - entity.previousPos.x) * alpha;
    const y = entity.previousPos.y + (entity.pos.y - entity.previousPos.y) * alpha;
    context.save();
    context.translate(x, y);
    context.rotate(entity.angle || 0);
    if (entity.kind === "asteroid") {
      if (assets.asteroid) {
        context.drawImage(
          assets.asteroid,
          0,
          0,
          64,
          64,
          -entity.radius,
          -entity.radius,
          entity.radius * 2,
          entity.radius * 2
        );
        context.restore();
        return;
      }
      context.strokeStyle = "#c1a875";
      context.fillStyle = "rgb(193 168 117 / 18%)";
      context.lineWidth = 2;
      context.beginPath();
      for (let point = 0; point < 8; point += 1) {
        const angle = (point / 8) * Math.PI * 2;
        const size = entity.radius * (0.8 + (point % 3) * 0.08);
        const px = Math.cos(angle) * size;
        const py = Math.sin(angle) * size;
        if (point === 0) context.moveTo(px, py);
        else context.lineTo(px, py);
      }
      context.closePath();
      context.fill();
      context.stroke();
    } else if (entity.kind === "bullet") {
      context.fillStyle = "#ffbd69";
      context.shadowColor = "#ffbd69";
      context.shadowBlur = 10;
      context.fillRect(-4, -2, 8, 4);
    } else if (entity.kind === "pickup") {
      context.strokeStyle = entity.type === "shield" ? "#70e4d4" : "#ffbd69";
      context.lineWidth = 3;
      context.beginPath();
      context.arc(0, 0, entity.radius, 0, Math.PI * 2);
      context.stroke();
      context.beginPath();
      context.moveTo(-6, 0);
      context.lineTo(6, 0);
      context.moveTo(0, -6);
      context.lineTo(0, 6);
      context.stroke();
    } else if (entity.kind === "explosion") {
      context.strokeStyle = "#ffbd69";
      context.globalAlpha = 1 - entity.age / entity.ttl;
      context.lineWidth = 3;
      context.beginPath();
      context.arc(0, 0, entity.radius * (1 + entity.age), 0, Math.PI * 2);
      context.stroke();
    }
    context.restore();
  }

  function render(world, alpha) {
    const rect = canvas.getBoundingClientRect();
    const width = rect.width || canvas.width;
    const height = rect.height || canvas.height;
    const safeAlpha = Math.max(0, Math.min(1, alpha));

    context.clearRect(0, 0, width, height);
    const background = context.createLinearGradient(0, 0, 0, height);
    background.addColorStop(0, "#080d22");
    background.addColorStop(1, "#050711");
    context.fillStyle = background;
    context.fillRect(0, 0, width, height);

    context.strokeStyle = "rgb(67 93 151 / 16%)";
    context.lineWidth = 1;
    for (let gridX = 0; gridX < width; gridX += 48) {
      context.beginPath();
      context.moveTo(gridX, 0);
      context.lineTo(gridX, height);
      context.stroke();
    }
    for (let gridY = 0; gridY < height; gridY += 48) {
      context.beginPath();
      context.moveTo(0, gridY);
      context.lineTo(width, gridY);
      context.stroke();
    }

    for (const star of stars) {
      context.fillStyle = star.size === 2 ? "#7de2ff" : "#8ca5d2";
      context.globalAlpha = star.size === 2 ? 0.8 : 0.55;
      context.fillRect(star.x * width, star.y * height, star.size, star.size);
    }
    context.globalAlpha = 1;

    for (const entity of world) {
      if (!entity.alive && entity.kind !== "ship") continue;
      if (entity.kind === "ship") drawShip(entity, safeAlpha);
      else drawEntity(entity, safeAlpha);
    }
  }

  return { render };
}
