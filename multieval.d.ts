import { general_problem } from './solve.js';
import type { multiwave_input } from './multiwave.js';
export interface multieval_input extends multiwave_input {
    attackerList: string[];
    defenderList: string[];
}
export interface multieval_output {
    resultList: [string, number, number, number][];
}
export declare function multiwaveMultiEval(input: multieval_input): multieval_output;
export type multi_eval_output = {
    result: [string, number, number, number][];
};
export declare function solve_multi_eval(problem: general_problem): multi_eval_output;
//# sourceMappingURL=multieval.d.ts.map