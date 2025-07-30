export const epsilon: number = 1e-9;

export type DiceMode = 'standard' | 'lowluck' | 'biased';

export type SortMode = 'unit_count' | 'ipc_cost';

export type PwinMode = 'takes' | 'destroys';

import { solve_one_general_state } from './solveone.js';
import { solve_one_general_state_copy1 } from './solveone1.js';
import { solve_one_general_state_copy2 } from './solveone2.js';
import { solve_one_general_state_copy3 } from './solveone3.js';
import { is_round_zero_retreat_state } from './zeroround.js';
import { count_units } from './preparse.js';
import {
  general_unit_group,
  hasAmphibious,
  hasDestroyer,
  hasNonAAUnit,
  make_unit_group,
  remove_aahits,
  unit_manager,
} from './unitgroup.js';
import { type casualty_1d, collect_and_print_results } from './output.js';

// General problem -- supports random order of loss cases
export class general_problem {
  um: unit_manager;
  is_naval: boolean;
  prob: number = 0;
  att_data: general_unit_group;
  def_data: general_unit_group;
  is_nonaval: boolean;
  is_retreat: boolean; // rounds > 0 || retreat_threshold
  is_amphibious: boolean; // attacker has amphibious units... and is_retreat
  is_crash_fighters: boolean;
  rounds: number = -1;
  average_rounds: number = -1;
  diceMode: DiceMode = 'standard';
  sortMode: SortMode = 'unit_count';
  is_deadzone: boolean = false; // deadzone attack
  skip_compute: boolean = false; // skip compute, used for complexity calculations.
  territory_value: number = 0; // value of the territory being attacked, used for expected profit calculations.
  retreat_round_zero: boolean = true; // allow retreat round 0.   default is true
  do_roundless_eval: boolean = false; // do roundless evaluation
  N: number;
  M: number;
  debug_level: number = 0;
  verbose_level: number = 0;

  // average rounds related variabless
  ERound_1d: number[] = []; // rounds of state i, j
  init_rounds: number = 0; // on init state -- incoming rounds.  ERound_1d[i, j] / p_init;

  P_1d: number[] = []; // probability of state i, j

  // retreat state
  is_retreat_state_initialized: boolean = false; // is retreat state initialized
  R_1d: boolean[] = []; // is i, j retreat state

  // EV related variables
  E_1d: number[] = []; // expected value of state i, j
  accumulate: number = 0; // accumulated expected value
  base_attcost: number = 0;
  base_defcost: number = 0;

  // Pwin related variables
  pwin_acc: number = 0; // accumulated expected value
  Pwin_1d: number[] = []; // Pwin of state i, j

