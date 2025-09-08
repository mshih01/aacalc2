import { general_problem, solve_general } from './solve.js';
import {
  collect_results,
  print_general_results,
  get_general_cost,
} from './output.js';
import { get_cost_from_str } from './unitgroup.js';
import { unit_manager } from './unitgroup.js';

import { preparse_token, preparse_battleship, preparse } from './preparse.js';

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

export function multiwave(input: multiwave_input): multiwave_output {
  const umarr: unit_manager[] = [];
  const probArr: general_problem[] = [];
  //let um = new unit_manager();
  //let um2 = new unit_manager();
  //let um3 = new unit_manager();
  const output: aacalc_output[] = [];

  let complexity: number = 0;

  for (let runs = 0; runs < input.num_runs; runs++) {
    for (let i = 0; i < input.wave_info.length; i++) {
      umarr.push(
        new unit_manager(input.verbose_level, input.report_complexity_only),
      );
      const um = umarr[i];
      const wave = input.wave_info[i];

      let defend_add_reinforce: casualty_1d[] | undefined;
      defend_add_reinforce = undefined;
      let defenders_internal;
      if (i > 0) {
        const defend_dist = input.report_complexity_only
          ? get_defender_distribution(probArr[i - 1])
          : output[i - 1].def_cas;
        const def_token = preparse_token(wave.defender);
        defend_add_reinforce = [];
        for (let j = 0; j < defend_dist.length; j++) {
          const cas = defend_dist[j];
          let p1;
          //let p2;
          if (cas.remain.length == 0) {
            //if attacker takes -- then no reinforce
            if (output[i - 1] != undefined) {
              p1 = cas.prob - output[i - 1].takesTerritory[0];
            } else {
              p1 = cas.prob;
            }
            //p2 = output[i-1].takesTerritory[0];
          } else {
            p1 = cas.prob;
            //p2 = 0;
          }
          // retreated subs fight in the second wave.
          const newcasstr_ool = apply_ool(
            cas.remain + cas.retreat + def_token,
            wave.def_ool,
            wave.def_aalast,
          );
          const newcasstr = input.is_naval
            ? preparse_battleship(newcasstr_ool)
            : newcasstr_ool;

          const newcasualty: casualty_1d = {
            remain: newcasstr,
            retreat: '',
            casualty: cas.casualty,
            prob: p1,
          };
          defend_add_reinforce.push(newcasualty);
          /*
                if (p2 > 0) {
                    const newcasstr = apply_ool(cas.remain, wave.def_ool, wave.def_aalast);
                    const newcasualty : casualty_1d = { remain : newcasstr, retreat : "", casualty : cas.casualty, prob : p2}
                    //defend_add_reinforce.push(newcasualty);
                }
*/
        }
        const defender =
          defend_add_reinforce.length == 0
            ? ''
            : apply_ool(
                defend_add_reinforce[defend_add_reinforce.length - 1].remain +
                  defend_add_reinforce[defend_add_reinforce.length - 1]
                    .casualty,
                wave.def_ool,
                wave.def_aalast,
              );
        defenders_internal = preparse(input.is_naval, defender, 1);
      } else {
        const defenders_token = preparse_token(wave.defender);
        const defenders_ool = apply_ool(
          defenders_token,
          wave.def_ool,
          wave.def_aalast,
        );
        const skipAA = input.in_progress;
        defenders_internal = preparse(input.is_naval, defenders_ool, 1, skipAA);
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
      if (input.report_complexity_only) {
        continue;
      }
      const myprob = probArr[i];
      myprob.set_prune_threshold(
        input.prune_threshold,
        input.prune_threshold / 10,
        input.report_prune_threshold,
      );
      //console.log(myprob);
      solve_general(myprob);

      const result_data = collect_results(myprob);
      let skipMerge = myprob.is_retreat;
      skipMerge = true;
      if (input.verbose_level > 2) {
        console.log(skipMerge, 'skipMerge');
      }
      const out = print_general_results(myprob, result_data);
      output.push(out);
      if (input.verbose_level > 2) {
        console.log(out, 'wave', i);
      }
    }
  }

  if (input.report_complexity_only) {
    const out2: aacalc_output = {
      attack: { survives: [0], ipcLoss: [0] },
      defense: { survives: [0], ipcLoss: [0] },
      casualtiesInfo: [],
      att_cas: [],
      def_cas: [],
      profitDistribution: {},
      rounds: -1,
      takesTerritory: [0],
    };
    const out: multiwave_output = {
      out: out2,
      output: [out2],
      complexity: complexity,
    };
    return out;
  }
  const attsurvive: number[] = [];
  const defsurvive: number[] = [];
  const attipc: number[] = [];
  const defipc: number[] = [];
  const atttakes: number[] = [];
  for (let i = 0; i < input.wave_info.length; i++) {
    let att_survives = output[i].attack.survives[0];
    const def_survives = output[i].defense.survives[0];
    let att_ipcLoss = output[i].attack.ipcLoss[0];
    let def_ipcLoss = output[i].defense.ipcLoss[0];
    let att_takes = output[i].takesTerritory[0];
    if (i > 0) {
      for (let j = 0; j < i; j++) {
        def_ipcLoss +=
          output[j].takesTerritory[0] *
          get_cost_from_str(probArr[j].um, probArr[j].def_data.unit_str, '');
      }
      //def_ipcLoss -= defipc[i-1];
      att_ipcLoss += attipc[i - 1];
      att_survives += atttakes[i - 1];
      att_takes += atttakes[i - 1];
    }
    attsurvive.push(att_survives);
    defsurvive.push(def_survives);
    attipc.push(att_ipcLoss);
    defipc.push(def_ipcLoss);
    atttakes.push(att_takes);
  }
  //let att_cas : casualty_1d[];
  const out2: aacalc_output = {
    attack: { survives: attsurvive, ipcLoss: attipc },
    defense: { survives: defsurvive, ipcLoss: defipc },
    casualtiesInfo: [],
    att_cas: [],
    def_cas: [],
    profitDistribution: {},
    rounds: -1,
    takesTerritory: atttakes,
  };

  const out: multiwave_output = {
    out: out2,
    output: output,
    complexity: complexity,
  };
  return out;
}

//
export function apply_ool(
  input: string,
  ool: string,
  aalast: boolean = false,
): string {
  if (ool == '') {
    return input;
  }

  const map: Map<string, number> = new Map();

  for (const char of input) {
    const v = map.get(char);
    if (v != undefined) {
      map.set(char, v + 1);
    } else {
      map.set(char, 1);
    }
  }
  let out = '';
  for (const ch of ool) {
    const cnt = map.get(ch);
    if (cnt == undefined) {
      continue;
    }
    for (let i = 0; i < cnt; i++) {
      out += ch;
    }
  }
  if (aalast) {
    // separate the aa's.
    let aas = '';
    let others = '';
    for (let i = 0; i < out.length; i++) {
      const ch = out.charAt(i);
      if (ch == 'c' || ch == 'e') {
        aas += ch;
      } else {
        others += ch;
      }
    }
    if (others.length > 0) {
      out = others.charAt(0) + aas + others.substr(1);
    } else {
      out = aas;
    }
  }
  return out;
}
export function get_defender_distribution(
  problem: general_problem,
): casualty_1d[] {
  const N = problem.def_data.nodeArr.length;
  let result: casualty_1d[] = [];
  for (let i = 0; i < N; i++) {
    const node = problem.def_data.nodeArr[i];
    const mycost = get_general_cost(problem, problem.def_data, node.index);
    const cas: casualty_1d = {
      remain: node.unit_str,
      retreat: node.retreat,
      casualty: mycost.casualty,
      prob: 0.01,
    };
    result.push(cas);
  }
  return result;
}
