import { Heap } from 'heap-js';

import type { UnitIdentifier } from './external.js';

const epsilon: number = 1e-9;

export type DiceMode = 'standard' | 'lowluck' | 'biased';

export type SortMode = 'unit_count' | 'ipc_cost';

export type PwinMode = 'takes' | 'destroys';

import { solve_one_general_state } from './solveone.js';
import { solve_one_general_state_copy1 } from './solveone1.js';
import { solve_one_general_state_copy2 } from './solveone2.js';
import { solve_one_general_state_copy3 } from './solveone3.js';
//import { solve_one_general_state_copy4 } from './solveone4.js';

class unit_group_manager {
  unit_group_arr: unit_group[];
  mymap: Map<string, number>;
  get_or_create_unit_group(
    um: unit_manager,
    input: string,
    attdef: number,
    diceMode: DiceMode,
  ): unit_group {
    let ug;
    const ii = this.mymap.get(input + attdef);
    if (ii == undefined) {
      ug = new unit_group(um, input, attdef, diceMode);
      if (ug == undefined) {
        console.log(input + attdef, 'ug manager FATAL -- undefind');
        throw new Error();
      }
      for (let i = 1; i <= input.length; i++) {
        const t = input.substring(0, i) + attdef;
        this.mymap.set(t, this.unit_group_arr.length);
      }
      this.unit_group_arr.push(ug);
    } else {
      ug = this.unit_group_arr[ii]!;
    }
    return ug;
  }
  constructor() {
    this.mymap = new Map();
    this.unit_group_arr = [];
  }
}

export class unit_manager {
  unit_stats: Map<string, unit_stat>;
  rev_map: Map<string, string>;
  rev_map2: Map<string, string>;
  rev_map3: Map<UnitIdentifier, string>;
  unit_group_manager: unit_group_manager;
  verbose_level: number;
  skip_compute: boolean = false;
  constructor(verbose_level: number, skip_compute: boolean = false) {
    this.unit_stats = new Map();
    this.rev_map = new Map();
    this.rev_map2 = new Map();
    this.rev_map3 = new Map();
    this.init_units();
    this.unit_group_manager = new unit_group_manager();
    this.verbose_level = verbose_level;
    this.skip_compute = skip_compute;
  }
  init_units() {
    this.make_unit(
      '',
      'e',
      'c',
      0,
      0,
      5,
      1,
      false,
      false,
      false,
      false,
      true,
      false,
      false,
    );
    this.make_unit(
      'AA',
      'c',
      'c',
      0,
      0,
      5,
      1,
      false,
      false,
      false,
      false,
      true,
      false,
      false,
    );
    this.make_unit(
      'Inf',
      'i',
      'i',
      1,
      2,
      3,
      1,
      true,
      false,
      false,
      false,
      false,
      false,
      false,
    );
    this.make_unit(
      'Inf_a',
      'j',
      'j',
      1,
      2,
      3,
      1,
      true,
      false,
      false,
      false,
      false,
      false,
      true,
    );
    this.make_unit(
      'Art',
      'a',
      'a',
      2,
      2,
      4,
      1,
      true,
      false,
      false,
      false,
      false,
      false,
      false,
    );
    this.make_unit(
      'Art_a',
      'g',
      'g',
      2,
      2,
      4,
      1,
      true,
      false,
      false,
      false,
      false,
      false,
      true,
    );
    this.make_unit(
      '',
      'd',
      'i',
      2,
      2,
      3,
      1,
      false,
      false,
      false,
      false,
      false,
      false,
      false,
    );
    this.make_unit(
      '',
      'h',
      'j',
      2,
      2,
      3,
      1,
      false,
      false,
      false,
      false,
      false,
      false,
      true,
    );
    this.make_unit(
      'Arm',
      't',
      't',
      3,
      3,
      6,
      1,
      true,
      false,
      false,
      false,
      false,
      false,
      false,
    );
    this.make_unit(
      'Arm_a',
      'u',
      'u',
      3,
      3,
      6,
      1,
      true,
      false,
      false,
      false,
      false,
      false,
      true,
    );
    this.make_unit(
      'Fig',
      'f',
      'f',
      3,
      4,
      10,
      1,
      false,
      false,
      false,
      true,
      false,
      false,
      false,
    );
    this.make_unit(
      'Bom',
      'b',
      'b',
      4,
      1,
      12,
      1,
      false,
      false,
      false,
      true,
      false,
      false,
      false,
    );
    this.make_unit(
      'ACC',
      'A',
      'A',
      1,
      2,
      14,
      1,
      false,
      false,
      false,
      false,
      false,
      false,
      false,
    );
    this.make_unit(
      'Cru',
      'C',
      'C',
      3,
      3,
      12,
      1,
      false,
      false,
      false,
      false,
      false,
      true,
      false,
    );
    this.make_unit(
      'Des',
      'D',
      'D',
      2,
      2,
      8,
      1,
      false,
      false,
      true,
      false,
      false,
      false,
      false,
    );
    this.make_unit(
      'Sub',
      'S',
      'S',
      2,
      1,
      6,
      1,
      false,
      true,
      false,
      false,
      false,
      false,
      false,
    );
    this.make_unit(
      'Bat',
      'B',
      'B',
      4,
      4,
      20,
      2,
      false,
      false,
      false,
      false,
      false,
      true,
      false,
    );
    this.make_unit(
      '',
      'E',
      'E',
      0,
      0,
      0,
      2,
      false,
      false,
      false,
      false,
      false,
      false,
      false,
    );
    this.make_unit(
      'Tra',
      'T',
      'T',
      0,
      0,
      7,
      1,
      false,
      false,
      false,
      false,
      false,
      false,
      false,
    );
    this.make_unit(
      'DBat',
      'F',
      'B',
      4,
      4,
      20,
      2,
      false,
      false,
      false,
      false,
      false,
      true,
      false,
    );
    this.make_unit(
      '+',
      '+',
      '+',
      0,
      0,
      0,
      0,
      false,
      false,
      false,
      false,
      false,
      false,
      false,
    );
    this.make_unit(
      'IC',
      'p',
      'p',
      0,
      0,
      1,
      1,
      false,
      false,
      false,
      false,
      false,
      false,
      false,
    );
  }
  make_unit(
    fullname: string,
    ch: string,
    ch2: string,
    att: number,
    def: number,
    cost: number,
    hits: number,
    isLand: boolean,
    isSub: boolean,
    isDestroyer: boolean,
    isAir: boolean,
    isAA: boolean,
    isBombard: boolean,
    isAmphibious: boolean,
  ) {
    const unit = new unit_stat(
      fullname,
      ch,
      ch2,
      att,
      def,
      cost,
      hits,
      isLand,
      isSub,
      isDestroyer,
      isAir,
      isAA,
      isBombard,
      isAmphibious,
    );
    this.unit_stats.set(ch, unit);
    this.rev_map.set(ch2, ch);
    this.rev_map2.set(fullname, ch);
  }
  get_stat(ch: string): unit_stat {
    const v = this.unit_stats.get(ch);
    if (v == undefined) {
      console.log(ch, 'get stat FATAL -- undefind');
      throw new Error('get stat failed');
    }
    return v;
  }
}

// a group of units with fixed order of loss.
export class unit_group {
  diceMode: DiceMode;
  unit_str: string;
  attdef: number;
  size: number;
  tbl_size: number;
  max_prob_table: number[];
  prob_hits: number[];
  first_destroyer_index: number;
  power: number[];
  pless: number[][];
  pgreater: number[][];
  prob_table2: number[];

  getIndex(i: number, j: number): number {
    return i * this.tbl_size + j;
  }
  geti_prob_table(ii: number): number {
    return this.prob_table2[ii];
  }
  get_prob_table(i: number, j: number): number {
    const ii = this.getIndex(i, j);
    return this.prob_table2[ii];
  }
  seti_prob_table(ii: number, val: number) {
    this.prob_table2[ii] = val;
  }
  set_prob_table(i: number, j: number, val: number) {
    const ii = this.getIndex(i, j);
    this.prob_table2[ii] = val;
  }