  nonavalproblem: general_problem | undefined = undefined;
  def_cas: casualty_1d[] | undefined = undefined;
  prune_threshold: number = -1;
  early_prune_threshold: number = -1;
  report_prune_threshold: number = -1;
  retreat_threshold: number = 0;
  retreat_expected_ipc_profit_threshold?: number;
  retreat_pwin_threshold?: number; // if defined, retreat if Pwin < retreat_pwin_threshold
  pwinMode?: PwinMode; // 'takes' or 'destroys'
  retreat_strafe_threshold?: number;
  retreat_lose_air_probability: number;
  attmap: Map<string, number>;
  defmap: Map<string, number>;
  attmap2: Map<string, number>;
  defmap2: Map<string, number>;
  getIndex(i: number, j: number): number {
    return i * this.M + j;
  }
  getiP(ii: number): number {
    return this.P_1d[ii];
  }
  getP(i: number, j: number): number {
    const ii = this.getIndex(i, j);
    return this.P_1d[ii];
  }
  setiP(ii: number, val: number) {
    this.P_1d[ii] = val;
  }
  setP(i: number, j: number, val: number) {
    const ii = this.getIndex(i, j);
    this.P_1d[ii] = val;
  }
  getiE(ii: number): number {
    return this.E_1d[ii];
  }
  setiE(ii: number, val: number) {
    this.E_1d[ii] = val;
  }
  getE(i: number, j: number): number {
    const ii = this.getIndex(i, j);
    return this.E_1d[ii];
  }
  setE(i: number, j: number, val: number) {
    const ii = this.getIndex(i, j);
    this.E_1d[ii] = val;
  }
  setPwin(i: number, j: number, val: number) {
    const ii = this.getIndex(i, j);
    this.Pwin_1d[ii] = val;
  }
  getiPwin(ii: number): number {
    return this.Pwin_1d[ii];
  }
  getPwin(i: number, j: number): number {
    const ii = this.getIndex(i, j);
    return this.Pwin_1d[ii];
  }
  setiPwin(ii: number, val: number) {
    this.Pwin_1d[ii] = val;
  }
  getiERound(ii: number): number {
    return this.ERound_1d[ii];
  }
  setiERound(ii: number, val: number) {
    this.ERound_1d[ii] = val;
  }
  getERound(i: number, j: number): number {
    const ii = this.getIndex(i, j);
    return this.ERound_1d[ii];
  }
  setERound(i: number, j: number, val: number) {
    const ii = this.getIndex(i, j);
    this.ERound_1d[ii] = val;
  }
  getRetreat(i: number, j: number): boolean {
    const ii = this.getIndex(i, j);
    return this.R_1d[ii];
  }
  getiRetreat(ii: number): boolean {
    return this.R_1d[ii];
  }
  setRetreat(i: number, j: number, val: boolean) {
    const ii = this.getIndex(i, j);
    this.R_1d[ii] = val;
  }
  setiRetreat(ii: number, val: boolean) {
    this.R_1d[ii] = val;
  }
  set_prune_threshold(pt: number, ept: number, rpt: number) {
    this.prune_threshold = pt;
    this.early_prune_threshold = ept;
    this.report_prune_threshold = rpt;
  }
  isEarlyRetreat() {
    return this.att_data.submerge_sub || this.def_data.submerge_sub;
  }
  hasRetreatCondition() {
    return (
      this.retreat_threshold > 0 ||
      this.retreat_expected_ipc_profit_threshold !== undefined ||
      this.retreat_pwin_threshold !== undefined ||
      this.retreat_strafe_threshold !== undefined ||
      this.retreat_lose_air_probability < 1.0
    );
  }
  hasNonCombat() {
    return (
      count_units(this.def_data.unit_str, 'T') > 0 ||
      count_units(this.def_data.unit_str, 'c') > 0 ||
      count_units(this.def_data.unit_str, 'e') > 0
    );
  }
  get_complexity(): number {
    return this.att_data.nodeArr.length * this.def_data.nodeArr.length;
  }
  constructor(
    verbose_level: number,
    um: unit_manager,
    att_str: string,
    def_str: string,
    prob: number,
    att_dest_last: boolean,
    att_submerge: boolean,
    def_dest_last: boolean,
    def_submerge: boolean,
    rounds: number,
    retreat_threshold: number,
    is_crash_fighters: boolean,
    is_naval: boolean = true,
    def_cas: casualty_1d[] | undefined = undefined,
    is_nonaval: boolean = false,
    diceMode: DiceMode = 'standard',
    sortMode: SortMode = 'unit_count',
    is_deadzone: boolean = false,
    skip_compute: boolean = false,
    territory_value: number = 0,
    retreat_round_zero: boolean = true,
    do_roundless_eval: boolean = false,
    retreat_lose_air_probability: number,
    retreat_expected_ipc_profit_threshold?: number,
    retreat_pwin_threshold?: number,
    pwinMode?: PwinMode,
    retreat_strafe_threshold?: number,
  ) {
    this.um = um;
    this.verbose_level = verbose_level;

    const numAA = count_units(def_str, 'c');

    const max_att_hits = att_str.length;
    let max_def_hits = def_str.length;
    if (!is_naval) {
      const numBombard = count_units(att_str, 'B') + count_units(att_str, 'C');
      max_def_hits += numBombard;
    }
    this.retreat_expected_ipc_profit_threshold =
      retreat_expected_ipc_profit_threshold;
    this.retreat_pwin_threshold = retreat_pwin_threshold;
    this.pwinMode = pwinMode;
    this.retreat_strafe_threshold = retreat_strafe_threshold;
    this.retreat_lose_air_probability = retreat_lose_air_probability;
    this.diceMode = diceMode;
    this.sortMode = sortMode;
    this.skip_compute = skip_compute;
    this.is_deadzone = is_deadzone;
    this.territory_value = territory_value;
    this.retreat_round_zero = retreat_round_zero;
    this.do_roundless_eval = do_roundless_eval;
    this.is_retreat = (rounds > 0 && rounds < 100) || retreat_threshold > 0;
    this.retreat_threshold = retreat_threshold;
    this.is_crash_fighters = is_crash_fighters;
    this.rounds = rounds;
    this.is_amphibious = this.is_retreat && hasAmphibious(um, att_str);
    this.att_data = new general_unit_group(
      um,
      att_str,
      0,
      att_dest_last,
      att_submerge,
      max_def_hits + 2,
      numAA,
      undefined,
      is_nonaval,
      this.is_amphibious,
      false,
      diceMode,
      is_naval,
    );
    //console.log(this.att_data, `att`);
    this.def_data = new general_unit_group(
      um,
      def_str,
      1,
      def_dest_last,
      def_submerge,
      max_att_hits + 2,
      0,
      def_cas,
      is_nonaval,
      false,
      this.is_crash_fighters,
      diceMode,
      is_naval,
    );
    this.N = this.att_data.nodeArr.length;
    this.M = this.def_data.nodeArr.length;

    //console.log(this.def_data, `def`);
    this.prob = prob;
    this.def_cas = def_cas;
    this.is_naval = is_naval;
    this.is_nonaval = is_nonaval;
    this.attmap = new Map();
    this.defmap = new Map();
    this.attmap2 = new Map();
    this.defmap2 = new Map();
    if (is_naval && !is_nonaval) {
      if (
        !att_submerge &&
        !def_submerge &&
        this.att_data.num_subs > 0 &&
        this.att_data.num_air > 0 &&
        this.def_data.num_subs > 0 &&
        this.def_data.num_air > 0
      ) {
        const att =
          this.att_data.sub_group.unit_str + this.att_data.air_group.unit_str;
        const def =
          this.def_data.sub_group.unit_str + this.def_data.air_group.unit_str;
        this.nonavalproblem = new general_problem(
          this.verbose_level,
          um,
          att,
          def,
          0.0,
          false,
          false,
          false,
          false,
          -1,
          0,
          false,
          true,
          undefined,
          true,
          this.diceMode,
          this.sortMode,
          this.is_deadzone,
          this.skip_compute,
          this.territory_value,
          this.retreat_round_zero,
          this.do_roundless_eval,
          this.retreat_lose_air_probability,
          this.retreat_expected_ipc_profit_threshold,
          this.retreat_pwin_threshold,
          this.pwinMode,
          this.retreat_strafe_threshold,
        );
        if (this.nonavalproblem != undefined) {
          for (let i = 0; i < this.att_data.nodeArr.length; i++) {
            const node = this.att_data.nodeArr[i];
            if (node.num_naval == 0) {
              const key: string = node.num_subs + ',' + node.num_air;
              this.attmap.set(key, i);
            }
          }
          for (let i = 0; i < this.def_data.nodeArr.length; i++) {
            const node = this.def_data.nodeArr[i];
            if (node.num_naval == 0) {
              const key: string = node.num_subs + ',' + node.num_air;
              this.defmap.set(key, i);
            }
          }
          for (
            let i = 0;
            i < this.nonavalproblem.att_data.nodeArr.length;
            i++
          ) {
            const node = this.nonavalproblem.att_data.nodeArr[i];
            const key: string = node.num_subs + ',' + node.num_air;
            this.attmap2.set(key, i);
          }
          for (
            let i = 0;
            i < this.nonavalproblem.def_data.nodeArr.length;
            i++
          ) {
            const node = this.nonavalproblem.def_data.nodeArr[i];
            const key: string = node.num_subs + ',' + node.num_air;
            this.defmap2.set(key, i);
          }
        }
      }
    }
    //console.log(this, `make_problem`);
  }
  setNoNavalP(N1: number, M1: number, N2: number, M2: number, p: number) {
    if (this.nonavalproblem != undefined) {
      const key1: string = N1 + ',' + N2;
      const key2: string = M1 + ',' + M2;
      const i = this.attmap2.get(key1);
      const j = this.defmap2.get(key2);
      if (i != undefined && j != undefined) {
        const ii = this.nonavalproblem.getIndex(i, j);
        this.nonavalproblem.setiP(ii, this.nonavalproblem.getiP(ii) + p);
      } else {
        throw new Error();
      }
    } else {
      console.log('nonavalproblem');
      throw new Error();
    }
  }
}

