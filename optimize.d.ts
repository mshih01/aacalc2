import { type MultiwaveInput, type Army } from './external.js';
import { type PwinMode } from './solve.js';
export type AttDefType = 'attacker' | 'defender';
export type SolveType = 'multiEval' | 'exhaust' | 'linearSearch' | 'gridSearch' | 'fuzzyBinarySearch';
export interface ArmyRecommendInput extends MultiwaveInput {
    attDefType: AttDefType;
    targetPercentage: number;
    pwinMode?: PwinMode;
    solveType?: SolveType;
}
export interface ArmyRecommendOutput {
    recommendations: {
        army: Army;
        cost: number;
    };
}
export declare function armyRecommend(input: ArmyRecommendInput): ArmyRecommendOutput;
//# sourceMappingURL=optimize.d.ts.map