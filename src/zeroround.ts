import { general_problem, is_retreat_state } from './solve.js';
import { buildAAGroup, forEachAAOutcome, hasNonAAUnit } from './unitgroup.js';

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
      const aaData = buildAAGroup(problem.um, num_aashots, problem.diceMode);
      let accumulate = 0.0;
      forEachAAOutcome(aaData, problem.att_data, aaData.tbl_size, N, (prob, n) => {
        const attnode2 = problem.att_data.nodeArr[n];
        const attloss = attnode.cost - attnode2.cost;
        accumulate += prob * (-attloss + problem.getE(n, M));
      });
      if (accumulate < problem.retreat_expected_ipc_profit_threshold) {
        return true;
      }
    }
  }

  return false;
}