function is_terminal_state(
  problem: general_problem,
  N: number,
  M: number,
  debug: boolean,
  disable_retreat: boolean = false,
): boolean {
  const out = is_terminal_state_helper(problem, N, M, disable_retreat);
  if (debug) {
    if (!out) {
      const attnode = problem.att_data.nodeArr[N];
      const defnode = problem.def_data.nodeArr[M];
      console.log(
        attnode.unit_str,
        ':',
        attnode.retreat,
        defnode.unit_str,
        'here',
      );
    }
  }
  return out;
}

function has_retreat_condition(problem: general_problem): boolean {
  if (problem.retreat_threshold > 0) {
    return true;
  }
  if (problem.retreat_expected_ipc_profit_threshold != undefined) {
    return true;
  }
  if (problem.retreat_pwin_threshold != undefined) {
    return true;
  }
  if (problem.retreat_strafe_threshold != undefined) {
    return true;
  }
  if (problem.retreat_lose_air_probability < 1.0) {
    return true;
  }
  return false;
}
export function is_retreat_state(
  problem: general_problem,
  N: number,
  M: number,
): boolean {
  const attnode = problem.att_data.nodeArr[N];
  const defnode = problem.def_data.nodeArr[M];
  if (problem.getRetreat(N, M)) {
    return true;
  }
  if (problem.is_retreat_state_initialized) {
    return false;
  }
  if (problem.retreat_threshold > 0) {
    if (attnode.N <= problem.retreat_threshold) {
      return true;
    }
  }
  if (
    problem.retreat_strafe_threshold != undefined &&
    attnode.nosub_group != undefined
  ) {
    const pgt = attnode.nosub_group.pgreater[attnode.N][defnode.N];
    if (pgt > problem.retreat_strafe_threshold) {
      return true;
    }
  }
  if (
    problem.retreat_lose_air_probability < 1.0 &&
    defnode.nosub_group != undefined
  ) {
    if (attnode.firstAirCasualty >= 0) {
      const pgt =
        defnode.nosub_group.pgreater[defnode.N][attnode.firstAirCasualty];
      if (pgt > problem.retreat_lose_air_probability) {
        return true;
      }
    }
  }
  return false;
}
function is_terminal_state_helper(
  problem: general_problem,
  N: number,
  M: number,
  disable_retreat: boolean = false,
): boolean {
  const attnode = problem.att_data.nodeArr[N];
  const defnode = problem.def_data.nodeArr[M];
  if (attnode.N == 0 || defnode.N == 0) {
    return true;
  }
  if (!disable_retreat && is_retreat_state(problem, N, M)) {
    if (problem.is_amphibious) {
      if (attnode.next_retreat_amphibious == undefined && attnode.N == 0) {
        return true;
      }
      return false;
    }
    return true;
  }

  const N1 = attnode.num_subs;
  const N2 = attnode.num_air;
  const N3 = attnode.num_naval;
  const M1 = defnode.num_subs;
  const M2 = defnode.num_air;
  const M3 = defnode.num_naval;
  if (N1 > 0 && N2 == 0 && N3 == 0 && M1 == 0 && M2 > 0 && M3 == 0) {
    return true;
  }
  if (M1 > 0 && M2 == 0 && M3 == 0 && N1 == 0 && N2 > 0 && N3 == 0) {
    return true;
  }
  return false;
}

