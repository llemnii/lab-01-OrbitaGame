export const SIM_HZ = 30;
export const SIM_DT = 1 / SIM_HZ;

export function mulberry32(seed) {
  let value = seed >>> 0;
  return () => {
    value += 0x6d2b79f5;
    let result = Math.imul(value ^ (value >>> 15), 1 | value);
    result ^= result + Math.imul(result ^ (result >>> 7), 61 | result);
    return ((result ^ (result >>> 14)) >>> 0) / 4294967296;
  };
}

export function createWorld(seed = 1, width = 900, height = 560) {
  return { seed, width, height, tick: 0, ships: {}, bullets: [], nextBullet: 1 };
}

export function addShip(world, id, index = 0) {
  world.ships[id] = {
    id,
    kind: "ship",
    x: widthAt(world, index, 0.25),
    y: heightAt(world, index, 0.5),
    vx: 0,
    vy: 0,
    angle: index ? Math.PI : 0,
    hp: 3
  };
  return world.ships[id];
}

function widthAt(world, index, fallback) {
  return world.width * (index === 0 ? fallback : 1 - fallback);
}

function heightAt(world, index, fallback) {
  return world.height * fallback;
}

export function applyInput(ship, input, dt, world, fire = true) {
  const thrust = Math.max(-1, Math.min(1, Number(input.thrust) || 0));
  const turn = Math.max(-1, Math.min(1, Number(input.turn) || 0));
  ship.angle += turn * 3.2 * dt;
  const acceleration = 180 * thrust;
  ship.vx += Math.cos(ship.angle) * acceleration * dt;
  ship.vy += Math.sin(ship.angle) * acceleration * dt;
  const drag = Math.pow(0.98, dt * 60);
  ship.vx *= drag;
  ship.vy *= drag;
  const speed = Math.hypot(ship.vx, ship.vy);
  if (speed > 260) {
    ship.vx = (ship.vx / speed) * 260;
    ship.vy = (ship.vy / speed) * 260;
  }
  ship.x = (ship.x + ship.vx * dt + world.width) % world.width;
  ship.y = (ship.y + ship.vy * dt + world.height) % world.height;
  if (fire && input.fire && world.tick % 7 === 0) {
    world.bullets.push({
      id: world.nextBullet++,
      kind: "bullet",
      owner: ship.id,
      x: ship.x + Math.cos(ship.angle) * 24,
      y: ship.y + Math.sin(ship.angle) * 24,
      vx: ship.vx + Math.cos(ship.angle) * 420,
      vy: ship.vy + Math.sin(ship.angle) * 420,
      angle: ship.angle,
      hp: 1
    });
  }
}

export function stepWorld(world, inputs = {}, dt = SIM_DT) {
  for (const id of Object.keys(world.ships).sort((a, b) => Number(a) - Number(b))) {
    applyInput(world.ships[id], inputs[id] ?? {}, dt, world);
  }
  for (const bullet of world.bullets) {
    bullet.x = (bullet.x + bullet.vx * dt + world.width) % world.width;
    bullet.y = (bullet.y + bullet.vy * dt + world.height) % world.height;
    bullet.hp -= dt;
  }
  world.bullets = world.bullets.filter((bullet) => bullet.hp > 0);
  world.tick += 1;
  return world;
}

export function snapshot(world, lastProcessedSeq = 0, selfId = 0) {
  return {
    tick: world.tick,
    lastProcessedSeq,
    selfId,
    entities: [...Object.values(world.ships), ...world.bullets].map((entity) => ({
      id: Number(entity.id),
      kind: entity.kind === "ship" ? 1 : 2,
      x: entity.x,
      y: entity.y,
      angle: entity.angle,
      hp: entity.hp ?? 1
    }))
  };
}
