import { type Army, type MultiwaveInput, type MultiwaveOutput, type UnitIdentifier } from './external.js';
/**
 * Minimal frontend input shape for a single-wave attack/defense battle.
 */
export interface BattleInput {
    attack: Army;
    defense: Army;
    attackOol?: UnitIdentifier[];
    defenseOol?: UnitIdentifier[];
    takes?: number;
    aaLast?: boolean;
    attSubmerge?: boolean;
    defSubmerge?: boolean;
    attDestLast?: boolean;
    defDestLast?: boolean;
    isCrashFighters?: boolean;
    rounds?: number;
    retreatThreshold?: number;
    retreatExpectedIpcProfitThreshold?: number;
    retreatPwinThreshold?: number;
    retreatStrafeThreshold?: number;
    retreatLoseAirProbability?: number;
    isNaval?: boolean;
    diceMode?: 'standard' | 'lowluck' | 'biased';
    sortMode?: 'unit_count' | 'ipc_cost';
    verboseLevel?: number;
}
export declare function makeMultiwaveInput(input: BattleInput): MultiwaveInput;
export declare function computeBattle(input: BattleInput): MultiwaveOutput;
export declare function computeSbrBattle(input: BattleInput): MultiwaveOutput;
//# sourceMappingURL=frontend.d.ts.map