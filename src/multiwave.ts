import {
  solve_general,
  compute_expected_value,
  compute_retreat_state,
  type general_problem,
} from './solve.js';
import { createGeneralProblem } from './problem-factory.js';
import { collect_results, print_general_results, get_general_cost } from './output.js';
import { get_cost_from_str, crash_fighters } from './unitgroup.js';
import { unit_manager } from './unitgroup.js';
import { hasLand, hasNaval } from './unitgroup.js';

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
  experimentalConvolution?: boolean;
  ev_future_wave?: boolean;
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
  use_attackers_from_previous_wave?: boolean;
  ev_deadzone?: boolean;
  ev_territory_value?: number;
}

// Convert internal unit codes to ch2 (display) encoding — matches what output.att_cas/.def_cas
// uses before survivors are fed into the next wave's pipeline.
function toCh2(um: unit_manager, s: string): string {
  let out = '';
  for (let i = 0; i < s.length; i++) {
    out += um.get_stat(s.charAt(i)).ch2;
  }
  return out;
}

// Process a survivor state from wave i into the remain string for wave i+1's defender
function processSurvivorIntoRemain(
  um: unit_manager,
  survivorRemain: string,
  survivorRetreat: string,
  nextWave: wave_input,
  isNaval: boolean,
  isSwap: boolean,
): string {
  const remainCh2 = toCh2(um, survivorRemain);
  const retreatCh2 = toCh2(um, survivorRetreat);
  const survivors = (isSwap && !isNaval ? remove_planes(remainCh2) : remainCh2) + retreatCh2;
  const defToken = preparse_token(nextWave.defender);
  const oolProcessed = apply_ool(survivors + defToken, nextWave.def_ool, nextWave.def_aalast);
  const battleshipProcessed = isNaval ? preparse_battleship(oolProcessed) : oolProcessed;
  if (isNaval) {
    const { remain } = crash_fighters(um, battleshipProcessed);
    return remain;
  }
  return battleshipProcessed;
}

// Build the defender string for wave i from max survivors of wave i-1 + wave i reinforcements
function buildWaveDefenderString(
  input: multiwave_input,
  prevDefenderStr: string | undefined,
  prevAttackerStr: string | undefined,
  wave: wave_input,
  isSwap: boolean,
): string {
  if (prevDefenderStr == undefined) {
    // First wave: defender is purely from initial config
    const defToken = preparse_token(wave.defender);
    const defOol = apply_ool(defToken, wave.def_ool, wave.def_aalast);
    return preparse(input.is_naval, defOol, 1, input.in_progress);
  }
  const rawSurvivors = isSwap ? prevAttackerStr! : prevDefenderStr;
  const um = new unit_manager(input.verbose_level);
  const survivorsCh2 = toCh2(um, rawSurvivors);

  const defToken = preparse_token(wave.defender);
  const combined = survivorsCh2 + defToken;
  const oolProcessed = apply_ool(combined, wave.def_ool, wave.def_aalast);
  const bProcessed = input.is_naval ? preparse_battleship(oolProcessed) : oolProcessed;

  let cas_remain = bProcessed;
  let cas_retreat = '';
  if (input.is_naval) {
    const { remain, retreat } = crash_fighters(um, bProcessed);
    cas_remain = remain;
    cas_retreat = retreat;
  }
  const defender = apply_ool(cas_remain + cas_retreat, wave.def_ool, wave.def_aalast);
  return preparse(input.is_naval, defender, 1);
}

function buildWaveAttackerString(input: multiwave_input, wave: wave_input): string {
  return preparse(input.is_naval, wave.attacker, 0);
}

