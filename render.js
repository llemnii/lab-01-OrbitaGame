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

export function createRenderer(canvas) {
  const context = canvas.getContext("2d");
  const stars = [];

  for (let index = 0; index < 80; index += 1) {
    stars.push({
      x: ((index * 47) % 100) / 100,
      y: ((index * 83) % 100) / 100,
      size: index % 3 === 0 ? 2 : 1
    });
  }

  function render(ship, alpha) {
    const rect = canvas.getBoundingClientRect();
    const width = rect.width || canvas.width;
    const height = rect.height || canvas.height;
    const safeAlpha = Math.max(0, Math.min(1, alpha));
    const x = ship.previousX + (ship.x - ship.previousX) * safeAlpha;
    const y = ship.previousY + (ship.y - ship.previousY) * safeAlpha;

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
    context.save();
    context.translate(x, y);
    context.rotate(ship.angle);

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

  return { render };
}
