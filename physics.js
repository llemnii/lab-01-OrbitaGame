export function createShip(width, height) {
  const startAngle = 0;

  return {
    x: width / 2,
    y: height / 2,
    previousX: width / 2,
    previousY: height / 2,
    angle: startAngle,
    startAngle,
    velocityX: 0,
    velocityY: 0,
    arenaWidth: width,
    arenaHeight: height,
    acceleration: 180,
    turnSpeed: 3.2,
    drag: 0.98,
    maxSpeed: 260,
    thrusting: false
  };
}

export function copyShipPosition(ship) {
  ship.previousX = ship.x;
  ship.previousY = ship.y;
}

export function integrate(ship, input, dt) {
  const left = input.isDown("a") || input.isDown("arrowleft");
  const right = input.isDown("d") || input.isDown("arrowright");
  const forward = input.isDown("w") || input.isDown("arrowup");
  const reverse = input.isDown("s") || input.isDown("arrowdown");

  ship.angle += (right ? 1 : 0) * ship.turnSpeed * dt;
  ship.angle -= (left ? 1 : 0) * ship.turnSpeed * dt;

  let thrustDirection = 0;
  if (forward) {
    thrustDirection = 1;
  } else if (reverse) {
    thrustDirection = -1;
  }

  ship.velocityX += Math.cos(ship.angle) * ship.acceleration * thrustDirection * dt;
  ship.velocityY += Math.sin(ship.angle) * ship.acceleration * thrustDirection * dt;

  const drag = Math.pow(ship.drag, dt * 60);
  ship.velocityX *= drag;
  ship.velocityY *= drag;

  const speed = Math.sqrt(ship.velocityX ** 2 + ship.velocityY ** 2);
  if (speed > ship.maxSpeed) {
    const speedPart = ship.maxSpeed / speed;
    ship.velocityX *= speedPart;
    ship.velocityY *= speedPart;
  }

  ship.x += ship.velocityX * dt;
  ship.y += ship.velocityY * dt;
  ship.thrusting = thrustDirection !== 0;

  let wrapped = false;

  if (ship.arenaWidth > 0 && ship.x < 0) {
    ship.x = ship.arenaWidth;
    wrapped = true;
  } else if (ship.arenaWidth > 0 && ship.x > ship.arenaWidth) {
    ship.x = 0;
    wrapped = true;
  }

  if (ship.arenaHeight > 0 && ship.y < 0) {
    ship.y = ship.arenaHeight;
    wrapped = true;
  } else if (ship.arenaHeight > 0 && ship.y > ship.arenaHeight) {
    ship.y = 0;
    wrapped = true;
  }

  if (wrapped) {
    ship.previousX = ship.x;
    ship.previousY = ship.y;
  }
}
