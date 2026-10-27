// Time-based rendering helpers. No frame-rate dependent lerp constants.
export const dampFactor = (rate, dt) => 1 - Math.exp(-rate * Math.max(0, dt));
export const angleDelta = (from, to) => Math.atan2(Math.sin(to - from), Math.cos(to - from));

export class PoseTrack {
  constructor() { this.ready = false; }
  push(p, q, time, stamp, snap = false) {
    if (!this.ready || snap || time < this.time || time - this.time > .5) {
      this.previous = [...p]; this.current = [...p];
      this.previousQ = [...q]; this.currentQ = [...q];
      this.duration = 0; this.ready = true;
    } else {
      if (time === this.time) return;
      this.previous = this.current; this.previousQ = this.currentQ;
      this.current = [...p]; this.currentQ = [...q];
      this.duration = Math.min(.25, time - this.time);
    }
    this.time = time; this.stamp = stamp;
  }
  alpha(stamp) { return this.duration ? Math.min(1, Math.max(0, (stamp - this.stamp) / 1000 / this.duration)) : 1; }
  position(stamp, output) {
    const t = this.alpha(stamp);
    for (let i = 0; i < 3; i++) output[i] = this.previous[i] + (this.current[i] - this.previous[i]) * t;
    return output;
  }
}

// At most 100 ms of catch-up: long tab suspensions never become a burst of inputs.
export class FixedClock {
  constructor(step = 1 / 120) { this.step = step; this.accumulator = 0; }
  advance(elapsed, tick) {
    this.accumulator += Math.max(0, Math.min(.1, elapsed));
    let count = 0;
    while (this.accumulator + 1e-10 >= this.step) {
      tick(); this.accumulator -= this.step; count++;
    }
    this.accumulator = Math.max(0, this.accumulator);
    return count;
  }
  reset() { this.accumulator = 0; }
}
