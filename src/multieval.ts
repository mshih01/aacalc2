// sweep a set of attacker or defender armies -- and solve multiple problems concurrently to take advaantage of sub-problem reuse.

import {
  compute_expected_value,
  compute_prob_wins,
  compute_retreat_state,
  general_problem,
  do_round_eval,
} from './solve.js';
import {
  hasNonAAUnit,
  make_unit_group,
  remove_aahits,
  unit_manager,
} from './unitgroup.js';
import { preparse, preparse_token, count_units } from './preparse.js';
import { apply_ool } from './multiwave.js';
import type { multiwave_input } from './multiwave.js';
import { get_reduced_group_string } from './output.js';
import type { aacalc_output, casualty_1d } from './output.js';

export interface multieval_input extends multiwave_input {
  attackerList: string[];
  defenderList: string[];
}

export interface multieval_output {
  resultList: [string, number, number, number][];
}

// given an array of sub-problems... solve for Pwin for all sub-problems.
export function multiwaveMultiEval(input: multieval_input): multieval_output {
  const umarr: unit_manager[] = [];
  const probArr: general_problem[] = [];
  const output: aacalc_output[] = [];

  let complexity: number = 0;

  if (input.wave_info.length > 1) {
    throw new Error('multiwaveMultiEval: only one wave supported');
  }
  let out: multi_eval_output = { result: [] };

  for (let i = 0; i < input.wave_info.length; i++) {
    umarr.push(
      new unit_manager(input.verbose_level, input.report_complexity_only),
    );
    const um = umarr[i];
    const wave = input.wave_info[i];

    let defend_add_reinforce: casualty_1d[] | undefined;
    defend_add_reinforce = undefined;
    let defenders_internal;

    {
      const defenderList = input.defenderList;
      const def_token = preparse_token(wave.defender);
      defend_add_reinforce = [];
      for (let j = 0; j < defenderList.length; j++) {
        const defender = defenderList[j];
        let p1;
        {
          p1 = 1;
        }
        // retreated subs fight in the second wave.
        const defenderool = apply_ool(defender, wave.def_ool, wave.def_aalast);
        const newcasualty: casualty_1d = {
          remain: defenderool,
          retreat: '',
          casualty: '',
          prob: p1,
        };
        defend_add_reinforce.push(newcasualty);
      }
      defenders_internal = preparse(input.is_naval, wave.defender, 1);
    }
    const attackers_internal = preparse(input.is_naval, wave.attacker, 0);

    if (input.verbose_level > 2) {
      console.log(defend_add_reinforce, 'defend_add_reinforce');
      if (defend_add_reinforce != undefined) {
        let sump = 0;
        for (let ii = 0; ii < defend_add_reinforce.length; ii++) {
          sump += defend_add_reinforce[ii].prob;
        }
        console.log(sump, 'total prob');
      }
    }
    probArr.push(
      new general_problem(
        input.verbose_level,
        um,
        attackers_internal,
        defenders_internal,
        1.0,
        wave.att_dest_last,
        wave.att_submerge,
        wave.def_dest_last,
        wave.def_submerge,
        wave.rounds,
        wave.retreat_threshold,
        wave.is_crash_fighters,
        input.is_naval,
        defend_add_reinforce,
        false,
        input.diceMode,
        input.sortMode,
        input.is_deadzone,
        input.report_complexity_only,
        input.territory_value,
        input.retreat_round_zero,
        input.do_roundless_eval,
        wave.retreat_lose_air_probability,
        wave.retreat_expected_ipc_profit_threshold,
        wave.retreat_pwin_threshold,
        wave.pwinMode,
        wave.retreat_strafe_threshold,
      ),
    );
    complexity += probArr[i].get_complexity();
    if (input.verbose_level > 2) {
      console.log(
        complexity,
        probArr[i].att_data.nodeArr.length,
        probArr[i].def_data.nodeArr.length,
        'complexity',
      );
    }
    const myprob = probArr[i];
    myprob.set_prune_threshold(
      input.prune_threshold,
      input.prune_threshold / 10,
      input.report_prune_threshold,
    );
    //console.log(myprob);
    out = solve_multi_eval(myprob);
  }
  let out2: multieval_output = {
    resultList: out.result,
  };

  return out2;
}