  constructor(
    manager: unit_manager,
    input_str: string,
    attdef: number,
    diceMode: DiceMode,
  ) {
    this.unit_str = input_str;
    this.size = input_str.length;
    this.tbl_size = this.size + 1;
    this.max_prob_table = [];
    this.prob_table2 = [];
    this.pless = [];
    this.pgreater = [];
    this.power = [];
    this.attdef = attdef;
    this.prob_hits = [];
    this.first_destroyer_index = -1;
    this.diceMode = diceMode;
    let i: number;
    let j: number;

    if (manager.verbose_level > 2) {
      console.log(input_str, 'make_unit_group');
    }
    for (i = 0; i < this.tbl_size; i++) {
      this.pless[i] = [];
      this.pgreater[i] = [];
      for (j = 0; j < this.tbl_size; j++) {
        this.pless[i][j] = 0;
        this.pgreater[i][j] = 0;
        this.set_prob_table(i, j, 0);
      }
    }
    //const biasedDice : number[] = [1, 2, 3, 2, 1, 1];
    const biasedDiceProb: number[] = [0, 1, 3, 6, 8, 9, 10];
    for (i = 0; i < this.size; i++) {
      const ii = i + 1;
      const ch = this.unit_str.charAt(i);
      //console.log(i, ch);
      const stat = manager.get_stat(ch);
      //console.log(stat);
      let val;
      switch (attdef) {
        case 0:
          val = stat.att;
          break;
        case 1:
          val = stat.def;
          break;
        case 2:
        default:
          val = 1;
      }
      if (diceMode == 'standard') {
        this.prob_hits[ii] = val / 6;
      } else if (diceMode == 'biased') {
        this.prob_hits[ii] = biasedDiceProb[val] / 10;
      } else {
        // low luck
        this.prob_hits[ii] = val / 6;
      }
      if (i == 0) {
        this.power[ii] = val;
      } else {
        this.power[ii] = this.power[ii - 1] + val;
      }
      //console.log(this.prob_hits);
    }
    this.compute_prob_table();

    // i units get j hits or less/
    for (i = 0; i < this.tbl_size; i++) {
      for (j = 0; j <= i; j++) {
        if (j == 0) {
          this.pless[i][j] = this.get_prob_table(i, j);
        } else {
          this.pless[i][j] = this.pless[i][j - 1] + this.get_prob_table(i, j);
        }
      }
    }
    // i units get j hits or greater/
    for (i = 0; i < this.tbl_size; i++) {
      for (j = i; j >= 0; j--) {
        if (j == i) {
          this.pgreater[i][j] = this.get_prob_table(i, j);
        } else {
          this.pgreater[i][j] =
            this.pgreater[i][j + 1] + this.get_prob_table(i, j);
        }
      }
    }
  }
  compute_prob_table() {
    const ph = this.prob_hits;
    const tbl_sz = this.tbl_size;
    let i, j;
    if (this.diceMode == 'lowluck') {
      this.set_prob_table(0, 0, 1.0);
      for (j = 1; j < tbl_sz; j++) {
        this.set_prob_table(0, j, 0.0);
      }
      for (i = 1; i < tbl_sz; i++) {
        const power = this.power[i];
        const hits = Math.floor(power / 6);
        const remainder = power % 6;
        const probRemainderHits = remainder / 6;
        const probRemainderMisses = 1 - probRemainderHits;
        for (j = 0; j < tbl_sz; j++) {
          let p: number;
          switch (j) {
            case hits:
              p = probRemainderMisses;
              break;
            case hits + 1:
              p = probRemainderHits;
              break;
            default:
              p = 0;
          }
          this.set_prob_table(i, j, p);
        }
      }
    } else {
      this.set_prob_table(0, 0, 1.0);
      for (j = 1; j < tbl_sz; j++) {
        this.set_prob_table(0, j, 0.0);
      }
      for (i = 1; i < tbl_sz; i++) {
        this.set_prob_table(i, 0, (1 - ph[i]) * this.get_prob_table(i - 1, 0));
        for (j = 1; j < tbl_sz; j++) {
          if (j > i) {
            this.set_prob_table(i, j, 0.0);
          } else {
            let v =
              ph[i] * this.get_prob_table(i - 1, j - 1) +
              (1 - ph[i]) * this.get_prob_table(i - 1, j);
            v = v < 1e-300 ? 0 : v;
            this.set_prob_table(i, j, v);
          }
        }
      }
    }
    for (i = 0; i < tbl_sz; i++) {
      let maxp = -1;
      for (j = 0; j <= i; j++) {
        maxp = Math.max(maxp, this.get_prob_table(i, j));
      }
      this.max_prob_table[i] = maxp;
    }
    //console.log(this);
  }
}

// graph node -- to support random order of loss.
// compute/store all possible next state transitions.
//      - casualties (air hit, naval hit, sub hit)
//      - remove non-combat fighters without other defendewrs (e.g. AA's, transports)
//      - retreat non-amphibious units
//      - submerge subs
//      - crash fighters
class general_unit_graph_node {
  unit_str: string;
  retreat: string = '';
  N: number;
  num_subs: number;
  num_air: number;
  num_naval: number;
  num_dest: number;
  hasLand: boolean = false; // true if unit_str has land units.
  cost: number;
  deadzone_cost: number; // land units taking territories in a deadzone.
  firstAirCasualty: number; // index of the first air casualty, -1 if no air units.
  dlast: boolean = false;
  index: number = 0;
  next_aahit: general_unit_graph_node | undefined = undefined;
  next_subhit: general_unit_graph_node | undefined = undefined;
  next_airhit: general_unit_graph_node | undefined = undefined;
  next_navalhit!: general_unit_graph_node;
  next_dlast_subhit: general_unit_graph_node | undefined = undefined;
  next_dlast_airhit: general_unit_graph_node | undefined = undefined;
  next_dlast_navalhit: general_unit_graph_node | undefined = undefined;
  next_submerge: general_unit_graph_node | undefined = undefined;
  next_retreat_amphibious: general_unit_graph_node | undefined = undefined;
  next_crash_fighters: general_unit_graph_node | undefined = undefined;
  next_remove_noncombat: general_unit_graph_node | undefined = undefined;
  naaArr: number[] = [];
  nsubArr: number[] = [];
  nairArr: number[] = [];
  nnavalArr: number[] = [];
  ndlastsubArr: number[] = [];
  ndlastairArr: number[] = [];
  ndlastnavalArr: number[] = [];
  nosub_group: unit_group | undefined = undefined;
  naval_group: unit_group | undefined = undefined;
  numBB: number = 0;
  constructor(
    um: unit_manager,
    unit_str: string,
    retreat: string,
    is_nonaval: boolean,
  ) {
    this.unit_str = unit_str;
    this.retreat = retreat;
    this.N = unit_str.length;
    this.num_subs = count_units(unit_str, 'S');
    this.num_air = count_units(unit_str, 'f') + count_units(unit_str, 'b');
    this.num_naval = this.N - this.num_subs - this.num_air;
    this.numBB = count_units(this.unit_str, 'E');
    this.num_dest = count_units(this.unit_str, 'D');
    this.cost = get_cost_from_str(um, unit_str, '');
    this.deadzone_cost = get_deadzone_cost_from_str(um, unit_str, '');
    this.hasLand = hasLand(um, unit_str);
    this.firstAirCasualty = -1;
    if (this.num_air > 0) {
      this.firstAirCasualty = getFirstAirCasualty(um, unit_str);
    }

    if (is_nonaval) {
      if (this.num_naval == 0) {
        this.cost += this.num_subs * 1000;
      }
    }
  }
}

// a group of units with random order of loss possible
class general_unit_group {
  um: unit_manager;
  unit_str: string = '';
  diceMode: DiceMode;
  attdef: number = 0;
  destroyer_last: boolean = false;
  submerge_sub: boolean = false;
  is_crash_fighters: boolean = false;
  num_subs: number = 0;
  num_naval: number = 0;
  num_air: number = 0;
  num_aashot: number = 0;
  is_nonaval: boolean;
  is_naval: boolean;
  sub_group: unit_group;
  naval_group: unit_group;
  air_group: unit_group;
  dlast_group: unit_group | undefined;

  nodeArr: general_unit_graph_node[] = [];

