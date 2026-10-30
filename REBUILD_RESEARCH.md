# Rebuild reference study — 2026-10-27

Reference inspected: https://rebuildsim.com/, v108 / build 1927696.

## Confirmed

- The author's site describes C++ compiled to WebAssembly and server-authoritative multiplayer: https://salvobonsma.com/.
- The launch post requires WebGL2: https://www.chiefdelphi.com/t/introducing-rebuild-simulator-a-web-based-multiplayer-first-frc-simulator/524218.
- The public game loaded `index.js?v=1927696` and `index.wasm?v=1927696`. Read-only inspection of the loaded files identified Emscripten and the strings `Initializing raylib` and `RLGL: Default OpenGL state initialized successfully`. This identifies raylib/rlgl, but not its exact version or build settings.
- The in-game camera choices were Driver Station and Behind Robot. Frame rate defaulted to VSync. Tab is the camera shortcut; WASD drive, J/L turn, Shift intake, K outtake, Space shoot.
- The selected 359 robot's setup displayed 14.8 ft/s speed and 27 ft/s² acceleration. These are FRC robot stats, not transferable FTC measurements.

## Observed visual and movement behavior

Flat shaded faceted models, thin dark edges, charcoal background and floor, saturated alliance colors, bright yellow game pieces, transparent field walls. The driver camera looks down the field from the alliance end; the alternate camera tracks the robot. These are visual observations, not recovered camera matrices or tuning coefficients.

## Unknown

No named physics library was identifiable in the inspected public client. No Rebuild source license, source physics implementation, solver settings, contact coefficients, camera constants, or exact frame timing were established. The absence of identifying strings does not prove a custom physics engine. No Rebuild code, models, or compiled game files are redistributed here.

## BIOBUZZ implementation

BIOBUZZ keeps Three.js for WebGL rendering, Rapier for browser physics, and the separate JBullet/FTCSim desktop Java runtime. It does not claim to run Rebuild's engine. The renderer uses inexpensive flat Lambert shading, darker outlines, simple transparent walls, and optional shadows. Driver Station and Behind Robot are the Play camera cycle, with smooth time-based tracking and scroll zoom. Orbit, top, and broadcast views remain available in the camera selector for code inspection.

Controls, browser simulation advancement, and rendering share a single animation loop. Simulation remains fixed at 120 Hz, with bounded catch-up. All moving bodies interpolate between snapshots; resets and newly released pieces snap immediately. Flower meshes rebuild only when contents change; hidden trails no longer rebuild every update. Manual acceleration is capped by vector magnitude, diagonal commands are normalized, braking is stronger, and angular acceleration accounts for chassis inertia. These are original estimates for BIOBUZZ, not Rebuild's coefficients or validated real-robot measurements.

## October 29 update

Simplified bumper/hopper/launcher robot silhouettes, unlit bright balls, thinner field rails and quieter tile seams. Raised driver-station camera is the start-of-match default; manual holonomic WASD stays locked to field axes. Lower assisted ballistic arcs compensate chassis velocity. See [DSIM adaptation details](DSIM_RESEARCH.md) for the deterministic Rapier upgrade, hinged hive, new drivetrains and flower mechanics. These are reference-inspired changes, not verified 1:1 Rebuild rendering or physics.

## October 30 multiplayer

The create-room, invite-code/link, driver-seat, ready and spectator flow follows the public Rebuild multiplayer description. BIOBUZZ implements it with original PeerJS/WebRTC code and a host-browser Rapier world. Rebuild uses dedicated server authority; this website uses private friend rooms with no accounts or public matchmaking. See [networking behavior and limits](MULTIPLAYER.md).
