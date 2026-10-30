export const PROTOCOL = 1;
export const SLOT_NAMES = ['R1', 'R2', 'B1', 'B2'];
export const cleanName = value => String(value || 'Driver').replace(/[\x00-\x1f<>]/g, '').trim().slice(0, 24) || 'Driver';
export const cleanCode = value => String(value || '').trim().toUpperCase();
export const validCode = value => /^[A-HJ-NP-Z2-9]{8}$/.test(value);
export class SnapshotCadence {
  constructor() { this.last=-Infinity; this.key=''; }
  take(state, now) {
    const key=state.arena.resetId+':'+state.arena.phase+':'+state.sim.paused;
    const critical=key!==this.key;
    if(!critical&&now-this.last<50)return null;
    this.key=key;this.last=now;return {critical};
  }
}
export function sanitizeInput(value = {}) {
  const input = {};
  for (const key of ['forward', 'strafe', 'turn', 'aim', 'power', 'elevation']) {
    const limit = key === 'aim' ? Math.PI : key === 'power' ? 1.2 : 1;
    input[key] = typeof value[key] === 'number' && Number.isFinite(value[key]) ? Math.max(-limit, Math.min(limit, value[key])) : 0;
  }
  for (const key of ['intake', 'shoot', 'eject', 'place', 'shift', 'assist', 'fieldRelative']) input[key] = value[key] === true;
  return input;
}

// All seat changes and starts are decided here by the room host, never by a client snapshot.
export class RoomAuthority {
  constructor(hostId, name, code, presetCount) {
    this.hostId = hostId; this.code = code; this.presetCount = presetCount;
    this.members = [{id: hostId, name: cleanName(name), slot: 0, preset: 0, ready: true}];
    this.started = false; this.round = 0;
  }
  add(id, name) {
    if (this.members.some(m => m.id === id)) return false;
    if (this.members.length >= 12) throw new Error('Room is full (4 drivers and 8 spectators).');
    const slot = this.started ? null : [2, 1, 3].find(s => !this.members.some(m => m.slot === s));
    this.members.push({id, name: cleanName(name), slot: slot ?? null, preset: 0, ready: false}); return true;
  }
  remove(id) { this.members = this.members.filter(m => m.id !== id); }
  request(id, message) {
    const member = this.members.find(m => m.id === id);
    if (!member || this.started) return false;
    if (message.type === 'seat') {
      const slot = message.slot;
      if (slot !== null && (!Number.isInteger(slot) || slot < 0 || slot > 3 || this.members.some(m => m.id !== id && m.slot === slot))) return false;
      member.slot = slot; member.ready = false;
    } else if (message.type === 'robot') {
      if (!Number.isInteger(message.preset) || message.preset < 0 || message.preset >= this.presetCount) return false;
      member.preset = message.preset; member.ready = false;
    } else if (message.type === 'tube') { member.boxTube = message.enabled === true; member.ready = false; }
    else if (message.type === 'ready') member.ready = message.ready === true;
    else return false;
    return true;
  }
  start(id) {
    if (id !== this.hostId || this.started) return false;
    const drivers = this.members.filter(m => m.slot !== null);
    if (drivers.length < 2 || !drivers.some(m => m.slot < 2) || !drivers.some(m => m.slot >= 2) || drivers.some(m => !m.ready)) return false;
    this.started = true; this.round++; return true;
  }
  lobby(id) { if (id !== this.hostId) return false; this.started = false; this.members.forEach(m => m.ready = false); return true; }
  view() { return {v: PROTOCOL, type: 'room', code: this.code, hostId: this.hostId, members: this.members.map(m => ({...m})), started: this.started, round: this.round}; }
}
