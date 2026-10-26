# BIOBUZZ Simulator

[Play on your phone or computer](https://hrushikbarani-hub.github.io/biobuzz-simulator/)

A browser-based 3D FTC practice game with ten simplified robot designs and normal 2-vs-2 matches. You drive R1 with an AI teammate against two AI opponents.

## Phone controls

Open the link in a modern browser. Landscape works best. Touch controls appear automatically on touch devices; the **Touch** button can toggle them.

- Left square pad: drive and strafe (tank robots cannot strafe).
- Right horizontal slider: turn.
- Hold **SHOOT** to launch a game piece.
- Tap **INTAKE** to toggle collection; hold **EJECT** to release pieces.
- **Robots & settings** changes designs, cameras and render quality.
- **Menu** pauses the match. Inputs reset on pause, tab changes and loss of focus.

Choose **Play match** for a timed match or **Free drive** for practice. Quick matches start with two minutes of TeleOp. Full matches include autonomous and driver transition; your manually controlled robot waits during autonomous. Match results include a local replay.

On a computer, use WASD, J/L or arrow keys to turn, Shift to intake, K to eject, Space to shoot, X to extract flower pollen, Tab for camera, and Esc for menu. Standard gamepads also work.

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

The ten presets are Atlas Turret, REV DUO, goBILDA Starter, AndyMark Robits, Studica Starter, Astra Compact, Vector Twin, Petal Lift, Sweep Hybrid and Bastion Tank. The catalog in `frontend/data/robots.json` records design references and estimates. These are original procedural meshes, not exact CAD replicas or an exhaustive list of every team robot.

Rapier simulates rigid-body gravity, collisions, friction and projectiles at 120 Hz. Chassis use box colliders; wheel traction, intake capture, hive tipping, flower storage and scoring are simplified. The seeded starting layout, dynamics and AI are estimates. This is a practice tool, not an official scorer or a calibrated replacement for testing a physical robot. The displayed score includes projected achievements; penalties and referee decisions are not fully modeled.

[Rebuild Simulator](https://rebuildsim.com/) inspired the flat-shaded field, minimal HUD and touch layout. [MoSim](https://mosimulator.com/) inspired driver practice and robot selection. No Rebuild or MoSim code, branding, models or audio assets are included. This is singleplayer; multiplayer, rankings and accounts are not implemented.

The local desktop integration was built around [FTCSim](https://github.com/WheatleyFromPortal2/FTCSim). The public web edition uses its own browser engine and does not distribute FTCSim source. [FIRST BIOBUZZ resources](https://ftc-resources.firstinspires.org/ftc/archive/2027/game) informed the field concept. This project is independent and is not endorsed by FIRST or the referenced vendors.

## Validation

Eight automated checks cover all ten presets, finite pieces, drive types, wall collisions, ballistic shots, intake/ejection, pause and input reset, full-match timing, autonomous input blocking, AI scoring, and explicitly refusing unsupported Java execution. Phone-sized landscape and portrait layouts and pointer controls were checked in a desktop browser. Physical iPhone/Android multitouch and sustained mobile performance have not been device-tested.

## Third-party software

Three.js (MIT), Lucide (ISC), and Rapier (Apache-2.0) are bundled. Their license texts are included under `frontend/public/licenses/` and served with the site. Fonts may load from Google Fonts with system fallbacks. See `THIRD_PARTY_NOTICES.md`.
