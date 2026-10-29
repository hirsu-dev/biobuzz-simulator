# DSIM adaptation notes — October 29, 2026

Primary source: [genius0412/dsim](https://github.com/genius0412/dsim), revision `f930291bd885e6f2a8afbf5f2c2aa64c9ac5b4d6`. Live reference: [playdsim.com](https://www.playdsim.com/).

DSIM is source-available under **PolyForm Noncommercial 1.0.0**. Required Notice: Copyright 2026 Dohun Kim (https://github.com/genius0412). The complete license is distributed in `frontend/public/licenses/DSIM.txt`, served at `./licenses/DSIM.txt`, linked in the builder and help, and preserved in the adapted module. These adaptations are for noncommercial use; this project does not offer a permissive commercial license for them.

## Verified source facts and implemented changes

- `package.json`: DSIM's 3D engine uses `@dimforge/rapier3d-deterministic-compat` 0.20.0. The browser edition now uses that exact package and version. This changes the underlying rigid-body library, not the whole DSIM application.
- `src/games/biobuzz/hive.ts` and `config.ts`: the pollen threshold by nectar count is `[8, 7, 6, 3, 1, 0]`. Adapted into `frontend/src/dsim-hive.js` with the required notice.
- `sim3d/hive3d.ts`: a detent holds the tray at a 30-degree stop until the table releases it. The dynamic tray swings on a revolute joint, with gravity, contact forces, angular damping and a minimum angular speed toward the opposite stop. BIOBUZZ now implements this structure with real colliding balls that remain visible in the tray and spill through its open outer end. Points accrue at the opposite stop, not at release. Membership is measured in the tilted tray's own frame.
- `config.ts`: DSIM uses estimated pollen mass 0.2 lb, nectar mass ratio 1.6, friction 0.6, bounce 0.55, angular damping 0.4, hive damping 4.466/s, and 13 lb tray + 6 lb ballast. The browser converts masses to SI and adopts these contact settings. Its tray geometry, center of mass and inertia are simplified and are **not DSIM's calibrated CAD mass properties**. Swing duration depends on actual load and contact positions; it is not asserted to equal DSIM's timing.
- `presets.ts` and `config.ts`: the five added preset adaptations are StarterBot (tank/dumper), Pollinator (mecanum/turret/rear Box Tube), Forager (butterfly/dumper/two intakes), Skimmer (X-drive/twin turret) and Sniper (swerve/pollen turret/two intakes). Footprints and declared demo masses were converted from inches/pounds. StarterBot mass and drive/launcher performance remain estimates. Meshes are original simple procedural shapes.
- The builder changes drivetrain, launcher, front/back/both intake, Box Tube position, dimensions, mass, speed and firing interval independently for each alliance slot. It saves on the current device. Swerve has rate-limited pod steering; X-drive normalizes commands in omni wheel space; butterfly toggles holonomic/traction operation. Chassis forces approximate wheel traction; these are not full per-wheel motor/suspension models.
- Flower gameplay follows the placement distinction in DSIM's mechanism code: a Box Tube places a held piece; launched balls do not magically become stored flower pieces. Bottom pollen can be extracted; bottom nectar blocks extraction. The browser uses a bounded discrete stack, reach alignment, a deposit cooldown and a final-60-seconds match window. It does **not** reproduce DSIM's CAD plate colliders and bore-contact simulation. Free drive allows flower practice throughout.

## Rebuild appearance and controls

Rebuild was visually inspected for the flat, simple robot silhouettes, untextured bright balls, dark field, wire-like field perimeter and driver-station perspective. BIOBUZZ uses its own box/hopper/launcher models, flat shading and unlit ball materials. The raised driver camera is anchored on the red station side. Manual holonomic input is field-relative; W moves toward world -Z even while turning. Java receives the original gamepad values so existing OpMode coordinate transforms are not applied twice.

Assisted browser shots now solve a lower ballistic arc with chassis-velocity compensation and much less artificial air drag. The original Rebuild physics implementation and coefficients remain unavailable from the inspected sources; no exact 1:1 physics or graphics claim is made.

## Edition boundary

The new DSIM physics, five presets, builder, shift mode and flower controls are in **browser Play**. The desktop Java runtime still uses JBullet and its original ten presets. It receives the shared visual/camera improvements and field-relative manual control, while Java gamepads retain their existing contract. The public site still saves Java drafts only. Real FTC SDK execution is verified in the separate desktop integration.