// Pre-compute future EV maps for all waves (backward pass)
function computeFutureEVMaps(input: multiwave_input): (Map<number, number> | undefined)[] {
  const N = input.wave_info.length;
  const maps: (Map<number, number> | undefined)[] = new Array(N);
  maps[N - 1] = undefined;

  // Build template problems for each wave using max-survivor defender composition.
  // For i>0, seed def_cas with all possible defender/attacker survivor states from
  // the previous wave so the node graph contains exact matches for the mapping.
  const templates: general_problem[] = [];
  let prevDef: string | undefined;
  let prevAtt: string | undefined;
  for (let i = 0; i < N; i++) {
    const wave = input.wave_info[i];
    const isSwap = wave.use_attackers_from_previous_wave ?? false;
    const defStr = buildWaveDefenderString(input, prevDef, prevAtt, wave, isSwap);
    const attStr = buildWaveAttackerString(input, wave);
    const um = new unit_manager(input.verbose_level);

    let defCas: casualty_1d[] | undefined;
    if (i > 0 && templates[i - 1] != undefined) {
      const prevProb = templates[i - 1];
      const prevIsSwap = wave.use_attackers_from_previous_wave ?? false;
      const prevNodeArr = prevIsSwap ? prevProb.att_data.nodeArr : prevProb.def_data.nodeArr;
      defCas = [];
      for (let j = 0; j < prevNodeArr.length; j++) {
        const remain = processSurvivorIntoRemain(
          um,
          prevNodeArr[j].unit_str,
          prevNodeArr[j].retreat,
          wave,
          input.is_naval,
          prevIsSwap,
        );
        defCas.push({ remain, retreat: '', casualty: '', prob: 0.001 });
      }
    }

    templates.push(createGeneralProblem(input, wave, um, attStr, defStr, defCas));
    prevDef = defStr;
    prevAtt = attStr;
  }

  // Backward pass: wave i's future EV = E(0, matchedState) on wave i+1's problem
  for (let i = N - 2; i >= 0; i--) {
    const nextWave = input.wave_info[i + 1];
    const prevProb = templates[i];
    const um = new unit_manager(input.verbose_level);

    // Use the template for wave i+1 as the reference problem
    const refProb = templates[i + 1];

    // Set futureEVMap on ref (already computed from previous iteration)
    if (i + 1 < N - 1 && maps[i + 1] == undefined) {
      throw new Error(`Future EV map for wave ${i + 1} is undefined`);
    }
    if (i + 1 < N - 1 && maps[i + 1] != undefined) {
      const nextNextSwap = input.wave_info[i + 2]?.use_attackers_from_previous_wave ?? false;
      if (nextNextSwap) {
        refProb.futureAttackerEVMap = maps[i + 1];
      } else {
        refProb.futureEVMap = maps[i + 1];
      }
    }

    // Ensure the EV threshold is set
    if (nextWave.retreat_expected_ipc_profit_threshold != undefined) {
      refProb.retreat_expected_ipc_profit_threshold =
        nextWave.retreat_expected_ipc_profit_threshold;
    } else {
      refProb.retreat_expected_ipc_profit_threshold = -1e9;
    }

    compute_retreat_state(refProb);
    compute_expected_value(refProb);
    // need to handle AA guns and bombardment in the future EV computation, so we need to set the correct flags

    // Build mapping from prev wave's states to EV
    const isSwap = nextWave.use_attackers_from_previous_wave ?? false;
    const nodeArr = isSwap ? prevProb.att_data.nodeArr : prevProb.def_data.nodeArr;

    const refDefMap = new Map<string, number>();
    for (let k = 0; k < refProb.def_data.nodeArr.length; k++) {
      refDefMap.set(refProb.def_data.nodeArr[k].unit_str, k);
    }

    const futureMap = new Map<number, number>();
    for (let j = 0; j < nodeArr.length; j++) {
      if (nodeArr[j].N == 0) {
        // Eliminated state — no survivors to carry over, future EV is 0
        futureMap.set(j, 0);
        continue;
      }
      const remain = processSurvivorIntoRemain(
        um,
        nodeArr[j].unit_str,
        nodeArr[j].retreat,
        nextWave,
        input.is_naval,
        isSwap,
      );
      const ii = refDefMap.get(remain);
      if (ii == undefined) {
        throw new Error(`Survivor state ${remain} not found in next wave's defender map`);
      }
      futureMap.set(j, ii != undefined ? (isSwap ? -1 : +1) * refProb.getE(0, ii) : 0);
    }
    maps[i] = futureMap;
  }

  return maps;
}