  constructor(
    um: unit_manager,
    input_str: string,
    attdef: number,
    dest_last: boolean,
    submerge: boolean,
    max_remove_hits: number,
    numAA: number,
    cas: casualty_1d[] | undefined,
    is_nonaval: boolean,
    is_amphibious: boolean,
    crash_fighters: boolean,
    diceMode: DiceMode,
    is_naval: boolean,
  ) {
    this.um = um;
    this.unit_str = input_str;
    this.attdef = attdef;
    this.destroyer_last = dest_last;
    this.submerge_sub = submerge;
    this.num_subs = count_units(input_str, 'S');
    this.num_air = count_units(input_str, 'f') + count_units(input_str, 'b');
    this.num_naval = input_str.length - this.num_subs - this.num_air;
    this.is_nonaval = is_nonaval;
    this.is_crash_fighters = crash_fighters;
    this.diceMode = diceMode;
    this.is_naval = is_naval;
    let subs = '';
    for (let i = 0; i < this.num_subs; i++) {
      subs += 'S';
    }
    this.sub_group = make_unit_group(um, subs, attdef, this.diceMode);

    let planes = '';
    for (let i = 0; i < input_str.length; i++) {
      const ch = input_str.charAt(i);
      if (isAir(this.um, ch)) {
        planes += ch;
      }
    }
    this.air_group = make_unit_group(um, planes, attdef, this.diceMode);

    let naval = '';
    let first_destroyer_index = -1;
    for (let i = 0; i < input_str.length; i++) {
      const ch = input_str.charAt(i);
      if (!isAir(this.um, ch) && !isSub(this.um, ch)) {
        if (isDestroyer(um, ch)) {
          if (first_destroyer_index < 0) {
            first_destroyer_index = naval.length;
          }
        }
        naval += ch;
      }
    }

    this.naval_group = make_unit_group(um, naval, attdef, this.diceMode);
    this.naval_group.first_destroyer_index = first_destroyer_index;

    if (first_destroyer_index >= 0) {
      const destlast =
        'D' +
        naval.substr(0, first_destroyer_index) +
        naval.substr(first_destroyer_index + 1);
      this.dlast_group = make_unit_group(um, destlast, attdef, this.diceMode);
    } else {
      this.dlast_group = this.naval_group;
    }
    compute_remove_hits(this, max_remove_hits, numAA, cas, is_amphibious);
  }
}

type state_data = [
  number /*probability*/,
  number /*expected value*/,
  boolean /*is retreat*/,
  number /*rounds*/,
];

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

class result_data_t {
  problem_index: number;
  i: number;
  j: number;
  cost: number;
  p: number;
  cumm: number = 0;
  rcumm: number = 0;

  constructor(index: number, i: number, j: number, cost: number, p: number) {
    this.problem_index = index;
    this.i = i;
    this.j = j;
    this.p = p;
    this.cost = cost;
  }
}

class unit_stat {
  fullname: string;
  ch: string;
  ch2: string;
  att: number;
  def: number;
  cost: number;
  hits: number;
  isLand: boolean;
  isSub: boolean;
  isDestroyer: boolean;
  isAir: boolean;
  isAA: boolean;
  isBombard: boolean;
  isAmphibious: boolean;
  constructor(
    fullname: string,
    ch: string,
    ch2: string,
    att: number,
    def: number,
    cost: number,
    hits: number,
    isLand: boolean,
    isSub: boolean,
    isDestroyer: boolean,
    isAir: boolean,
    isAA: boolean,
    isBombard: boolean,
    isAmphibious: boolean,
  ) {
    this.fullname = fullname;
    this.ch = ch;
    this.ch2 = ch2;
    this.att = att;
    this.def = def;
    this.cost = cost;
    this.hits = hits;
    this.isSub = isSub;
    this.isDestroyer = isDestroyer;
    this.isAir = isAir;
    this.isAA = isAA;
    this.isBombard = isBombard;
    this.isAmphibious = isAmphibious;
    this.isLand = isLand;
  }
}

export function hasDestroyer(
  group: general_unit_group,
  node: general_unit_graph_node,
): boolean {
  const v1 = node.num_dest > 0;
  /*
	let v2 = hasDestroyerOrig(group, node);
	if (v1 != v2) {
		console.log(v1, v2, group, node);
	}
*/
  return v1;
}

/*
function hasDestroyerOrig( group : general_unit_group, node : general_unit_graph_node) : boolean {
	if (node.dlast) {
		return node.num_naval > 0;
	}
	if (group.naval_group.first_destroyer_index >= 0) {
		return  (node.num_naval > group.naval_group.first_destroyer_index);
	}
	return false;
}
*/

export function remove_subhits2(
  node: general_unit_graph_node,
  hits: number,
): number {
  const n = hits;
  return node.nsubArr[n];
}
function remove_aahits(
  group: general_unit_group,
  hits: number,
  index: number,
): number {
  const node = group.nodeArr[index];
  const n = hits;
  return node.naaArr[n];
}

export function remove_dlast_subhits2(
  node: general_unit_graph_node,
  hits: number,
): number {
  const n = hits;
  return node.ndlastsubArr[n];
}

export function remove_planehits2(
  node: general_unit_graph_node,
  hasDest: boolean,
  hits: number,
): number {
  const n = hits;
  if (hasDest) {
    return node.nnavalArr[n];
  } else {
    return node.nairArr[n];
  }
}

export function remove_dlast_planehits2(
  node: general_unit_graph_node,
  hasDest: boolean,
  hits: number,
): number {
  const n = hits;
  if (hasDest) {
    return node.ndlastnavalArr[n];
  } else {
    return node.ndlastairArr[n];
  }
}

export function remove_navalhits2(
  node: general_unit_graph_node,
  hits: number,
): number {
  const n = hits;
  return node.nnavalArr[n];
}