function get_terminal_state_prob(
  problem: general_problem,
  disable_retreat: boolean = false,
  debug: boolean = false,
): number {
  const N = problem.att_data.nodeArr.length;
  const M = problem.def_data.nodeArr.length;
  let prob = 0;

  for (let i = 0; i < N; i++) {
    for (let j = 0; j < M; j++) {
      const p = problem.getP(i, j);
      if (p > 0) {
        if (is_terminal_state(problem, i, j, debug, disable_retreat)) {
          prob += p;
        }
      }
    }
  }
  return prob;
}

// if attackers and defenders exist.
// 1.  remove move the remaining non-amphibous attackers to retreat state.
function retreat_one_naval_state(
  problem: general_problem,
  N: number,
  M: number,
) {
  const attnode = problem.att_data.nodeArr[N];
  const defnode = problem.def_data.nodeArr[M];

  const p_init = problem.getP(N, M);

  if (p_init == 0) {
    return;
  }

  if (
    attnode.N > 0 &&
    defnode.N > 0 &&
    attnode.retreat.length == 0 &&
    attnode.next_retreat_amphibious != undefined
  ) {
    const n = attnode.next_retreat_amphibious.index;
    const m = defnode.index;
    const ii = problem.getIndex(n, m);
    problem.setiP(ii, problem.getiP(ii) + p_init);
    problem.setP(N, M, 0);
    return;
  }
}

function do_crash_fighters(problem: general_problem) {
  const N = problem.att_data.nodeArr.length;
  const M = problem.def_data.nodeArr.length;
  for (let i = 0; i < N; i++) {
    for (let j = 0; j < M; j++) {
      const attnode = problem.att_data.nodeArr[i];
      const defnode = problem.def_data.nodeArr[j];
      const p = problem.getP(i, j);
      if (p == 0) {
        continue;
      }
      if (defnode.next_crash_fighters != undefined) {
        problem.setP(i, j, 0);
        const n = attnode.index;
        const m = defnode.next_crash_fighters.index;
        const ii = problem.getIndex(n, m);
        problem.setiP(ii, problem.getiP(ii) + p);
      }
    }
  }
}

function do_early_retreat(problem: general_problem, N: number, M: number) {
  const attnode = problem.att_data.nodeArr[N];
  const defnode = problem.def_data.nodeArr[M];
  if (attnode.N == 0 || defnode.N == 0) {
    return;
  }
  //console.log(N, M, "solve_one_naval");
  const p_init = problem.getP(N, M);

  if (p_init == 0) {
    return;
  }
  const N1 = attnode.num_subs;
  const M1 = defnode.num_subs;
  const att_destroyer = hasDestroyer(problem.att_data, attnode);
  const def_destroyer = hasDestroyer(problem.def_data, defnode);
  const att_submerge =
    problem.att_data.submerge_sub && N1 > 0 && !def_destroyer;
  const def_submerge =
    problem.def_data.submerge_sub && M1 > 0 && !att_destroyer;
  if (att_submerge || def_submerge) {
    let n = attnode.index;
    let m = defnode.index;
    if (att_submerge) {
      if (attnode.next_submerge == undefined) {
        throw new Error();
      }
      n = attnode.next_submerge.index;
    }
    if (def_submerge) {
      if (defnode.next_submerge == undefined) {
        throw new Error();
      }
      m = defnode.next_submerge.index;
    }
    const ii = problem.getIndex(n, m);
    problem.setiP(ii, problem.getiP(ii) + p_init);
    problem.setP(N, M, 0);
    return;
  }
  if (defnode.next_remove_noncombat != undefined) {
    const n = attnode.index;
    const m = defnode.next_remove_noncombat.index;
    const ii = problem.getIndex(n, m);
    problem.setiP(ii, problem.getiP(ii) + p_init);
    problem.setP(N, M, 0);
    return;
  }
}

function compute_retreat_state(problem: general_problem): void {
  //problem.R_1d = [];
  const N = problem.att_data.nodeArr.length;
  const M = problem.def_data.nodeArr.length;
  problem.R_1d = new Array(N * M);
  let i, j;
  for (i = 0; i < N; i++) {
    for (j = 0; j < M; j++) {
      problem.setRetreat(i, j, false);
    }
  }
  for (i = 0; i < N; i++) {
    for (j = 0; j < M; j++) {
      const is_retreat = is_retreat_state(problem, i, j);
      if (is_retreat) {
        problem.setRetreat(i, j, true);
      }
    }
  }
}

