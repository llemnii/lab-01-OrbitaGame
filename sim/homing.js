export function attachHoming(entity, getTarget, strength = 35) {
  entity.behaviors ??= [];
  entity.behaviors.push((current) => {
    const target = getTarget();
    if (!target || !target.alive || target.respawnTimer > 0) return;
    const direction = target.pos.sub(current.pos).normalize();
    current.vel = current.vel.add(direction.scale(strength / 60));
    if (current.vel.length() > 130) current.vel = current.vel.normalize().scale(130);
  });
  return entity;
}

export function applyHoming(entity, dt, target, strength = 35) {
  if (!target) return;
  const direction = target.pos.sub(entity.pos).normalize();
  entity.vel = entity.vel.add(direction.scale(strength * dt));
}
