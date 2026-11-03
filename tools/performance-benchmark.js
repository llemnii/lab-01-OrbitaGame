import { performance } from "node:perf_hooks";
import { addShip, createWorld, stepWorld } from "../shared/src/sim.ts";

const clients = Number(process.argv[2] ?? 8);
const seconds = Number(process.argv[3] ?? 30);
const frames = seconds * 60;
const world = createWorld(7);
for (let id = 1; id <= clients; id += 1) addShip(world, id, id % 2);

const samples = [];
for (let frame = 0; frame < frames; frame += 1) {
  const start = performance.now();
  const inputs = {};
  for (let id = 1; id <= clients; id += 1) {
    inputs[id] = {
      thrust: frame % 3 === 0 ? 1 : 0,
      turn: id % 2 ? 1 : -1,
      fire: frame % 7 === 0
    };
  }
  stepWorld(world, inputs);
  samples.push(performance.now() - start);
}

samples.sort((a, b) => a - b);
const percentile = (value) =>
  samples[Math.min(samples.length - 1, Math.floor(samples.length * value))];
console.log(
  JSON.stringify(
    {
      clients,
      seconds,
      p50: percentile(0.5),
      p95: percentile(0.95),
      p99: percentile(0.99),
      rssMiB: process.memoryUsage().rss / 1024 / 1024
    },
    null,
    2
  )
);
