import { general_problem } from './solve.js';
import { general_unit_group } from './unitgroup.js';
export declare function report_filter(threshold: number, p: number): number;
export declare function collect_results(parent_prob: general_problem): result_data_t[];
export declare function get_reduced_group_string(input: string): string;
interface naval_cost {
    cost: number;
    casualty: string;
}
export declare function get_general_cost(problem: general_problem, group: general_unit_group, ii: number): naval_cost;
export declare function print_general_results(baseproblem: general_problem, resultArr: result_data_t[]): aacalc_output;
export declare function collect_and_print_results(problem: general_problem): void;
interface aacalc_info {
    survives: number[];
    ipcLoss: number[];
}
export interface casualty_2d {
    attacker: string;
    defender: string;
    attacker_retreat: string;
    defender_retreat: string;
    attacker_casualty: string;
    defender_casualty: string;
    prob: number;
}
export interface casualty_1d {
    remain: string;
    retreat: string;
    casualty: string;
    prob: number;
}
export interface ProfitInfo {
    ipc: number;
    prob: number;
}
export type ProfitDistribution = Record<number, ProfitInfo>;
export interface aacalc_output {
    attack: aacalc_info;
    defense: aacalc_info;
    casualtiesInfo: casualty_2d[];
    att_cas: casualty_1d[];
    def_cas: casualty_1d[];
    profitDistribution: ProfitDistribution;
    rounds: number;
    takesTerritory: number[];
}
export declare class result_data_t {
    i: number;
    j: number;
    cost: number;
    p: number;
    cumm: number;
    rcumm: number;
    constructor(i: number, j: number, cost: number, p: number);
}
export {};
//# sourceMappingURL=output.d.ts.map