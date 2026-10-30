# BIOBUZZ Simulator

[Play on your phone or computer](https://hirsu-dev.github.io/biobuzz-simulator/)

A browser-based 3D FTC practice game with fifteen simplified robot designs and normal 2-vs-2 matches. Solo practice has only your robot. Timed singleplayer matches can use an AI teammate and two AI opponents. Online rooms support four human drivers and eight spectators.

## Phone controls

Open the link in a modern browser. Landscape works best. Touch controls appear automatically on touch devices; the **Touch** button can toggle them.

- Left square pad: drive and strafe using the selected field-relative or robot-relative reference (tank and butterfly traction mode cannot strafe).
- Right horizontal slider: turn.
- Hold **SHOOT** to launch a game piece.
- Tap **AUTO INTAKE** to toggle collection from the floor and the bottom of flowers; hold **EJECT** to release pieces.
- **FLOWER** drops a piece through the top opening using an aligned Box Tube. Normal intake retrieves bottom pollen; nectar cannot be pulled through the retrieval opening.
- **FIELD DRIVE / ROBOT DRIVE** switches the driving reference. **TRACTION** appears on butterfly robots to switch gears.
- **Robots & settings** changes designs, cameras and render quality.
- **Menu** pauses singleplayer. In online games it opens the room without pausing everyone. Inputs reset on pause, tab changes and loss of focus.

Use the **Fullscreen** button or **Alt+Enter** to enter fullscreen. **Escape** exits fullscreen before opening the pause menu. Menus, dialogs and Code testing remain accessible. Unsupported browsers offer an expanded view; on iPhone, Add to Home Screen can provide a borderless view.

Choose **Play match** for a timed match or **Solo practice** for a field without AI. Quick matches start with two minutes of TeleOp. Full matches include autonomous and driver transition; your manually controlled robot waits during autonomous. Singleplayer match results include a local replay.

On a computer, use WASD, J/L or arrow keys to turn, Shift/right bumper to intake, I/right-stick click to toggle auto intake, K to eject, Space to shoot, C to place in a flower, V to toggle field-relative/robot-relative driving, B to shift butterfly traction, Tab to switch Driver Station / Behind Robot, and Esc for menu. Field-relative W moves away from your alliance station, including while rotating. Robot-relative W follows the chassis front. Choose the reference in Settings → Input; changing cameras does not change it. Scroll or pinch the field to zoom. Standard gamepads also work.

## Multiplayer

Choose **Multiplayer → Create room**, then send friends the room code or invite link. Choose a red or blue seat and a robot, equip a Box Tube if wanted, and mark ready. The host starts a two-minute TeleOp match. Empty seats stay empty; late arrivals spectate until the next round. The host controls returning to the lobby.

The host browser runs the shared physics using WebRTC connections. Keep the host tab open and visible; hiding it pauses the match. Some networks block direct connections, and a TURN relay is not configured. No accounts or public matchmaking. See [multiplayer details and connection limits](MULTIPLAYER.md).

## Java code

This public website runs gameplay entirely on your device using Three.js and Rapier 3D physics. It does not need a running PC or a localhost server.

**FTC Java is not compiled or executed on this static website.** The Code testing tab allows editing, importing, saving and downloading Java drafts. Drafts are stored only in this browser's local storage; clearing site data removes them. Download important files.

Real FTC Java OpMode execution belongs to the separate local desktop project using FTCSim and JBullet. Its engine and third-party source are not included in this public repository. Browser practice physics does not reproduce FTC motor, encoder, battery or SDK timing behavior.

## Development

Requires Node.js 22 or later.

```sh
npm ci
npm run dev
npm test
npm run build
```

The build goes into `frontend/web-dist`. GitHub Actions tests and publishes it to GitHub Pages on pushes to main. Pages must use GitHub Actions as its publishing source. All asset paths support the repository subdirectory.

## Models and simulation limits

The original ten presets are Atlas Turret, REV DUO, goBILDA Starter, AndyMark Robits, Studica Starter, Astra Compact, Vector Twin, Petal Lift, Sweep Hybrid and Bastion Tank. The catalog in `frontend/data/robots.json` records design references and estimates. Five DSIM adaptations add StarterBot, Pollinator, Forager, Skimmer and Sniper. Choose **Customize** in Singleplayer to change drivetrain (mecanum, tank, swerve, X-drive or butterfly), launcher, intake position, Box Tube, dimensions, mass and performance. Builds save per slot on this device. These are original procedural meshes, not exact CAD replicas or an exhaustive list of every team robot.

Rapier simulates rigid-body gravity, collisions, friction and projectiles at 120 Hz. The browser uses the same deterministic Rapier 0.20.0 build as DSIM. Hives use measured DSIM dimensions, roofed clear cells, a triangular support frame, physical hinged bodies, the DSIM load table and gravity-driven spills. The models are original procedural geometry with matching collision panels. Chassis use box colliders, estimated wheel traction and rate-limited swerve steering. Flowers use rectangular plates, posts, a backstop and physical falling stacks. Normal intake retrieves pollen through the bottom; Box Tube placement releases pieces through the top. Nectar remains supported above the retrieval opening. Match setup uses 56 pieces, including four pollen per flower and robot, three nectar per hive and five reserve nectar per alliance. Nectar placement unlocks at 1:00; pollen placement can occur earlier. Dynamics and AI remain estimates. See [TU06 rules audit and limits](RULES.md). This is a practice tool, not an official scorer or a calibrated replacement for testing a physical robot. The score shows hive tips during play; leftover hive pieces and gardens are assessed after settling. Auto points are banked at 30 seconds and TeleOp park at time expiry; penalties and referee decisions are not fully modeled.

[Rebuild Simulator](https://rebuildsim.com/) inspired the title screen, right-side main menu, full-screen singleplayer setup with robot preview and stat bars, settings, minimal HUD and touch layout. The interface is recreated with original BIOBUZZ geometry and an openly licensed Silkscreen font. Rebuild’s author describes a C++/WebAssembly implementation at [salvobonsma.com](https://salvobonsma.com/); the public build also contains raylib/rlgl rendering signatures. Its physics library and tuning remain unverified. This website uses Three.js and Rapier, with recreated flat graphics and time-based camera tracking; it does not claim identical engine behavior. See [reference findings](REBUILD_RESEARCH.md). [MoSim](https://mosimulator.com/) inspired driver practice and robot selection. No Rebuild or MoSim code, branding, models or audio assets are included. Private multiplayer rooms use an original host-browser implementation. Rankings, accounts and public matchmaking are not implemented.

The local desktop integration was built around [FTCSim](https://github.com/WheatleyFromPortal2/FTCSim). The public web edition uses its own browser engine and does not distribute FTCSim source. [FIRST BIOBUZZ resources](https://ftc-resources.firstinspires.org/ftc/archive/2027/game) informed the field concept. This project is independent and is not endorsed by FIRST or the referenced vendors.

## Validation

Forty-seven browser checks cover solo body removal, assessment-time scoring, seat ownership, readiness, input expiry, both drive references, flower alignment assistance, AI path clearance, fullscreen entry/exit and rejection, measured hive openings, roof deflection, physical flower columns, ordinary flower intake, nectar sorting and timing, TU06 inventory and reserve release, flower ownership and partial-overlap scoring, plus all fifteen presets, field-relative input at four headings while turning, customization isolation, swerve/X-drive/butterfly behavior, flower placement and extraction, mixed hive thresholds, physical tipping/spills, assisted shots, finite pieces, drive types, wall collisions, ballistic shots, intake/ejection, pause and input reset, full-match timing, autonomous input blocking, AI scoring, explicitly refusing unsupported Java execution, equal driving behavior at different display rates, braking, diagonal speed limits, camera damping, interpolation, and bounded frame catch-up. Four driver tabs and a late spectator connected through real PeerJS signaling and shared controls. Phone-sized layouts and pointer controls were checked in a desktop browser. Physical iPhone/Android multitouch and sustained mobile performance have not been device-tested.

## Third-party software

DSIM preset data and hive adaptations require **PolyForm Noncommercial 1.0.0**. Required Notice: Copyright 2026 Dohun Kim (https://github.com/genius0412). See [DSIM adaptation details](DSIM_RESEARCH.md) and the [full license](frontend/public/licenses/DSIM.txt). The full DSIM application and CAD assets are not included.

Three.js (MIT), Lucide (ISC), Rapier (Apache-2.0), and PeerJS (MIT) are bundled. Their license texts are included under `frontend/public/licenses/` and served with the site. Silkscreen is bundled under the SIL Open Font License in `frontend/public/fonts/OFL.txt`. Other editor fonts may load from Google Fonts with system fallbacks. See `THIRD_PARTY_NOTICES.md`.