export function remove_dlast_navalhits2(
  node: general_unit_graph_node,
  hits: number,
): number {
  const n = hits;
  return node.ndlastnavalArr[n];
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

function isAir(um: unit_manager, input: string): boolean {
  const stat = um.get_stat(input);
  return stat.isAir;
}
function isSub(um: unit_manager, input: string): boolean {
  const stat = um.get_stat(input);
  return stat.isSub;
}
function isDestroyer(um: unit_manager, input: string): boolean {
  const stat = um.get_stat(input);
  return stat.isDestroyer;
}
function isTransport(um: unit_manager, input: string): boolean {
  return input == 'T';
}
function isLand(um: unit_manager, input: string): boolean {
  const stat = um.get_stat(input);
  return stat.isLand;
}

export function hasLand(um: unit_manager, input: string): boolean {
  for (let i = input.length - 1; i >= 0; i--) {
    const ch = input.charAt(i);
    if (isLand(um, ch)) {
      return true;
    }
  }
  return false;
}

function hasAmphibious(um: unit_manager, input: string): boolean {
  for (let i = input.length - 1; i >= 0; i--) {
    const ch = input.charAt(i);
    const stat = um.get_stat(ch);
    if (stat.isAmphibious) {
      return true;
    }
  }
  return false;
}

function hasNonAAUnit(um: unit_manager, input: string): boolean {
  for (let i = input.length - 1; i >= 0; i--) {
    const ch = input.charAt(i);
    const stat = um.get_stat(ch);
    if (!stat.isAA) {
      return true;
    }
  }
  return false;
}

function remove_one_plane(
  um: unit_manager,
  input_str: string,
): [string, string] {
  const N = input_str.length;
  for (let i = N - 1; i >= 0; i--) {
    const ch = input_str.charAt(i);
    if (isAir(um, ch)) {
      const out = input_str.substring(0, i) + input_str.substring(i + 1, N);
      return [out, ch];
    }
  }
  return [input_str, ''];
}
function remove_one_notdestroyer(um: unit_manager, input_str: string): string {
  const N = input_str.length;
  for (let i = N - 1; i >= 0; i--) {
    const ch = input_str.charAt(i);
    if (!isDestroyer(um, ch) && !isTransport(um, ch)) {
      const out = input_str.substring(0, i) + input_str.substring(i + 1, N);
      return out;
    }
  }
  for (let i = N - 1; i >= 0; i--) {
    {
      const out = input_str.substring(0, i) + input_str.substring(i + 1, N);
      return out;
    }
  }
  return input_str;
}
function remove_one_notplane(
  um: unit_manager,
  input_str: string,
  skipd: boolean,
): string {
  const N = input_str.length;
  for (let i = N - 1; i >= 0; i--) {
    const ch = input_str.charAt(i);
    if (
      !isAir(um, ch) &&
      (!skipd || (!isDestroyer(um, ch) && !isTransport(um, ch)))
    ) {
      const out = input_str.substring(0, i) + input_str.substring(i + 1, N);
      return out;
    }
  }
  if (skipd) {
    for (let i = N - 1; i >= 0; i--) {
      const ch = input_str.charAt(i);
      if (!isAir(um, ch)) {
        const out = input_str.substring(0, i) + input_str.substring(i + 1, N);
        return out;
      }
    }
  }

  return input_str;
}
function remove_one_notsub(
  um: unit_manager,
  input_str: string,
  skipd: boolean,
): string {
  const N = input_str.length;
  for (let i = N - 1; i >= 0; i--) {
    const ch = input_str.charAt(i);
    if (
      !isSub(um, ch) &&
      (!skipd || (!isDestroyer(um, ch) && !isTransport(um, ch)))
    ) {
      const out = input_str.substring(0, i) + input_str.substring(i + 1, N);
      return out;
    }
  }
  if (skipd) {
    for (let i = N - 1; i >= 0; i--) {
      const ch = input_str.charAt(i);
      if (!isSub(um, ch)) {
        const out = input_str.substring(0, i) + input_str.substring(i + 1, N);
        return out;
      }
    }
  }

  return input_str;
}
interface retreat_subs_output {
  s: string;
  num_subs: number;
  subs: string;
}
function retreat_subs(
  um: unit_manager,
  input_str: string,
): retreat_subs_output {
  const N = input_str.length;
  let out = '';
  let subs = '';
  let num_subs = 0;
  for (let i = 0; i < N; i++) {
    const ch = input_str.charAt(i);
    if (!isSub(um, ch)) {
      out = out + ch;
    } else {
      num_subs++;
      subs += 'S';
    }
  }
  return { s: out, num_subs: num_subs, subs: subs };
}

function is_only_transports_remain(
  um: unit_manager,
  input_str: string,
): boolean {
  const num_transports = count_units(input_str, 'T');
  return num_transports == input_str.length;
}
function is_only_aa_remain(um: unit_manager, input_str: string): boolean {
  const num_aa = count_units(input_str, 'c') + count_units(input_str, 'e');
  return num_aa == input_str.length;
}

function crash_fighters(um: unit_manager, input_str: string): string {
  const num_acc = count_units(input_str, 'A');
  const max_num_fighters = num_acc * 2;

  const N = input_str.length;
  let out = '';
  let num_fighters = 0;
  for (let i = 0; i < N; i++) {
    const ch = input_str.charAt(i);
    const stat = um.get_stat(ch);
    if (!stat.isAir) {
      out = out + ch;
    } else {
      num_fighters++;
      if (num_fighters <= max_num_fighters) {
        out = out + ch;
      }
    }
  }
  return out;
}

function retreat_non_amphibious(
  um: unit_manager,
  input_str: string,
): [string, string] {
  const N = input_str.length;
  let out = '';
  let retreat = '';
  for (let i = 0; i < N; i++) {
    const ch = input_str.charAt(i);
    const stat = um.get_stat(ch);
    if (stat.isAmphibious) {
      out += ch;
    } else {
      retreat += ch;
    }
  }
  return [out, retreat];
}

export function report_filter(threshold: number, p: number): number {
  if (p < threshold) {
    return 0;
  }
  return p;
}

export function get_cost_from_str(
  um: unit_manager,
  s: string,
  retreat: string = '',
): number {
  let cost = 0;
  let i;
  for (i = 0; i < s.length; i++) {
    const ch = s.charAt(i);
    const stat = um.get_stat(ch);
    cost += stat.cost;
  }
  for (i = 0; i < retreat.length; i++) {
    const ch = retreat.charAt(i);
    const stat = um.get_stat(ch);
    cost += stat.cost;
  }
  return cost;
}

export function get_deadzone_cost_from_str(
  um: unit_manager,
  s: string,
  retreat: string = '',
): number {
  let cost = 0;
  let i;
  for (i = 0; i < s.length; i++) {
    const ch = s.charAt(i);
    const stat = um.get_stat(ch);
    if (!isLand(um, ch)) {
      continue;
    }
    cost += stat.cost - (stat.def / 6) * 3; // cost of the unit + chance of unit hitting * cost of inf
  }
  return cost;
}

// returns the number of casualties to lose first air.  -1 if no air units
function getFirstAirCasualty(um: unit_manager, unit_str: string): number {
  const len = unit_str.length;
  for (let cas = 1; cas <= len; cas++) {
    const i = len - cas;
    const ch = unit_str.charAt(i);
    if (isAir(um, ch)) {
      return cas;
    }
  }
  return -1; // no air casualty
}

function get_cost_remain(
  um: unit_manager,
  group: unit_group,
  ii: number,
): number {
  let cost = 0;
  let i;
  for (i = 0; i < ii; i++) {
    const ch = group.unit_str[i];
    const stat = um.get_stat(ch);
    cost += stat.cost;
  }
  return cost;
}

function get_general_cost_remain(
  um: unit_manager,
  group: general_unit_group,
  ii: number,
): number {
  const node = group.nodeArr[ii];
  let cost = 0;
  if (node.retreat.length > 0) {
    cost += get_cost_from_str(um, node.retreat);
  }
  if (node.dlast && group.dlast_group != undefined) {
    return (
      cost +
      get_cost_remain(um, group.sub_group, node.num_subs) +
      get_cost_remain(um, group.air_group, node.num_air) +
      get_cost_remain(um, group.dlast_group, node.num_naval)
    );
  } else {
    return (
      cost +
      get_cost_remain(um, group.sub_group, node.num_subs) +
      get_cost_remain(um, group.air_group, node.num_air) +
      get_cost_remain(um, group.naval_group, node.num_naval)
    );
  }
}

function collect_results(
  parent_prob: general_problem,
  problemArr: general_problem[],
  index: number,
  resultArr: result_data_t[],
): result_data_t[] {
  const problem = problemArr[index];
  const N = problem.att_data.nodeArr.length;
  const M = problem.def_data.nodeArr.length;
  let i, j;

  let att_cost, def_cost;

  const NN_base = get_general_cost_remain(
    parent_prob.um,
    parent_prob.att_data,
    0,
  );
  const MM_base = get_general_cost_remain(
    parent_prob.um,
    parent_prob.def_data,
    0,
  );
  const max_cost = NN_base + MM_base;
  for (i = 0; i < N; i++) {
    for (j = 0; j < M; j++) {
      //let p = report_filter(P[i][j]);
      const p = report_filter(
        problem.report_prune_threshold,
        problem.getP(i, j),
      );
      if (p > 0) {
        att_cost = get_general_cost_remain(problem.um, problem.att_data, i);
        def_cost = get_general_cost_remain(problem.um, problem.def_data, j);
        const i2 =
          problem.att_data.nodeArr[i].N - problem.att_data.nodeArr[i].numBB;
        const j2 =
          problem.def_data.nodeArr[j].N - problem.def_data.nodeArr[j].numBB;
        const cost = j2 - i2 + (def_cost - att_cost) / max_cost;

        const attcascost = NN_base - att_cost;
        const defcascost = MM_base - def_cost;
        const cost2 = -defcascost + attcascost;
        const dzcost =
          problem.is_deadzone && problem.def_data.nodeArr[j].N == 0
            ? problem.att_data.nodeArr[i].deadzone_cost
            : 0;
        const takes =
          problem.def_data.nodeArr[j].N == 0 &&
          problem.att_data.nodeArr[i].hasLand;
        const territoryValue = takes ? problem.territory_value : 0;
        const cost3 =
          parent_prob.sortMode == 'unit_count'
            ? cost
            : cost2 + dzcost - territoryValue;

        /*
                if (do_strafe) {
                    int attcas = NN - i;
                    int defcas = MM - j;
                    int attcascost = NN_base - att_cost;
                    int defcascost = MM_base - def_cost;
                    cost = (double) (attcas - defcas) +
                        ((double)(attcascost - defcascost)/max_cost);
                    if ( j == 0) {
                        cost += max_cost;
                    }
                }
*/
        const data = new result_data_t(index, i, j, cost3, p);
        resultArr.push(data);
      }
    }
  }
  return resultArr;
}

function merge_results(sortedArr: result_data_t[]): result_data_t[] {
  const mergedArr = sortedArr;
  let i, j;
  for (i = 0; i < sortedArr.length; i++) {
    const result = sortedArr[i];
    j = i + 1;
    if (j < sortedArr.length) {
      const result2 = sortedArr[j];
      if (Math.abs(result.cost - result2.cost) < epsilon) {
        result2.p += result.p;
        result.p = 0;
      }
    }
  }
  return mergedArr;
}

function get_group_string(
  um: unit_manager,
  group: unit_group,
  sz: number,
): string {
  let out = '';
  for (let i = 0; i < sz; i++) {
    const ch = group.unit_str.charAt(i);
    const stat = um.get_stat(ch);
    out += stat.ch2;
  }
  return out;
}

function get_general_group_string(
  um: unit_manager,
  group: general_unit_group,
  sz: number,
): [string, string] {
  let out = '';
  const node = group.nodeArr[sz];
  if (node.retreat.length > 0) {
    out += node.retreat;
  }
  let out1 = '';
  for (const ch of node.unit_str) {
    if (ch == '') {
      continue;
    }
    const stat = um.get_stat(ch);
    out1 += stat.ch2;
  }
  return [out1, out];
}

function get_reduced_group_string(input: string): string {
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
  map.forEach((value: number, key: string) => {
    out = out + value + key + ', ';
  });
  return out.substring(0, out.length - 2);
}

/*
export function get_external_unit_str(um : unit_manager, input : string) :
		string
{
// stat
	let map : Map<string, number> = new Map();

	for (var char of input) {
		let v = map.get(char);
		if (v != undefined) {
			map.set(char, v + 1);
		} else {
			map.set(char, 1);
		}
	}

	let out = ""
	map.forEach((value : number, key : string) => {
		let stat = um.get_stat(key);
		
		out = out + value + " " + stat.fullname + ", "
	})
	return out.substring(0, out.length - 2);
}
*/

function get_cost(
  um: unit_manager,
  group: unit_group,
  ii: number,
  cas: string = '',
  skipBombard: boolean = false,
): [number, string] {
  const N = group.tbl_size;
  let cost = 0;
  let i;
  let out: string = '';
  for (i = ii; i < N; i++) {
    const ch = group.unit_str.charAt(i);
    if (ch == '') {
      continue;
    }
    if (skipBombard) {
      const stat = um.get_stat(ch);
      if (stat.isBombard) {
        continue;
      }
    }

    const stat = um.get_stat(ch);
    cost += stat.cost;
    out = out + stat.ch2;
  }
  for (const ch of cas) {
    if (ch == '') {
      continue;
    }
    const stat = um.get_stat(ch);
    cost += stat.cost;
    out = out + stat.ch2;
  }
  return [cost, out];
}

interface naval_cost {
  cost: number;
  casualty: string;
}
function get_general_cost(
  problem: general_problem,
  group: general_unit_group,
  ii: number,
): naval_cost {
  let skipBombard = false;
  if (!problem.is_naval && group.attdef == 0) {
    skipBombard = true;
  }
  const node = group.nodeArr[ii];
  const mymap: Map<string, number> = new Map();
  const units_remain = node.unit_str + node.retreat;
  const baseunits = group.nodeArr[0].unit_str;

  for (const ch of baseunits) {
    const stat = problem.um.get_stat(ch);
    const ch2 = stat.ch2;
    const cnt = mymap.get(ch2);
    if (cnt == undefined) {
      mymap.set(ch2, 1);
    } else {
      mymap.set(ch2, cnt + 1);
    }
  }

  for (const ch of units_remain) {
    const stat = problem.um.get_stat(ch);
    const ch2 = stat.ch2;
    const cnt = mymap.get(ch2);
    if (cnt == undefined) {
      console.log('fatal');
      throw new Error();
    } else {
      mymap.set(ch2, cnt - 1);
    }
  }

  let casualty = '';
  let cost = 0;
  for (const [ch2, cnt] of mymap) {
    const stat = problem.um.get_stat(ch2);
    if (skipBombard && stat.isBombard) {
      continue;
    }
    cost += stat.cost * cnt;
    for (let i = 0; i < cnt; i++) {
      casualty += ch2;
    }
  }

  return { cost: cost, casualty: casualty };
}

function print_general_results(
  baseproblem: general_problem,
  problemArr: general_problem[],
  resultArr: result_data_t[],
  doMerge: boolean = true,
): aacalc_output {
  if (baseproblem.verbose_level > 2) {
    console.log(resultArr.length, `number of results`);
  }

  const sortedArr = resultArr.sort((n1, n2) => {
    const r1 = n1.cost;
    const r2 = n2.cost;
    if (Math.abs(r1 - r2) < epsilon) {
      return 0;
    } else if (r1 < r2) {
      return -1;
    } else {
      return 1;
    }
  });

  const mergedArr = doMerge ? merge_results(sortedArr) : sortedArr;

  let att: string;
  let def: string;
  let retreat_att: string;
  let retreat_def: string;
  let red_att: string;
  let red_def: string;
  let red_att_cas: string;
  let red_def_cas: string;

  [att, retreat_att] = get_general_group_string(
    baseproblem.um,
    baseproblem.att_data,
    0,
  );
  [def, retreat_def] = get_general_group_string(
    baseproblem.um,
    baseproblem.def_data,
    0,
  );
  red_att = get_reduced_group_string(att);
  red_def = get_reduced_group_string(def);
  if (baseproblem.verbose_level > 2) {
    console.log(`attackers = ${att}`);
    console.log(`defenders = ${def}`);
    console.log(`attackers = ${red_att}`);
    console.log(`defenders = ${red_def}`);
  }

  let sum = 0.0;

  let attsurvive = 0;
  let defsurvive = 0;
  for (let ii = 0; ii < mergedArr.length; ii++) {
    const result = mergedArr[ii];
    const p = result.p;
    sum += p;
    result.cumm = sum;
    if (
      get_general_cost_remain(
        baseproblem.um,
        problemArr[result.problem_index].att_data,
        result.i,
      ) > 0
    ) {
      attsurvive += p;
    }
    if (
      get_general_cost_remain(
        baseproblem.um,
        problemArr[result.problem_index].def_data,
        result.j,
      ) > 0
    ) {
      defsurvive += p;
    }
  }
  sum = 0.0;
  for (let ii = mergedArr.length - 1; ii >= 0; ii--) {
    const result = mergedArr[ii];
    const p = result.p;
    sum += p;
    result.rcumm = sum;
  }

  const casualties: casualty_2d[] = [];

  // accumulate attacker and defender maps.
  const att_map: Map<number, number> = new Map();
  const att_retreat_map: Map<number, number> = new Map(); // for retreating units
  const def_map: Map<number, number> = new Map();

  let totalattloss = 0;
  let totaldefloss = 0;
  let takes = 0;
  for (let ii = 0; ii < mergedArr.length; ii++) {
    const result = mergedArr[ii];
    const problem = problemArr[result.problem_index];
    [att, retreat_att] = get_general_group_string(
      problem.um,
      problem.att_data,
      result.i,
    );
    [def, retreat_def] = get_general_group_string(
      problem.um,
      problem.def_data,
      result.j,
    );
    const red_retreat_att = get_reduced_group_string(retreat_att);
    const red_retreat_def = get_reduced_group_string(retreat_def);
    red_att = get_reduced_group_string(att);
    red_def = get_reduced_group_string(def);
    const att_naval_cost = get_general_cost(
      problem,
      problem.att_data,
      result.i,
    );
    const def_naval_cost = get_general_cost(
      problem,
      problem.def_data,
      result.j,
    );
    red_att_cas = get_reduced_group_string(att_naval_cost.casualty);
    red_def_cas = get_reduced_group_string(def_naval_cost.casualty);
    const p = report_filter(problem.report_prune_threshold, result.p);
    const d_p = def_map.get(result.j);
    if (d_p == undefined) {
      def_map.set(result.j, p);
    } else {
      def_map.set(result.j, d_p + p);
    }
    // separate attackers into retreat and survives catetories
    if (def.length > 0) {
      const a_p = att_retreat_map.get(result.i);
      if (a_p == undefined) {
        att_retreat_map.set(result.i, p);
      } else {
        att_retreat_map.set(result.i, a_p + p);
      }
    } else {
      const a_p = att_map.get(result.i);
      if (a_p == undefined) {
        att_map.set(result.i, p);
      } else {
        att_map.set(result.i, a_p + p);
      }
    }
    if (p > 0) {
      totalattloss += att_naval_cost.cost * p;
      totaldefloss += def_naval_cost.cost * p;
      if (
        !baseproblem.is_naval &&
        hasLand(problem.um, att) &&
        def.length == 0
      ) {
        takes += p;
        totalattloss -= problem.territory_value * p;
        if (baseproblem.is_deadzone) {
          const attnode = baseproblem.att_data.nodeArr[result.i];
          totalattloss += attnode.deadzone_cost * p;
        }
      }
      if (baseproblem.verbose_level > 2) {
        //console.log(`result:  P[%d][%d] ${red_att} vs. ${red_def} = ${p} cumm(${result.cumm}) rcumm(${result.rcumm}) (${result.cost})`, result.i, result.j);
        const att_loss = att_naval_cost.cost;
        const def_loss = def_naval_cost.cost;
        console.log(
          `result:  P[%d][%d] ${red_att}:${red_retreat_att} vs. ${red_def}:${red_retreat_def} (loss ${red_att_cas} ${att_loss} vs. ${red_def_cas} ${def_loss})= ${p} cumm(${result.cumm}) rcumm(${result.rcumm}) (${result.cost})`,
          result.i,
          result.j,
        );
      }
      const cas: casualty_2d = {
        attacker: red_att,
        defender: red_def,
        attacker_retreat: red_retreat_att,
        defender_retreat: red_retreat_def,
        attacker_casualty: red_att_cas,
        defender_casualty: red_def_cas,
        prob: p,
      };
      casualties.push(cas);
    }
  }

  const att_cas_1d: casualty_1d[] = [];
  const def_cas_1d: casualty_1d[] = [];

  for (const [i, p] of att_map) {
    //console.log(i, p, "i, p");
    const [att, retreat_att] = get_general_group_string(
      baseproblem.um,
      baseproblem.att_data,
      i,
    );
    const att_naval_cost = get_general_cost(
      baseproblem,
      baseproblem.att_data,
      i,
    );
    const att_cas = att_naval_cost.casualty;
    const cas: casualty_1d = {
      remain: att,
      retreat: retreat_att,
      casualty: att_cas,
      prob: p,
    };
    att_cas_1d.push(cas);
  }
  for (const [i, p] of att_retreat_map) {
    //console.log(i, p, "i, p");
    const [att, retreat_att] = get_general_group_string(
      baseproblem.um,
      baseproblem.att_data,
      i,
    );
    const att_naval_cost = get_general_cost(
      baseproblem,
      baseproblem.att_data,
      i,
    );
    const att_cas = att_naval_cost.casualty;
    const cas: casualty_1d = {
      remain: '',
      retreat: retreat_att + att,
      casualty: att_cas,
      prob: p,
    };
    att_cas_1d.push(cas);
  }
  //console.log("att_cas_1d", JSON.stringify(att_cas_1d, null, 4));

  for (const [j, p] of def_map) {
    //console.log(j, p, "j, p");
    const [def, retreat_def] = get_general_group_string(
      baseproblem.um,
      baseproblem.def_data,
      j,
    );
    const def_naval_cost = get_general_cost(
      baseproblem,
      baseproblem.def_data,
      j,
    );
    const def_cas = def_naval_cost.casualty;
    const cas: casualty_1d = {
      remain: def,
      retreat: retreat_def,
      casualty: def_cas,
      prob: p,
    };
    def_cas_1d.push(cas);
  }
  //console.log("def_cas_1d", JSON.stringify(def_cas_1d, null, 4));

  //console.log(casualties);
  const output: aacalc_output = {
    attack: { survives: [attsurvive, 0, 0], ipcLoss: [totalattloss, 0, 0] },
    defense: { survives: [defsurvive, 0, 0], ipcLoss: [totaldefloss, 0, 0] },
    casualtiesInfo: casualties,
    att_cas: att_cas_1d,
    def_cas: def_cas_1d,
    rounds: baseproblem.average_rounds,
    takesTerritory: [takes, 0, 0],
  };

  return output;
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

function solve_general(problem: general_problem) {
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

  if (problem.def_cas == undefined) {
    /* initial seed */
    problem.setP(0, 0, problem.prob);
    const doAA =
      !problem.is_naval &&
      problem.att_data.num_aashot > 0 &&
      hasNonAAUnit(problem.um, problem.def_data.unit_str);
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
        const doAA =
          !problem.is_naval &&
          numAA > 0 &&
          problem.att_data.num_aashot > 0 &&
          hasNonAAUnit(problem.um, problem.def_cas[i].remain);
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
          problem.setP(0, ii, problem.getP(0, ii) + problem.def_cas[i].prob);
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
  if (
    numBombard > 0 ||
    (!problem.retreat_round_zero && problem.hasRetreatCondition())
  ) {
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

function make_node_key(s: string, retreat: string) {
  return s + ';' + retreat;
}
// compute all possible sub-states (and all possible casualties from every state).
function compute_remove_hits(
  naval_group: general_unit_group,
  max_remove_hits: number,
  numAA: number,
  cas: casualty_1d[] | undefined,
  is_amphibious: boolean,
) {
  // compute next state graph
  // start with initial state.
  // from each node --  next states are:
  //   remove 1sub hit
  //   remove 1air hit  (no destroyer)
  //   remove 1naval hit (unconstrained)

  // root node
  const s = naval_group.unit_str;
  //printf ("%s", s);
  //console.log(naval_group);
  let node = new general_unit_graph_node(
    naval_group.um,
    s,
    '',
    naval_group.is_nonaval,
  );
  node.dlast = false;

  const nodeVec: general_unit_graph_node[] = [];
  const mymap: Map<string, general_unit_graph_node> = new Map();
  //const q : number[] = [];
  // information to uniquely identify a node
  const mycompare = (a: general_unit_graph_node, b: general_unit_graph_node) =>
    b.cost - a.cost;
  const myheap = new Heap(mycompare);
  mymap.set(make_node_key(s, ''), node);
  myheap.push(node);

  if (numAA > 0 && naval_group.attdef == 0) {
    let num_shots = numAA * 3;
    const num_planes = naval_group.num_air;
    if (num_planes < num_shots) num_shots = num_planes;
    if (naval_group.um.verbose_level > 3) {
      console.log(num_shots, 'num_shots');
    }

    naval_group.num_aashot = num_shots;

    let att_str = s;
    let att_cas = '';
    let prev = node;
    let nnode = node;
    for (let i = 0; i <= num_shots; i++) {
      if (i > 0) {
        let cas;
        [att_str, cas] = remove_one_plane(naval_group.um, att_str);
        att_cas += cas;
        nnode = new general_unit_graph_node(
          naval_group.um,
          att_str,
          '',
          naval_group.is_nonaval,
        );
        myheap.push(nnode);
        mymap.set(make_node_key(att_str, ''), nnode);
        prev.next_aahit = nnode;
      }
      prev = nnode;
    }
    prev.next_aahit = prev;
  }

  if (cas != undefined) {
    for (let i = 0; i < cas.length; i++) {
      const s = cas[i].remain;
      const key = make_node_key(s, '');
      const ii = mymap.get(key);
      if (ii == undefined) {
        const newnode = new general_unit_graph_node(
          naval_group.um,
          s,
          '',
          naval_group.is_nonaval,
        );
        if (newnode.num_naval > 0) {
          newnode.dlast = node.dlast;
        } else {
          newnode.dlast = false;
        }
        mymap.set(key, newnode);
        myheap.push(newnode);
        //console.log (newnode.index, "push 0");
      }
    }
  }

  while (myheap.length > 0) {
    const node = myheap.pop();
    if (node == undefined) {
      throw new Error();
    }
    node.index = nodeVec.length;
    nodeVec.push(node);

    //console.log (node.index, node, nodeVec.length, "pop");
    if (node.N == 0) {
      node.next_navalhit = node;
      node.next_airhit = node;
      node.next_subhit = node;
      node.next_dlast_navalhit = node;
      node.next_dlast_airhit = node;
      node.next_dlast_subhit = node;
      node.next_submerge = node;
      continue;
    }
    const ch = node.unit_str[node.N - 1];

    // unconstrained next:  remove last unit
    const s = node.unit_str.substring(0, node.unit_str.length - 1);

    let newnode: general_unit_graph_node;

    const key = make_node_key(s, node.retreat);
    const ii = mymap.get(key);
    if (ii == undefined) {
      newnode = new general_unit_graph_node(
        naval_group.um,
        s,
        node.retreat,
        naval_group.is_nonaval,
      );
      if (newnode.num_naval > 0) {
        newnode.dlast = node.dlast;
      } else {
        newnode.dlast = false;
      }
      mymap.set(key, newnode);
      myheap.push(newnode);
      //console.log (newnode.index, "push 0");
    } else {
      newnode = ii;
    }
    node.next_navalhit = newnode;

    if (!naval_group.is_naval || !isAir(naval_group.um, ch)) {
      // sub is the same as unconstrained/
      node.next_subhit = newnode;
    } else {
      const s2 = remove_one_notplane(naval_group.um, node.unit_str, false);
      let node2: general_unit_graph_node;
      const key = make_node_key(s2, node.retreat);
      const ii = mymap.get(key);
      if (ii == undefined) {
        node2 = new general_unit_graph_node(
          naval_group.um,
          s2,
          node.retreat,
          naval_group.is_nonaval,
        );
        if (node2.num_naval > 0) {
          node2.dlast = node.dlast;
        } else {
          node2.dlast = false;
        }
        mymap.set(key, node2);
        myheap.push(node2);
        //console.log (node2.index, "push 1");
      } else {
        node2 = ii;
      }
      node.next_subhit = node2;
    }
    if (!naval_group.is_naval || !isSub(naval_group.um, ch)) {
      node.next_airhit = newnode;
    } else {
      const s2 = remove_one_notsub(naval_group.um, node.unit_str, false);
      let node2: general_unit_graph_node;
      const key = make_node_key(s2, node.retreat);
      const ii = mymap.get(key);
      if (ii == undefined) {
        node2 = new general_unit_graph_node(
          naval_group.um,
          s2,
          node.retreat,
          naval_group.is_nonaval,
        );
        if (node2.num_naval > 0) {
          node2.dlast = node.dlast;
        } else {
          node2.dlast = false;
        }
        mymap.set(key, node2);
        myheap.push(node2);
        //console.log (node2.index, "push 2");
      } else {
        node2 = ii;
      }
      node.next_airhit = node2;
    }
    node.next_dlast_navalhit = node.next_navalhit;
    node.next_dlast_airhit = node.next_airhit;
    node.next_dlast_subhit = node.next_subhit;
    const nnnode = node.next_navalhit;
    const nanode = node.next_airhit;
    const nsnode = node.next_subhit;
    /*
		console.log (
				naval_group.destroyer_last, 
				node.num_dest,
				 node.num_naval,
				nnnode.num_dest,
				nanode.num_dest,
				nsnode.num_dest);
*/
    if (
      naval_group.destroyer_last &&
      node.num_dest == 1 &&
      nnnode.num_dest == 0
    ) {
      //console.log ("here");
      // next naval
      const s2 = remove_one_notdestroyer(naval_group.um, node.unit_str);
      let node2: general_unit_graph_node;
      const key = make_node_key(s2, node.retreat);
      const ii = mymap.get(key);
      if (ii == undefined) {
        node2 = new general_unit_graph_node(
          naval_group.um,
          s2,
          node.retreat,
          naval_group.is_nonaval,
        );
        node2.dlast = true;
        mymap.set(key, node2);
        myheap.push(node2);
        //console.log (node2, "push 3");
        //console.log (node2.index, "push 3");
      } else {
        node2 = ii;
      }
      node.next_dlast_navalhit = node2;
    }
    if (
      naval_group.destroyer_last &&
      node.num_dest == 1 &&
      nanode.num_dest == 0
    ) {
      // next air
      const s2 = remove_one_notsub(naval_group.um, node.unit_str, true);
      let node2: general_unit_graph_node;
      const key = make_node_key(s2, node.retreat);
      const ii = mymap.get(key);
      if (ii == undefined) {
        node2 = new general_unit_graph_node(
          naval_group.um,
          s2,
          node.retreat,
          naval_group.is_nonaval,
        );
        node2.dlast = true;
        mymap.set(key, node2);
        myheap.push(node2);
        //console.log (node2, "push 4");
        //console.log (node2.index, "push 4");
      } else {
        node2 = ii;
      }
      node.next_dlast_airhit = node2;
    }
    if (
      naval_group.destroyer_last &&
      node.num_dest == 1 &&
      nsnode.num_dest == 0
    ) {
      // next sub
      const s2 = remove_one_notplane(naval_group.um, node.unit_str, true);
      let node2: general_unit_graph_node;
      const key = make_node_key(s2, node.retreat);
      const ii = mymap.get(key);
      if (ii == undefined) {
        node2 = new general_unit_graph_node(
          naval_group.um,
          s2,
          node.retreat,
          naval_group.is_nonaval,
        );
        node2.dlast = true;
        mymap.set(key, node2);
        myheap.push(node2);
        //console.log (node2, "push 5");
        //console.log (node2.index, "push 5");
      } else {
        node2 = ii;
      }
      node.next_dlast_subhit = node2;
    }
    if (
      naval_group.submerge_sub &&
      node.num_subs > 0 &&
      node.retreat.length == 0
    ) {
      const retreat_subs_output = retreat_subs(naval_group.um, node.unit_str);
      const s2 = retreat_subs_output.s;
      const subs = retreat_subs_output.subs;
      let node2: general_unit_graph_node;
      const key = make_node_key(s2, subs);
      const ii = mymap.get(key);
      if (ii == undefined) {
        node2 = new general_unit_graph_node(
          naval_group.um,
          s2,
          subs,
          naval_group.is_nonaval,
        );
        if (node2.num_naval > 0) {
          node2.dlast = node.dlast;
        } else {
          node2.dlast = false;
        }
        mymap.set(key, node2);
        myheap.push(node2);
        //console.log (node2, "push 6");
        //console.log (node2.index, "push 6");
      } else {
        node2 = ii;
      }
      node.next_submerge = node2;
    }
    if (is_amphibious && node.unit_str.length > 0 && node.retreat.length == 0) {
      const [s2, amphibious] = retreat_non_amphibious(
        naval_group.um,
        node.unit_str,
      );
      //if (true || hasAmphibious (naval_group.um, s2))
      {
        let node2: general_unit_graph_node;
        const key = make_node_key(s2, amphibious);
        const ii = mymap.get(key);
        if (ii == undefined) {
          node2 = new general_unit_graph_node(
            naval_group.um,
            s2,
            amphibious,
            naval_group.is_nonaval,
          );
          if (node2.num_naval > 0) {
            node2.dlast = node.dlast;
          } else {
            node2.dlast = false;
          }
          mymap.set(key, node2);
          myheap.push(node2);
          //console.log (node2, "push 6");
          //console.log (node2.index, "push 6");
        } else {
          node2 = ii;
        }
        node.next_retreat_amphibious = node2;
      }
    }
    if (naval_group.is_crash_fighters) {
      const s2 = crash_fighters(naval_group.um, node.unit_str);
      let node2: general_unit_graph_node;
      const key = make_node_key(s2, node.retreat);
      const ii = mymap.get(key);
      if (ii == undefined) {
        node2 = new general_unit_graph_node(
          naval_group.um,
          s2,
          node.retreat,
          naval_group.is_nonaval,
        );
        if (node2.num_naval > 0) {
          node2.dlast = node.dlast;
        } else {
          node2.dlast = false;
        }
        mymap.set(key, node2);
        myheap.push(node2);
        //console.log (node2, "push 6");
        //console.log (node2.index, "push 6");
      } else {
        node2 = ii;
      }
      node.next_crash_fighters = node2;
    }

    if (
      is_only_transports_remain(naval_group.um, node.unit_str) ||
      is_only_aa_remain(naval_group.um, node.unit_str)
    ) {
      const s2 = '';
      let node2: general_unit_graph_node;
      const key = make_node_key(s2, node.retreat);
      const ii = mymap.get(key);
      if (ii == undefined) {
        node2 = new general_unit_graph_node(
          naval_group.um,
          s2,
          node.retreat,
          naval_group.is_nonaval,
        );
        if (node2.num_naval > 0) {
          node2.dlast = node.dlast;
        } else {
          node2.dlast = false;
        }
        mymap.set(key, node2);
        myheap.push(node2);
        //console.log (node2, "push 6");
        //console.log (node2.index, "push 6");
      } else {
        node2 = ii;
      }
      node.next_remove_noncombat = node2;
    }
  } // end of while heap loop

  //console.log("done queue");
  naval_group.nodeArr = nodeVec;
  //console.log(naval_group.nodeArr.length, "length");

  let i;
  for (i = 0; i < naval_group.nodeArr.length; i++) {
    node = naval_group.nodeArr[i];
    //console.log(i, node);

    // compute nextsub array
    node.nsubArr = [];

    let prev: general_unit_graph_node | undefined = undefined;
    let node2: general_unit_graph_node | undefined;
    for (
      node2 = node;
      node2 != undefined && node2 != prev;
      node2 = node2.next_subhit
    ) {
      prev = node2;
      node.nsubArr.push(node2.index);
    }
    if (prev == undefined) {
      throw new Error();
    }
    for (let i = node.nsubArr.length; i < max_remove_hits; i++) {
      node.nsubArr.push(prev.index);
    }

    // compute nextair array
    node.nairArr = [];
    prev = undefined;
    for (
      node2 = node;
      node2 != undefined && node2 != prev;
      node2 = node2.next_airhit
    ) {
      prev = node2;
      node.nairArr.push(node2.index);
    }
    if (prev == undefined) {
      throw new Error();
    }
    for (let i = node.nairArr.length; i < max_remove_hits; i++) {
      node.nairArr.push(prev.index);
    }

    node.nnavalArr = [];
    // compute nextnaval array
    prev = undefined;
    for (
      node2 = node;
      node2 != undefined && node2 != prev;
      node2 = node2.next_navalhit
    ) {
      prev = node2;
      node.nnavalArr.push(node2.index);
    }
    if (prev == undefined) {
      throw new Error();
    }
    for (let i = node.nnavalArr.length; i < max_remove_hits; i++) {
      node.nnavalArr.push(prev.index);
    }

    // compute next_dlast_sub array
    node.ndlastsubArr = [];
    prev = undefined;

    for (
      node2 = node;
      node2 != undefined && node2 != prev;
      node2 = node2.next_dlast_subhit
    ) {
      prev = node2;
      node.ndlastsubArr.push(node2.index);
    }
    if (prev == undefined) {
      throw new Error();
    }
    for (let i = node.ndlastsubArr.length; i < max_remove_hits; i++) {
      node.ndlastsubArr.push(prev.index);
    }

    // compute nextair array
    node.ndlastairArr = [];
    prev = undefined;
    for (
      node2 = node;
      node2 != undefined && node2 != prev;
      node2 = node2.next_dlast_airhit
    ) {
      prev = node2;
      node.ndlastairArr.push(node2.index);
    }
    if (prev == undefined) {
      throw new Error();
    }
    for (let i = node.ndlastairArr.length; i < max_remove_hits; i++) {
      node.ndlastairArr.push(prev.index);
    }

    node.ndlastnavalArr = [];
    // compute nextnaval array
    prev = undefined;
    for (
      node2 = node;
      node2 != undefined && node2 != prev;
      node2 = node2.next_dlast_navalhit
    ) {
      prev = node2;
      node.ndlastnavalArr.push(node2.index);
    }
    if (prev == undefined) {
      throw new Error();
    }
    for (let i = node.ndlastnavalArr.length; i < max_remove_hits; i++) {
      node.ndlastnavalArr.push(prev.index);
    }

    if (node.num_subs == 0) {
      node.nosub_group = make_unit_group(
        naval_group.um,
        node.unit_str,
        naval_group.attdef,
        naval_group.diceMode,
      );
    } else {
      const retreat_subs_output = retreat_subs(naval_group.um, node.unit_str);
      const s2 = retreat_subs_output.s;
      node.nosub_group = make_unit_group(
        naval_group.um,
        s2,
        naval_group.attdef,
        naval_group.diceMode,
      );
    }
    {
      let naval = '';
      for (let j = 0; j < node.unit_str.length; j++) {
        const ch = node.unit_str.charAt(j);
        if (isAir(naval_group.um, ch) || isSub(naval_group.um, ch)) {
          continue;
        }
        naval += ch;
      }
      node.naval_group = make_unit_group(
        naval_group.um,
        naval,
        naval_group.attdef,
        naval_group.diceMode,
      );
    }
  }
  // aahits
  {
    node = naval_group.nodeArr[0];
    // compute nextsub array
    node.naaArr = [];
    let prev: general_unit_graph_node | undefined = undefined;
    let node2: general_unit_graph_node | undefined;
    for (
      node2 = node;
      node2 != undefined && node2 != prev;
      node2 = node2.next_aahit
    ) {
      prev = node2;
      node.naaArr.push(node2.index);
    }
  }
  //console.log("done queue 2");
  for (let i = 0; i < naval_group.nodeArr.length; i++) {
    node = naval_group.nodeArr[i];
    const red_str = get_reduced_group_string(node.unit_str);
    const red_retreat_str = get_reduced_group_string(node.retreat);

    if (naval_group.um.verbose_level > 2) {
      console.log(
        `${node.index}:  ${red_str}:${red_retreat_str} ${node.num_subs} ${node.num_air} ${node.num_naval} ${node.num_dest} ${node.dlast} ${node.cost}`,
      );
      //		if (node.next_subhit != undefined && node.next_airhit != undefined && node.next_navalhit != undefined){
      //			console.log(node.index, node.next_subhit.index, node.next_airhit.index, node.next_navalhit.index);
      //		}
      if (naval_group.um.verbose_level > 3) {
        if (node.next_crash_fighters != undefined) {
          console.log(
            node.index,
            node.next_crash_fighters.index,
            'next crash fighter',
          );
        }
        if (node.next_remove_noncombat != undefined) {
          console.log(
            node.index,
            node.next_remove_noncombat.index,
            'next remove transports ',
          );
        }
      }
      if (naval_group.um.verbose_level > 4) {
        console.log(
          node.unit_str,
          node.num_subs,
          node.num_air,
          node.num_naval,
          naval_group.sub_group.unit_str.substr(0, node.num_subs),
          naval_group.naval_group.unit_str.substr(0, node.num_naval),
          node.naval_group != undefined
            ? node.naval_group.unit_str.substr(0, node.num_naval)
            : '',
          naval_group.air_group.unit_str.substr(0, node.num_air),
        );
      }
    }
  }
}

export function make_unit_group(
  um: unit_manager,
  input_str: string,
  attdef: number,
  diceMode: DiceMode,
): unit_group {
  if (um.skip_compute) {
    return um.unit_group_manager.get_or_create_unit_group(
      um,
      '',
      attdef,
      diceMode,
    );
  } else {
    return um.unit_group_manager.get_or_create_unit_group(
      um,
      input_str,
      attdef,
      diceMode,
    );
  }
}

export function count_units(input: string, tok: string): number {
  let cnt = 0;
  for (let i = 0; i < input.length; i++) {
    const ch = input.charAt(i);
    if (ch == tok) {
      cnt++;
    }
  }
  return cnt;
}

function preparse_token(input: string): string {
  const space = ' ';
  const comma = ',';

  const a = input.split(space).join('');
  const b = a.split(comma).join('');
  let out = '';
  const len = b.length;
  for (let i = 0; i < len; i++) {
    const term = b.substring(i, len);
    const c = parseInt(term);
    if (c > 0) {
      // number seen.
      const dd = c.toString();
      const e = dd.length;
      const unit = term.charAt(e);

      // c is the number of units (5)
      // e is the index of unit 'i'
      let temp = '';
      for (let j = 0; j < c; j++) {
        temp = temp + unit;
      }
      out = out + temp;
      i += e;
    } else {
      out = out + b.charAt(i);
    }
  }

  return out;
}

function preparse_artillery(input: string, attdef: number): string {
  if (attdef != 0) {
    return input;
  }
  let out = input;

  const numArt = count_units(input, 'a') + count_units(input, 'g');
  let cnt = 0;
  for (let i = 0; i < out.length; i++) {
    const ch = out.charAt(i);
    if (ch == 'i') {
      if (cnt < numArt) {
        let newout;
        if (i > 0) {
          newout = out.substring(0, i) + 'd' + out.substring(i + 1, out.length);
        } else {
          newout = 'd' + out.substring(1, out.length);
        }
        out = newout;
        cnt++;
      }
    }
    if (ch == 'j') {
      if (cnt < numArt) {
        let newout;
        if (i > 0) {
          newout = out.substring(0, i) + 'h' + out.substring(i + 1, out.length);
        } else {
          newout = 'h' + out.substring(1, out.length);
        }
        out = newout;
        cnt++;
      }
    }
  }
  return out;
}

function preparse_skipaa(input: string): string {
  let out = '';
  for (const ch of input) {
    if (ch == 'c') {
      out += 'e';
    } else {
      out += ch;
    }
  }
  return out;
}

function preparse_battleship(input: string): string {
  // remove "E"
  let removeE = '';
  for (const ch of input) {
    if (ch == 'E') {
      continue;
    }
    removeE += ch;
  }

  let out = removeE;
  const numBB = count_units(input, 'B');
  for (let i = 0; i < numBB; i++) {
    out += 'E';
  }
  return out;
}

function preparse(
  isnaval: boolean,
  input: string,
  attdef: number,
  skipAA: boolean = false,
): string {
  const token_out = preparse_token(input);
  const art_out = preparse_artillery(token_out, attdef);
  if (isnaval) {
    const bat_out = preparse_battleship(art_out);
    return bat_out;
  }
  if (skipAA) {
    const aa_out = preparse_skipaa(art_out);
    return aa_out;
  }
  return art_out;
}

export interface aacalc_input {
  attacker: string;
  defender: string;
  debug: boolean;
  diceMode: DiceMode;
  prune_threshold: number;
  report_prune_threshold: number;
  is_naval: boolean;
  is_in_progress: boolean;
  att_destroyer_last: boolean;
  def_destroyer_last: boolean;
  att_submerge_sub: boolean;
  def_submerge_sub: boolean;
  num_runs: number;
  retreat_threshold: number;
  verbose_level: number;
}

interface aacalc_info {
  survives: number[];
  ipcLoss: number[];
}

interface casualty_2d {
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

export interface aacalc_output {
  attack: aacalc_info;
  defense: aacalc_info;
  casualtiesInfo: casualty_2d[];
  att_cas: casualty_1d[];
  def_cas: casualty_1d[];
  rounds: number;
  takesTerritory: number[];
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

function collect_and_print_results(problem: general_problem) {
  const problemArr: general_problem[] = [];
  problemArr.push(problem);
  const result_data: result_data_t[] = [];
  collect_results(problem, problemArr, 0, result_data);
  let skipMerge = problem.is_retreat;
  skipMerge = true;
  const out = print_general_results(
    problem,
    problemArr,
    result_data,
    !skipMerge,
  );
  console.log(out);
}

function get_defender_distribution(problem: general_problem): casualty_1d[] {
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
      const problemArr: general_problem[] = [];
      problemArr.push(myprob);
      //console.log(myprob);
      solve_general(myprob);

      const result_data: result_data_t[] = [];
      collect_results(myprob, problemArr, 0, result_data);
      let skipMerge = myprob.is_retreat;
      skipMerge = true;
      if (input.verbose_level > 2) {
        console.log(skipMerge, 'skipMerge');
      }
      const out = print_general_results(
        myprob,
        problemArr,
        result_data,
        !skipMerge,
      );
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