function print_retreat_state(problem: general_problem): void {
  const N = problem.att_data.nodeArr.length;
  const M = problem.def_data.nodeArr.length;
  let i, j;
  if (problem.verbose_level > 2) {
    for (i = 0; i < N; i++) {
      for (j = 0; j < M; j++) {
        console.log(
          `result:  is_retreat_state[%d][%d] = %d`,
          i,
          j,
          problem.getRetreat(i, j),
        );
      }
    }
  }
}

// compute EV for all possible substates
function compute_expected_value(problem: general_problem): void {
  const N = problem.att_data.nodeArr.length;
  const M = problem.def_data.nodeArr.length;
  problem.E_1d = new Array(N * M);
  let i, j;
  for (i = 0; i < N; i++) {
    for (j = 0; j < M; j++) {
      problem.setE(i, j, 0.0);
    }
  }

  for (i = N - 1; i >= 0; i--) {
    for (j = M - 1; j >= 0; j--) {
      // for each state... compute the expected IPC profit E(i, j)
      // E(i, j) = 0 if the state is terminal (no attackers or no defenders)
      // E(i, j) = sum of (ii, jj all possible next states):  prob(ii, jj) * (E(ii, jj) + delta_cost(ii, jj)

      solve_one_general_state_copy1(
        problem,
        i,
        j,
        false,
        0,
        false,
        false,
        (
          problem: general_problem,
          ii: number,
          prob: number,
          n: number,
          m: number,
          num_rounds: number,
        ) => {
          const attnode = problem.att_data.nodeArr[n];
          const defnode = problem.def_data.nodeArr[m];
          const attloss = problem.base_attcost - attnode.cost;
          const defloss = problem.base_defcost - defnode.cost;
          const deltacost = defloss - attloss;
          const expected_value = problem.E_1d[ii];
          problem.accumulate += (deltacost + expected_value) * prob;
        },
        (problem, n: number, m: number) => {
          problem.accumulate = 0;
          problem.base_attcost = problem.att_data.nodeArr[n].cost;
          problem.base_defcost = problem.def_data.nodeArr[m].cost;
          return 1;
        },
        (problem, n: number, m: number) => {
          const attnode = problem.att_data.nodeArr[n];
          const defnode = problem.def_data.nodeArr[m];
          if (is_terminal_state(problem, n, m, false, false)) {
            problem.accumulate = 0;
            if (problem.is_deadzone && defnode.N == 0) {
              problem.accumulate -= attnode.deadzone_cost;
            }
            if (defnode.N == 0 && attnode.hasLand) {
              problem.accumulate += problem.territory_value;
            }
            problem.setE(n, m, problem.accumulate);
          } else {
            const is_retreat =
              problem.retreat_expected_ipc_profit_threshold != undefined &&
              problem.accumulate <
                problem.retreat_expected_ipc_profit_threshold;
            const ev = !is_retreat ? problem.accumulate : 0;
            if (is_retreat) {
              problem.setRetreat(n, m, true);
            }
            problem.setE(n, m, ev);
          }
        },
      );
    }
  }

  if (problem.verbose_level > 3) {
    for (i = 0; i < N; i++) {
      for (j = 0; j < M; j++) {
        console.log(`result:  EV[%d][%d] = %d`, i, j, problem.getE(i, j));
      }
    }
  }
}

// compute the Pwin with the win condition as attacker takes territory
function compute_prob_wins(problem: general_problem): void {
  problem.Pwin_1d = [];
  const N = problem.att_data.nodeArr.length;
  const M = problem.def_data.nodeArr.length;
  let i, j;
  for (i = 0; i < N; i++) {
    for (j = 0; j < M; j++) {
      problem.setPwin(i, j, 0.0);
    }
  }
  for (i = N - 1; i >= 0; i--) {
    for (j = M - 1; j >= 0; j--) {
      // for each state... compute the Pwin(i, j)
      // Pwin(i, j) =
      //    for terminal state -- 0, or 1 based on if the state should be
      //            considered a win.  (e.g. takes)
      //    for non-terminal state --
      //      Pwin(i,j) = sum of (ii, jj all possible next states :=
      //            prob(ii, jj) * Pwin(ii, jj);

      solve_one_general_state_copy3(
        problem,
        i,
        j,
        false,
        0,
        false,
        false,
        (
          problem: general_problem,
          ii: number,
          prob: number,
          n: number,
          m: number,
          num_rounds: number,
        ) => {
          problem.pwin_acc += prob * problem.Pwin_1d[ii];
        },
        (problem, n: number, m: number) => {
          problem.pwin_acc = 0;
          return 1;
        },
        (problem, n: number, m: number) => {
          const attnode = problem.att_data.nodeArr[n];
          const defnode = problem.def_data.nodeArr[m];
          if (is_terminal_state(problem, n, m, false, false)) {
            problem.pwin_acc = 0;
            if (
              defnode.N == 0 &&
              (attnode.hasLand || problem.pwinMode == 'destroys')
            ) {
              problem.pwin_acc = 1; // attacker wins
            }
            problem.setPwin(n, m, problem.pwin_acc);
          } else {
            const is_retreat =
              problem.retreat_pwin_threshold != undefined &&
              problem.pwin_acc < problem.retreat_pwin_threshold;
            const pwin = !is_retreat ? problem.pwin_acc : 0;
            if (is_retreat) {
              problem.setRetreat(n, m, true);
            }
            problem.setPwin(n, m, pwin);
          }
        },
      );
    }
  }
}