export function multiwave(input: multiwave_input): multiwave_output {
  // Pre-compute future EV maps for multiwave retreat
  const futureEVMaps =
    input.ev_future_wave && input.wave_info.length > 1 ? computeFutureEVMaps(input) : undefined;

  let umarr: unit_manager[] = [];
  let probArr: general_problem[] = [];
  let output: aacalc_output[] = [];
  let initIpcCost: number[] = [];

  let complexity: number = 0;

  for (let runs = 0; runs < input.num_runs; runs++) {
    umarr = [];
    probArr = [];
    output = [];
    initIpcCost = [];

    for (let i = 0; i < input.wave_info.length; i++) {
      const um = new unit_manager(input.verbose_level);
      umarr.push(um);
      const wave = input.wave_info[i];

      let defend_add_reinforce: casualty_1d[] | undefined;
      defend_add_reinforce = undefined;
      let defenders_internal;
      if (i > 0) {
        const defend_dist = wave.use_attackers_from_previous_wave
          ? output[i - 1].att_cas
          : output[i - 1].def_cas;
        const def_token = preparse_token(wave.defender);
        defend_add_reinforce = [];
        for (let j = 0; j < defend_dist.length; j++) {
          const cas = defend_dist[j];
          let p1;
          if (cas.remain.length == 0) {
            if (wave.use_attackers_from_previous_wave) {
              //if attacker doesn't take -- then no reinforce
              continue;
            } else {
              //if attacker takes -- then no reinforce
              if (output[i - 1] != undefined) {
                p1 = cas.prob - output[i - 1].takesTerritory[0];
              } else {
                p1 = cas.prob;
              }
            }
            //p2 = output[i-1].takesTerritory[0];
          } else {
            p1 = cas.prob;
            if (wave.use_attackers_from_previous_wave) {
              if (input.is_naval) {
                if (!hasNaval(um, cas.remain)) {
                  continue;
                }
              } else {
                if (!hasLand(um, cas.remain)) {
                  continue;
                }
              }
            }
            //p2 = 0;
          }
          // retreated subs fight in the second wave.
          const isAttacker = wave.use_attackers_from_previous_wave;
          const newcasstr_ool = apply_ool(
            (isAttacker && !input.is_naval ? remove_planes(cas.remain) : cas.remain) +
              cas.retreat +
              def_token,
            wave.def_ool,
            wave.def_aalast,
          );
          const newcasstr = input.is_naval ? preparse_battleship(newcasstr_ool) : newcasstr_ool;

          let cas_remain = newcasstr;
          let cas_retreat = '';
          if (input.is_naval) {
            const { remain, retreat } = crash_fighters(um, newcasstr);
            cas_remain = remain;
            cas_retreat = retreat;
          }

          const newcas = isAttacker && !input.is_naval ? remove_planes(cas.casualty) : cas.casualty;

          const newcasualty: casualty_1d = {
            remain: cas_remain,
            retreat: cas_retreat,
            casualty: newcas,
            prob: p1,
          };
          defend_add_reinforce.push(newcasualty);
        }
        const defender =
          defend_add_reinforce.length == 0
            ? ''
            : apply_ool(
                defend_add_reinforce[defend_add_reinforce.length - 1].remain +
                  defend_add_reinforce[defend_add_reinforce.length - 1].retreat +
                  defend_add_reinforce[defend_add_reinforce.length - 1].casualty,
                wave.def_ool,
                wave.def_aalast,
              );
        defenders_internal = preparse(input.is_naval, defender, 1);
      } else {
        const defenders_token = preparse_token(wave.defender);
        const defenders_ool = apply_ool(defenders_token, wave.def_ool, wave.def_aalast);
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
      const prob = createGeneralProblem(
        input,
        wave,
        um,
        attackers_internal,
        defenders_internal,
        defend_add_reinforce,
      );
      if (
        futureEVMaps != undefined &&
        i < input.wave_info.length - 1 &&
        futureEVMaps[i] != undefined
      ) {
        const nextIsSwap = input.wave_info[i + 1]?.use_attackers_from_previous_wave ?? false;
        if (nextIsSwap) {
          prob.futureAttackerEVMap = futureEVMaps[i];
        } else {
          prob.futureEVMap = futureEVMaps[i];
        }
      }
      probArr.push(prob);
      const init_ipc_cost = defend_add_reinforce
        ? defend_add_reinforce.reduce((acc, cas) => {
            const ipcCost = get_cost_from_str(prob.um, cas.casualty, cas.retreat);
            acc += cas.prob * ipcCost;
            return acc;
          }, 0)
        : 0;
      complexity += prob.get_complexity();
      if (input.verbose_level > 2) {
        console.log(
          complexity,
          prob.att_data.nodeArr.length,
          prob.def_data.nodeArr.length,
          'complexity',
        );
      }
      const myprob = prob;
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
      if (input.experimentalConvolution && i > 0 && defend_add_reinforce) {
        const initMap = new Map<number, number>();
        for (const cas of defend_add_reinforce) {
          const cost = get_cost_from_str(prob.um, cas.casualty);
          initMap.set(cost, (initMap.get(cost) ?? 0) + cas.prob);
        }
        const finalMap = new Map<number, number>();
        for (const info of Object.values(out.profitDistribution)) {
          finalMap.set(info.ipc, (finalMap.get(info.ipc) ?? 0) + info.prob);
        }
        const deltaMap = new Map<number, number>();
        for (const [fIPC, pF] of finalMap) {
          for (const [iIPC, pI] of initMap) {
            const d = fIPC - iIPC;
            deltaMap.set(d, (deltaMap.get(d) ?? 0) + pF * pI);
          }
        }
        out.profitDistribution = {};
        for (const [ipc, prob] of deltaMap) {
          out.profitDistribution[ipc] = { ipc, prob };
        }
      }
      output.push(out);
      initIpcCost.push(init_ipc_cost ?? 0);
      if (input.verbose_level > 2) {
        console.log(out, 'wave', i);
      }
    }
  }

  const attsurvive: number[] = [];
  const defsurvive: number[] = [];
  const attipc: number[] = [];
  const defipc: number[] = [];
  const incrattipc: number[] = [];
  const incrdefipc: number[] = [];
  const atttakes: number[] = [];
  for (let i = 0; i < input.wave_info.length; i++) {
    let att_survives = output[i].attack.survives[0];
    const def_survives = output[i].defense.survives[0];
    let att_ipcLoss = output[i].attack.ipcLoss[0];
    let def_ipcLoss = output[i].defense.ipcLoss[0];
    incrattipc.push(att_ipcLoss);
    incrdefipc.push(def_ipcLoss - initIpcCost[i]);
    let att_takes = output[i].takesTerritory[0];
    const isAttacker = input.wave_info[i].use_attackers_from_previous_wave;
    if (i > 0) {
      for (let j = 0; j < i; j++) {
        if (!isAttacker) {
          def_ipcLoss +=
            output[j].takesTerritory[0] *
            get_cost_from_str(probArr[j].um, probArr[j].def_data.unit_str, '');
        }
      }
      //def_ipcLoss -= defipc[i-1];
      if (!isAttacker) {
        att_ipcLoss += attipc[i - 1];
        att_survives += atttakes[i - 1];
        att_takes += atttakes[i - 1];
      } else {
        att_ipcLoss += defipc[i - 1];
        att_takes += 1 - atttakes[i - 1];
        att_survives += 1 - atttakes[i - 1];
      }
    }
    attsurvive.push(att_survives);
    defsurvive.push(def_survives);
    attipc.push(att_ipcLoss);
    defipc.push(def_ipcLoss);
    atttakes.push(att_takes);
  }
  //let att_cas : casualty_1d[];
  const out2: aacalc_output = {
    attack: {
      survives: attsurvive,
      ipcLoss: attipc,
      incrementalLoss: incrattipc,
    },
    defense: {
      survives: defsurvive,
      ipcLoss: defipc,
      incrementalLoss: incrdefipc,
    },
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
export function apply_ool(input: string, ool: string, aalast: boolean = false): string {
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
export function get_defender_distribution(problem: general_problem): casualty_1d[] {
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

function remove_planes(s: string): string {
  let out = '';
  for (let i = 0; i < s.length; i++) {
    const ch = s.charAt(i);
    if (ch == 'f' || ch == 'b') {
      continue;
    }
    out += ch;
  }
  return out;
}
