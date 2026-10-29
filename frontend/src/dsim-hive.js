/*! Required Notice: Copyright 2026 Dohun Kim (https://github.com/genius0412)
 * DSIM adaptations under PolyForm Noncommercial 1.0.0:
 * https://polyformproject.org/licenses/noncommercial/1.0.0
 */
// Adapted from DSIM hive.ts and sim3d/hive3d.ts, commit f930291bd885e6f2a8afbf5f2c2aa64c9ac5b4d6.
// Required Notice: Copyright 2026 Dohun Kim (https://github.com/genius0412)
// PolyForm Noncommercial 1.0.0: https://polyformproject.org/licenses/noncommercial/1.0.0
// Coordinate system and SI units adapted for BIOBUZZ Studio. See DSIM_RESEARCH.md.
import {HIVE,hiveLocal,inCellProfile} from './hive-geometry.js';
export const HIVE_REST=HIVE.rest;
export const TIP_POLLEN=[8,7,6,3,1,0];
export function hiveLoad(pieces){return pieces.reduce((a,p)=>{a[p.color===0?'pollen':'nectar']++;return a;},{pollen:0,nectar:0});}
export function hiveWillTip({pollen,nectar}){return pollen>=TIP_POLLEN[Math.min(nectar,5)];}
export function pollenToTip(pieces){const load=hiveLoad(pieces);return Math.max(0,TIP_POLLEN[Math.min(load.nectar,5)]-load.pollen);}
export function cellContains(point,pivot,angle,side){
 const p=hiveLocal(point,pivot,angle),along=-p.z*side;
 return along>HIVE.near&&along<HIVE.far&&p.y<HIVE.top-HIVE.seatDepth&&inCellProfile(p.x,p.y);
}