// roundless evaluation... while analytically computing average rounds.
function do_roundless_eval(
  problem: general_problem,
  init_rounds: number,
): void {
  const N = problem.att_data.nodeArr.length;
  const M = problem.def_data.nodeArr.length;
  let i, j;

  if (problem.verbose_level > 2) {
    console.log('doing roundless eval with init_rounds', init_rounds);
    console.time('do_roundless_eval');
  }
  //problem.ERound_1d = [];
  problem.ERound_1d = new Array(N * M);
  // initialize expected rounds for each state
  for (i = 0; i < N; i++) {
    for (j = 0; j < M; j++) {
      const ii = problem.getIndex(i, j);
      const p = problem.getiP(ii);
      problem.setiERound(ii, p * init_rounds);
    }
  }

  if (problem.verbose_level > 2) {
    console.log(problem.ERound_1d.length, 'ERound_1d length');
  }

  for (i = 0; i < N; i++) {
    for (j = 0; j < M; j++) {
      solve_one_general_state_copy2(
        problem,
        i,
        j,
        false,
        0,
        false,
        false,
        (
          problem,
          ii: number,
          prob: number,
          n: number,
          m: number,
          num_rounds: number,
        ) => {
          problem.P_1d[ii] += prob;
          problem.ERound_1d[ii] += prob * (problem.init_rounds + num_rounds);
        },
        (problem, n: number, m: number) => {
          const p_init = problem.getP(n, m);
          if (p_init == 0) {
            problem.init_rounds = 0;
            return p_init;
          }
          problem.init_rounds = problem.getERound(n, m) / p_init;
          return p_init;
        },
        (problem, n: number, m: number) => {
          if (problem.getP(n, m) == 0) {
            problem.setERound(n, m, 0.0);
          }
        },
      );
    }
  }

  let sum = 0.0;
  for (i = 0; i < N; i++) {
    for (j = 0; j < M; j++) {
      sum += problem.getERound(i, j);
    }
  }
  problem.average_rounds = sum;

  if (problem.verbose_level > 2) {
    console.log(sum, 'average rounds');
    console.timeEnd('do_roundless_eval');
  }
  /*
  if (problem.verbose_level > 2) {
    for (i = 0; i < N; i++) {
      for (j = 0; j < M; j++) {
        console.log(`result:  EV[%d][%d] = %d`, i, j, problem.getE(i, j));
      }
    }
  }
    */
}

function do_roundless_eval_without_rounds(problem: general_problem): void {
  const N = problem.att_data.nodeArr.length;
  const M = problem.def_data.nodeArr.length;
  let i, j;
  for (i = 0; i < N; i++) {
    for (j = 0; j < M; j++) {
      solve_one_general_state(problem, i, j, false, 0, false, false);
    }
  }
}

function do_round_eval(
  problem: general_problem,
  allow_same_state: boolean,
  num_bombard: number,
  do_retreat_only: boolean,
  disable_retreat: boolean,
): void {
  const N = problem.att_data.nodeArr.length;
  const M = problem.def_data.nodeArr.length;
  let i, j;
  for (i = N - 1; i >= 0; i--) {
    for (j = M - 1; j >= 0; j--) {
      solve_one_general_state(
        problem,
        i,
        j,
        allow_same_state,
        num_bombard,
        do_retreat_only,
        disable_retreat,
      );
    }
  }
}

