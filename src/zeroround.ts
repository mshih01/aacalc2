import { general_problem, is_retreat_state } from './solve.js';
import { make_unit_group } from './unitgroup.js';
import { hasNonAAUnit } from './unitgroup.js';
import { remove_aahits } from './unitgroup.js';

// need to consider the impact of AA's
export function is_round_zero_retreat_state(
  problem: general_problem,
  N: number,
  M: number,
): boolean {
  if (problem.retreat_round_zero == false) {
    return false;
  }
  if (is_retreat_state(problem, N, M)) {
    return true;
  }

  if (problem.retreat_expected_ipc_profit_threshold != undefined) {
    const attnode = problem.att_data.nodeArr[N];
    const defnode = problem.def_data.nodeArr[M];
    const doAA =
      !problem.is_naval &&
      defnode.num_aa > 0 &&
      attnode.num_air > 0 &&
      hasNonAAUnit(problem.um, defnode.unit_str);
    let num_aashots = defnode.num_aa * 3;
    if (num_aashots > attnode.num_air) {
      num_aashots = attnode.num_air;
    }
    if (doAA) {
      let aashots = '';
      for (let i = 0; i < num_aashots; i++) {
        aashots = aashots + 'c';
      }
      const aa_data = make_unit_group(problem.um, aashots, 2, problem.diceMode);

      const NN = aa_data.tbl_size;
      let accumulate = 0.0;
      for (let i = 0; i < NN; i++) {
        const prob = aa_data.get_prob_table(NN - 1, i);
        const n = remove_aahits(problem.att_data, i, N);
        const attnode2 = problem.att_data.nodeArr[n];
        const attloss = attnode.cost - attnode2.cost;
        const defloss = 0;
        const deltacost = defloss - attloss;
        accumulate += prob * (deltacost + problem.getE(n, M));
      }
      if (accumulate < problem.retreat_expected_ipc_profit_threshold) {
        return true;
      }
    }
  }

  return false;
}
