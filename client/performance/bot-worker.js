import { createWorld, addShip, stepWorld } from "../../shared/src/sim.ts";

self.onmessage = ({ data }) => {
  const world = createWorld(data.seed ?? 1);
  for (let id = 1; id <= data.clients; id += 1) addShip(world, id, id % 2);
  for (let tick = 0; tick < data.ticks; tick += 1) {
    const inputs = {};
    for (let id = 1; id <= data.clients; id += 1)
      inputs[id] = { thrust: 1, turn: id % 2, fire: false };
    stepWorld(world, inputs);
  }
  self.postMessage({ tick: world.tick, clients: data.clients });
};
