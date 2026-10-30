# Online rooms

Choose **Multiplayer → Create room**, then share the eight-character code or **Copy invite link**. Friends choose **Join room**. Select R1/R2/B1/B2, choose a robot, optionally equip a Box Tube, and mark ready. The host starts a two-minute TeleOp match once ready drivers occupy both alliances. Empty seats have no robot. New arrivals spectate during a match; the host returns everyone to the lobby for another round. Up to four drivers and eight spectators can join.

The room/link/lobby flow draws on [Rebuild Simulator](https://rebuildsim.com/) and its [multiplayer launch description](https://www.chiefdelphi.com/t/introducing-rebuild-simulator-a-web-based-multiplayer-first-frc-simulator/524218). This is an original implementation. [Rebuild's author](https://salvobonsma.com/) describes dedicated server-authoritative C++/WebAssembly multiplayer. BIOBUZZ's GitHub Pages edition uses the host browser as the physics authority.

## Connection and simulation

- PeerJS Cloud supplies WebRTC signaling. No account or room database is required. PeerJS is bundled from npm with its MIT license. [PeerJS documentation](https://peerjs.com/docs/).
- Only the host advances the 120 Hz Rapier world and calculates scores. Guests send bounded controls at up to 30 Hz, receive snapshots at up to 20 Hz, and interpolate visual transforms.
- The host assigns inputs to the sender's seat. Inputs expire after 0.5 simulation seconds. Readiness, seats, robot choices and starts are validated by the host. Messages carry a protocol version; room size and message rate are bounded. Names are length limited and rendered as text. Spectators cannot drive.
- The host tab must stay open and visible. Hiding it pauses the shared simulation; returning resumes it. A guest losing focus sends neutral input. Disconnecting clears that seat. Losing the host ends the session; there is no host migration or persistent reconnect identity.
- Direct WebRTC connectivity depends on both networks and the signaling service. No TURN relay is configured. Restrictive NAT, school networks, VPNs or cellular networks may prevent connection. Failed joins display a timeout with recovery instructions.

This release supports private friend rooms, drivers, spectators and host starts/restarts. Public matchmaking, accounts, rankings, chat, human-player/referee seats and dedicated game servers are not implemented. Rooms are intended for practice with friends; hosts control their local game.

## Driving and flowers

The driver camera uses your alliance side. Field-relative W moves away from that station. **Settings → Input → Drive controls** selects field-relative or robot-relative driving independently of the camera. The setting saves on that device. V / gamepad Y / the touch Drive button toggles it. B / gamepad B / TRACTION changes butterfly gears.

The flower indicator explains readiness, empty inventory, missing Box Tube, alignment, a full flower or the nectar timing lock. Enable a Box Tube in the room before starting. When ready, C / gamepad X / FLOWER drops a piece through the physical top opening, with a short alignment assist. Normal intake retrieves bottom pollen.

Browser verification used real PeerJS connections among four driver tabs and a late spectator on one desktop, plus a separate two-player driving/shooting check. This does not establish cross-network or physical-phone reliability.
