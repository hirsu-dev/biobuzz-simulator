import {Peer} from 'peerjs';
import {PROTOCOL, RoomAuthority, SnapshotCadence, cleanName, cleanCode, validCode, sanitizeInput} from './room-protocol.js';

const prefix = 'biobuzz-room-v1-';
const randomCode = () => Array.from(crypto.getRandomValues(new Uint8Array(8)), n => 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[n % 32]).join('');
const packet = (type, rest = {}) => ({v: PROTOCOL, type, ...rest});
export function createMultiplayer({engine, presets, onRoom, onState, onStatus, onLeave}) {
  let peer, authority, room, selfId, host = false, generation = 0, opening = false;
  let connections = new Map(), hostConnection, lastInput = 0, lastReceived = 0, timer, connectionTimer;
  const snapshots=new SnapshotCadence();
  let pendingInput = {}, lastRound = -1, lastRoomJSON = '', savedBuilds;
  const active = () => !!room;
  const slot = () => room?.members.find(m => m.id === selfId)?.slot ?? null;
  const status = (message, error = false) => onStatus(message, error);
  function transmit(conn, data, droppable = false) {
    if (!conn?.open || (droppable && conn.dataChannel?.bufferedAmount > 65536)) return;
    try { conn.send(data); } catch { /* Close/timeout handles a dropped transport. */ }
  }
  function broadcast(data, droppable = false) { for (const conn of connections.values()) transmit(conn, data, droppable); }
  function deliver(state) {
    state.arena.viewerSlot = slot(); state.arena.multiplayer = true;
    const bot=state.arena.bots[slot()??0];
    if(bot){const q=bot.q;state.robot={x:bot.p[0]/.0254,y:bot.p[2]/.0254,headingDeg:Math.atan2(2*(q[3]*q[1]+q[0]*q[2]),1-2*(q[1]*q[1]+q[2]*q[2]))*180/Math.PI};}
    onState(state);
  }
  function acceptRoom(next) {
    room = next;
    if (host) { engine.networkSlots = room.members.filter(m => m.slot !== null).map(m => m.slot); engine.setParticipants(engine.networkSlots); }
    const serialized = JSON.stringify(room);
    if (serialized !== lastRoomJSON) { lastRoomJSON = serialized; onRoom(room, {host, selfId, slot: slot(), newRound: room.started && room.round !== lastRound}); }
    if (room.started) lastRound = room.round;
  }
  function publishRoom() { const next = authority.view(); broadcast(next); acceptRoom(next); }
  function leave(reason = '') {
    generation++; clearInterval(timer); clearTimeout(connectionTimer); opening = false;
    const wasActive = !!room;
    if (host) broadcast(packet('closed'));
    for (const conn of connections.values()) conn.close(); connections.clear(); hostConnection?.close(); hostConnection = undefined;
    const oldPeer = peer; peer = undefined; oldPeer?.destroy();
    room = authority = undefined; host = false; selfId = undefined; lastRound = -1; lastRoomJSON = ''; pendingInput = {};
    if(savedBuilds){engine.selection=savedBuilds.selection;engine.custom=savedBuilds.custom;savedBuilds=undefined;}
    engine.networkSlots = null; engine.paused = true; engine.reset(); engine.publish();
    if (wasActive || reason) onLeave(reason);
    if (reason) status(reason, true);
  }
  function request(message) {
    if (!room) return;
    if (host) { if (authority.request(selfId, message)) publishRoom(); }
    else transmit(hostConnection, packet(message.type, message));
  }
  function start() {
    if (!host || !authority.start(selfId)) { status('Ready at least one red driver and one blue driver to start.', true); return; }
    for (const member of authority.members) if (member.slot !== null) { engine.selection[member.slot] = member.preset; engine.custom[member.slot] = member.boxTube === undefined ? null : {lift: member.boxTube}; }
    engine.networkSlots = authority.members.filter(m => m.slot !== null).map(m => m.slot);
    engine.reset(6829, true, true); engine.paused = false; pendingInput = {};
    publishRoom(); engine.publish();
  }
  function lobby() {
    if (host && authority.lobby(selfId)) { engine.paused = true; engine.slotInputs = {}; publishRoom(); engine.publish(); }
  }
  function connectEvents(conn, current, serverSide) {
    let memberId, rateAt = 0, count = 0;
    const helloTimeout = setTimeout(() => { if (serverSide && !memberId) conn.close(); }, 12000);
    conn.on('open', () => { if (generation !== current) return conn.close(); if (!serverSide) transmit(conn, packet('hello', {name: pendingName})); });
    conn.on('data', data => {
      if (generation !== current || !data || data.v !== PROTOCOL || typeof data.type !== 'string') return;
      const now = performance.now(); if (now - rateAt > 1000) { rateAt = now; count = 0; } if (++count > 100) return;
      if (serverSide) {
        if (data.type === 'hello' && !memberId) {
          try { if (!authority.add(conn.peer, data.name)) return conn.close(); memberId = conn.peer; clearTimeout(helloTimeout); connections.set(memberId, conn); publishRoom(); transmit(conn, packet('state', {state: engine.snapshot()})); }
          catch (error) { transmit(conn, packet('error', {message: error.message})); setTimeout(() => conn.close(), 250); }
          return;
        }
        if (!memberId) return;
        if (data.type === 'input' && room.started) {
          const seat = authority.members.find(m => m.id === memberId)?.slot;
          if (seat !== null && seat !== undefined) engine.setSlotInput(seat, sanitizeInput(data.input));
        } else if (data.type === 'ping') transmit(conn, packet('pong', {at: data.at}));
        else if (authority.request(memberId, data)) publishRoom();
      } else {
        if (data.type === 'room') { clearTimeout(connectionTimer); opening = false; acceptRoom(data); status(data.started ? 'Joined as spectator. Drivers are locked until the next round.' : 'Connected. Choose a seat and mark ready.'); }
        if (data.type === 'state' && room && data.state?.arena) { lastReceived = now; deliver(data.state); }
        if (data.type === 'pong') { lastReceived = now; const ping = Math.max(0, Math.round(now - data.at)); onStatus('Connected · ' + ping + ' ms', false, true); }
        if (data.type === 'closed') leave('The host closed the room.');
        if (data.type === 'error') leave(String(data.message).slice(0, 160));
      }
    });
    conn.on('close', () => {
      clearTimeout(helloTimeout); if (generation !== current) return;
      if (serverSide) { if (!memberId) return; connections.delete(memberId); authority.remove(memberId); publishRoom(); }
      else leave('Disconnected from the host. Join the room again to reconnect.');
    });
    conn.on('error', () => { if (generation === current && !serverSide) leave('Connection failed. Try a different network or recreate the room.'); });
  }
  let pendingName = 'Driver';
  function open(asHost, code, name) {
    if (opening || room) return;
    code = cleanCode(code); if (!asHost && !validCode(code)) { status('Enter the eight-character room code.', true); return; }
    savedBuilds=structuredClone({selection:engine.selection,custom:engine.custom});
    opening = true; host = asHost; pendingName = cleanName(name); const current = ++generation;
    status(asHost ? 'Creating room…' : 'Connecting to room…');
    // PeerJS Cloud exchanges connection metadata; gameplay uses encrypted WebRTC data channels.
    peer = asHost ? new Peer(prefix + (code = randomCode())) : new Peer();
    connectionTimer = setTimeout(() => { if (generation === current && opening) leave('Could not connect. Check the room code, keep the host tab open, or try another network.'); }, 15000);
    peer.on('open', id => {
      if (generation !== current) return; selfId = id; lastReceived = performance.now();
      if (asHost) { authority = new RoomAuthority(id, pendingName, code, presets.length); engine.paused = true; engine.networkSlots = [0]; engine.reset(); clearTimeout(connectionTimer); opening = false; publishRoom(); engine.publish(); status('Room created. Share the code or invite link.'); }
      else { hostConnection = peer.connect(prefix + code, {reliable: true, serialization: 'json'}); connectEvents(hostConnection, current, false); }
      timer = setInterval(() => {
        if (generation !== current || host || !room) return;
        transmit(hostConnection, packet('ping', {at: performance.now()}));
        if (performance.now() - lastReceived > 12000) leave('The host stopped responding. Rejoin when they are back.');
      }, 2000);
    });
    peer.on('connection', conn => { if (host && generation === current && authority && connections.size < 11) connectEvents(conn, current, true); else conn.close(); });
    peer.on('error', error => {
      if (generation !== current) return;
      if (error.type === 'peer-unavailable') leave('Room not found. Check the code and ask the host to keep the room open.');
      else if (opening) leave('Multiplayer could not connect to signaling. Check your connection and try again.');
      else status('Connection service interrupted. Existing players can continue; recreate the room if new players cannot join.', true);
    });
  }
  return {
    active, slot, isHost: () => host && !!room, isGuest: () => !!room && !host,
    room: () => room, selfId: () => selfId, host: name => open(true, '', name), join: (code, name) => open(false, code, name), request, start, lobby, leave,
    input(value) { pendingInput = sanitizeInput(value); },
    handle(message) {
      if (!room) return false;
      if (message.type === 'arena' && message.action === 'input') pendingInput = sanitizeInput(message);
      // Only explicit room controls may reset/pause/change the authoritative field.
      return true;
    },
    advance(dt) {
      if (!room) { engine.advance(dt); return; }
      const now = performance.now();
      if (host) {
        if (slot() !== null) engine.setSlotInput(slot(), pendingInput);
        engine.advance(dt);
      } else if (now - lastInput >= 1000 / 30) {
        lastInput = now; transmit(hostConnection, packet('input', {input: pendingInput}), true);
      }
    },
    localState(state) {
      if (!room) { onState(state); return; }
      if (!host) return;
      const delivery=snapshots.take(state,performance.now());
      if(delivery)broadcast(packet('state',{state}),!delivery.critical);
      // Decorate a copy so the viewer's seat never leaks into other clients' snapshots.
      deliver({...state, arena: {...state.arena}});
    },
    background(hidden) {
      pendingInput = {};
      if (!room) return;
      if (host) { engine.paused = hidden || !room.started; engine.slotInputs = {}; engine.clock.reset(); engine.publish(); status(hidden ? 'Host tab hidden · match paused for everyone.' : 'Host returned.'); }
      else transmit(hostConnection, packet('input', {input: {}}));
    }
  };
}
