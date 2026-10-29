# Browser rules audit — October 29, 2026

Checked [FIRST's current season page](https://ftc-resources.firstinspires.org/ftc/game) and [BIOBUZZ manual TU06](https://ftc-resources.firstinspires.org/ftc/game/cm-html/BIOBUZZ%20Competition%20Manual%20-%20TU06.htm), published October 22. The UI's browser practice score uses these game values. This is a simulator, not a referee system.

| Area | Browser implementation |
| --- | --- |
| Setup, §10.3 | 40 pollen, 8 red nectar, 8 blue nectar. Four pollen in each robot and flower; four in each garden; three nectar per hive; five per alliance held in reserve. |
| Clock | 30-second Auto, 8-second transition, 120-second TeleOp. No manual Auto input or powered transition movement. Gravity continues during transition and after time expires. |
| Intake, G407–409 | Four-piece capacity; opponent nectar rejected; hive spills must reach floor height before collection. |
| Flowers, G410/G418 | Entry through top, retrieval of bottom pollen using normal intake. Nectar placement unlocks at 1:00. Accidental early nectar entry adds 20 points to the opponent. |
| Flower scoring | Only partially intersecting the middle-to-top scoring volume counts. Highest scoring nectar owns the flower (2 per element); lowest scoring nectar awards its alliance 5. |
| Hive scoring | 20 per completed tip; 2 per remaining upward-cell element in the end-state projection. |
| Other scoring | Garden 1 per element; Auto Leave 3; Auto Park 5; TeleOp Park 5. Zone checks include partial overlap. |

The live HUD projects the end-state achievements. Final scoring waits for settling, bounded to ten seconds. Free drive uses the same initial inventory and allows immediate nectar supply and placement. In matches, a simulated human player releases one reserve nectar per completed tip, then the remaining reserve after 1:00, when its drop location is clear. No extra pieces are created.

## Geometry and control checks

Flower plates and backstop follow the official §9.7 drawing; dimensions also use DSIM measurements, documented in `DSIM_RESEARCH.md`. Flowers are rectangular assemblies with circular plate openings, not hoops. Posts, plates, balls and hive panels collide. A physical flower column falls under gravity, and nectar is supported above the retrieval opening. Box Tube placement and intake use reach/alignment checks; robot mechanisms themselves remain simplified.

The red driver camera is on the left alliance side. Browser field-relative W points away from it and D points right. Shift/right bumper holds intake; I/right-stick click or the on-screen Auto Intake button latches intake. The phone Auto Intake button uses the same latch. Pause, focus loss and workspace changes clear it. Fullscreen uses the whole document so menus, dialogs and Code testing stay accessible; Alt+Enter toggles and Escape exits. Unsupported mobile browsers use an explicitly labeled expanded view.

## Remaining limits

Contact intent, pinning, strategic violations, cards, inspections and tournament ranking points are not refereed. Human-player placement and collision materials are estimates. Flowers use annular sectors and an eight-sided confinement approximation; hive skins and ribs are procedural, with no redistributed CAD meshes. The bounded settling window and live score projection may differ from a referee's final assessment. No claim of complete rules enforcement or calibrated real-robot dynamics is made. The desktop Java edition retains its older field/rules implementation.
