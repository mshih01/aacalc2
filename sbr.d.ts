import { type aacalc_output } from './output.js';
import type { DiceMode } from './solve.js';
export interface sbr_input {
    diceMode: DiceMode;
    verboseLevel: number;
    numBombers: number;
    industrialComplexHitPoints: number;
    inProgress: boolean;
    pruneThreshold: number;
    reportPruneThreshold: number;
}
export declare function sbr(input: sbr_input): aacalc_output;
//# sourceMappingURL=sbr.d.ts.map