export type multi_eval_output = {
  result: [string, number, number, number][];
};

export function solve_multi_eval(problem: general_problem): multi_eval_output {
  const N = problem.att_data.nodeArr.length;
  const M = problem.def_data.nodeArr.length;

  problem.P_1d = new Array(N * M);
  let i, j;
  for (i = 0; i < N; i++) {
    for (j = 0; j < M; j++) {
      problem.setP(i, j, 0.0);
    }
  }

  problem.is_retreat_state_initialized = false;
  compute_retreat_state(problem);

  if (problem.verbose_level > 2) {
    console.time('compute_prob_pwins');
  }
  compute_prob_wins(problem);
  if (problem.verbose_level > 2) {
    console.timeEnd('compute_prob_pwins');
  }

  problem.is_retreat_state_initialized = true;

  if (problem.def_cas == undefined) {
    throw new Error('def_cas is undefined');
  }
  const mymap: Map<string, number> = new Map();

  // map the defender unit_str to index
  for (let i = 0; i < M; i++) {
    mymap.set(problem.def_data.nodeArr[i].unit_str, i);
  }
  const result: [string, number, number, number][] = [];
  {
    let aa_data;
    let Naa;
    if (problem.att_data.num_aashot > 0) {
      let aashots = '';
      for (let i = 0; i < problem.att_data.num_aashot; i++) {
        aashots = aashots + 'c';
      }
      aa_data = make_unit_group(problem.um, aashots, 2, problem.diceMode);
      Naa = aa_data.tbl_size;
    }
    const numBombard = !problem.is_naval
      ? count_units(problem.att_data.unit_str, 'B') +
        count_units(problem.att_data.unit_str, 'C')
      : 0;
    let doBombard = false;
    if (numBombard > 0) {
      doBombard = true;
    }

    for (let i = 0; i < problem.def_cas.length; i++) {
      const unitstr = problem.def_cas[i].remain;
      const ii = mymap.get(problem.def_cas[i].remain);
      if (ii == undefined) {
        throw new Error('defender unit not found in map');
      } else {
        const numAA = count_units(problem.def_cas[i].remain, 'c');
        let expected_profit = 0;
        let prob_win = 0;
        let doAA =
          !problem.is_naval &&
          numAA > 0 &&
          problem.att_data.num_aashot > 0 &&
          hasNonAAUnit(problem.um, problem.def_cas[i].remain);
        if (doAA && Naa != undefined && aa_data != undefined) {
          const NN = Math.min(numAA * 3 + 1, Naa);

          for (let i = 0; i < NN; i++) {
            const prob = aa_data.get_prob_table(NN - 1, i);
            const n = remove_aahits(problem.att_data, i, 0);

            //expected_profit += problem.getE(n, ii) * prob;
            prob_win += problem.getPwin(n, ii) * prob;
            if (doBombard) {
              problem.setP(n, ii, prob);
            }
          }
        } else {
          //expected_profit += problem.getE(0, ii);
          prob_win += problem.getPwin(0, ii);
          if (doBombard) {
            problem.setP(0, ii, 1.0);
          }
        }

        if (doBombard) {
          do_round_eval(problem, true, numBombard, false, true);
          let pwin = 0;
          let iii = 0;
          for (let i = 0; i < N; i++) {
            for (let j = 0; j < M; j++) {
              pwin += problem.Pwin_1d[iii] * problem.P_1d[iii];
              problem.P_1d[iii] = 0.0;
              iii++;
            }
          }
          prob_win = pwin;
        }
        //const redstr = get_reduced_group_string(unitstr);
        const defNode = problem.def_data.nodeArr[ii];
        result.push([unitstr, expected_profit, prob_win, defNode.cost]);
      }
    }
  }
  return { result: result };
}
