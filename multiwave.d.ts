import { general_problem } from './solve.js';
import type { DiceMode, PwinMode, SortMode } from './solve.js';
import type { aacalc_output, casualty_1d } from './output.js';
export interface multiwave_input {
    wave_info: wave_input[];
    debug: boolean;
    diceMode: DiceMode;
    sortMode: SortMode;
    prune_threshold: number;
    report_prune_threshold: number;
    is_naval: boolean;
    in_progress: boolean;
    is_deadzone: boolean;
    do_roundless_eval: boolean;
    territory_value: number;
    retreat_round_zero: boolean;
    num_runs: number;
    verbose_level: number;
    report_complexity_only: boolean;
}
export interface multiwave_output {
    out: aacalc_output;
    output: aacalc_output[];
    complexity: number;
}
export interface wave_input {
    attacker: string;
    defender: string;
    def_ool: string;
    def_aalast: boolean;
    att_submerge: boolean;
    def_submerge: boolean;
    att_dest_last: boolean;
    def_dest_last: boolean;
    is_crash_fighters: boolean;
    retreat_threshold: number;
    retreat_expected_ipc_profit_threshold?: number;
    retreat_pwin_threshold?: number;
    pwinMode?: PwinMode;
    retreat_strafe_threshold?: number;
    retreat_lose_air_probability: number;
    rounds: number;
}
export declare function multiwave(input: multiwave_input): multiwave_output;
export declare function apply_ool(input: string, ool: string, aalast?: boolean): string;
export declare function get_defender_distribution(problem: general_problem): casualty_1d[];
//# sourceMappingURL=multiwave.d.ts.map