export function solve_general(problem: general_problem) {
  //debugger;

  const N = problem.att_data.nodeArr.length;
  const M = problem.def_data.nodeArr.length;
  problem.P_1d = new Array(N * M);
  //problem.R_1d = new Array(N * M);
  //problem.E_1d = new Array(N * M);
  //problem.ERound_1d = new Array(N * M);
  let i, j;
  for (i = 0; i < N; i++) {
    for (j = 0; j < M; j++) {
      problem.setP(i, j, 0.0);
    }
  }
  problem.is_retreat_state_initialized = false;
  compute_retreat_state(problem);

  if (problem.retreat_expected_ipc_profit_threshold != undefined) {
    if (problem.verbose_level > 2) {
      console.time('compute_expected_value');
    }
    compute_expected_value(problem);
    if (problem.verbose_level > 2) {
      console.timeEnd('compute_expected_value');
    }
  }
  if (problem.retreat_pwin_threshold != undefined) {
    if (problem.verbose_level > 2) {
      console.time('compute_prob_pwins');
    }
    compute_prob_wins(problem);
    if (problem.verbose_level > 2) {
      console.timeEnd('compute_prob_pwins');
    }
  }
  problem.is_retreat_state_initialized = true;
  if (problem.verbose_level > 3) {
    print_retreat_state(problem);
  }

  if (problem.nonavalproblem != undefined) {
    problem.nonavalproblem.P_1d = [];
    const N = problem.nonavalproblem.att_data.nodeArr.length;
    const M = problem.nonavalproblem.def_data.nodeArr.length;
    let i, j;
    for (i = 0; i < N; i++) {
      for (j = 0; j < M; j++) {
        problem.nonavalproblem.setP(i, j, 0.0);
      }
    }
  }

  // states which are early retreated due to retreat conditions in the zero round.
  // these states are zeroed in the probability table, so they are not expanded.
  // for multiwave handling.
  // They are restored in the end to the seed probabilities after all expansion is complete.
  let zeroRoundList: [number, number, number][] = [];

  if (problem.def_cas == undefined) {
    /* initial seed */
    problem.setP(0, 0, problem.prob);
    let doAA =
      !problem.is_naval &&
      problem.att_data.num_aashot > 0 &&
      hasNonAAUnit(problem.um, problem.def_data.unit_str);
    if (is_round_zero_retreat_state(problem, 0, 0)) {
      zeroRoundList.push([0, 0, problem.prob]);
      problem.setP(0, 0, 0);
      doAA = false;
    }
    if (doAA) {
      let aashots = '';
      for (let i = 0; i < problem.att_data.num_aashot; i++) {
        aashots = aashots + 'c';
      }
      const aa_data = make_unit_group(problem.um, aashots, 2, problem.diceMode);

      const N = aa_data.tbl_size;
      for (let i = 0; i < N; i++) {
        const prob = aa_data.get_prob_table(N - 1, i);
        const n = remove_aahits(problem.att_data, i, 0);
        problem.setP(n, 0, problem.prob * prob);
        if (problem.verbose_level > 2) {
          console.log(i, n, problem.prob * prob, 'i, n, prob -- solveAA');
        }
      }
    }
  } else {
    const mymap: Map<string, number> = new Map();
    for (let i = 0; i < M; i++) {
      mymap.set(problem.def_data.nodeArr[i].unit_str, i);
    }
    let aa_data;
    let N;
    if (problem.att_data.num_aashot > 0) {
      let aashots = '';
      for (let i = 0; i < problem.att_data.num_aashot; i++) {
        aashots = aashots + 'c';
      }
      aa_data = make_unit_group(problem.um, aashots, 2, problem.diceMode);
      N = aa_data.tbl_size;
    }
    for (let i = 0; i < problem.def_cas.length; i++) {
      const ii = mymap.get(problem.def_cas[i].remain);
      if (ii == undefined) {
        throw new Error();
      } else {
        const p = problem.def_cas[i].prob;
        const numAA = count_units(problem.def_cas[i].remain, 'c');
        let doAA =
          !problem.is_naval &&
          numAA > 0 &&
          problem.att_data.num_aashot > 0 &&
          hasNonAAUnit(problem.um, problem.def_cas[i].remain);
        let isZeroRound = false;
        if (is_round_zero_retreat_state(problem, 0, ii)) {
          zeroRoundList.push([0, ii, problem.def_cas[i].prob]);
          doAA = false;
          isZeroRound = true;
        }
        if (doAA && N != undefined && aa_data != undefined) {
          const NN = Math.min(numAA * 3 + 1, N);

          for (let i = 0; i < NN; i++) {
            const prob = aa_data.get_prob_table(NN - 1, i);
            const n = remove_aahits(problem.att_data, i, 0);
            problem.setP(n, ii, problem.getP(n, ii) + p * prob);
            if (problem.verbose_level > 2) {
              console.log(i, n, problem.prob * prob, 'i, n, prob -- solveAA');
            }
          }
        } else {
          if (!isZeroRound) {
            problem.setP(0, ii, problem.getP(0, ii) + problem.def_cas[i].prob);
          }
        }
      }
    }
  }

  let p0: number = 1.0; // probablity the battle already ended in previous wave.
  for (i = N - 1; i >= 0; i--) {
    for (j = M - 1; j >= 0; j--) {
      p0 -= problem.getP(i, j);
    }
  }

  const p1 = get_terminal_state_prob(problem, true, false); // probability that the starting state is already terminal
  // naval bombard

  let didBombard = false;
  const numBombard = !problem.is_naval
    ? count_units(problem.att_data.unit_str, 'B') +
      count_units(problem.att_data.unit_str, 'C')
    : 0;
  if (numBombard > 0 || problem.hasRetreatCondition()) {
    do_round_eval(problem, true, numBombard, false, true);
    didBombard = true;
  }

  if (problem.rounds > 0) {
    const rounds = didBombard ? problem.rounds - 1 : problem.rounds;
    const prob_ends: number[] = [];
    prob_ends.push(p0 + p1);
    if (problem.verbose_level > 2) {
      console.log(rounds, 'rounds');
    }
    const needs_early_retreat =
      problem.isEarlyRetreat() ||
      problem.is_amphibious ||
      problem.hasNonCombat();
    if (didBombard) {
      if (needs_early_retreat) {
        do_round_eval(problem, true, 0, true, false);
      }
      const p = get_terminal_state_prob(problem, false, false);
      prob_ends.push(p + p0);
      if (problem.verbose_level > 2) {
        console.log(prob_ends, 'prob ends');
      }
    }
    if (problem.isEarlyRetreat() || problem.hasNonCombat()) {
      for (i = N - 1; i >= 0; i--) {
        for (j = M - 1; j >= 0; j--) {
          do_early_retreat(problem, i, j);
        }
      }
      const p = get_terminal_state_prob(problem, false, false);
      prob_ends[prob_ends.length - 1] = p + p0;
    }
    for (let ii = 0; ii < rounds; ii++) {
      const label = 'round ' + ii;
      if (problem.verbose_level > 2) {
        console.time(label);
      }
      do_round_eval(problem, true, 0, false, false);
      if (needs_early_retreat) {
        do_round_eval(problem, true, 0, true, false);
      }
      const enable_debug = false;
      const debug = enable_debug && prob_ends.length == 8;
      const p = get_terminal_state_prob(problem, false, debug);
      prob_ends.push(p + p0);
      if (debug) {
        console.log(ii, 'round', prob_ends);
        collect_and_print_results(problem);
      }
      if (p > 0) {
        if (ii > 3 && p + p0 == prob_ends[ii - 1]) {
          if (problem.verbose_level > 2) {
            console.timeEnd(label);
          }
          break;
        }
      }
      if (problem.verbose_level > 2) {
        console.timeEnd(label);
      }
    }
    if (problem.is_amphibious && prob_ends.length >= rounds) {
      // for each state
      // if attackers and defenders exist.
      // 1.  remove move the remaining non-amphibous attackers to retreat state.

      for (let i = N - 1; i >= 0; i--) {
        for (let j = M - 1; j >= 0; j--) {
          retreat_one_naval_state(problem, i, j);
        }
      }
      const p = get_terminal_state_prob(problem, false, false);
      prob_ends[prob_ends.length - 1] = p + p0;
      // evaluate infinite rounds -- with retreat disabled. -- remaining attackers are not allowed to retreat.
      for (let ii = 0; ii < 100; ii++) {
        do_round_eval(problem, true, 0, false, true);
        const p = get_terminal_state_prob(problem, false, false);
        prob_ends.push(p + p0);
        if (p == prob_ends[prob_ends.length - 2]) {
          break;
        }
      }
    }
    if (!problem.is_amphibious) {
      prob_ends[prob_ends.length - 1] = 1.0;
    }
    if (problem.verbose_level > 2) {
      console.log(prob_ends.length, 'stopped after rounds');
      console.log(prob_ends, 'stopped after rounds');
    }
    let sum = 0.0;
    for (let i = 0; i < prob_ends.length; i++) {
      const p = i > 0 ? prob_ends[i] - prob_ends[i - 1] : prob_ends[i];
      sum += i * p;
    }
    if (problem.verbose_level > 2) {
      console.log(sum, 'average rounds');
    }
    problem.average_rounds = sum;
  } else {
    if (problem.do_roundless_eval) {
      do_roundless_eval(problem, didBombard ? 1.0 : 0.0);
    } else {
      do_roundless_eval_without_rounds(problem);
    }
  }

  //
  for (let i = 0; i < zeroRoundList.length; i++) {
    const [N, M, prob] = zeroRoundList[i];
    const ii = problem.getIndex(N, M);
    problem.P_1d[ii] += prob;
  }

  if (problem.is_crash_fighters) {
    //console.log("before crash")
    //collect_and_print_results(problem);
    do_crash_fighters(problem);
    //console.log("after crash")
    //collect_and_print_results(problem);
  }

  if (problem.nonavalproblem != undefined) {
    const N = problem.nonavalproblem.att_data.nodeArr.length;
    const M = problem.nonavalproblem.def_data.nodeArr.length;
    let i, j;

    for (i = 0; i < N; i++) {
      for (j = 0; j < M; j++) {
        solve_one_general_state(
          problem.nonavalproblem,
          i,
          j,
          false,
          0,
          false,
          false,
        );
      }
    }
    // map back to parent problem
    let sum = 0;
    for (i = 0; i < N; i++) {
      const attnode = problem.nonavalproblem.att_data.nodeArr[i];
      const key: string = attnode.num_subs + ',' + attnode.num_air;
      const ii = problem.attmap.get(key);
      for (j = 0; j < M; j++) {
        const node = problem.nonavalproblem.def_data.nodeArr[j];
        const key2: string = node.num_subs + ',' + node.num_air;
        const jj = problem.defmap.get(key2);
        const p = problem.nonavalproblem.getP(i, j);
        if (p > 0) {
          //console.log(attnode.num_subs, attnode.num_air, node.num_subs, node.num_air, p, "p here");
          if (ii == undefined || jj == undefined) {
            console.log(key, key2, 'key, key2');
            throw new Error();
          }
          const iii = problem.getIndex(ii, jj);
          problem.setiP(iii, problem.getiP(iii) + p);
          sum += p;
        }
      }
    }
    if (problem.verbose_level > 2) {
      console.log(sum, 'sum');
    }
    problem.E_1d = [];
    problem.ERound_1d = [];
    problem.R_1d = [];
  }
}
