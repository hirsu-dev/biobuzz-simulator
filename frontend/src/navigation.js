import {FLOWERS} from './flower-geometry.js';

// A small clearance grid keeps match AI away from flower posts and the hive feet.
// Flower pollen is handled by drivers; the basic AI only pursues accessible floor pieces.
const SIZE = 23, SPACING = 3.6 / (SIZE - 1);
const point = id => ({x: (id % SIZE) * SPACING - 1.8, z: Math.floor(id / SIZE) * SPACING - 1.8});
export function clearForRobot(p, radius) {
  if (Math.abs(p.x) > 1.825 - radius || Math.abs(p.z) > 1.825 - radius) return false;
  if (FLOWERS.some(f => Math.hypot(p.x - f.x, p.z - f.z) < radius + .12)) return false;
  return ![-.603, .603].some(x => Math.hypot(p.x - x, Math.max(Math.abs(p.z) - .5, 0)) < radius + .045);
}
export function navigationPath(from, to, radius) {
  const nodes = Array.from({length: SIZE * SIZE}, (_, id) => point(id));
  const free = nodes.map(p => clearForRobot(p, radius));
  const nearest = target => { let best = -1, distance = Infinity; nodes.forEach((p, i) => {const d = Math.hypot(p.x - target.x, p.z - target.z); if (free[i] && d < distance) {best = i; distance = d;}}); return best; };
  const start = nearest(from), goal = nearest(to); if (start < 0 || goal < 0) return [];
  const open = new Set([start]), cost = new Map([[start, 0]]), previous = new Map();
  while (open.size) {
    let current, lowest = Infinity;
    for (const id of open) {const p = nodes[id], score = cost.get(id) + Math.hypot(p.x - nodes[goal].x, p.z - nodes[goal].z); if (score < lowest) {lowest = score; current = id;}}
    if (current === goal) {const path = [nodes[current]]; while (previous.has(current)) {current = previous.get(current); path.unshift(nodes[current]);} if (clearForRobot(to, radius)) path.push({x: to.x, z: to.z}); return path;}
    open.delete(current);
    const x = current % SIZE, z = Math.floor(current / SIZE);
    for (const [dx, dz] of [[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]]) {
      if (x+dx<0||x+dx>=SIZE||z+dz<0||z+dz>=SIZE) continue;
      const next = current + dx + dz * SIZE;
      if (!free[next] || (dx && dz && (!free[current+dx] || !free[current+dz*SIZE]))) continue;
      const nextCost = cost.get(current) + SPACING * Math.hypot(dx, dz);
      if (nextCost >= (cost.get(next) ?? Infinity)) continue;
      cost.set(next, nextCost); previous.set(next, current); open.add(next);
    }
  }
  return [];
}
