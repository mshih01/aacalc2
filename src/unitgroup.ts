import { Heap } from 'heap-js';
import type { UnitIdentifier } from './external.js';
import { count_units } from './preparse.js';
import { type DiceMode } from './solve.js';
import { type casualty_1d } from './output.js';
import { get_reduced_group_string } from './output.js';

//import { solve_one_general_state_copy4 } from './solveone4.js';
export class unit_group_manager {
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
export class general_unit_graph_node {
  unit_str: string;
  retreat: string = '';
  N: number;
  num_subs: number;
  num_air: number;
  num_naval: number;
  num_dest: number;
  num_aa: number;
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
    this.num_aa = count_units(unit_str, 'c');
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
export class general_unit_group {
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
export class unit_stat {
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

export function remove_subhits2(
  node: general_unit_graph_node,
  hits: number,
): number {
  const n = hits;
  return node.nsubArr[n];
}
export function remove_aahits(
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
export function isAir(um: unit_manager, input: string): boolean {
  const stat = um.get_stat(input);
  return stat.isAir;
}
export function isSub(um: unit_manager, input: string): boolean {
  const stat = um.get_stat(input);
  return stat.isSub;
}
export function isDestroyer(um: unit_manager, input: string): boolean {
  const stat = um.get_stat(input);
  return stat.isDestroyer;
}
function isTransport(um: unit_manager, input: string): boolean {
  return input == 'T';
}
export function isLand(um: unit_manager, input: string): boolean {
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
export function hasAmphibious(um: unit_manager, input: string): boolean {
  for (let i = input.length - 1; i >= 0; i--) {
    const ch = input.charAt(i);
    const stat = um.get_stat(ch);
    if (stat.isAmphibious) {
      return true;
    }
  }
  return false;
}

export function hasNonAAUnit(um: unit_manager, input: string): boolean {
  for (let i = input.length - 1; i >= 0; i--) {
    const ch = input.charAt(i);
    const stat = um.get_stat(ch);
    if (!stat.isAA) {
      return true;
    }
  }
  return false;
}
export function remove_one_plane(
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
export function remove_one_notdestroyer(
  um: unit_manager,
  input_str: string,
): string {
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
export function remove_one_notplane(
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
export function remove_one_notsub(
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
export function retreat_subs(
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
export function is_only_transports_remain(
  um: unit_manager,
  input_str: string,
): boolean {
  const num_transports = count_units(input_str, 'T');
  return num_transports == input_str.length;
}
export function is_only_aa_remain(
  um: unit_manager,
  input_str: string,
): boolean {
  const num_aa = count_units(input_str, 'c') + count_units(input_str, 'e');
  return num_aa == input_str.length;
}
export function crash_fighters(um: unit_manager, input_str: string): string {
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
export function retreat_non_amphibious(
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

export function getFirstAirCasualty(
  um: unit_manager,
  unit_str: string,
): number {
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
export function get_general_cost_remain(
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
function make_node_key(s: string, retreat: string) {
  return s + ';' + retreat;
}
// compute all possible sub-states (and all possible casualties from every state).
export function compute_remove_hits(
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
