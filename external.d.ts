import { type DiceMode, type SortMode, type PwinMode } from './solve.js';
import { type ProfitDistribution } from './output.js';
import { unit_manager } from './unitgroup.js';
import { type multiwave_input } from './multiwave.js';
import { type multieval_output } from './multieval.js';
export type UnitIdentifier = 'aa' | 'inf' | 'art' | 'arm' | 'fig' | 'bom' | 'sub' | 'tra' | 'des' | 'cru' | 'acc' | 'bat' | 'bat1' | 'dbat' | 'ic' | 'inf_a' | 'art_a' | 'arm_a';
export type Army = Partial<Record<UnitIdentifier, number>>;
export declare const UnitIdentifier2UnitMap: Record<UnitIdentifier, string>;
export declare const Unit2UnitIdentifierMap: Map<string, UnitIdentifier>;
export declare const Unit2ExternalNameMap: Map<string, string>;
export interface UnitGroup {
    units: Army;
    ool: UnitIdentifier[];
    takes: number;
    aaLast: boolean;
}
export interface WaveInput {
    attack: UnitGroup;
    defense: UnitGroup;
    att_submerge: boolean;
    def_submerge: boolean;
    att_dest_last: boolean;
    def_dest_last: boolean;
    is_crash_fighters: boolean;
    rounds: number;
    retreat_threshold: number;
    retreat_expected_ipc_profit_threshold?: number;
    retreat_pwin_threshold?: number;
    pwinMode?: PwinMode;
    retreat_strafe_threshold?: number;
    retreat_lose_air_probability?: number;
}
export interface MultiwaveInput {
    wave_info: WaveInput[];
    debug: boolean;
    prune_threshold: number;
    report_prune_threshold: number;
    is_naval: boolean;
    in_progress: boolean;
    num_runs: number;
    verbose_level: number;
    diceMode: DiceMode;
    sortMode?: SortMode;
    is_deadzone?: boolean;
    report_complexity_only?: boolean;
    do_roundless_eval?: boolean;
    territory_value?: number;
    retreat_round_zero?: boolean;
}
export interface MultiEvalInput extends MultiwaveInput {
    attackerList: Army[];
    defenderList: Army[];
}
export interface SbrInput {
    attack: UnitGroup;
    defense: UnitGroup;
    verbose_level: number;
    diceMode: DiceMode;
    in_progress: boolean;
    pruneThreshold: number;
    reportPruneThreshold: number;
}
export type Side = 'attack' | 'defense';
export type CasualtiesInfo = Record<Side, Record<string, CasualtyInfo>>;
export interface CasualtyInfo {
    casualties: string;
    survivors: string;
    retreaters: string;
    amount: number;
    ipcLoss: number;
}
export interface CalcInfo {
    survives: number[];
    ipcLoss: number[];
}
export interface MultiwaveOutput {
    attack: CalcInfo;
    defense: CalcInfo;
    casualtiesInfo: CasualtiesInfo;
    profitDistribution: ProfitDistribution[];
    takesTerritory: number[];
    rounds: number[];
    waves: number;
    complexity: number;
}
export type MultiEvalOutput = multieval_output;
export declare function multiwaveComplexityFastV2(input: MultiwaveInput): number;
export declare function multiwaveComplexity(input: MultiwaveInput): number;
export declare function getInternalInput(input: MultiwaveInput): multiwave_input;
export declare function multiwaveExternal(input: MultiwaveInput): MultiwaveOutput;
export declare function multiEvalExternal(input: MultiEvalInput): MultiEvalOutput;
interface make_unit_group_string_output {
    unit: string;
    ool: string;
}
export declare function make_unit_group_string(units: Army, ool: UnitIdentifier[], // array of order of loss
takes: number, // number of land units to take with
aa_last: boolean, // take aa as second last casualty for defender
is_naval: boolean, verbose_level: number): make_unit_group_string_output;
export declare function get_external_unit_str(um: unit_manager, input: string): string;
export declare function sbrExternal(input: SbrInput): MultiwaveOutput;
export declare function getIntegersInRange(low: number, high: number, step: number): number[];
export declare function getArmyCost(army: Army): number;
export declare function getSubArmies(army: Army, startArmy: Army, stepArmy: Army): [Army, number, number, number][];
export declare function getCombinations<T>(arrays: T[][]): T[][];
export {};
//# sourceMappingURL=external.d.ts.map