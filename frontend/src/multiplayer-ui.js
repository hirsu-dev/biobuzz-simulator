import {SLOT_NAMES, cleanCode} from './room-protocol.js';

export function createMultiplayerUI({network, presets, onOpen, onClose}) {
  const dialog = document.createElement('dialog'); dialog.id = 'networkDialog'; dialog.className = 'network-dialog';
  dialog.innerHTML = `<div class="network-heading"><div><span class="game-eyebrow">BIOBUZZ ONLINE · 2 VS 2</span><h2>MULTIPLAYER</h2></div><button id="netClose" class="game-button compact" aria-label="Close multiplayer">×</button></div>
  <p id="netStatus" role="status">Create a room, then invite friends with its code.</p>
  <section id="netEntry"><label>YOUR NAME<input id="netName" maxlength="24" autocomplete="nickname" value="Driver"></label><div class="network-join"><button id="netCreate" class="game-button accent">CREATE ROOM</button><label>ROOM CODE<input id="netCode" maxlength="8" autocomplete="off" autocapitalize="characters" placeholder="ABCDEFGH"></label><button id="netJoin" class="game-button">JOIN ROOM</button></div><p class="network-note">Private rooms for up to four drivers and eight spectators. The host must keep this tab open. Some school or mobile networks may block direct connections.</p></section>
  <section id="netLobby" hidden><div class="network-invite"><span>ROOM <strong id="netRoomCode"></strong></span><button id="netCopy" class="game-button compact">COPY INVITE LINK</button></div><p id="netRound"></p><div id="netSeats" class="network-seats"></div><div class="network-spectators"><button id="netSpectate" class="game-button compact">SPECTATE</button><span id="netSpectatorNames"></span></div><label>YOUR ROBOT<select id="netRobot" aria-label="Multiplayer robot"></select></label><label class="tube-option"><input type="checkbox" id="netTube">Equip a Box Tube for flower placement</label><p id="netResults"></p><div class="network-actions"><button id="netReady" class="game-button">READY</button><button id="netStart" class="game-button accent">START MATCH</button><button id="netReturn" class="game-button">RETURN TO LOBBY</button><button id="netResume" class="game-button">BACK TO FIELD</button><button id="netLeave" class="game-button">LEAVE ROOM</button></div><p class="network-note">A match needs ready drivers on both alliances. Empty seats stay empty. Drivers lock when the match starts; new arrivals spectate until the next round. No accounts or public matchmaking.</p></section>`;
  document.body.append(dialog);
  const $ = id => dialog.querySelector('#' + id);
  $('netRobot').replaceChildren(...presets.map((p, i) => new Option(p.name, i)));
  try { $('netName').value = localStorage.getItem('biobuzz-player-name') || 'Driver'; } catch {}
  const invite = cleanCode(new URLSearchParams(location.hash.slice(1)).get('room'));
  if (invite) $('netCode').value = invite;
  const name = () => { const name = $('netName').value; try { localStorage.setItem('biobuzz-player-name', name); } catch {} return name; };
  function open() { onOpen(); if (!dialog.open) dialog.showModal(); }
  function close() { dialog.close(); onClose(); }
  function status(text, error = false, quiet = false) { if (quiet) { $('netStatus').dataset.ping = text; return; } $('netStatus').textContent = text; $('netStatus').classList.toggle('network-error', error); $('netCreate').disabled = $('netJoin').disabled = /…$/.test(text); }
  function update(room, context) {
    $('netEntry').hidden = true; $('netLobby').hidden = false;
    $('netRoomCode').textContent = room.code;
    const me = room.members.find(m => m.id === context.selfId);
    $('netRound').textContent = room.started ? 'MATCH IN PROGRESS · ' + (me?.slot == null ? 'SPECTATING' : 'YOU ARE ' + SLOT_NAMES[me.slot]) : 'CHOOSE YOUR SEAT';
    $('netSeats').replaceChildren(...SLOT_NAMES.map((label, slot) => {
      const player = room.members.find(m => m.slot === slot), button = document.createElement('button');
      button.className = 'network-seat ' + (slot < 2 ? 'red-seat' : 'blue-seat');
      button.setAttribute('aria-pressed', String(player?.id === context.selfId));
      button.disabled = room.started || !!(player && player.id !== context.selfId);
      const heading = document.createElement('strong'), detail = document.createElement('span'), ready = document.createElement('small');
      heading.textContent = label; detail.textContent = player ? player.name + (player.id === room.hostId ? ' · HOST' : '') : 'OPEN SEAT';
      ready.textContent = player ? presets[player.preset]?.name + (player.ready ? ' · READY' : ' · NOT READY') : 'Click to drive';
      button.append(heading, detail, ready); button.onclick = () => network.request({type: 'seat', slot}); return button;
    }));
    $('netSpectatorNames').textContent = 'Spectators: ' + (room.members.filter(m => m.slot === null).map(m => m.name).join(', ') || 'none');
    $('netSpectate').disabled = room.started || me?.slot === null;
    $('netTube').checked=me?.boxTube??!!(presets[me?.preset]?.lift||presets[me?.preset]?.mechanism==='lift');$('netTube').disabled=room.started||me?.slot===null;
    $('netRobot').value = String(me?.preset ?? 0); $('netRobot').disabled = room.started || me?.slot === null;
    $('netReady').textContent = me?.ready ? 'READY ✓ · UNREADY' : 'READY'; $('netReady').disabled = room.started || me?.slot === null;
    $('netStart').hidden = !context.host || room.started; $('netReturn').hidden = !context.host || !room.started;
    $('netResume').hidden = !room.started;
    if (!room.started) open();
  }
  $('netClose').onclick = close; dialog.addEventListener('cancel', () => onClose());
  $('netCreate').onclick = () => network.host(name());
  $('netJoin').onclick = () => network.join($('netCode').value, name());
  $('netCode').addEventListener('keydown', e => { if (e.key === 'Enter') $('netJoin').click(); });
  $('netRobot').onchange = () => network.request({type: 'robot', preset: Number($('netRobot').value)});
  $('netTube').onchange=()=>network.request({type:'tube',enabled:$('netTube').checked});
  $('netSpectate').onclick = () => network.request({type: 'seat', slot: null});
  $('netReady').onclick = () => network.request({type: 'ready', ready: !network.room()?.members.find(m => m.id === network.selfId())?.ready});
  $('netStart').onclick = () => network.start(); $('netReturn').onclick = () => network.lobby(); $('netResume').onclick = close;
  $('netLeave').onclick = () => { network.leave(); close(); };
  $('netCopy').onclick = async () => {
    const url = new URL(location.href); url.hash = 'room=' + network.room().code;
    try { await navigator.clipboard.writeText(url.href); status('Invite link copied. Send it to your friends.'); }
    catch { status('Clipboard unavailable. Share room code ' + network.room().code + '.'); }
  };
  return {open, close, update, status, state(s){
 const a=s.arena;if(!a?.multiplayer)return;
 if(a.ended&&a.scoreBreakdown){const r=a.scoreBreakdown;$('netResults').textContent='FINAL · RED '+a.score[0]+' — '+a.score[1]+' BLUE\nHive tips: '+r[0].tips+' / '+r[1].tips+' · Flowers: '+r[0].flowers+' / '+r[1].flowers+'\nRemaining hive: '+r[0].hive+' / '+r[1].hive+' · Gardens: '+r[0].garden+' / '+r[1].garden+' · Park: '+r[0].park+' / '+r[1].park;}
 else $('netResults').textContent=s.sim.paused&&network.room()?.started?'Host paused · waiting for host to return.':'';
 }, blocked: () => dialog.open, invited: !!invite,
    reset() { $('netEntry').hidden = false; $('netLobby').hidden = true; $('netCreate').disabled = $('netJoin').disabled = false; }
  };
}
